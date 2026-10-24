import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createOrderBot } from './bot/createBot';
import { loadServerConfig } from './config';
import { createHttpServer } from './http/httpServer';
import { OrderService } from './orders/orderService';
import { SqliteOrderStore } from './orders/sqliteOrderStore';
import type { OrderNotifier } from './orders/types';

const config = loadServerConfig(process.env);
mkdirSync(dirname(config.databasePath), { recursive: true });
const store = new SqliteOrderStore(config.databasePath);

const notifierHolder: { current?: OrderNotifier } = {};
const service = new OrderService({
  store,
  notifier: { notifyOrderCreated: (order) => notifierHolder.current?.notifyOrderCreated(order) ?? Promise.resolve() },
});

async function downloadTelegramFile(token: string, filePath: string): Promise<Uint8Array> {
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!response.ok) throw new Error(`Telegram file ${filePath} returned status ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function startBot(token: string): () => Promise<void> {
  if (config.adminIds.length === 0) throw new Error('ADMIN_IDS is required when TELEGRAM_BOT_TOKEN is set');
  const { bot, notifier } = createOrderBot({
    token,
    adminIds: config.adminIds,
    service,
    publicUrl: config.publicUrl,
    downloadFile: (filePath) => downloadTelegramFile(token, filePath),
  });
  bot.catch((error) => console.error('Bot update failed', error.error));
  notifierHolder.current = notifier;
  bot
    .start({ onStart: (info) => console.log(`Telegram bot @${info.username} is polling`) })
    .catch((error: unknown) => console.error('Telegram bot stopped', error));
  return () => bot.stop();
}

const stopBot = config.botToken ? startBot(config.botToken) : null;
if (!stopBot) console.warn('TELEGRAM_BOT_TOKEN is not set: the API works, managers are not notified');

const server = createHttpServer({ service, publicUrl: config.publicUrl, trustProxy: process.env.TRUST_PROXY === '1' });
server.listen(config.port, () => console.log(`Orders API listens on http://localhost:${config.port}`));

async function shutdown(): Promise<void> {
  await stopBot?.();
  server.close();
  store.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

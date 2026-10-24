import { Bot, type Context } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { OrderError, type OrderErrorCode, type OrderService } from '../orders/orderService';
import type { Order, OrderNotifier, StoredQr } from '../orders/types';
import {
  HELP_TEXT,
  ORDERS_LIST_CALLBACK,
  buildConfirmationKeyboard,
  buildOrderKeyboard,
  buildOrderListKeyboard,
  formatConfirmation,
  formatMoney,
  formatOrderCard,
  formatOrderList,
  parseOrderCallback,
} from './orderMessages';

const RECENT_ORDERS_LIMIT = 10;
const KITCHEN_LINK_PATTERN = /[#?&]k=([A-Za-z0-9_-]{10,})/;
const CAPTION_ORDER_PATTERN = /(\d+)/;
const PHOTO_MIME = 'image/jpeg';

const ERROR_TEXTS: Record<OrderErrorCode, string> = {
  invalid_kitchen: 'Не удалось прочитать ссылку на кухню. Скопируйте её из конструктора заново.',
  empty_kitchen: 'В кухне нет модулей, заказ не создан.',
  invalid_contact: 'Контактные данные некорректны.',
  invalid_product: 'Такого товара нет в каталоге.',
  order_not_found: 'Такого заказа нет.',
  invalid_transition: 'Это действие сейчас недоступно для заказа.',
  invalid_qr: 'Не удалось принять изображение. Пришлите QR как фото или файл PNG, JPEG, WebP до 5 МБ.',
};

export interface BotOptions {
  token: string;
  adminIds: number[];
  service: OrderService;
  publicUrl: string;
  downloadFile: (filePath: string) => Promise<Uint8Array>;
  botInfo?: UserFromGetMe;
}

export interface OrderBot {
  bot: Bot;
  notifier: OrderNotifier;
}

export function createOrderBot(options: BotOptions): OrderBot {
  const { service, publicUrl, adminIds, downloadFile } = options;
  const bot = new Bot(options.token, options.botInfo ? { botInfo: options.botInfo } : undefined);
  const pendingQrOrders = new Map<number, number>();

  async function replyCard(ctx: Context, order: Order, prefix?: string): Promise<void> {
    const text = prefix ? `${prefix}\n\n${formatOrderCard(order, publicUrl)}` : formatOrderCard(order, publicUrl);
    await ctx.reply(text, { reply_markup: buildOrderKeyboard(order, publicUrl) });
  }

  async function editCard(ctx: Context, order: Order): Promise<void> {
    await ctx.editMessageText(formatOrderCard(order, publicUrl), { reply_markup: buildOrderKeyboard(order, publicUrl) });
  }

  async function runOrderAction(ctx: Context, action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      if (!(error instanceof OrderError)) throw error;
      await ctx.reply(ERROR_TEXTS[error.code]);
    }
  }

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId !== undefined && adminIds.includes(userId)) return next();
    if (ctx.chat?.type === 'private') await ctx.reply('Бот доступен только менеджерам.');
  });

  bot.command(['start', 'help'], (ctx) => ctx.reply(HELP_TEXT));

  async function showOrderList(ctx: Context): Promise<void> {
    const orders = service.listRecentOrders(RECENT_ORDERS_LIMIT);
    await ctx.reply(formatOrderList(orders), { reply_markup: buildOrderListKeyboard(orders) });
  }

  bot.command('orders', showOrderList);

  bot.on('callback_query:data', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.callbackQuery.data === ORDERS_LIST_CALLBACK) return showOrderList(ctx);
    const parsed = parseOrderCallback(ctx.callbackQuery.data);
    if (!parsed) return;
    await runOrderAction(ctx, async () => {
      const order = service.getOrderById(parsed.orderId);
      if (parsed.action === 'view') return editCard(ctx, order);
      if (parsed.action === 'qr') {
        pendingQrOrders.set(ctx.from.id, order.id);
        await ctx.reply(`Пришлите фото QR для заказа №${order.id}. Сумма к оплате ${formatMoney(order.total)}.`);
        return;
      }
      if (parsed.action === 'paid' || parsed.action === 'cancel') {
        const confirmAction = parsed.action === 'paid' ? 'paid_confirm' : 'cancel_confirm';
        await ctx.editMessageText(formatConfirmation(order, confirmAction), {
          reply_markup: buildConfirmationKeyboard(order, confirmAction),
        });
        return;
      }
      const updated = parsed.action === 'paid_confirm' ? service.markPaid(order.id) : service.cancelOrder(order.id);
      await editCard(ctx, updated);
    });
  });

  async function receiveQr(ctx: Context, fileId: string, mime: string, caption: string | undefined): Promise<void> {
    const orderId = pendingQrOrders.get(ctx.from?.id ?? 0) ?? Number(CAPTION_ORDER_PATTERN.exec(caption ?? '')?.[1]);
    if (!orderId) {
      await ctx.reply('Сначала откройте заказ и нажмите «Выставить оплату», либо подпишите фото номером заказа.');
      return;
    }
    await runOrderAction(ctx, async () => {
      const file = await ctx.api.getFile(fileId);
      if (!file.file_path) throw new OrderError('invalid_qr', 'Telegram returned a file without a path');
      const qr: StoredQr = { mime, bytes: await downloadFile(file.file_path) };
      const order = service.attachQr(orderId, qr);
      pendingQrOrders.delete(ctx.from?.id ?? 0);
      await replyCard(ctx, order, `QR сохранён, клиент видит его в корзине.`);
    });
  }

  bot.on('message:photo', (ctx) => {
    const largest = ctx.message.photo[ctx.message.photo.length - 1];
    return receiveQr(ctx, largest.file_id, PHOTO_MIME, ctx.message.caption);
  });

  bot.on('message:document', (ctx) => {
    const { file_id: fileId, mime_type: mime = '' } = ctx.message.document;
    return receiveQr(ctx, fileId, mime, ctx.message.caption);
  });

  bot.on('message:text', async (ctx) => {
    const match = KITCHEN_LINK_PATTERN.exec(ctx.message.text);
    if (!match) {
      await ctx.reply(HELP_TEXT);
      return;
    }
    await runOrderAction(ctx, async () => {
      await service.createOrder({ kitchenToken: match[1], source: 'bot', contact: null });
    });
  });

  const notifier: OrderNotifier = {
    async notifyOrderCreated(order) {
      const results = await Promise.allSettled(
        adminIds.map((adminId) =>
          bot.api.sendMessage(adminId, formatOrderCard(order, publicUrl), {
            reply_markup: buildOrderKeyboard(order, publicUrl),
          }),
        ),
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') console.error(`Order ${order.id} was not sent to admin ${adminIds[index]}`, result.reason);
      });
    },
  };

  return { bot, notifier };
}

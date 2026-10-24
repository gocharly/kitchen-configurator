export interface ServerConfig {
  port: number;
  publicUrl: string;
  databasePath: string;
  botToken: string | null;
  adminIds: number[];
}

const DEFAULT_PORT = 8787;
const DEFAULT_PUBLIC_URL = 'http://localhost:5180';
const DEFAULT_DATABASE_PATH = 'server/data/orders.sqlite';

function parseAdminIds(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = raw.split(',').map((part) => Number(part.trim()));
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error(`ADMIN_IDS must be a comma separated list of Telegram user ids, got "${raw}"`);
  }
  return ids;
}

export function loadServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const port = Number(env.PORT ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT must be a positive integer, got "${env.PORT}"`);
  return {
    port,
    publicUrl: (env.PUBLIC_URL ?? DEFAULT_PUBLIC_URL).replace(/\/+$/, ''),
    databasePath: env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
    botToken: env.TELEGRAM_BOT_TOKEN?.trim() || null,
    adminIds: parseAdminIds(env.ADMIN_IDS),
  };
}

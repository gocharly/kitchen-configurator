export type Route =
  | { name: 'shop' }
  | { name: 'product'; id: string }
  | { name: 'order'; token: string }
  | { name: 'constructor' };

const PRODUCT_PATH = /^\/kitchen\/([A-Za-z0-9_-]+)\/?$/;
const ORDER_PATH = /^\/order\/([A-Za-z0-9_-]+)\/?$/;
const LEGACY_CONSTRUCTOR_HASH = '#k=';

export function resolveRoute(pathname: string, hash: string): Route {
  const product = PRODUCT_PATH.exec(pathname);
  if (product) return { name: 'product', id: product[1] };
  const order = ORDER_PATH.exec(pathname);
  if (order) return { name: 'order', token: order[1] };
  if (pathname === '/constructor' || pathname === '/constructor/') return { name: 'constructor' };
  if (pathname === '/' && hash.startsWith(LEGACY_CONSTRUCTOR_HASH)) return { name: 'constructor' };
  return { name: 'shop' };
}

export const ROUTE_CHANGE_EVENT = 'app:routechange';

export function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
  window.scrollTo(0, 0);
}

export function replaceTo(path: string): void {
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

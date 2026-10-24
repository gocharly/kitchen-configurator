import { useEffect, useState } from 'react';
import { ROUTE_CHANGE_EVENT } from '../site/routes';
import { parseShopQuery, type ShopQuery } from './shopQuery';

export function useShopQuery(): ShopQuery {
  const [query, setQuery] = useState<ShopQuery>(() => parseShopQuery(window.location.search));
  useEffect(() => {
    const update = () => setQuery(parseShopQuery(window.location.search));
    window.addEventListener(ROUTE_CHANGE_EVENT, update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener(ROUTE_CHANGE_EVENT, update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return query;
}

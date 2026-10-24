import { useEffect, useState } from 'react';
import { ROUTE_CHANGE_EVENT, resolveRoute, type Route } from './routes';

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.pathname, window.location.hash));
  useEffect(() => {
    const update = () => setRoute(resolveRoute(window.location.pathname, window.location.hash));
    window.addEventListener(ROUTE_CHANGE_EVENT, update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener(ROUTE_CHANGE_EVENT, update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

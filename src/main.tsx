import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { OrderPage } from './order/OrderPage';
import { ProductPage } from './shop/ProductPage';
import { findProduct } from './shop/productCatalog';
import { BRAND_NAME } from './shop/siteConfig';
import { ShopLayout } from './shop/ShopLayout';
import { ShopPage } from './shop/ShopPage';
import type { Route } from './site/routes';
import { useRoute } from './site/useRoute';
import './styles.css';
import './shop/shop.css';

const CONSTRUCTOR_TITLE = 'Конструктор кухни';

function describeRoute(route: Route): string {
  if (route.name === 'constructor') return CONSTRUCTOR_TITLE;
  if (route.name === 'order') return `Заказ — ${BRAND_NAME}`;
  if (route.name === 'product') return `${findProduct(route.id)?.title ?? 'Кухня'} — ${BRAND_NAME}`;
  return BRAND_NAME;
}

function Site() {
  const route = useRoute();
  const isShopRoute = route.name === 'shop' || route.name === 'product';
  useEffect(() => {
    document.title = describeRoute(route);
  }, [route]);
  useEffect(() => {
    document.body.classList.toggle('shop-theme', isShopRoute);
  }, [isShopRoute]);
  if (route.name === 'order') return <OrderPage token={route.token} />;
  if (route.name === 'constructor') return <App />;
  return (
    <ShopLayout isCompact={route.name === 'product'}>
      {route.name === 'product' ? <ProductPage productId={route.id} /> : <ShopPage />}
    </ShopLayout>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing in index.html');
createRoot(rootElement).render(<Site />);

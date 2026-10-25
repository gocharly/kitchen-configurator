import { Link } from '../site/Link';
import { formatPrice } from '../ui/formatPrice';
import { Gallery } from './Gallery';
import { ProductTile } from './ProductTile';
import { PRODUCTS, SHAPE_TITLES, findProduct, type Product } from './productCatalog';
import { buildShopHref } from './shopQuery';
import { Tabs } from './Tabs';
import { WhatsAppLink } from './WhatsAppLink';
import { buildProductMessage } from './whatsapp';

const SIMILAR_LIMIT = 4;

function pickSimilar(current: Product): Product[] {
  const others = PRODUCTS.filter((product) => product.id !== current.id);
  const sameShape = others.filter((product) => product.shape === current.shape);
  const rest = others.filter((product) => product.shape !== current.shape);
  return [...sameShape, ...rest].slice(0, SIMILAR_LIMIT);
}

function SuggestCard({ product }: { product: Product }) {
  return (
    <Link to={`/kitchen/${product.id}`} className="suggest-card">
      <ProductTile product={product} />
      <span className="suggest-info">
        <span className="suggest-title">{product.title}</span>
        <span className="suggest-price">{formatPrice(product.price)}</span>
      </span>
    </Link>
  );
}

export function ProductPage({ productId }: { productId: string }) {
  const product = findProduct(productId);

  if (!product) {
    return (
      <main className="shop-main product-page">
        <p className="shop-empty">Кухня не найдена</p>
        <Link to="/" className="wa-button wa-button-neutral">
          К кухням
        </Link>
      </main>
    );
  }

  const message = buildProductMessage(product, window.location.href);

  return (
    <main className="shop-main product-page">
      <nav className="breadcrumbs" aria-label="Вы здесь">
        <Link to="/">Главная</Link>
        <Link to={buildShopHref({ shape: product.shape })}>{SHAPE_TITLES[product.shape]}</Link>
        <span aria-current="page">{product.title}</span>
      </nav>
      <div className="product-layout">
        <Gallery product={product} />
        <div className="product-info">
          <h1 className="product-title">{product.title}</h1>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="product-lead">
            {SHAPE_TITLES[product.shape]}, размер {product.size}
          </p>
          {product.description && <p className="product-description">{product.description}</p>}
          <WhatsAppLink message={message} className="wa-button product-order">
            Заказать в WhatsApp
          </WhatsAppLink>
        </div>
      </div>
      <Tabs
        label="О кухне"
        tabs={[
          {
            id: 'facts',
            title: 'Характеристики',
            content: (
              <dl className="product-facts">
                <dt>Форма</dt>
                <dd>{SHAPE_TITLES[product.shape]}</dd>
                <dt>Размер</dt>
                <dd>{product.size}</dd>
                <dt>Артикул</dt>
                <dd>{product.sku}</dd>
              </dl>
            ),
          },
          {
            id: 'order',
            title: 'Как заказать',
            content: (
              <p className="tab-text">
                Нажмите «Заказать»: откроется WhatsApp с готовым сообщением о выбранной кухне. Менеджер ответит вам там
                же.
              </p>
            ),
          },
        ]}
      />
      <section className="suggest" aria-labelledby="suggest-title">
        <h2 id="suggest-title" className="section-title">
          Вам может понравиться
        </h2>
        <div className="suggest-grid">
          {pickSimilar(product).map((similar) => (
            <SuggestCard key={similar.id} product={similar} />
          ))}
        </div>
      </section>
      <div className="order-bar">
        <span className="order-bar-price">{formatPrice(product.price)}</span>
        <WhatsAppLink message={message} className="wa-button order-bar-button">
          Заказать
        </WhatsAppLink>
      </div>
    </main>
  );
}

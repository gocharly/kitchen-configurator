import { useMemo } from 'react';
import { Link } from '../site/Link';
import { navigateTo } from '../site/routes';
import { Dropdown } from './Dropdown';
import { formatKitchenCount } from './formatKitchenCount';
import { ProductCard } from './ProductCard';
import { PRODUCTS, SHAPES, SHAPE_TITLES, type KitchenShape } from './productCatalog';
import {
  CATALOG_TITLE,
  HERO_IMAGE,
  HERO_IMAGE_POSITION,
  HERO_LABEL,
  HERO_LINES,
  HERO_LINK_TEXT,
  HERO_TITLE,
} from './siteConfig';
import { SORT_OPTIONS, filterProducts, sortProducts, type SortOrder } from './shopFilters';
import { buildShopHref } from './shopQuery';
import { useShopQuery } from './useShopQuery';

const CATEGORY_TABS: { id: KitchenShape | null; title: string }[] = [
  { id: null, title: 'Все' },
  ...SHAPES.map((id) => ({ id, title: SHAPE_TITLES[id] })),
];

const CATALOG_ANCHOR = 'catalog';

export function ShopPage() {
  const query = useShopQuery();
  const visible = useMemo(
    () => sortProducts(filterProducts(PRODUCTS, { shape: query.shape, query: query.query }), query.sort),
    [query.shape, query.query, query.sort],
  );

  const scrollToCatalog = () => document.getElementById(CATALOG_ANCHOR)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="shop-main">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-label">{HERO_LABEL}</p>
          <h1 className="hero-title">{HERO_TITLE}</h1>
          <ul className="hero-lines">
            {HERO_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button type="button" className="hero-link" onClick={scrollToCatalog}>
            {HERO_LINK_TEXT}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        {HERO_IMAGE && (
          <div className="hero-photo">
            <img src={HERO_IMAGE} alt="" style={{ objectPosition: HERO_IMAGE_POSITION }} />
          </div>
        )}
      </section>
      <section id={CATALOG_ANCHOR} className="catalog">
        <h2 className="catalog-title">{CATALOG_TITLE}</h2>
        <nav className="category-tabs" aria-label="Категории">
          {CATEGORY_TABS.map((tab) => (
            <Link
              key={tab.id ?? 'all'}
              to={buildShopHref({ ...query, shape: tab.id })}
              className="category-tab"
              aria-current={query.shape === tab.id}
            >
              {tab.title}
            </Link>
          ))}
        </nav>
        <div className="catalog-bar">
          <span className="catalog-count">{formatKitchenCount(visible.length)}</span>
          <Dropdown<SortOrder>
            label="Сортировка"
            value={query.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => navigateTo(buildShopHref({ ...query, sort }))}
          />
        </div>
        <div aria-live="polite">
          {visible.length === 0 ? (
            <p className="shop-empty">Ничего не найдено</p>
          ) : (
            <div className="product-grid">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

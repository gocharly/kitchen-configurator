import { Link } from '../site/Link';
import { formatRubles } from '../ui/formatRubles';
import { ProductTile } from './ProductTile';
import type { Product } from './productCatalog';
import { WhatsAppLink } from './WhatsAppLink';
import { buildProductMessage } from './whatsapp';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const productUrl = `${window.location.origin}/kitchen/${product.id}`;
  return (
    <article className="product-card">
      <Link to={`/kitchen/${product.id}`} className="product-card-link" aria-label={product.title}>
        <ProductTile product={product} />
      </Link>
      <h3 className="product-card-title">
        <Link to={`/kitchen/${product.id}`}>{product.title}</Link>
      </h3>
      <p className="product-card-size">{product.size}</p>
      <p className="product-card-price">{formatRubles(product.price)}</p>
      <WhatsAppLink message={buildProductMessage(product, productUrl)} className="wa-button product-card-order">
        Заказать
      </WhatsAppLink>
    </article>
  );
}

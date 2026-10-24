import type { Product } from './productCatalog';

interface ProductTileProps {
  product: Product;
}

export function ProductTile({ product }: ProductTileProps) {
  const image = product.images[0];
  return (
    <div className="product-tile">
      {image && <img src={image.src} alt={product.title} loading="lazy" style={{ objectPosition: image.position }} />}
    </div>
  );
}

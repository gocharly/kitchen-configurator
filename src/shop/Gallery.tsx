import { useState } from 'react';
import type { Product } from './productCatalog';

interface GalleryProps {
  product: Product;
}

export function Gallery({ product }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const current = product.images[Math.min(index, product.images.length - 1)];
  return (
    <div className="gallery">
      <div className="gallery-main">
        {current && <img src={current.src} alt={product.title} style={{ objectPosition: current.position }} />}
      </div>
      {product.images.length > 1 && (
        <ul className="gallery-thumbs">
          {product.images.map((image, imageIndex) => (
            <li key={`${image.src}-${imageIndex}`}>
              <button
                type="button"
                className="gallery-thumb"
                aria-label={`Фото ${imageIndex + 1}`}
                aria-current={imageIndex === index}
                onClick={() => setIndex(imageIndex)}
              >
                <img src={image.src} alt="" style={{ objectPosition: image.position }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

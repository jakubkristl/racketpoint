import type { ImgHTMLAttributes } from 'react';
import type { Product } from '../data/catalog';
import { getFallbackImageForProduct } from '../data/store';

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  product: Pick<Product, 'imageUrl' | 'name' | 'categorySlug' | 'type'>;
  alt?: string;
};

const LOGO_FALLBACK = '/branding/logo-icon.png';

function ProductImage({ product, alt, onError, ...props }: ProductImageProps) {
  const fallbackSrc = getFallbackImageForProduct(product);
  const source = product.imageUrl?.trim() || fallbackSrc;

  return (
    <img
      {...props}
      src={source}
      alt={alt ?? product.name}
      onError={(event) => {
        const target = event.currentTarget;
        const stage = target.dataset.imageFallback ?? 'none';

        if (stage === 'logo') {
          return;
        }

        if (stage === 'sport' || target.src === fallbackSrc) {
          target.dataset.imageFallback = 'logo';
          target.src = LOGO_FALLBACK;
          return;
        }

        target.dataset.imageFallback = 'sport';
        target.src = fallbackSrc;
        onError?.(event);
      }}
    />
  );
}

export default ProductImage;

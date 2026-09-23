import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import type { Product } from '../data/catalog';
import { getFallbackImageForProduct, hasUsableProductImage } from '../data/store';

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  product: Pick<Product, 'imageUrl' | 'name' | 'categorySlug' | 'type'> & Partial<Pick<Product, 'sku'>>;
  alt?: string;
};

const LOGO_FALLBACK = '/branding/logo-icon.png';

function resolveInitialSrc(product: ProductImageProps['product'], fallbackSrc: string) {
  const imageUrl = product.imageUrl?.trim() ?? '';
  // Never attempt kiosk / Access / placeholder hosts — they often "load" as 0×0 without onError.
  return hasUsableProductImage(imageUrl) ? imageUrl : fallbackSrc;
}

function ProductImage({ product, alt, onError, onLoad, ...props }: ProductImageProps) {
  const fallbackSrc = getFallbackImageForProduct(product);
  const [src, setSrc] = useState(() => resolveInitialSrc(product, fallbackSrc));
  const stageRef = useRef<'source' | 'sport' | 'logo'>('source');

  useEffect(() => {
    stageRef.current = 'source';
    setSrc(resolveInitialSrc(product, fallbackSrc));
  }, [product.imageUrl, product.sku, product.categorySlug, product.type, fallbackSrc]);

  function advanceFallback(currentSrc: string) {
    if (stageRef.current === 'logo') {
      return;
    }

    if (stageRef.current === 'source' && fallbackSrc && currentSrc !== fallbackSrc) {
      stageRef.current = 'sport';
      setSrc(fallbackSrc);
      return;
    }

    stageRef.current = 'logo';
    setSrc(LOGO_FALLBACK);
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt ?? product.name}
      referrerPolicy="no-referrer"
      onLoad={(event) => {
        // Cloudflare Access / empty responses can "succeed" with a 0×0 image.
        if (event.currentTarget.naturalWidth === 0) {
          advanceFallback(event.currentTarget.currentSrc || event.currentTarget.src);
          return;
        }
        onLoad?.(event);
      }}
      onError={(event) => {
        advanceFallback(event.currentTarget.currentSrc || event.currentTarget.src);
        onError?.(event);
      }}
    />
  );
}

export default ProductImage;

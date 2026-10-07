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

function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function ProductImage({ product, alt, className, onError, onLoad, decoding, ...props }: ProductImageProps) {
  const fallbackSrc = getFallbackImageForProduct(product);
  const [src, setSrc] = useState(() => resolveInitialSrc(product, fallbackSrc));
  const [isLoaded, setIsLoaded] = useState(false);
  const stageRef = useRef<'source' | 'sport' | 'logo'>('source');
  const resolvedAlt = (alt ?? product.name ?? '').trim() || 'Продукт RacketPoint';

  useEffect(() => {
    stageRef.current = 'source';
    setIsLoaded(false);
    setSrc(resolveInitialSrc(product, fallbackSrc));
  }, [product.imageUrl, product.sku, product.categorySlug, product.type, fallbackSrc]);

  function advanceFallback(currentSrc: string) {
    if (stageRef.current === 'logo') {
      return;
    }

    setIsLoaded(false);

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
      className={joinClassNames(className, isLoaded && 'is-loaded')}
      src={src}
      alt={resolvedAlt}
      decoding={decoding ?? 'async'}
      referrerPolicy="no-referrer"
      onLoad={(event) => {
        // Cloudflare Access / empty responses can "succeed" with a 0×0 image.
        if (event.currentTarget.naturalWidth === 0) {
          advanceFallback(event.currentTarget.currentSrc || event.currentTarget.src);
          return;
        }
        setIsLoaded(true);
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

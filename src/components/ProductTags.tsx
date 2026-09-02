import type { Product } from '../data/catalog';

const supportedTags = ['HOT', 'SALE', 'BUNDLE', 'NEW'] as const;

function ProductTags({ product }: { product: Product }) {
  const tags = supportedTags.filter((tag) => product.badges.some((badge) => badge.trim().toUpperCase() === tag));

  if (typeof product.salePriceEur === 'number' && product.salePriceEur < (product.priceEur ?? 0) && !tags.includes('SALE')) {
    tags.push('SALE');
  }

  return tags.length > 0 ? <>{tags.map((tag) => <span className={`product-tag product-tag-${tag.toLowerCase()}`} key={tag}>{tag}</span>)}</> : null;
}

export default ProductTags;
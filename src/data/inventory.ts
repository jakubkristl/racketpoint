import type { Product } from './catalog';

export const MADE_TO_ORDER_LABEL = 'Поръчва се при заявка';
export const MADE_TO_ORDER_DETAIL_LABEL = 'Наличност: изчерпано, поръчва се при заявка';
export const MADE_TO_ORDER_DELIVERY_NOTE = 'Доставка 7-14 дни';
export const IN_STOCK_LABEL = 'Налично';

export function isMadeToOrder(product: Pick<Product, 'stock'>) {
  return typeof product.stock !== 'number' || product.stock <= 0;
}

export function getStockLabel(product: Pick<Product, 'stock'>) {
  return isMadeToOrder(product) ? MADE_TO_ORDER_LABEL : IN_STOCK_LABEL;
}

export function getStockDetailLabel(product: Pick<Product, 'stock'>) {
  if (isMadeToOrder(product)) {
    return MADE_TO_ORDER_DETAIL_LABEL;
  }

  return `Наличност: налично (${product.stock})`;
}

export function getAvailabilityClassName(product: Pick<Product, 'stock'>, baseClass: string) {
  return isMadeToOrder(product) ? `${baseClass} made-to-order` : baseClass;
}

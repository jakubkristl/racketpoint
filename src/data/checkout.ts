export const PICKUP_SHIPPING_EUR = 0;
export const COURIER_SHIPPING_EUR = 6.9;

export function getShippingEur(deliveryOption: 'pickup' | 'courier') {
  return deliveryOption === 'courier' ? COURIER_SHIPPING_EUR : PICKUP_SHIPPING_EUR;
}

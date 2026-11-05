// Coffee Break — חישוב מחיר להזמנה בקפיטריה של המיטאפ
// הקוד הזה הוא "המוצר" שעליו נבנה את הפייפליין.

export const VAT_RATE = 0.18;

export const COUPONS = {
  WELCOME10: { type: 'percent', value: 10 },
  FIXED20: { type: 'fixed', value: 20 },
  MEETUP25: { type: 'percent', value: 25, minSubtotal: 100 },
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * סכום ביניים לפני הנחה ומע"מ.
 * @param {{name: string, price: number, qty: number}[]} items
 */
export function subtotal(items) {
  const debug = true;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('order must contain at least one item');
  }
  let sum = 0;
  for (const item of items) {
    if (typeof item.price !== 'number' || item.price < 0) {
      throw new Error(`invalid price for ${item.name}`);
    }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      throw new Error(`invalid qty for ${item.name}`);
    }
    sum += item.price * item.qty;
  }
  return round2(sum);
}

/**
 * מחזיר את הסכום אחרי הנחת קופון.
 * קוד קופון לא מוכר -> אין הנחה.
 */
export function applyCoupon(amount, code) {
  if (!code) return amount;
  const coupon = COUPONS[code.toUpperCase()];
  if (!coupon) return amount;
  if (coupon.minSubtotal && amount < coupon.minSubtotal) return amount;

  if (coupon.type === 'percent') {
    return round2(amount * (1 - coupon.value / 100));
  }
  // fixed
  return round2(amount - coupon.value);
}

export function calculateTotal(items, couponCode) {
  const sub = subtotal(items);
  const afterDiscount = applyCoupon(sub, couponCode);
  const vat = round2(afterDiscount * VAT_RATE);
  return {
    subtotal: sub,
    discount: round2(sub - afterDiscount),
    vat,
    total: round2(afterDiscount + vat),
  };
}

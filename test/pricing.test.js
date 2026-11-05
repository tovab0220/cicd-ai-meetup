import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtotal, applyCoupon, calculateTotal } from '../src/pricing.js';

const latte = { name: 'latte', price: 16, qty: 2 };
const croissant = { name: 'croissant', price: 14.5, qty: 1 };

test('subtotal sums price * qty', () => {
  assert.equal(subtotal([latte, croissant]), 46.5);
});

test('subtotal rejects an empty order', () => {
  assert.throws(() => subtotal([]), /at least one item/);
});

test('subtotal rejects a negative price', () => {
  assert.throws(() => subtotal([{ name: 'x', price: -1, qty: 1 }]), /invalid price/);
});

test('calculateTotal adds 18% VAT when there is no coupon', () => {
  assert.deepEqual(calculateTotal([latte]), {
    subtotal: 32,
    discount: 0,
    vat: 5.76,
    total: 37.76,
  });
});

// ---------- applyCoupon ----------

test('applyCoupon: WELCOME10 takes 10% off', () => {
  assert.equal(applyCoupon(100, 'WELCOME10'), 90);
});

test('applyCoupon: FIXED20 takes 20 off', () => {
  assert.equal(applyCoupon(100, 'FIXED20'), 80);
});

test('applyCoupon: MEETUP25 takes 25% off above the minimum', () => {
  assert.equal(applyCoupon(200, 'MEETUP25'), 150);
});

test('applyCoupon: MEETUP25 applies at exactly the minimum (100)', () => {
  assert.equal(applyCoupon(100, 'MEETUP25'), 75);
});

test('applyCoupon: MEETUP25 is ignored just below the minimum', () => {
  assert.equal(applyCoupon(99.99, 'MEETUP25'), 99.99);
});

test('applyCoupon: codes are case-insensitive', () => {
  assert.equal(applyCoupon(100, 'welcome10'), 90);
  assert.equal(applyCoupon(100, 'Fixed20'), 80);
  assert.equal(applyCoupon(100, 'meetup25'), 75);
});

test('applyCoupon: unknown code gives no discount', () => {
  assert.equal(applyCoupon(100, 'NOPE'), 100);
});

test('applyCoupon: missing / empty code gives no discount', () => {
  assert.equal(applyCoupon(100), 100);
  assert.equal(applyCoupon(100, ''), 100);
  assert.equal(applyCoupon(100, null), 100);
});

test('applyCoupon: Object prototype keys are not treated as coupons', () => {
  assert.equal(applyCoupon(100, 'constructor'), 100);
  assert.equal(applyCoupon(100, '__proto__'), 100);
});

test('applyCoupon: percent result is rounded to 2 decimals', () => {
  assert.equal(applyCoupon(14.5, 'WELCOME10'), 13.05);
  assert.equal(applyCoupon(33.33, 'WELCOME10'), 30);
});

test('applyCoupon: FIXED20 on exactly 20 gives 0', () => {
  assert.equal(applyCoupon(20, 'FIXED20'), 0);
});

// --- edge cases that expose real bugs (marked todo so CI stays green; remove `todo` to make them fail) ---

test('applyCoupon: FIXED20 never makes the amount negative', { todo: 'BUG: 15 - 20 = -5' }, () => {
  assert.equal(applyCoupon(15, 'FIXED20'), 0);
});

test('applyCoupon: non-string code does not crash', { todo: 'BUG: code.toUpperCase is not a function' }, () => {
  assert.equal(applyCoupon(100, 123), 100);
});

test('applyCoupon: surrounding whitespace in code is tolerated', { todo: 'BUG?: " welcome10 " is not trimmed' }, () => {
  assert.equal(applyCoupon(100, ' welcome10 '), 90);
});

// ---------- calculateTotal ----------

test('calculateTotal with WELCOME10', () => {
  assert.deepEqual(calculateTotal([latte], 'WELCOME10'), {
    subtotal: 32,
    discount: 3.2,
    vat: 5.18,
    total: 33.98,
  });
});

test('calculateTotal with FIXED20', () => {
  assert.deepEqual(calculateTotal([latte], 'FIXED20'), {
    subtotal: 32,
    discount: 20,
    vat: 2.16,
    total: 14.16,
  });
});

test('calculateTotal: MEETUP25 below minimum behaves like no coupon', () => {
  assert.deepEqual(calculateTotal([latte], 'MEETUP25'), calculateTotal([latte]));
});

test('calculateTotal: MEETUP25 threshold is checked on subtotal (before VAT)', () => {
  // subtotal 100 exactly -> eligible
  assert.deepEqual(calculateTotal([{ name: 'cake', price: 50, qty: 2 }], 'MEETUP25'), {
    subtotal: 100,
    discount: 25,
    vat: 13.5,
    total: 88.5,
  });
});

test('calculateTotal: MEETUP25 above minimum', () => {
  assert.deepEqual(calculateTotal([{ ...latte, qty: 7 }], 'meetup25'), {
    subtotal: 112,
    discount: 28,
    vat: 15.12,
    total: 99.12,
  });
});

test('calculateTotal: unknown coupon gives zero discount', () => {
  assert.deepEqual(calculateTotal([latte], 'NOPE'), calculateTotal([latte]));
});

test('calculateTotal: total === subtotal - discount + vat for every coupon', () => {
  const items = [latte, croissant];
  for (const code of [undefined, 'WELCOME10', 'FIXED20', 'MEETUP25', 'NOPE']) {
    const r = calculateTotal(items, code);
    assert.equal(r.total, Math.round((r.subtotal - r.discount + r.vat) * 100) / 100, `code=${code}`);
  }
});

test('calculateTotal propagates subtotal validation errors', () => {
  assert.throws(() => calculateTotal([], 'WELCOME10'), /at least one item/);
  assert.throws(() => calculateTotal([{ name: 'x', price: 5, qty: 0 }]), /invalid qty/);
});

test('calculateTotal: FIXED20 on a small order never yields negative total/VAT', { todo: 'BUG: croissant (14.5) -> total -6.49, vat -0.99' }, () => {
  assert.deepEqual(calculateTotal([croissant], 'FIXED20'), {
    subtotal: 14.5,
    discount: 14.5,
    vat: 0,
    total: 0,
  });
});

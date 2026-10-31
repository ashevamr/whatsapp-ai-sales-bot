'use strict';

const assert = require('assert');
const { sanitizeCustomerFacingText } = require('./customer_brand_safety');

const cases = [
  ['Здравствуйте! Вы обратились в компанию VODEL.', 'Здравствуйте! Вы обратились в компанию.'],
  ['Компания Водель поможет подобрать фильтр.', 'Компания поможет подобрать фильтр.'],
  ['Подробнее: https://catalog-vodel-kz.pages.dev/', 'Подробнее:'],
  ['Vodel / ВОДЕЛЬ', '/'],
  ['FOURA — фильтр без накопительного бака.', 'FOURA — фильтр без накопительного бака.']
];

for (const [input, expected] of cases) {
  const actual = sanitizeCustomerFacingText(input);
  assert.strictEqual(actual, expected);
  assert.ok(!/(?:vodel|водель)/iu.test(actual), `Former brand leaked: ${actual}`);
}

assert.strictEqual(sanitizeCustomerFacingText(null), null);
console.log(`Customer brand safety passed: ${cases.length} cases.`);

const assert = require('assert');
const {
  COMMERCIAL_FACTS,
  formatInstallmentOptions,
  formatKaspiInstallmentOptions,
  isKaspiZero24Active,
  getCommercialConversationPolicy,
  getCommercialFactsForPrompt,
  getLogisticsForPrompt,
  getCatalogPreviewContext,
  resolveLatestCatalogProduct
} = require('./commercial_facts');

assert.strictEqual(COMMERCIAL_FACTS.products.foura.cashPrice, 185000);
assert.strictEqual(COMMERCIAL_FACTS.products.foura.installment.kaspi.termMonths, 12);
assert.strictEqual(COMMERCIAL_FACTS.products.foura.installment.kaspi.monthlyPayment, 15400);
assert.strictEqual(COMMERCIAL_FACTS.products.foura.installment.halykFreedom.termMonths, 24);
assert.strictEqual(COMMERCIAL_FACTS.products.foura.installment.halykFreedom.monthlyPayment, 7700);
assert.strictEqual(COMMERCIAL_FACTS.products.foura.service.firstReplacementIntervalMonths, '6–9');
assert.strictEqual(COMMERCIAL_FACTS.products.foura.service.replacementSchedule[2].price, 35000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.cashPrice, 109000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.installmentPrice, 120000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.installment.kaspi.termMonths, 12);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.installment.kaspi.monthlyPayment, 10000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.installment.halykFreedom.termMonths, 24);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.installment.halykFreedom.monthlyPayment, 5000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.service.replacementSchedule[0].price, 12500);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.service.replacementSchedule[1].price, 15000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkaline.service.replacementSchedule[2].price, 30000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.cashPrice, 150000);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.installment.kaspi.termMonths, 12);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.installment.kaspi.monthlyPayment, 12500);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.installment.halykFreedom.termMonths, 24);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.installment.halykFreedom.monthlyPayment, 6250);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.warrantyMonths, 36);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.freeServiceYears, 15);
assert.strictEqual(COMMERCIAL_FACTS.products.alkalineSmart.origin, 'Южная Корея');
assert.ok(getCommercialFactsForPrompt({}).includes('Alkaline Smart'));
assert.strictEqual(COMMERCIAL_FACTS.catalog.fileName, 'VODEL 19.08 50 процентов скидка.pdf');
assert.ok(COMMERCIAL_FACTS.catalog.promoCaption.includes('до конца месяца'));
assert.strictEqual(COMMERCIAL_FACTS.campaigns.kaspiZero24.endsOn, '2026-09-06');
assert.deepStrictEqual(COMMERCIAL_FACTS.campaigns.ar01GiftChoice.gifts, ['пылесос', 'аэрогриль']);
assert.strictEqual(COMMERCIAL_FACTS.campaigns.kettleDailyGift.gift, 'электрический чайник');
assert.strictEqual(isKaspiZero24Active(new Date('2026-08-27T12:00:00+05:00')), true);
assert.strictEqual(isKaspiZero24Active(new Date('2026-09-06T12:00:00+05:00')), true);
assert.strictEqual(isKaspiZero24Active(new Date('2026-09-07T12:00:00+05:00')), false);
assert.ok(formatKaspiInstallmentOptions(COMMERCIAL_FACTS.products.foura, new Date('2026-08-27T12:00:00+05:00')).includes('Kaspi 0-0-24'));
assert.ok(!formatKaspiInstallmentOptions(COMMERCIAL_FACTS.products.foura, new Date('2026-09-07T12:00:00+05:00')).includes('0-0-24'));
assert.ok(formatInstallmentOptions(COMMERCIAL_FACTS.products.foura, new Date('2026-08-27T12:00:00+05:00')).includes('7 700'));
assert.ok(formatInstallmentOptions(COMMERCIAL_FACTS.products.alkaline, new Date('2026-08-27T12:00:00+05:00')).includes('10 000'));
assert.ok(getCommercialFactsForPrompt({}, 'Хочу Alkaline G75').includes('120 000'));
const activePromos = getCommercialFactsForPrompt({}, 'AR-01A: есть подарок и Kaspi 0-0-24?');
assert.ok(activePromos.includes('пылесос или аэрогриль'));
assert.ok(activePromos.includes('Электрический чайник'));
assert.strictEqual(activePromos.includes('Kaspi 0-0-24'), isKaspiZero24Active());
assert.strictEqual(
  getCatalogPreviewContext({ title: 'Фильтр Alkaline G75 (White)', description: 'Щелочная вода, бак 8 л', canonicalUrl: 'https://catalog-vodel-kz.pages.dev/' }),
  '[Выбранная карточка сайта VODEL: Фильтр Alkaline G75 (White)]'
);
assert.strictEqual(getCatalogPreviewContext({ title: 'Случайная карточка товара' }), '');
assert.strictEqual(
  resolveLatestCatalogProduct([
    { sender: 'user', text: 'Этот хочу', context: '[Выбранная карточка сайта VODEL: Фильтр Alkaline G75 (White)]' },
    { sender: 'ai', text: 'Расскажу про выбранную модель.' }
  ], 'Каспи рассрочка есть?').id,
  'alkaline_g75'
);

const eligible = getCommercialConversationPolicy([
  { sender: 'user', text: 'I am in Astana and interested in Alkaline G75.' }
], 'This is too expensive.');
assert.strictEqual(eligible.eligibleForAlkalineCashOffer, true);
assert.ok(getCommercialFactsForPrompt(eligible).includes('100 000'));

const notEligible = getCommercialConversationPolicy([
  { sender: 'user', text: 'I am in Astana and interested in FOURA without a tank.' },
  { sender: 'model', text: 'There are models with and without a tank.' }
], 'This is too expensive.');
assert.strictEqual(notEligible.eligibleForAlkalineCashOffer, false);

const alreadyOffered = getCommercialConversationPolicy([
  { sender: 'user', text: 'I am in Astana and want Alkaline G75.' },
  { sender: 'ai', text: 'I can offer Alkaline G75 for 100 000 today.' }
], 'Still too expensive.');
assert.strictEqual(alreadyOffered.eligibleForAlkalineCashOffer, false);

const warehouseCityPolicy = getCommercialConversationPolicy([
  { sender: 'user', text: 'I am in Astana.' }
], 'Any time is fine.');
assert.ok(getLogisticsForPrompt(warehouseCityPolicy, 10).includes('сегодня'));
assert.ok(getLogisticsForPrompt(warehouseCityPolicy, 18).includes('завтра'));

console.log('Commercial facts checks passed.');

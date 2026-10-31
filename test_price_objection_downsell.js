const assert = require('assert');
const aiWorkflow = require('./ai_workflow');
const {
  isAffirmative,
  shouldOfferG75BudgetAlternative,
  detectCustomerLanguage
} = require('./conversation_safety');

const smartHistory = [
  { sender: 'user', text: '3' },
  { sender: 'ai', text: 'Alkaline SMART стоит 150 000 ₸. Вам удобнее полная оплата или рассрочка?' }
];

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Бағасына келісейікта',
  history: smartHistory,
  activeProductId: 'alkaline_smart'
}), true, 'Kazakh price negotiation must trigger the cheaper G75 offer');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Для меня это дорого',
  history: smartHistory,
  activeProductId: 'alkaline_smart'
}), true, 'Russian price objection must trigger the cheaper G75 offer');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'А скидка есть?',
  history: smartHistory,
  activeProductId: 'alkaline_smart'
}), true, 'A discount objection for SMART must trigger the cheaper G75 offer');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Цена?',
  history: smartHistory,
  activeProductId: 'alkaline_smart'
}), false, 'A first plain price question must receive a direct price answer, not a downsell');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Цена?',
  history: [
    ...smartHistory,
    { sender: 'user', text: 'Бағасына келісейікта' },
    { sender: 'ai', text: 'Alkaline SMART моделінің бағасы — 150 000 ₸.' }
  ],
  activeProductId: 'alkaline_smart'
}), true, 'A repeated price question after a clear objection must trigger the G75 alternative');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Каспи рассрочка бар ма?',
  history: smartHistory,
  activeProductId: 'alkaline_smart'
}), false, 'An installment question alone must not trigger a cheaper model');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Дорого',
  history: [{ sender: 'ai', text: 'FOURA стоит 185 000 ₸.' }],
  activeProductId: 'foura_600gpd'
}), false, 'FOURA objections use the FOURA closing flow, not the SMART-to-G75 downsell');

assert.strictEqual(shouldOfferG75BudgetAlternative({
  text: 'Дорого',
  history: smartHistory,
  activeProductId: 'alkaline_smart',
  alreadyOffered: true
}), false, 'The G75 alternative must be offered only once');

assert.strictEqual(isAffirmative('Иа'), true, 'Common Kazakh spelling "Иа" must confirm the offer');
assert.strictEqual(isAffirmative('Иә'), true, 'Kazakh "Иә" must confirm the offer');
assert.strictEqual(detectCustomerLanguage('Цена?', [
  { sender: 'user', text: 'Бағасына келісейікта' }
]), 'kk', 'Language must remain Kazakh after a short Russian price word');
assert.strictEqual(detectCustomerLanguage('Для меня дорого', smartHistory), 'ru');

const kkOffer = aiWorkflow.buildG75BudgetAlternativeReply('kk');
assert.match(kkOffer, /Alkaline G75/);
assert.match(kkOffer, /109 000 ₸/);
assert.match(kkOffer, /120 000 ₸/);
assert.match(kkOffer, /көрсетейін бе\?/);
assert.doesNotMatch(kkOffer, /FOURA|100 000 ₸/);

const ruOffer = aiWorkflow.buildG75BudgetAlternativeReply('ru');
assert.match(ruOffer, /более доступный Alkaline G75/);
assert.match(ruOffer, /109 000 ₸/);
assert.match(ruOffer, /120 000 ₸/);
assert.match(ruOffer, /Показать эту модель\?/);
assert.doesNotMatch(ruOffer, /FOURA|100 000 ₸/);

const kkPresentation = aiWorkflow.buildG75PresentationReply('kk');
assert.match(kkPresentation, /8 л багы бар/);
assert.match(kkPresentation, /толық төлемде 109 000 ₸/);
assert.match(kkPresentation, /бөліп төлеуде 120 000 ₸/);

console.log('Price-objection downsell tests passed.');

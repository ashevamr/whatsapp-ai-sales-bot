const assert = require('assert');
const {
  getQuestionIntents,
  analyzeConversationTurn,
  isExplicitPurchaseIntent,
  isAddressRequest,
  hasAssistantAddressRequest,
  guardAddressRequest
} = require('./conversation_safety');

assert.strictEqual(
  isExplicitPurchaseIntent('Иа', 'Alkaline SMART фильтрін орнату үшін раковина астындағы орын жеткілікті ме?'),
  false,
  'Yes to a space question must not start checkout'
);
assert.strictEqual(
  isExplicitPurchaseIntent('Иа', 'Дизайнерлік шүмекті +15 000 ₸-ге қосқыңыз келе ме?'),
  false,
  'Yes to an add-on question must not start checkout'
);
assert.strictEqual(
  isExplicitPurchaseIntent('Наличка алсам қаншаға бересіз?', ''),
  false,
  'A conditional cash-price question is not a purchase confirmation'
);
assert.strictEqual(isExplicitPurchaseIntent('Оформляйте заказ', ''), true);
assert.strictEqual(isExplicitPurchaseIntent('Сатып аламын', ''), true);
assert.strictEqual(isExplicitPurchaseIntent('Иә', 'Тапсырысты рәсімдейік пе?'), true);
assert.strictEqual(isExplicitPurchaseIntent('Да', 'Оформляем заказ?'), true);

assert.strictEqual(
  analyzeConversationTurn({
    text: 'Иа',
    history: [{ sender: 'ai', text: 'Хотите, отправлю каталог со всеми моделями?' }]
  }).confirmCatalog,
  true,
  'An affirmative answer to a catalog offer must send the catalog directly.'
);
assert.strictEqual(
  analyzeConversationTurn({
    text: 'Да',
    history: [{ sender: 'ai', text: 'Хотите, расскажу подробнее об этой модели?' }]
  }).confirmCatalog,
  false,
  'A generic affirmative must not accidentally trigger a catalog.'
);

assert.strictEqual(
  analyzeConversationTurn({
    text: 'Да',
    history: [
      { sender: 'user', text: 'Если банк не одобрит?' },
      { sender: 'ai', text: 'Можно подобрать более доступную модель Alkaline G75.' },
      { sender: 'ai', text: 'Хотите, расскажу подробнее про эту модель?' }
    ]
  }).confirmG75Presentation,
  true,
  'Yes after an explicit G75 offer must send the real G75 presentation.'
);
assert.strictEqual(
  analyzeConversationTurn({
    text: 'Да',
    history: [{ sender: 'ai', text: 'В каком городе вы находитесь?' }]
  }).confirmG75Presentation,
  false,
  'Yes to an unrelated question must not trigger G75 materials.'
);

const kazakhAddressQuestion = 'Тапсырысты рәсімдеу үшін мекенжайыңызды жаза аласыз ба?';
const russianAddressQuestion = 'Подскажите полный адрес: улицу, дом и квартиру?';
assert.strictEqual(isAddressRequest(kazakhAddressQuestion), true);
assert.strictEqual(isAddressRequest(russianAddressQuestion), true);
assert.strictEqual(isAddressRequest('Фильтр Южная Кореяда жасалған.'), false);
assert.ok(getQuestionIntents(kazakhAddressQuestion).includes('address'));
assert.strictEqual(hasAssistantAddressRequest([
  { sender: 'user', text: 'Талдыкорган' },
  { sender: 'ai', text: kazakhAddressQuestion }
]), true);

const mixedReply = 'Фильтр Южная Кореяда жасалған. Осы модельді орнату үшін мекенжайыңызды жаза аласыз ба?';
const unauthorized = guardAddressRequest(mixedReply, {
  checkoutAuthorized: false,
  addressAlreadyAsked: false,
  language: 'kk'
});
assert.strictEqual(unauthorized.blocked, true);
assert.strictEqual(unauthorized.addressRequestAllowed, false);
assert.match(unauthorized.text, /Оңтүстік Кореяда|Южная Кореяда/);
assert.doesNotMatch(unauthorized.text, /мекенжай/);

const firstAuthorized = guardAddressRequest(kazakhAddressQuestion, {
  checkoutAuthorized: true,
  addressAlreadyAsked: false,
  language: 'kk'
});
assert.strictEqual(firstAuthorized.blocked, false);
assert.strictEqual(firstAuthorized.addressRequestAllowed, true);
assert.strictEqual(firstAuthorized.text, kazakhAddressQuestion);

const repeatedAuthorized = guardAddressRequest(kazakhAddressQuestion, {
  checkoutAuthorized: true,
  addressAlreadyAsked: true,
  language: 'kk'
});
assert.strictEqual(repeatedAuthorized.blocked, true);
assert.strictEqual(repeatedAuthorized.addressRequestAllowed, false);
assert.doesNotMatch(repeatedAuthorized.text, /мекенжай/);

const exactFailureCase = [
  ['Иа', 'Alkaline SMART фильтрін орнату үшін раковина астындағы орын жеткілікті ме?'],
  ['Иа', 'Дизайнерлік шүмекті +15 000 ₸-ге қосқыңыз келе ме?'],
  ['Бағасына келісейікта', ''],
  ['Қай жақта шыққан', '']
];
for (const [customerText, previousAssistant] of exactFailureCase) {
  assert.strictEqual(
    isExplicitPurchaseIntent(customerText, previousAssistant),
    false,
    `Failure-case message must not authorize address collection: ${customerText}`
  );
}

console.log('Checkout/address safety tests passed.');

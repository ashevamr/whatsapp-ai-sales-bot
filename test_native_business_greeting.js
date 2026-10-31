const assert = require('assert');
const { classifyNativeBusinessGreeting, purgeNativeBusinessGreetings } = require('./native_business_greeting');

const legacy = `Здравствуйте! 👋 Вы перешли по рекламе VODEL.
1️⃣Alkaline SMART
2️⃣ FOURA
3️⃣ Другие системы
4️⃣ Каталог`;
const current = `Здравствуйте! 🛶 Вы перешли по рекламе VODEL.
1️⃣ Каталог
2️⃣ FOURA
3️⃣ Alkaline SMART`;

assert.strictEqual(classifyNativeBusinessGreeting(legacy), 'legacy_vodel_menu');
assert.strictEqual(classifyNativeBusinessGreeting(current), 'current_vodel_menu');
assert.strictEqual(
  classifyNativeBusinessGreeting('Добро пожаловать! Для регистрации заполните форму ниже.'),
  'registration_form'
);
assert.strictEqual(
  classifyNativeBusinessGreeting('Добро пожаловать!\nДля регистрации заполните форму ниже'),
  'registration_form'
);
assert.strictEqual(classifyNativeBusinessGreeting('Можно узнать подробнее?'), 'short_details_template');
assert.strictEqual(classifyNativeBusinessGreeting('Здравствуйте! Чем мы можем вам помочь?'), 'help_template');
assert.strictEqual(classifyNativeBusinessGreeting('Я сама пишу клиенту'), null);

const lockedByShortTemplate = {
  status: 'human',
  manualTakeover: true,
  messages: [
    { sender: 'human', text: 'Можно узнать подробнее?' },
    { sender: 'user', text: 'Атырау, цена?' }
  ]
};
assert.deepStrictEqual(purgeNativeBusinessGreetings(lockedByShortTemplate), { removed: 1, unlocked: true });
assert.strictEqual(lockedByShortTemplate.status, 'ai');

const lockedByNativeGreeting = {
  status: 'human',
  manualTakeover: true,
  messages: [
    { sender: 'human', text: 'Добро пожаловать! Для регистрации заполните форму ниже.' },
    { sender: 'user', text: 'Привет! Можно узнать об этом подробнее?' }
  ]
};
assert.deepStrictEqual(purgeNativeBusinessGreetings(lockedByNativeGreeting), { removed: 1, unlocked: true });
assert.strictEqual(lockedByNativeGreeting.status, 'ai');
assert.strictEqual(lockedByNativeGreeting.messages.length, 1);

const realHumanTakeover = {
  status: 'human',
  manualTakeover: true,
  messages: [
    { sender: 'human', text: 'Добро пожаловать! Для регистрации заполните форму ниже.' },
    { sender: 'human', text: 'Я сама отвечу клиенту' }
  ]
};
assert.deepStrictEqual(purgeNativeBusinessGreetings(realHumanTakeover), { removed: 1, unlocked: false });
assert.strictEqual(realHumanTakeover.status, 'human');

console.log('Native WhatsApp Business greeting tests passed.');

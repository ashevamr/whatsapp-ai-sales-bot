const assert = require('assert');
const fs = require('fs');
const path = require('path');
const aiWorkflow = require('./ai_workflow');
const { detectProductMenuChoice } = require('./conversation_safety');

const welcome = aiWorkflow.buildWelcomeMessage();
for (const requiredPart of ['Здравствуйте!🫶', '1️⃣ Каталог — все модели фильтров и цены', '2️⃣ FOURA', '3️⃣ Alkaline SMART', 'Напишите цифру 1, 2 или 3']) {
  assert.ok(welcome.includes(requiredPart), `Welcome menu is missing: ${requiredPart}`);
}
assert.strictEqual(
  aiWorkflow.buildProductMenuReminder(),
  'Здравствуйте! Можете, пожалуйста, выбрать цифру 1, 2 или 3 — или написать ваш вопрос? Я помогу. 😊'
);

assert.strictEqual(detectProductMenuChoice('1'), 1);
assert.strictEqual(detectProductMenuChoice('2️⃣'), 2);
assert.strictEqual(detectProductMenuChoice('вариант 3'), 3);
assert.strictEqual(detectProductMenuChoice('каталог'), 1);
assert.strictEqual(detectProductMenuChoice('FOURA'), 2);
assert.strictEqual(detectProductMenuChoice('Alkaline Smart'), 3);
for (const unsafeValue of ['12', '185 000', '2026', '5', '4', '2 тысячи', 'вариант 12', 'Сколько стоит фильтр без бака?']) {
  assert.strictEqual(detectProductMenuChoice(unsafeValue), null, `Unsafe menu match: ${unsafeValue}`);
}

const source = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
assert.ok(source.includes("CATALOG_FACTS.webUrl"), 'Option 1 catalog link is not wired.');
assert.ok(source.includes('sendFouraPresentationBundle(chatId, chatObj, chats[chatId])'), 'Option 2 bundle is not wired.');
assert.ok(source.includes('sendAlkalineSmartMenuBundle(chatId, chatObj, chats[chatId])'), 'Option 3 bundle is not wired.');
assert.ok(source.includes('sendProductCatalog(chatId, chatObj, chats[chatId])'), 'Option 1 catalog is not wired.');
assert.ok(source.includes('const FILTER_TYPE_FOLLOW_UP_DELAY_MS = 3 * 60 * 1000'), 'Menu reminder must wait three minutes.');
assert.ok(source.includes('!chat.awaitingProductMenu || chat.productMenuReminderSent'), 'Menu reminder must not interrupt or repeat.');

console.log('Product menu checks passed.');

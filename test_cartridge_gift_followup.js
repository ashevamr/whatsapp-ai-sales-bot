'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  CARTRIDGE_GIFT_DELAY_MS,
  isCartridgeQuestion,
  canSendCartridgeGiftFollowUp,
  buildCartridgeGiftFollowUp
} = require('./cartridge_gift_followup');
const { getCommercialFactsForPrompt, getCommercialConversationPolicy } = require('./commercial_facts');

let checks = 0;
const check = (actual, expected, label) => { assert.strictEqual(actual, expected, label); checks += 1; };

for (const text of ['Сколько стоят картриджи?', 'А замена фильтров сколько?', 'Картридждер қанша тұрады', 'колбы часто менять?', 'Какое обслуживание нужно?']) {
  check(isCartridgeQuestion(text), true, `cartridge question: ${text}`);
}
for (const text of ['Сколько стоит фильтр?', 'Алматы', 'Хочу заказать']) {
  check(isCartridgeQuestion(text), false, `not a cartridge question: ${text}`);
}

check(CARTRIDGE_GIFT_DELAY_MS, 20 * 60 * 1000, 'gift offer waits 20 minutes');
const eligible = { autoReplyAllowed: true, chatExists: true, chatStatus: 'ai', latestSender: 'ai', alreadySent: false, warehouseCityKnown: true };
check(canSendCartridgeGiftFollowUp(eligible), true, 'silent customer in a warehouse city gets the gift');
check(canSendCartridgeGiftFollowUp({ ...eligible, warehouseCityKnown: false }), false, 'no gift outside warehouse cities');
check(canSendCartridgeGiftFollowUp({ ...eligible, latestSender: 'user' }), false, 'no gift when the customer wrote last');
check(canSendCartridgeGiftFollowUp({ ...eligible, alreadySent: true }), false, 'gift offer only once');
check(canSendCartridgeGiftFollowUp({ ...eligible, chatStatus: 'human' }), false, 'no gift while an operator handles the chat');
check(canSendCartridgeGiftFollowUp({ ...eligible, autoReplyAllowed: false }), false, 'no gift when automation is off');

check(getCommercialConversationPolicy([{ sender: 'user', text: 'Шымкент' }], '').warehouseCityKnown, true, 'Shymkent is a warehouse city');
check(/15 500 ₸/.test(buildCartridgeGiftFollowUp('ru')) && /подарок/.test(buildCartridgeGiftFollowUp('ru')), true, 'Russian gift text');
check(/15 500 ₸/.test(buildCartridgeGiftFollowUp('kk')) && /сыйлық/.test(buildCartridgeGiftFollowUp('kk')), true, 'Kazakh gift text');

const facts = getCommercialFactsForPrompt({}, 'RO-H015 картриджи');
check(facts.includes('замена 3 картриджей грубой очистки, 15 500 ₸'), true, 'first replacement price in prompt');
check(facts.includes('полная замена 6 картриджей, 19 500 ₸'), true, 'yearly replacement price in prompt');
check(facts.includes('Сроки и стоимость замены картриджей для Фильтр RO - H 015'), false, 'RO-H015 cartridge question no longer hands over');

check(fs.existsSync(path.join(__dirname, 'Vodel content', '01_RO-H015', 'ro_h015_kartridzhi.jpeg')), true, 'cartridge picture exists');
const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
check(/roH015Sent\.cartridges = true[\s\S]{0,200}ro_h015_kartridzhi\.jpeg/.test(server), true, 'picture sent once per chat');
check(/cancelCartridgeGiftFollowUp\(chatId, \{ clearDeadline: true \}\);\s*\n\s*const userMsg/.test(server), true, 'customer reply cancels the gift timer');
check(server.includes('restorePendingCartridgeGiftFollowUps();'), true, 'pending gift timers survive a restart');

console.log(`Cartridge gift follow-up checks passed: ${checks} checks.`);

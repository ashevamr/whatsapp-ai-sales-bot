const assert = require('assert');
const fs = require('fs');
const path = require('path');
const workflow = require('./ai_workflow');
const { COMMERCIAL_FACTS } = require('./commercial_facts');
const { analyzeConversationTurn } = require('./conversation_safety');
const {
  MAX_SILENT_FOLLOW_UPS,
  getSilentFollowUpDecision,
  buildSilentFollowUpText
} = require('./silent_lead_followup');

let checks = 0;
const check = (actual, expected, label) => { assert.deepStrictEqual(actual, expected, label); checks += 1; };

// RO-H015 price as advertised.
const roH015 = COMMERCIAL_FACTS.catalogProducts.find(product => product.id === 'ro_h015');
check([roH015.price, roH015.installmentPrice, roH015.oldPrice], [65000, 75000, 120000], 'RO-H015 ad prices');

// First reply to a new ad lead.
const opener = workflow.buildAdvertisedModelOpener(22);
check(opener.greeting, 'Доброй ночи! Подскажите пожалуйста, с какого города вы обращаетесь?😊', 'opener asks the city first');
check(workflow.buildAdvertisedModelOpener(9).greeting.startsWith('Доброе утро!'), true, 'opener greets by Astana time');
check(opener.specs.includes('RO-H015') && opener.specs.includes('65 000 ₸') && opener.specs.includes('75 000 ₸'), true, 'opener names the model and both prices');
check(opener.warranty.includes('3 года') && opener.warranty.includes('15 лет'), true, 'opener warranty');
check(fs.existsSync(path.join(__dirname, 'Vodel content', '01_RO-H015', 'ro_h015_1_main.jpeg')), true, 'opener photo exists');
check(fs.existsSync(path.join(__dirname, 'Vodel content', '01_RO-H015', 'ro_h015_video.mp4')), true, 'opener video exists');
const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
check(/RO_H015_OPENER_MEDIA = \[[^\]]*poster/.test(serverSource), false, 'old-price poster is never sent in the opener');

for (const [text, expected] of [
  ['Здравствуйте! Можно узнать об этом подробнее?', true],
  ['Здравствуйте', true],
  ['Сколько стоит RO-H015?', true],
  ['Интересует фильтр с баком', true],
  ['Нужен фильтр без бака', false],
  ['Сколько стоит FOURA?', false],
  ['Alkaline smart цена', false],
  ['Хочу каталог', false]
]) check(workflow.shouldOfferAdvertisedModel(text), expected, `advertised model decision: ${text}`);

const openerHistory = [
  { sender: 'user', text: 'Здравствуйте' },
  { sender: 'ai', text: opener.greeting },
  { sender: 'ai', text: opener.specs },
  { sender: 'ai', text: opener.warranty }
];
check(analyzeConversationTurn({ text: 'Павлодар', history: openerHistory }).cityReply, true, 'city answer recognised after the opener');

// Emoji style: only 😊 or 💐, at most one; a closing ")" is a complete ending.
check(workflow.formatSalesReply('Отлично! 💧✅ Фильтр стоит 65 000 ₸ 🇺🇸. Хотите оформить?😊😊'), 'Отлично! Фильтр стоит 65 000 ₸. Хотите оформить?😊', 'foreign emoji removed, one smile kept');
check(workflow.formatSalesReply('Что вы думаете по поводу фильтра? Дайте вашу обратную связь пожалуйста)'), 'Что вы думаете по поводу фильтра? Дайте вашу обратную связь пожалуйста)', 'closing bracket keeps the sentence and its order');
check(workflow.formatSalesReply('Спасибо! 💐 Привезём завтра 🚚. Удобно?😊'), 'Спасибо! 💐 Привезём завтра. Удобно?', 'only the first allowed emoji survives');

check(workflow.formatSalesReply('[HANDOVER] Один момент, уточню это у специалиста и вернусь к вам.\n\nПодскажите, у вас есть место?'),'[HANDOVER] Один момент, уточню это у специалиста и вернусь к вам.', 'handover carries no extra question');

// Daily follow-up for silent leads.
const HOUR = 60 * 60 * 1000;
const now = Date.parse('2026-11-02T07:00:00Z'); // 12:00 in Astana
const lead = (overrides = {}) => ({
  id: 'lead@lid',
  number: '77000000001',
  status: 'ai',
  messages: [
    { sender: 'user', text: 'Здравствуйте', timestamp: new Date(now - 30 * HOUR).toISOString() },
    { sender: 'ai', text: opener.warranty, timestamp: new Date(now - 29 * HOUR).toISOString() }
  ],
  ...overrides
});
const at = (chat, options = {}) => getSilentFollowUpDecision(chat, { now, kzHour: 12, kzDateKey: '2026-11-02', ...options });

check(at(lead()).eligible, true, 'silent lead is eligible');
check(at(lead()).step, 0, 'first follow-up step');
check(at(lead(), { kzHour: 9 }).reason, 'OUTSIDE_HOURS', 'no follow-up before 11:00');
check(at(lead(), { kzHour: 20 }).reason, 'OUTSIDE_HOURS', 'no follow-up after 19:00');
check(at(lead({ status: 'human' })).reason, 'HUMAN', 'operator chats are left alone');
check(at(lead({ checkoutAuthorized: true })).reason, 'HANDLED', 'confirmed orders are left alone');
check(at(lead(), { completedPhones: new Set(['77000000001']) }).reason, 'SOLD', 'buyers are left alone');

const recent = lead();
recent.messages[1].timestamp = new Date(now - 2 * HOUR).toISOString();
check(at(recent).reason, 'TOO_SOON', 'waits at least 18 hours after the last bot message');

const answered = lead();
answered.messages.push({ sender: 'user', text: 'Подумаю', timestamp: new Date(now - HOUR).toISOString() });
check(at(answered).reason, 'NOT_WAITING', 'customer reply means the bot answers, not a nudge');

const refused = lead();
refused.messages.splice(1, 0, { sender: 'user', text: 'Спасибо, не интересно', timestamp: new Date(now - 29.5 * HOUR).toISOString() });
check(at(refused).reason, 'OPTED_OUT', 'refusal stops follow-ups');

const stale = lead();
stale.messages[0].timestamp = new Date(now - 8 * 24 * HOUR).toISOString();
check(at(stale).reason, 'TOO_OLD', 'old leads are not revived');

const anchor = lead().messages[0].timestamp;
check(at(lead({ silentFollowUp: { count: 1, anchorUserMessageAt: anchor, lastSentDateKey: '2026-11-02' } })).reason, 'ALREADY_TODAY', 'one follow-up per day');
check(at(lead({ silentFollowUp: { count: 2, anchorUserMessageAt: anchor, lastSentDateKey: '2026-11-01' } })).step, 2, 'next day continues the sequence');
check(at(lead({ silentFollowUp: { count: MAX_SILENT_FOLLOW_UPS, anchorUserMessageAt: anchor, lastSentDateKey: '2026-11-01' } })).reason, 'LIMIT', `stops after ${MAX_SILENT_FOLLOW_UPS} follow-ups`);
check(at(lead({ silentFollowUp: { count: MAX_SILENT_FOLLOW_UPS, anchorUserMessageAt: 'older', lastSentDateKey: '2026-11-01' } })).step, 0, 'counter restarts after a new customer message');

check(buildSilentFollowUpText(0, 11), 'Доброе утро! Что вы думаете по поводу фильтра? Дайте вашу обратную связь пожалуйста)', 'day 1 text');
check(buildSilentFollowUpText(1, 15), 'Здравствуйте! Что вы решили по поводу фильтра? Может хотели бы варианты со скрытым баком рассмотреть?😊', 'day 2 text');
check(buildSilentFollowUpText(3, 15).includes('Вы оставили заявку'), true, 'day 4 text');
for (let step = 0; step < MAX_SILENT_FOLLOW_UPS; step += 1) {
  const emojis = buildSilentFollowUpText(step, 15).match(/\p{Extended_Pictographic}/gu) || [];
  check(emojis.every(emoji => emoji === '😊' || emoji === '💐') && emojis.length <= 1, true, `follow-up ${step + 1} emoji style`);
}

console.log(`Ad opener, tone and silent-lead follow-up checks passed: ${checks} checks.`);

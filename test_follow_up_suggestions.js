const assert = require('assert');
const { buildFollowUpSuggestions } = require('./follow_up_suggestions');

const now = new Date('2026-08-13T12:00:00.000Z').getTime();
const hoursAgo = hours => new Date(now - hours * 60 * 60 * 1000).toISOString();
const chats = {
  unanswered: {
    id: 'unanswered@c.us', name: 'Алия', number: '77010000001',
    messages: [
      { sender: 'user', text: 'Здравствуйте', timestamp: hoursAgo(5) },
      { sender: 'ai', text: 'Чем могу помочь?', timestamp: hoursAgo(3) }
    ]
  },
  thinking: {
    id: 'thinking@c.us', name: 'Ерлан', number: '77010000002',
    messages: [{ sender: 'user', text: 'Я подумаю и позже напишу', timestamp: hoursAgo(4) }]
  },
  optedOut: {
    id: 'optedout@c.us', name: 'Марат', number: '77010000003',
    messages: [{ sender: 'user', text: 'Не пишите мне больше', timestamp: hoursAgo(4) }]
  },
  tooRecent: {
    id: 'recent@c.us', name: 'Дана', number: '77010000004',
    messages: [{ sender: 'ai', text: 'Добрый день', timestamp: hoursAgo(1) }]
  },
  old: {
    id: 'old@c.us', name: 'Сауле', number: '77010000005',
    messages: [{ sender: 'ai', text: 'Добрый день', timestamp: hoursAgo(30) }]
  }
};

const suggestions = buildFollowUpSuggestions(chats, [], { now });
assert.strictEqual(suggestions.length, 2, 'only eligible chats from the last 24 hours should appear');
assert.deepStrictEqual(suggestions.map(item => item.category).sort(), ['no_reply', 'thinking']);
assert.ok(suggestions.find(item => item.chatId === 'thinking@c.us').draft.includes('цене, установке или обслуживанию'));
assert.ok(suggestions.find(item => item.chatId === 'unanswered@c.us').draft.includes('Алия'));
assert.strictEqual(buildFollowUpSuggestions(chats, [{ phone: '77010000001' }], { now }).some(item => item.chatId === 'unanswered@c.us'), false, 'completed sales must be excluded');

console.log('Follow-up suggestion checks passed.');

const assert = require('assert');
const {
  getTimestampMs,
  getKazakhstanDayWindow,
  buildDailySalesSummary,
  formatDailySalesReport,
  shouldSendDailyReport
} = require('./daily_sales_report');

const now = Date.parse('2026-08-27T17:30:00.000Z'); // 22:30 in Kazakhstan UTC+5
const chats = {
  ignored: {
    number: '77000000001',
    messages: [
      { sender: 'user', text: 'Сколько стоит?', timestamp: '2026-08-27T10:00:00.000Z' },
      { sender: 'ai', text: 'Какой фильтр рассматриваете?', timestamp: '2026-08-27T10:01:00.000Z' }
    ]
  },
  thinking: {
    number: '77000000002',
    messages: [{ sender: 'user', text: 'Я подумаю и позже напишу', timestamp: '2026-08-27T11:00:00.000Z' }]
  },
  processing: {
    number: '77000000003',
    messages: [{ sender: 'user', text: 'Хочу FOURA, расскажите про рассрочку', timestamp: '2026-08-27T12:00:00.000Z' }]
  },
  refusedByText: {
    number: '77000000004',
    messages: [{ sender: 'user', text: 'Спасибо, покупать не буду', timestamp: '2026-08-27T13:00:00.000Z' }]
  },
  bought: {
    number: '77000000005',
    messages: [{ sender: 'user', text: 'Подтверждаю заказ', timestamp: '2026-08-27T14:00:00.000Z' }]
  },
  refusedSale: {
    number: '77000000006',
    messages: [{ sender: 'user', text: 'Отмените заказ', timestamp: '2026-08-27T15:00:00.000Z' }]
  },
  oldOnly: {
    number: '77000000007',
    messages: [{ sender: 'user', text: 'Вчерашний лид', timestamp: '2026-08-26T18:00:00.000Z' }]
  }
};

const completedSales = [
  { phone: '77000000005', flag: 'Подтвержден', timestamp: '2026-08-27T14:05:00.000Z' },
  { phone: '77000000006', flag: 'Отменен', timestamp: '2026-08-27T15:05:00.000Z' },
  { phone: '77000000007', flag: 'Подтвержден', timestamp: '2026-08-26T18:05:00.000Z' }
];

const window = getKazakhstanDayWindow(now);
assert.strictEqual(window.dateKey, '2026-08-27');
assert.strictEqual(window.localHour, 22);
assert.strictEqual(getTimestampMs(1787846400), 1787846400000);

const summary = buildDailySalesSummary(chats, completedSales, { now });
assert.deepStrictEqual(summary, {
  dateKey: '2026-08-27',
  total: 6,
  ignored: 1,
  thinking: 1,
  processing: 1,
  refused: 2,
  bought: 1,
  conversionPercent: 17
});
assert.strictEqual(
  summary.ignored + summary.thinking + summary.processing + summary.refused + summary.bought,
  summary.total,
  'Every inquiry must belong to exactly one category.'
);

const text = formatDailySalesReport(summary);
assert.ok(text.includes('Отчёт VODEL за 27.08.2026'));
assert.ok(text.includes('Всего обращений: 6'));
assert.ok(text.includes('Не ответили: 1'));
assert.ok(text.includes('Думают о покупке: 1'));
assert.ok(text.includes('В обработке: 1'));
assert.ok(text.includes('Отказались: 2'));
assert.ok(text.includes('Купили: 1'));
assert.ok(text.includes('Конверсия в покупку: 17%'));

assert.strictEqual(shouldSendDailyReport({
  now: Date.parse('2026-08-27T16:59:00.000Z'),
  lastSentDate: null,
  clientReady: true
}), false, '21:59 local is too early.');
assert.strictEqual(shouldSendDailyReport({ now, lastSentDate: null, clientReady: true }), true);
assert.strictEqual(shouldSendDailyReport({ now, lastSentDate: '2026-08-27', clientReady: true }), false);
assert.strictEqual(shouldSendDailyReport({ now, lastSentDate: null, clientReady: false }), false);

console.log('Daily sales report checks passed.');

const assert = require('assert');
const { prepareSuccessfulSalesCorpus, redactText, sanitizeSuccessfulSalesPlaybook } = require('./successful_sales_analysis');

const now = new Date('2026-08-13T12:00:00.000Z').getTime();
const daysAgo = days => Math.floor((now - days * 24 * 60 * 60 * 1000) / 1000);

assert.strictEqual(redactText('Тел +7 701 123 45 67, email x@test.com, https://example.com'), 'Тел [ТЕЛЕФОН], email [EMAIL], [ССЫЛКА]');

const corpus = prepareSuccessfulSalesCorpus([
  { fromMe: true, timestamp: daysAgo(1), body: 'Добрый день, +7 701 123 45 67' },
  { author: 'client@c.us', timestamp: daysAgo(1) + 10, body: 'Спасибо, подумаю' },
  { author: 'old@c.us', timestamp: daysAgo(61), body: 'Старое сообщение' }
], { now });

assert.strictEqual(corpus.metadata.availableMessages, 2, 'only the last 60 days belong in the corpus');
assert.ok(corpus.transcript.includes('ПРОДАВЕЦ'));
assert.ok(corpus.transcript.includes('УЧАСТНИК_1'));
assert.ok(!corpus.transcript.includes('701 123'));
assert.ok(!corpus.transcript.includes('Старое сообщение'));

const sanitizedPlaybook = sanitizeSuccessfulSalesPlaybook({
  phrasingToReuse: ['Рассрочка Kaspi 0-0-24', 'Мастер свяжется заранее'],
  observedPatterns: [{ title: 'Оплата', evidence: 'Kaspi 0-0-24', rule: 'Предлагать рассрочку', confidence: 'high' }],
  limitations: []
});
assert.deepStrictEqual(sanitizedPlaybook.phrasingToReuse, ['Мастер свяжется заранее']);
assert.ok(!JSON.stringify(sanitizedPlaybook.observedPatterns).includes('0-0-24'));
assert.ok(sanitizedPlaybook.limitations.some(item => item.includes('коммерческих фактов')));

console.log('Successful-sales analysis preparation checks passed.');

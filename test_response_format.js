const assert = require('assert');
const workflow = require('./ai_workflow');

const verboseReply = [
  'FOURA очищает воду в реальном времени и не занимает место под мойкой.',
  'У неё есть несколько ступеней очистки, подробности которых я могу перечислить.',
  'Также можно рассказать о гарантии, сервисе и рассрочке.',
  'Какой вопрос о фильтре для вас сейчас самый важный?'
].join(' ');

const formatted = workflow.formatSalesReply(verboseReply);
const sentenceCount = (formatted.match(/[.!?…]+/g) || []).length;

assert.ok(formatted.length <= 650, 'Reply must be no longer than 650 characters');
assert.ok(sentenceCount <= 5, 'Reply must contain no more than five sentences');
assert.ok(formatted.endsWith('?'), 'The final customer prompt must be retained');
assert.strictEqual(
  workflow.formatSalesReply('[HANDOVER] Один момент, уточню у специалиста.'),
  '[HANDOVER] Один момент, уточню у специалиста.'
);

const welcome = workflow.buildWelcomeMessage();
assert.ok(welcome.startsWith('Здравствуйте!🫶'));
assert.ok(welcome.includes('1️⃣ Каталог — все модели фильтров и цены'));
assert.ok(welcome.includes('2️⃣ FOURA'));
assert.ok(welcome.includes('3️⃣ Alkaline SMART'));

assert.strictEqual(workflow.hasExplicitFilterPreference('Здравствуйте! Можно узнать подробнее? Сколько стоит?'), false);
assert.strictEqual(workflow.hasExplicitFilterPreference('Нужен фильтр без бака, сколько стоит?'), true);
assert.strictEqual(workflow.hasExplicitFilterPreference('Интересует Alkaline Smart с баком.'), true);

const comparison = workflow.formatSalesReply(
  '• Alkaline G75 — вариант с запасом воды в баке.\n• FOURA — свежая вода сразу, без бака и больше места под мойкой.\nКакой вариант вам ближе — с баком или без?'
);
assert.ok(comparison.includes('\n'), 'Short comparison lines must remain scannable');

const interruptedKazakhReply = workflow.formatSalesReply(
  'Иә, дұрыс таңдау! FOURA моделі екі түрлі су береді: біреуі минералдармен байытылған су, екіншісі — pH деңгейі жоғары, ағзаны қышқылданудан қорғайтын табиғи антиоксидантты сілтілі су. 💧\n\nБұл жүйеде су ешқашан бакта тұрып қалмайды, сондықтан әрқашан балғын әрі дәмді болады.\nОсы модельді тапсырыс'
);
assert.ok(!interruptedKazakhReply.includes('Осы модельді тапсырыс'), 'A sentence cut by the model must never reach the customer.');
assert.ok(interruptedKazakhReply.endsWith('?'), 'An interrupted reply must end with a complete next-step question.');
assert.ok(interruptedKazakhReply.includes('Осы модель туралы толығырақ айтайын ба?'), 'Kazakh customers receive a Kazakh completion question.');

const noRepeatedSentence = workflow.formatSalesReply(
  'Доставка и установка у нас бесплатные. Сегодня мастера уже завершили выезды, но можем оформить всё на завтра или другой удобный день. Подскажите, вы рассматриваете фильтр с баком или без бака? Подскажите, вы рассматриваете фильтр с баком или без бака?'
);
assert.strictEqual((noRepeatedSentence.match(/Подскажите, вы рассматриваете фильтр с баком или без бака\?/g) || []).length, 1, 'A repeated model question must be removed before delivery');

assert.strictEqual(
  workflow.buildFilterTypeQuestion(),
  'Подскажите, пожалуйста, вы рассматриваете фильтр с накопительным баком или без бака? Если хотите, коротко объясню разницу.'
);

assert.ok(workflow.shouldAnswerServiceCost('Сколько стоят фильтра и какой период замены?'));
const serviceAnswer = workflow.buildServiceCostAnswer();
assert.ok(serviceAnswer.includes('FOURA без бака'));
assert.ok(serviceAnswer.includes('Alkaline G75 с баком'));
assert.ok(serviceAnswer.includes('12 500'));
assert.ok(serviceAnswer.includes('35 000'));
assert.ok(serviceAnswer.endsWith('с баком или без?'));

assert.strictEqual(
  workflow.stripCustomerFileReferences('FOURA compact.\n[foura main picture.\njpeg]\n[foura 1.jpeg]'),
  'FOURA compact.',
  'File names must never reach a customer, even when Gemini splits the extension across lines.'
);
assert.strictEqual(
  workflow.buildOrderContactQuestion(),
  'Отлично! Подскажите, пожалуйста, из какого вы города?'
);
assert.strictEqual(workflow.shouldStartOrder('Давайте оформим заказ'), true);

const welcomeBubbles = workflow.splitIntoBubbles(welcome);
assert.strictEqual(welcomeBubbles.length, 1, 'The operator-approved welcome must arrive as one complete message.');
assert.ok(welcomeBubbles[0].includes('Напишите цифру 1, 2 или 3'), 'Welcome must ask for a menu choice.');

const twoParagraphReply = "В Алматы доставка и установка день в день.\n\nУдобно оформить заказ на завтра?";
const twoBubbles = workflow.splitIntoBubbles(twoParagraphReply);
assert.strictEqual(twoBubbles.length, 2);
assert.strictEqual(twoBubbles[0], 'В Алматы доставка и установка день в день.');
assert.strictEqual(twoBubbles[1], 'Удобно оформить заказ на завтра?');

const catalogUrl = 'https://catalog-vodel-kz.pages.dev/';
const formattedCatalogLink = workflow.formatSalesReply(`Вот каталог: ${catalogUrl}`);
assert.ok(formattedCatalogLink.includes(catalogUrl), 'A URL must remain exact after reply formatting.');
assert.ok(!/catalog-vodel-kz\.\s+pages\.\s+dev/i.test(formattedCatalogLink), 'A URL must never be split at domain dots.');

const catalogLinkBubbles = workflow.splitIntoBubbles(`Вот каталог со всеми моделями и ценами:\n${catalogUrl}\n\nЕсли появится вопрос — напишите.`);
assert.strictEqual(catalogLinkBubbles.length, 2, 'The catalog link message should keep its short two-part structure.');
assert.strictEqual(catalogLinkBubbles[0], `Вот каталог со всеми моделями и ценами:\n${catalogUrl}`, 'The catalog URL must be delivered as one exact clickable link.');

console.log('Response formatting checks passed.');

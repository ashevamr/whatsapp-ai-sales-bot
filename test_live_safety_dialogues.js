require('dotenv').config();
const assert = require('assert');
const workflow = require('./ai_workflow');

const baseHistory = [
  { sender: 'user', text: 'Здравствуйте! Можно узнать об этом подробнее?' },
  { sender: 'ai', text: workflow.buildWelcomeMessage() },
  { sender: 'user', text: 'Астана' },
  { sender: 'ai', text: 'Спасибо, Астана! Какой фильтр рассматриваете — с баком или без бака?' }
];

const scenarios = [
  { name: 'FOURA price', input: 'Без бака. Сколько стоит FOURA?', required: ['185'], forbidden: ['109 000', 'здравствуйте'] },
  { name: 'G75 price', input: 'Хочу Alkaline G75 с баком, сколько стоит?', required: ['109'], forbidden: ['185 000', 'здравствуйте'] },
  { name: 'Smart Kaspi term', input: 'Сколько Alkaline Smart в рассрочку Kaspi?', required: ['12'], forbidden: ['kaspi 0-0-24', '6 250', 'здравствуйте'] },
  { name: 'Tank comparison', input: 'Объясните разницу между фильтром с баком и без бака', required: ['мембран'], forbidden: ['здравствуйте'] },
  { name: 'Service details', input: 'Сколько стоят фильтры и когда менять картриджи?', required: ['109', '185', '12 500', '35 000'], forbidden: ['здравствуйте'] },
  { name: 'Known city warranty', input: 'Какая гарантия на FOURA?', required: ['3'], forbidden: ['из какого вы города', 'сертификат отправ', 'здравствуйте'] },
  { name: 'G75 price objection discount', input: 'G75 дорогой, не потяну такую цену. Есть скидка?', required: ['100 000'], forbidden: ['foura', 'здравствуйте'] },
  { name: 'FOURA price objection no G75 discount', input: 'FOURA дорогой, есть скидка?', required: ['185'], forbidden: ['100 000', 'g75', 'здравствуйте'] },
  { name: 'FOURA installment banks', input: 'Какие варианты рассрочки на FOURA?', required: ['kaspi', 'halyk', 'freedom'], forbidden: ['kaspi 0-0-24', 'здравствуйте'] },
  { name: 'No repeated city at checkout', input: 'Беру FOURA, хочу оформить заказ', required: [], forbidden: ['из какого вы города', 'какой у вас город', 'здравствуйте'] },
  { name: 'No file labels', input: 'Пришлите фото и презентацию FOURA', required: [], forbidden: ['.jpeg', '.jpg', '.png', '.pdf', '[foura', 'здравствуйте'] },
  { name: 'Kazakh FOURA answer', input: 'FOURA бағасы қанша және бөліп төлеу бар ма?', required: ['185'], forbidden: ['здравствуйте', '109 000'] }
];

function normalize(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

async function main() {
  let checks = 0;
  for (const scenario of scenarios) {
    const history = [...baseHistory, { sender: 'user', text: scenario.input }];
    const reply = String(await workflow.generateResponse(history, scenario.input) || '').trim();
    const lower = normalize(reply);

    assert.ok(reply && !reply.startsWith('[HANDOVER]'), `${scenario.name}: live model returned handover`);
    checks += 1;
    assert.ok(reply.length <= 700, `${scenario.name}: reply is too long (${reply.length})`);
    checks += 1;
    assert.ok((reply.match(/\?/g) || []).length <= 1, `${scenario.name}: more than one question`);
    checks += 1;
    for (const required of scenario.required) {
      assert.ok(lower.includes(normalize(required)), `${scenario.name}: missing ${required}\n${reply}`);
      checks += 1;
    }
    for (const forbidden of scenario.forbidden) {
      assert.ok(!lower.includes(normalize(forbidden)), `${scenario.name}: contains forbidden ${forbidden}\n${reply}`);
      checks += 1;
    }
    console.log(`PASS ${scenario.name}: ${reply.replace(/\s+/g, ' ').slice(0, 180)}`);
  }
  console.log(`Live Gemini dialogue safety passed: ${checks} checks across ${scenarios.length} scenarios.`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

const assert = require('assert');
const workflow = require('./ai_workflow');
const { getCommercialConversationPolicy, getLogisticsForPrompt, resolveWarehouseCityLocative } = require('./commercial_facts');

const ruralMessage = 'Алматинская область, село Кеген. Фильтр без бачка, цену можно?';
const ruralPolicy = getCommercialConversationPolicy([], ruralMessage);
assert.strictEqual(ruralPolicy.warehouseCityKnown, false, 'A village in a region is not a warehouse city.');
assert.strictEqual(ruralPolicy.ruralOrRegionalLocationMentioned, true, 'A village/region must be classified for route confirmation.');
assert.ok(!getLogisticsForPrompt(ruralPolicy, 11).includes('бесплатную доставку и установку сегодня'), 'Rural logistics must not promise free same-day service.');
assert.strictEqual(workflow.isPrefilledInstagramLead('Здравствуйте! Можно узнать об этом подробнее?'), true, 'The exact Instagram template keeps the approved welcome flow.');
assert.strictEqual(workflow.isPrefilledInstagramLead(ruralMessage), false, 'A meaningful first message must not be treated as the Instagram template.');
assert.strictEqual(workflow.shouldClarifyRuralTanklessRequest(ruralMessage), true, 'A rural tankless price request needs a deterministic, safe answer.');
const reply = workflow.buildRuralTanklessReply();
assert.ok(reply.includes('185 000'), 'The reply gives the current FOURA price.');
assert.ok(!reply.toLowerCase().includes('бесплат'), 'The reply does not promise free installation for a village.');
assert.ok(!reply.toLowerCase().includes('улицу и номер дома'), 'The reply does not ask for an address before route availability is confirmed.');
assert.ok(reply.endsWith('краткую презентацию FOURA?'), 'The reply keeps the next step low-friction.');

assert.strictEqual(resolveWarehouseCityLocative([{ sender: 'user', text: 'Астана' }]), 'Астане');
assert.strictEqual(resolveWarehouseCityLocative([{ sender: 'user', text: 'Алматинская область, село Кеген' }]), null);

console.log('Location policy checks passed.');

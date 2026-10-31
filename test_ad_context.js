const assert = require('assert');
const { detectAdvertisedProduct, isEmptyReferralEvent } = require('./ad_context');
const workflow = require('./ai_workflow');

assert.strictEqual(
  detectAdvertisedProduct({ _data: { referral: { headline: 'Система FOURA работает без накопительного бака' } } }),
  'foura',
  'FOURA advertisement metadata must select FOURA.'
);
assert.strictEqual(
  detectAdvertisedProduct({ _data: { contextInfo: { externalAdReplyInfo: { title: 'Alkaline Smart с баком' } } } }),
  'alkalineSmart',
  'Alkaline Smart advertisement metadata must remain model-specific.'
);
assert.strictEqual(isEmptyReferralEvent({ text: '', hasMedia: false, isVoice: false }), true);
assert.strictEqual(isEmptyReferralEvent({ text: 'Привет', hasMedia: false, isVoice: false }), false);
assert.strictEqual(isEmptyReferralEvent({ text: '', hasMedia: true, isVoice: false }), false);

const fouraReply = workflow.buildFouraAdReply();
assert.ok(fouraReply.includes('FOURA'));
assert.ok(fouraReply.includes('Alkaline SMART'));
assert.ok(fouraReply.includes('Напишите цифру 1, 2 или 3'));
assert.strictEqual(fouraReply, workflow.buildWelcomeMessage());

assert.strictEqual(workflow.isLikelyCityReply('Балхаш', { awaitingCity: true }), true);
assert.strictEqual(workflow.isLikelyCityReply('Да', { awaitingCity: true }), false);
assert.strictEqual(workflow.isLikelyCityReply('Сколько стоит FOURA?'), false);
const fouraCityReply = workflow.buildFouraAdCityReply('Балхаш');
assert.ok(fouraCityReply.includes('FOURA'));
assert.ok(!fouraCityReply.includes('G75'));
assert.ok(!fouraCityReply.includes('бесплатная доставка'));

console.log('Advertisement-context checks passed.');

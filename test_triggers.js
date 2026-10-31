const assert = require('assert');
const {
  resolveProductAttachmentTargets,
  shouldUseLegacyProductAttachments
} = require('./attachment_safety');
const { isFouraPriceProofRequest, isFouraClosingRisk } = require('./conversation_safety');

assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsFoura: false, wantsAlkaline: false }),
  { foura: false, alkaline: false, alkalineSmart: false },
  'A generic request must not default to FOURA.'
);
assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsFoura: true }),
  { foura: true, alkaline: false, alkalineSmart: false },
  'A FOURA request must not send Alkaline.'
);
assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsAlkaline: true }),
  { foura: false, alkaline: true, alkalineSmart: false },
  'An Alkaline request must not send FOURA.'
);
assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsAlkalineSmart: true }),
  { foura: false, alkaline: false, alkalineSmart: true },
  'An Alkaline Smart request must target Alkaline Smart.'
);
assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsBoth: true }),
  { foura: true, alkaline: true, alkalineSmart: true },
  'Both files require an explicit request for all models.'
);
assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsFoura: true, fouraAlreadyPresented: true }),
  { foura: false, alkaline: false, alkalineSmart: false },
  'A presentation must not be repeated.'
);
assert.deepStrictEqual(
  resolveProductAttachmentTargets({ wantsAlkalineSmart: true, alkalineSmartAlreadyPresented: true }),
  { foura: false, alkaline: false, alkalineSmart: false },
  'An Alkaline Smart presentation must not be repeated.'
);
assert.strictEqual(
  shouldUseLegacyProductAttachments({ hasAttachmentRequest: true, hasProductTarget: true, isFouraThreeStepContext: true }),
  false,
  'The legacy attachment path must not run beside the FOURA three-step presentation.'
);
assert.strictEqual(
  shouldUseLegacyProductAttachments({ hasAttachmentRequest: true, hasProductTarget: false }),
  false,
  'A faucet/photo request without a model target must not attach a product PDF.'
);
assert.strictEqual(
  shouldUseLegacyProductAttachments({ hasAttachmentRequest: true, hasProductTarget: true, isKaspiProof: true }),
  false,
  'A price-proof request must not attach a product presentation.'
);
assert.strictEqual(
  shouldUseLegacyProductAttachments({ hasAttachmentRequest: true, hasProductTarget: true }),
  true
);

assert.strictEqual(isFouraPriceProofRequest('Каспи рассрочка есть?', 'foura_600gpd'), false, 'A normal Kaspi question must not send price-proof media.');
assert.strictEqual(isFouraPriceProofRequest('Покажите скрин цены FOURA на маркетплейсе', 'foura_600gpd'), true, 'An explicit FOURA proof request may send the matching proof.');
assert.strictEqual(isFouraPriceProofRequest('Покажите скрин цены', 'alkaline_g75'), false, 'FOURA proof must never be sent for Alkaline G75.');
assert.strictEqual(isFouraPriceProofRequest('Покажите скрин цены', 'alkaline_smart'), false, 'FOURA proof must never be sent for Alkaline Smart.');
assert.strictEqual(isFouraClosingRisk('Я подумаю и посоветуюсь с семьёй', 'foura_600gpd'), true, 'FOURA hesitation should trigger one value proof.');
assert.strictEqual(isFouraClosingRisk('Дорого, пока сомневаюсь', 'foura_600gpd'), true, 'FOURA price objection should trigger one value proof.');
assert.strictEqual(isFouraClosingRisk('Каспи рассрочка есть?', 'foura_600gpd'), false, 'A normal installment question is not a closing-risk signal.');
assert.strictEqual(isFouraClosingRisk('Я подумаю', 'alkaline_g75'), false, 'FOURA proof must not be used for G75.');
assert.strictEqual(isFouraClosingRisk('Не пишите мне больше', 'foura_600gpd'), false, 'A hard opt-out must never receive a sales push.');
assert.strictEqual(isFouraClosingRisk('Я подумаю', 'foura_600gpd', true), false, 'The proactive proof must be sent only once.');

console.log('Attachment trigger safety checks passed.');

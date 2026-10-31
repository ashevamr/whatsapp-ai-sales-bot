const assert = require('assert');
const {
  resolveProductAttachmentTargets,
  shouldUseLegacyProductAttachments
} = require('./attachment_safety');
const {
  analyzeConversationTurn,
  isRecentAssistantDuplicate,
  isBurstDuplicateCustomerMessage,
  isPaymentVerificationEvent,
  isServiceHandoverRequest
} = require('./conversation_safety');
const { detectAdvertisedProduct, isEmptyReferralEvent } = require('./ad_context');
const workflow = require('./ai_workflow');

let checks = 0;
function check(actual, expected, label) {
  checks += 1;
  assert.deepStrictEqual(actual, expected, `#${checks} ${label}`);
}

const targetCases = [
  [{}, [false, false, false]],
  [{ wantsFoura: true }, [true, false, false]],
  [{ wantsAlkaline: true }, [false, true, false]],
  [{ wantsAlkalineSmart: true }, [false, false, true]],
  [{ wantsBoth: true }, [true, true, true]],
  [{ wantsFoura: true, fouraAlreadyPresented: true }, [false, false, false]],
  [{ wantsAlkaline: true, alkalineAlreadyPresented: true }, [false, false, false]],
  [{ wantsAlkalineSmart: true, alkalineSmartAlreadyPresented: true }, [false, false, false]],
  [{ wantsFoura: true, wantsAlkaline: true }, [true, false, false]],
  [{ wantsFoura: true, wantsAlkalineSmart: true }, [false, false, true]]
];
for (const [input, expected] of targetCases) {
  const result = resolveProductAttachmentTargets(input);
  check(result.foura, expected[0], 'FOURA attachment target');
  check(result.alkaline, expected[1], 'G75 attachment target');
  check(result.alkalineSmart, expected[2], 'Smart attachment target');
}

const attachmentGateCases = [
  [{ hasAttachmentRequest: true, hasProductTarget: true }, true],
  [{ hasAttachmentRequest: false, hasProductTarget: true }, false],
  [{ hasAttachmentRequest: true, hasProductTarget: false }, false],
  [{ hasAttachmentRequest: true, hasProductTarget: true, isFouraThreeStepContext: true }, false],
  [{ hasAttachmentRequest: true, hasProductTarget: true, isKaspiProof: true }, false],
  [{ hasAttachmentRequest: true, hasProductTarget: true, aiTalksAboutKaspiProof: true }, false],
  [{ hasAttachmentRequest: true, hasProductTarget: true, isCertificateRequested: true }, false],
  [{ hasAttachmentRequest: true, hasProductTarget: true, shouldSendProductCatalog: true }, false]
];
for (const [input, expected] of attachmentGateCases) {
  check(shouldUseLegacyProductAttachments(input), expected, 'legacy attachment safety gate');
}

const adCases = [
  [{ _data: { referral: { headline: 'FOURA' } } }, 'foura'],
  [{ _data: { referral: { body: 'без накопительного бака' } } }, 'foura'],
  [{ _data: { referral: { body: 'Alkaline G75' } } }, 'alkaline'],
  [{ _data: { referral: { body: 'Alkaline Smart' } } }, 'alkalineSmart'],
  [{ _data: { referral: { body: 'фильтр для воды' } } }, null]
];
for (const [input, expected] of adCases) check(detectAdvertisedProduct(input), expected, 'advertised product routing');
check(isEmptyReferralEvent({ text: '', hasMedia: false, isVoice: false }), true, 'empty referral is silent');
check(isEmptyReferralEvent({ text: 'Привет', hasMedia: false, isVoice: false }), false, 'visible referral text is processed');

const cityHistory = [{ sender: 'ai', text: 'Подскажите, из какого вы города?' }];
const presentationHistory = [{ sender: 'ai', text: 'Хотите, отправлю презентацию модели?' }];
check(analyzeConversationTurn({ text: 'Актобе', history: cityHistory, advertisedProduct: 'foura' }).cityReply, true, 'city stage accepts city');
check(analyzeConversationTurn({ text: 'Да', history: cityHistory, advertisedProduct: 'foura' }).cityReply, false, 'city stage rejects yes');
check(analyzeConversationTurn({ text: 'Да', history: presentationHistory, advertisedProduct: 'foura' }).confirmFouraPresentation, true, 'FOURA yes launches bundle');
check(analyzeConversationTurn({ text: 'Да', history: presentationHistory, advertisedProduct: 'alkaline' }).confirmFouraPresentation, false, 'Alkaline context cannot launch FOURA bundle');

const now = Date.now();
check(isRecentAssistantDuplicate([{ sender: 'ai', text: 'Хотите презентацию?', timestamp: new Date(now).toISOString() }], 'Отправить вам презентацию?', 600000, now), true, 'reworded presentation question is blocked');
check(isRecentAssistantDuplicate([{ sender: 'ai', text: 'Из какого вы города?', timestamp: new Date(now).toISOString() }], 'Какой у вас город?', 600000, now), true, 'reworded city question is blocked');
check(isBurstDuplicateCustomerMessage([{ sender: 'user', text: 'Да', timestamp: new Date(now).toISOString() }], 'Да', 45000, now), true, 'same inbound burst is blocked');
check(isBurstDuplicateCustomerMessage([{ sender: 'ai', text: 'Хотите презентацию?', timestamp: new Date(now).toISOString() }], 'Да', 45000, now), false, 'answer after assistant is allowed');

check(isPaymentVerificationEvent('КВИТАНЦИЯ: БИН 000'), true, 'receipt routes to manual review');
check(isPaymentVerificationEvent('Сколько стоит?'), false, 'price question stays automated');
check(isServiceHandoverRequest('После установки фильтр течет'), true, 'installed-filter fault routes to service');
check(isServiceHandoverRequest('Есть защита от протечек?'), false, 'feature question stays automated');

check(workflow.buildFouraAdReply().match(/Здравствуйте/g)?.length, 1, 'FOURA intro greets once');
check(workflow.buildFouraAdCityReply('Актобе').includes('Спасибо, Актобе'), true, 'FOURA city response uses city');
check(workflow.buildFouraPriceObjectionAnswer().includes('Alkaline'), false, 'FOURA price response never switches product');
check(workflow.stripCustomerFileReferences('[foura main picture.jpeg] Ответ').includes('jpeg'), false, 'file label is stripped');
check((workflow.formatSalesReply('Один вопрос? Один вопрос?').match(/Один вопрос\?/g) || []).length, 1, 'duplicate sentence is removed');

console.log(`Current routing scenario suite passed: ${checks} checks.`);

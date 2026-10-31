const assert = require('assert');
const fs = require('fs');
const {
  isAffirmative,
  isNegative,
  isCityQuestion,
  isPresentationQuestion,
  isLikelyCityReply,
  analyzeConversationTurn,
  isRecentAssistantDuplicate,
  isBurstDuplicateCustomerMessage,
  getQuestionIntents,
  isPaymentVerificationEvent,
  isServiceHandoverRequest
} = require('./conversation_safety');
const { detectAdvertisedProduct, isEmptyReferralEvent } = require('./ad_context');
const { shouldProcessCustomerInboundMessage } = require('./inbound_message_guard');
const workflow = require('./ai_workflow');
const { COMMERCIAL_FACTS, isKaspiZero24Active, getCommercialFactsForPrompt, getCommercialConversationPolicy } = require('./commercial_facts');

let checks = 0;
function check(actual, expected, label) {
  checks += 1;
  assert.deepStrictEqual(actual, expected, `#${checks} ${label}`);
}

const affirmatives = ['да', 'Да', 'давай', 'давайте', 'хочу', 'отправляй', 'отправьте', 'пришлите', 'можно', 'ок', 'окей', 'yes', 'yeah', 'sure', 'иә', 'ия', 'жақсы', 'әрине'];
for (const value of affirmatives) check(isAffirmative(value), true, `${value} is affirmative`);

const nonAffirmatives = ['Балхаш', 'Актобе', 'нет', 'не надо', 'подумаю', 'цена', 'сколько', 'привет', 'Алматы?', 'FOURA'];
for (const value of nonAffirmatives) check(isAffirmative(value), false, `${value} is not affirmative`);

const negatives = ['нет', 'не надо', 'не нужно', 'не хочу', 'no', 'not now', 'жоқ', 'керек емес'];
for (const value of negatives) check(isNegative(value), true, `${value} is negative`);

const cityQuestions = ['Из какого вы города?', 'С какого вы города?', 'Какой у вас город?', 'Қай қаладан жазып тұрсыз?', 'Қай қала?'];
for (const value of cityQuestions) check(isCityQuestion(value), true, `${value} asks for city`);

const notCityQuestions = ['Хотите презентацию?', 'С баком или без?', 'Сколько стоит?', 'Как вас зовут?', 'Отправить фото?'];
for (const value of notCityQuestions) check(isCityQuestion(value), false, `${value} does not ask for city`);

const validCities = ['Балхаш', 'Актобе', 'Усть-Каменогорск', 'Нур Султан', 'Кызылорда', 'Талдыкорган', 'Жанаозен', 'Косшы', 'Талгар', 'Шымкент', 'Атырау', 'Павлодар', 'Костанай', 'Семей', 'Караганда'];
for (const value of validCities) check(isLikelyCityReply(value, { awaitingCity: true }), true, `${value} accepted after city question`);

const invalidCities = ['Да', 'Нет', 'Ок', 'Спасибо', 'Понятно', 'Подумаю', 'Сколько', 'Цена', 'Дорого', 'Привет', 'FOURA', 'без бака', '150000', 'Сколько стоит?', 'Хочу фильтр'];
for (const value of invalidCities) check(isLikelyCityReply(value, { awaitingCity: true }), false, `${value} rejected as city`);
for (const value of validCities.slice(0, 5)) check(isLikelyCityReply(value, { awaitingCity: false }), false, `${value} rejected when city was not requested`);

const presentationQuestions = ['Хотите, отправлю презентацию модели?', 'Отправить вам презентацию?', 'Прислать презентацию FOURA?'];
for (const value of presentationQuestions) check(isPresentationQuestion(value), true, `${value} asks for presentation`);
for (const value of ['Из какого вы города?', 'Хотите фото?', 'Сколько стоит?']) check(isPresentationQuestion(value), false, `${value} is not a presentation question`);

const fouraHistory = [{ sender: 'ai', text: 'Хотите, отправлю презентацию модели?' }];
check(analyzeConversationTurn({ text: 'Да', history: fouraHistory, advertisedProduct: 'foura' }).confirmFouraPresentation, true, 'yes confirms FOURA presentation');
check(analyzeConversationTurn({ text: 'Да', history: fouraHistory, advertisedProduct: 'alkaline' }).confirmFouraPresentation, false, 'FOURA presentation cannot launch for Alkaline ad');
check(analyzeConversationTurn({ text: 'Нет', history: fouraHistory, advertisedProduct: 'foura' }).confirmFouraPresentation, false, 'no declines FOURA presentation');
check(analyzeConversationTurn({ text: 'Да', history: [{ sender: 'ai', text: 'Из какого вы города?' }], advertisedProduct: 'foura' }).cityReply, false, 'yes is never a city');
check(analyzeConversationTurn({ text: 'Актобе', history: [{ sender: 'ai', text: 'Из какого вы города?' }], advertisedProduct: 'foura' }).cityReply, true, 'Aктобе is city only in city stage');

const adCases = [
  [{ _data: { referral: { headline: 'FOURA без накопительного бака' } } }, 'foura'],
  [{ _data: { ctwaContext: { description: 'прямоточный фильтр' } } }, 'foura'],
  [{ _data: { contextInfo: { externalAdReplyInfo: { title: 'ФОУРА' } } } }, 'foura'],
  [{ _data: { referral: { body: 'Alkaline Smart' } } }, 'alkalineSmart'],
  [{ _data: { referral: { body: 'Alkaline G75' } } }, 'alkaline'],
  [{ _data: { referral: { body: 'обычный фильтр' } } }, null]
];
for (const [message, expected] of adCases) check(detectAdvertisedProduct(message), expected, 'ad product detection');
check(isEmptyReferralEvent({ text: '', hasMedia: false, isVoice: false }), true, 'empty event stays silent');
check(isEmptyReferralEvent({ text: 'Привет', hasMedia: false, isVoice: false }), false, 'real text is processed');
check(isEmptyReferralEvent({ text: '', hasMedia: true, isVoice: false }), false, 'real media is processed');

const inboundCases = [
  [{ from: '7701@c.us', fromMe: false }, true],
  [{ from: '7701@c.us', fromMe: true }, false],
  [{ from: '7701@c.us', fromMe: false, id: { fromMe: true } }, false],
  [{ from: 'group@g.us', fromMe: false }, false],
  [{ from: 'status@broadcast', fromMe: false }, false],
  [null, false]
];
for (const [message, expected] of inboundCases) check(shouldProcessCustomerInboundMessage(message), expected, 'inbound safety');

const now = Date.now();
const recentHistory = [{ sender: 'ai', text: 'Хотите презентацию?', timestamp: new Date(now - 1000).toISOString() }];
check(isRecentAssistantDuplicate(recentHistory, 'Хотите презентацию?', 600000, now), true, 'recent exact duplicate blocked');
check(isRecentAssistantDuplicate(recentHistory, 'Другой вопрос?', 600000, now), false, 'different reply allowed');
check(isRecentAssistantDuplicate([{ sender: 'user', text: 'Хотите презентацию?', timestamp: new Date(now).toISOString() }], 'Хотите презентацию?', 600000, now), false, 'customer text does not block bot reply');
check(isRecentAssistantDuplicate([{ sender: 'ai', text: 'Хотите презентацию?', timestamp: new Date(now - 700000).toISOString() }], 'Хотите презентацию?', 600000, now), false, 'old reply expires');
check(isRecentAssistantDuplicate(recentHistory, 'Отправить вам презентацию?', 600000, now), true, 'same presentation question intent blocked');
check(isRecentAssistantDuplicate([{ sender: 'ai', text: 'Подскажите, из какого вы города?', timestamp: new Date(now).toISOString() }], 'Какой у вас город?', 600000, now), true, 'reworded city question blocked');
check(getQuestionIntents('С баком или без бака?').includes('filter_type'), true, 'filter-type intent detected');
check(isBurstDuplicateCustomerMessage([{ sender: 'user', text: 'Да', timestamp: new Date(now - 1000).toISOString() }], 'Да', 45000, now), true, 'burst duplicate customer text blocked');
check(isBurstDuplicateCustomerMessage([{ sender: 'ai', text: 'Хотите презентацию?', timestamp: new Date(now - 1000).toISOString() }], 'Да', 45000, now), false, 'same customer answer after bot question is allowed');
check(isBurstDuplicateCustomerMessage([{ sender: 'user', text: 'Да', timestamp: new Date(now - 60000).toISOString() }], 'Да', 45000, now), false, 'old customer text can be repeated');

for (const value of [
  '[РЕЗУЛЬТАТ ПРОВЕРКИ КВИТАНЦИИ В РЕАЛЬНОМ ВРЕМЕНИ: КВИТАНЦИЯ: БИН 000, Сумма 1 тг.]',
  'КВИТАНЦИЯ: БИН 000, Сумма 1 тг.'
]) check(isPaymentVerificationEvent(value), true, 'payment evidence requires human review');
for (const value of ['Сколько стоит?', 'Хочу оплатить наличными', 'Есть рассрочка?']) {
  check(isPaymentVerificationEvent(value), false, 'normal payment question stays in sales flow');
}

for (const value of ['Фильтр течет снизу', 'После установки фильтр не работает', 'Покупала у вас фильтр, теперь он сломался']) {
  check(isServiceHandoverRequest(value), true, 'installed filter problem requires service handover');
}
for (const value of ['Сколько стоит обслуживание?', 'Как часто менять картриджи?', 'Есть защита от протечек?']) {
  check(isServiceHandoverRequest(value), false, 'normal service question stays in sales flow');
}

check(COMMERCIAL_FACTS.products.foura.cashPrice, 185000, 'FOURA cash price');
check(COMMERCIAL_FACTS.products.alkaline.cashPrice, 109000, 'G75 cash price');
check(COMMERCIAL_FACTS.products.alkalineSmart.installment.kaspi.termMonths, 12, 'Smart Kaspi is 12 months');
check(COMMERCIAL_FACTS.products.foura.installment.kaspi.termMonths, 12, 'FOURA Kaspi is 12 months');
check(COMMERCIAL_FACTS.products.alkaline.installment.kaspi.termMonths, 12, 'G75 Kaspi is 12 months');
const factsText = getCommercialFactsForPrompt(getCommercialConversationPolicy([], 'цена'));
check(factsText.includes('Kaspi 0-0-24'), isKaspiZero24Active(), 'prompt follows dated Kaspi 0-0-24 campaign');
check(factsText.includes('до 6 сентября'), isKaspiZero24Active(), 'active prompt names the Kaspi campaign deadline');
check(factsText.includes('185 000 ₸'), true, 'prompt contains FOURA price');
check(factsText.includes('109 000 ₸'), true, 'prompt contains G75 price');

const repeated = workflow.formatSalesReply('Хотите презентацию? Хотите презентацию?');
check((repeated.match(/Хотите презентацию\?/g) || []).length, 1, 'duplicate sentence removed');
check(workflow.formatSalesReply('Короткий ответ. Что важно?').endsWith('?'), true, 'complete question retained');
check(workflow.stripCustomerFileReferences('[foura main.jpeg] Готово').includes('jpeg'), false, 'file name removed');
check(workflow.buildFouraAdCityReply('Актобе').includes('G75'), false, 'FOURA city response excludes G75');
check(workflow.buildFouraAdCityReply('Актобе').includes('бесплатная доставка'), false, 'FOURA city response makes no free-delivery promise');
check(workflow.shouldAnswerFouraPriceObjection('FOURA дорогой, есть скидка?'), true, 'FOURA discount objection is deterministic');
check(workflow.buildFouraPriceObjectionAnswer().includes('G75'), false, 'FOURA price objection never switches models');
check(workflow.buildFouraPriceObjectionAnswer().includes('Kaspi 0-0-12'), true, 'FOURA objection offers current Kaspi term');
check(workflow.buildEligibleG75CashOffer().includes('100 000 ₸'), true, 'eligible G75 cash offer uses controlled price');
check(workflow.buildSafeFallbackReply([{ sender: 'ai', text: 'Уже ответили' }], 'Да').startsWith('[HANDOVER]'), true, 'AI outage never repeats welcome in an active chat');
check(workflow.buildSafeFallbackReply([], 'Здравствуйте! Можно узнать об этом подробнее?'), workflow.buildWelcomeMessage(), 'first generic lead still gets approved welcome');

const aiSource = fs.readFileSync(require.resolve('./ai_workflow'), 'utf8');
const activePromptSource = aiSource.split('/* Retired long-form prompt.')[0];
check(activePromptSource.includes('${knowledgeBase}'), false, 'legacy database is not injected into active prompt');
check(activePromptSource.includes('260 из 300'), false, 'fake scarcity absent from active prompt');
const executeFallbackSource = aiSource.slice(aiSource.indexOf('async executeWithFallback'), aiSource.indexOf('getRobustModel'));
check(executeFallbackSource.includes('lastMessageContent'), false, 'voice/media fallback has no out-of-scope message variable');
const serverSource = fs.readFileSync(require.resolve('./server').replace(/server\.js$/, 'server.js'), 'utf8');
check(serverSource.includes("🚚 Бесплатная доставка и установка по всему Казахстану"), false, 'FOURA presentation has no nationwide free-delivery claim');
check(serverSource.includes('isBurstDuplicateCustomerMessage(chats[chatId].messages, textContent)'), true, 'duplicate inbound event guard is active');
check(serverSource.includes("presentationProgress.foura = { pdf: false, text: false, example: false }"), true, 'FOURA partial bundle progress is persisted');
check(serverSource.includes('async function sendProductCatalog(chatId, chatObj, chatRecord)'), true, 'catalog sender exists');
check(fs.existsSync(require('path').join(__dirname, 'Vodel content', COMMERCIAL_FACTS.catalog.fileName)), true, 'catalog PDF exists at configured path');

assert.ok(checks >= 100, `Expected at least 100 checks, ran ${checks}`);
console.log(`Full safety matrix passed: ${checks} checks.`);

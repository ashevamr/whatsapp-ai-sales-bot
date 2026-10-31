function normalize(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9әіңғүұқөһ\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
}

const AFFIRMATIVE = new Set(['да', 'давай', 'давайте', 'хочу', 'отправляй', 'отправьте', 'пришлите', 'можно', 'ок', 'окей', 'yes', 'yeah', 'sure', 'иә', 'ия', 'иа', 'жақсы', 'әрине']);
const NEGATIVE = new Set(['нет', 'не надо', 'не нужно', 'не хочу', 'no', 'not now', 'жоқ', 'керек емес']);
const NOT_A_CITY = new Set([...AFFIRMATIVE, ...NEGATIVE, 'спасибо', 'понятно', 'цена', 'сколько', 'почему', 'дорого', 'подумаю', 'здравствуйте', 'привет']);

function isAffirmative(text) {
  return AFFIRMATIVE.has(normalize(text));
}

function isNegative(text) {
  return NEGATIVE.has(normalize(text));
}

function detectProductMenuChoice(text) {
  const value = normalize(text);
  const match = value.match(/^(?:вариант|номер|пункт)?\s*([1-3])(?:\s*(?:вариант|номер|пункт))?$/i);
  if (match) return Number(match[1]);

  // Text choices are intentionally narrow: this runs only while the menu is
  // open, but a real product question must still reach the consultant logic.
  if (/^(?:хочу |нужен |нужна |пришлите |отправьте |покажите |давайте )?(?:каталог|все модели|все фильтры|модели и цены)$/.test(value)) return 1;
  if (/^(?:вариант )?(?:foura|фоура)(?: 600 gpd)?$/.test(value)) return 2;
  if (/^(?:вариант )?(?:alkaline smart|алкалайн смарт)$/.test(value)) return 3;
  return null;
}

function isCityQuestion(text) {
  return /(?:из|с)\s+какого\s+(?:вы\s+)?города|какой\s+у\s+вас\s+город|қай\s+қаладан|қай\s+қала/i.test(String(text || ''));
}

function isPresentationQuestion(text) {
  return /(?:хотите|отправить|отправлю|прислать|прислать).*презентац|презентац.*(?:хотите|отправить|отправлю|прислать)/i.test(String(text || ''));
}

function isCatalogQuestion(text) {
  const value = String(text || '');
  return /каталог/i.test(value)
    && /(?:хотите|отправ(?:ить|лю)|пришл(?:ите|ю)|показ(?:ать|ать)|ссылк)/i.test(value);
}

function isLikelyCityReply(text, { awaitingCity = false } = {}) {
  if (/[?？]/.test(String(text || ''))) return false;
  const value = normalize(text);
  if (!awaitingCity || value.length < 3 || value.length > 80 || NOT_A_CITY.has(value)) return false;
  if (/\d|цен|стоим|рассроч|фильтр|foura|фоура|бак|достав|установ|каспи/i.test(value)) return false;
  return /^[a-zа-яәіңғүұқөһ][a-zа-яәіңғүұқөһ\s-]*$/i.test(value);
}

function recentAssistantText(history) {
  return [...(history || [])].reverse().find(message => message.sender !== 'user')?.text || '';
}

function recentAssistantTurnText(history) {
  const parts = [];
  for (let index = (history || []).length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (message.sender === 'user') break;
    parts.unshift(String(message.text || ''));
  }
  return parts.join('\n');
}

function isG75PresentationOffer(text) {
  const value = normalize(text);
  return /alkaline\s*g\s*75|алкалайн\s*g?\s*75|\bg\s*75\b/.test(value)
    && /расскаж|показ|отправ|присл|подроб|модель|вариант/.test(value);
}

function getQuestionIntents(text) {
  const raw = String(text || '');
  if (!/[?？]/.test(raw)) return [];
  const value = normalize(raw);
  const intents = [];
  const patterns = [
    ['city', /(?:из|с) какого (?:вы )?города|какой у вас город|қай қаладан|қай қала/],
    ['filter_type', /с (?:накопительным )?баком|без бака|какой фильтр|какой вариант/],
    ['presentation', /презентац/],
    ['price', /цен|стоим|сколько.*(?:тг|тенге|стоит)/],
    ['installment', /рассроч|ежемесяч|в месяц|каспи|halyk|freedom/],
    ['installation', /установ|монтаж|мастер|какой день|какое время|когда удобно/],
    ['service', /обслужив|картридж|замен/],
    ['address', /адрес|улиц|дом|квартир|подъезд|мекенжай|көше|пәтер|үй нөмір|уй номер/],
    ['name', /как (?:к вам )?обращ|ваше имя/],
    ['payment', /как.*оплат|способ оплат|наличн/],
    ['photo', /фото|сурет|изображен|как выглядит/]
  ];
  for (const [intent, pattern] of patterns) {
    if (pattern.test(value)) intents.push(intent);
  }
  return intents;
}

function tokenSimilarity(left, right) {
  const leftTokens = new Set(normalize(left).split(' ').filter(token => token.length > 2));
  const rightTokens = new Set(normalize(right).split(' ').filter(token => token.length > 2));
  if (leftTokens.size < 4 || rightTokens.size < 4) return 0;
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

function analyzeConversationTurn({ text = '', history = [], advertisedProduct = null } = {}) {
  const previousAssistant = recentAssistantText(history);
  const previousAssistantTurn = recentAssistantTurnText(history);
  // The city question may be the first of several bubbles in the last turn.
  const awaitingCity = isCityQuestion(previousAssistantTurn);
  const awaitingPresentation = isPresentationQuestion(previousAssistant);
  const awaitingCatalog = isCatalogQuestion(previousAssistant);
  return {
    previousAssistant,
    affirmative: isAffirmative(text),
    negative: isNegative(text),
    cityReply: isLikelyCityReply(text, { awaitingCity }),
    confirmFouraPresentation: advertisedProduct === 'foura' && awaitingPresentation && isAffirmative(text),
    confirmCatalog: awaitingCatalog && isAffirmative(text),
    confirmG75Presentation: isAffirmative(text) && isG75PresentationOffer(previousAssistantTurn)
  };
}

function isRecentAssistantDuplicate(history, text, windowMs = 10 * 60 * 1000, now = Date.now()) {
  const target = normalize(text);
  if (!target) return false;
  const targetIntents = new Set(getQuestionIntents(text));
  return [...(history || [])].reverse().some(message => {
    if (message.sender === 'user') return false;
    const timestamp = Date.parse(message.timestamp || '');
    if (Number.isFinite(timestamp) && now - timestamp > windowMs) return false;
    if (normalize(message.text) === target) return true;
    if (tokenSimilarity(message.text, text) >= 0.82) return true;
    const previousIntents = getQuestionIntents(message.text);
    return previousIntents.some(intent => targetIntents.has(intent));
  });
}

function isBurstDuplicateCustomerMessage(history, text, windowMs = 45 * 1000, now = Date.now()) {
  const lastMessage = (history || [])[history.length - 1];
  if (!lastMessage || lastMessage.sender !== 'user' || normalize(lastMessage.text) !== normalize(text)) return false;
  const timestamp = Date.parse(lastMessage.timestamp || '');
  return !Number.isFinite(timestamp) || now - timestamp <= windowMs;
}

function isPaymentVerificationEvent(text) {
  return /\[?результат\s+проверки\s+квитанции|квитанция:\s*бин/i.test(String(text || ''));
}

function isServiceHandoverRequest(text) {
  const value = normalize(text);
  const hasProblem = /теч|протек|слом|не работает|перестал|ремонт|неисправ|гудит|шумит|запах после|ошибка/.test(value);
  const installedContext = /уже установлен|после установки|покупал|покупала|купил|купила|наш фильтр|фильтр/.test(value);
  return hasProblem && installedContext;
}

function isFouraPriceProofRequest(text, productId) {
  const explicitProof = /420|скрин|докаж|маркетплейс|покаж.*цен|подтверд.*цен/i.test(normalize(text));
  return explicitProof && productId === 'foura_600gpd';
}

function isFouraClosingRisk(text, productId, alreadySent = false) {
  if (alreadySent || productId !== 'foura_600gpd') return false;
  const value = normalize(text);
  const hardOptOut = /не пишите|не беспокойте|не хочу|точно не буду|отказываюсь|отказался|отказалась/.test(value);
  if (hardOptOut) return false;
  return /дорог|не потян|не по бюджету|подума|надо подумать|посовет|с семьей|с семьёй|обсудить с муж|обсудить с жен|сомнева|не уверен|не уверена|позже реш|пока не реш|сравню|сравнить цены/.test(value);
}

function isPriceObjection(text) {
  const value = normalize(text);
  if (!value) return false;

  const directConcern = /дорог|слишком много|не потян|не по карман|не по бюджету|не могу позвол|дешевле|подешевле|доступнее|скидк|уступ|сниз.*цен|торг|too expensive|cheaper|discount/.test(value);
  const kazakhConcern = /қымбат|кымбат|арзанырақ|арзанырак|жеңілдік|женілдік|ақша.*жетп|акша.*жетп|бюджетке.*(?:жоғары|жогары)|баға(?:сын|сына|сы)?\s*(?:келіс|келис|түсір|тусир)|бағасына\s*келіс|багасына\s*келис|келісейік|келисейик/.test(value);
  return directConcern || kazakhConcern;
}

function isStandalonePriceQuestion(text) {
  const value = normalize(text);
  return /^(?:а\s+)?(?:цена|стоимость|сколько|сколько стоит|price|бағасы|багасы|қанша|канша)$/.test(value);
}

function hasAlkalineSmartContext(history = []) {
  return [...history].reverse().slice(0, 10).some(message => {
    const value = normalize([message.text, message.context].filter(Boolean).join(' '));
    return /alkaline smart|алкалайн смарт/.test(value)
      || (/150\s*000/.test(value) && /смарт|smart/.test(value));
  });
}

function shouldOfferG75BudgetAlternative({
  text = '',
  history = [],
  activeProductId = null,
  selectedProduct = null,
  alreadyOffered = false
} = {}) {
  if (alreadyOffered) return false;
  const selectedSmart = selectedProduct === 'alkalineSmart' || selectedProduct === 3;
  const smartContext = activeProductId === 'alkaline_smart' || selectedSmart || hasAlkalineSmartContext(history);
  if (!smartContext) return false;
  if (isPriceObjection(text)) return true;

  const recentCustomerConcern = [...history].reverse().slice(0, 8).some(message => (
    message.sender === 'user' && isPriceObjection(message.text)
  ));
  const smartPriceWasExplained = [...history].reverse().slice(0, 8).some(message => {
    if (message.sender === 'user') return false;
    const value = normalize(message.text);
    return /150\s*000/.test(value) && /alkaline smart|алкалайн смарт|смарт/.test(value);
  });
  return isStandalonePriceQuestion(text) && recentCustomerConcern && smartPriceWasExplained;
}

function detectCustomerLanguage(text = '', history = []) {
  const recentCustomerText = [...history]
    .reverse()
    .filter(message => message.sender === 'user')
    .slice(0, 5)
    .map(message => message.text || '')
    .reverse()
    .join(' ');
  const value = normalize(`${recentCustomerText} ${text}`);
  const hasKazakhLetters = /[әіңғүұқөһ]/i.test(value);
  const hasKazakhWords = /\b(?:бағасы|багасы|қымбат|кымбат|керек|келісейік|келисейик|қанша|канша|маған|маган|сізге|бөліп|болама|болады|жақсы|иа|иә)\b/i.test(value);
  return hasKazakhLetters || hasKazakhWords ? 'kk' : 'ru';
}

function isCheckoutOfferQuestion(text) {
  const raw = String(text || '');
  if (!/[?？]/.test(raw)) return false;
  const value = normalize(raw);
  return /оформ.*заказ|заказ.*оформ|оформляем|перейти к оформлению|тапсырыс.*рәсім|тапсырысты рәсім|рәсімдейік пе|расимдейик пе/.test(value);
}

function isExplicitPurchaseIntent(text, previousAssistantText = '') {
  const value = normalize(text);
  const directRussian = /(?:^|\s)(?:оформляйте|оформляем|заказываю|беру|покупаю)(?:\s|$)|хочу купить|готов купить|готова купить|давайте оформ|можно оформлять|ставьте фильтр/.test(value);
  const directKazakh = /сатып аламын|тапсырысты рәсімде|тапсырысты расімде|тапсырыс берейін|тапсырыс берейин|рәсімдейік|расімдейік|рәсімдей беріңіз|расімдей бериниз|орната беріңіз|орната бериниз|(?:^|\s)аламын(?:\s|$)/.test(value);
  if (directRussian || directKazakh) return true;
  return isAffirmative(text) && isCheckoutOfferQuestion(previousAssistantText);
}

function isAddressRequest(text) {
  const raw = String(text || '');
  const value = normalize(raw);
  const mentionsAddress = /адрес|мекенжай|улиц|көше|квартир|пәтер|подъезд|үй нөмір|уй номер/.test(value);
  const asksForIt = /[?？]/.test(raw)
    || /напиш|укаж|сообщ|пришл|назов|можете|нужен|нужна|жаза|жазыңыз|жазыныз|айтыңыз|айтыныз|көрсетіңіз|корсетиниз/.test(value);
  return mentionsAddress && asksForIt;
}

function hasAssistantAddressRequest(history = []) {
  return (history || []).some(message => message.sender !== 'user' && isAddressRequest(message.text));
}

function guardAddressRequest(reply, {
  checkoutAuthorized = false,
  addressAlreadyAsked = false,
  language = 'ru'
} = {}) {
  const raw = String(reply || '').trim();
  const hadAddressRequest = isAddressRequest(raw);
  if (!hadAddressRequest) {
    return { text: raw, hadAddressRequest: false, addressRequestAllowed: false, blocked: false };
  }
  if (checkoutAuthorized && !addressAlreadyAsked) {
    return { text: raw, hadAddressRequest: true, addressRequestAllowed: true, blocked: false };
  }

  const sentences = raw.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [raw];
  const safeText = sentences
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .filter(sentence => !isAddressRequest(sentence))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const fallback = language === 'kk'
    ? 'Модель бойынша сұрақтарыңыз болса, қысқаша жауап беремін.'
    : 'Если остались вопросы по модели, я коротко отвечу.';
  return {
    text: safeText || fallback,
    hadAddressRequest: true,
    addressRequestAllowed: false,
    blocked: true
  };
}

module.exports = {
  normalize,
  isAffirmative,
  isNegative,
  detectProductMenuChoice,
  isCityQuestion,
  isPresentationQuestion,
  isG75PresentationOffer,
  isCatalogQuestion,
  isLikelyCityReply,
  analyzeConversationTurn,
  isRecentAssistantDuplicate,
  isBurstDuplicateCustomerMessage,
  getQuestionIntents,
  isPaymentVerificationEvent,
  isServiceHandoverRequest,
  isFouraPriceProofRequest,
  isFouraClosingRisk,
  isPriceObjection,
  isStandalonePriceQuestion,
  shouldOfferG75BudgetAlternative,
  detectCustomerLanguage,
  isCheckoutOfferQuestion,
  isExplicitPurchaseIntent,
  isAddressRequest,
  hasAssistantAddressRequest,
  guardAddressRequest
};

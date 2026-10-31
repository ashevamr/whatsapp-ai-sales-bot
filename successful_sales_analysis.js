const ANALYSIS_WINDOW_DAYS = 60;
const MAX_FETCHED_GROUP_MESSAGES = 3000;
const MAX_ANALYSIS_MESSAGES = 700;
const MAX_MESSAGE_CHARS = 700;
const COMMERCIAL_REFERENCE_PATTERN = /(?:kaspi|халык|halyk|freedom|рассроч|0\s*[-–]\s*0\s*[-–]\s*\d+|предоплат|оплат|цен|стоим|тенге|тг\b|₸|скидк|акци|подар|бесплатн)/i;

function getMessageTime(message) {
  const raw = Number(message?.timestamp);
  if (!Number.isFinite(raw)) return NaN;
  // whatsapp-web.js timestamps are seconds; accept milliseconds defensively.
  return raw < 10_000_000_000 ? raw * 1000 : raw;
}

function redactText(value) {
  return String(value || '')
    .replace(/\+?\d[\d\s()\-]{6,}\d/g, '[ТЕЛЕФОН]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    .replace(/https?:\/\/\S+/gi, '[ССЫЛКА]')
    .replace(/\b(?:бин|иик|iban)\s*[:№#-]?\s*[\d\w-]+/gi, '[ПЛАТЕЖНЫЕ_ДАННЫЕ]')
    .replace(/\s+/g, ' ')
    .trim();
}

function sampleEvenly(items, maximum) {
  if (items.length <= maximum) return items;
  const result = [];
  for (let index = 0; index < maximum; index += 1) {
    const itemIndex = Math.floor((index * (items.length - 1)) / (maximum - 1));
    result.push(items[itemIndex]);
  }
  return result;
}

function prepareSuccessfulSalesCorpus(messages, options = {}) {
  const now = options.now || Date.now();
  const cutoff = now - ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const authorAliases = new Map();
  let nextAuthor = 1;
  const getAlias = message => {
    if (message?.fromMe) return 'ПРОДАВЕЦ';
    const key = String(message?.author || message?.from || 'unknown');
    if (!authorAliases.has(key)) authorAliases.set(key, `УЧАСТНИК_${nextAuthor++}`);
    return authorAliases.get(key);
  };

  const eligible = (messages || [])
    .map(message => ({ message, time: getMessageTime(message) }))
    .filter(item => Number.isFinite(item.time) && item.time >= cutoff && item.time <= now)
    .sort((a, b) => a.time - b.time)
    .map(({ message, time }) => ({
      at: new Date(time).toISOString(),
      author: getAlias(message),
      type: message.type || 'chat',
      text: redactText(message.body || message.caption || '').slice(0, MAX_MESSAGE_CHARS)
    }))
    .filter(item => item.text);

  const sampled = sampleEvenly(eligible, MAX_ANALYSIS_MESSAGES);
  const transcript = sampled
    .map(item => `[${item.at}] ${item.author}: ${item.text}`)
    .join('\n');

  return {
    metadata: {
      windowDays: ANALYSIS_WINDOW_DAYS,
      availableMessages: eligible.length,
      analyzedMessages: sampled.length,
      wasSampled: sampled.length < eligible.length,
      startAt: eligible[0]?.at || null,
      endAt: eligible[eligible.length - 1]?.at || null
    },
    transcript
  };
}

function hasCommercialReference(value) {
  return COMMERCIAL_REFERENCE_PATTERN.test(String(value || ''));
}

// Historical sales groups may contain expired prices, campaigns, gifts and bank
// plans. Their wording is useful for communication patterns, but never as a
// source of current commercial facts.
function sanitizeSuccessfulSalesPlaybook(playbook) {
  const source = playbook && typeof playbook === 'object' ? playbook : {};
  const list = (items, fallback) => {
    const clean = Array.isArray(items)
      ? items.filter(item => !hasCommercialReference(item)).map(item => String(item).trim()).filter(Boolean)
      : [];
    return clean.length ? clean : fallback;
  };
  const sanitizePattern = item => {
    const value = item && typeof item === 'object' ? item : {};
    if (!hasCommercialReference(`${value.title || ''} ${value.evidence || ''} ${value.rule || ''}`)) return value;
    return {
      title: 'Фиксация договорённостей',
      evidence: 'В кейсах продавец фиксирует договорённость и следующий шаг.',
      rule: 'Актуальные условия всегда брать только из коммерческих фактов бота.',
      confidence: value.confidence || 'medium'
    };
  };
  const sanitizeFlow = item => {
    const value = item && typeof item === 'object' ? item : {};
    if (!hasCommercialReference(`${value.stage || ''} ${value.goal || ''} ${value.bestPractice || ''} ${value.question || ''}`)) return value;
    return {
      stage: 'Подтверждение деталей',
      goal: 'Зафиксировать следующий шаг',
      bestPractice: 'Уточнять условия по актуальному коммерческому файлу перед подтверждением.',
      question: 'Подскажите, когда вам удобно вернуться к оформлению?'
    };
  };
  const sanitizePacing = item => {
    const value = item && typeof item === 'object' ? item : {};
    if (!hasCommercialReference(`${value.recommendation || ''} ${value.evidence || ''}`)) return value;
    return {
      recommendation: 'Одно короткое сообщение — одна мысль и один следующий шаг.',
      evidence: 'Рекомендация основана на форме диалогов, без использования старых коммерческих условий.'
    };
  };

  const limitations = list(source.limitations, []);
  if (!limitations.some(item => /коммерческ.*услов/i.test(item))) {
    limitations.push('Исторические цены, акции, подарки и банковские условия исключены: актуальные данные берутся только из коммерческих фактов бота.');
  }

  return {
    ...source,
    observedPatterns: Array.isArray(source.observedPatterns) ? source.observedPatterns.map(sanitizePattern) : [],
    conversationFlow: Array.isArray(source.conversationFlow) ? source.conversationFlow.map(sanitizeFlow) : [],
    messagePacing: Array.isArray(source.messagePacing) ? source.messagePacing.map(sanitizePacing) : [],
    phrasingToReuse: list(source.phrasingToReuse, ['Подскажите, когда вам удобно продолжить?', 'Мастер свяжется заранее, чтобы согласовать время.']),
    mistakesToAvoid: list(source.mistakesToAvoid, ['Не перегружать клиента длинным сообщением.', 'Не подтверждать детали без проверки актуальных условий.']),
    trainingInstructions: list(source.trainingInstructions, ['Пиши коротко и фиксируй один следующий шаг.', 'Перед оформлением сверяй все условия с коммерческими фактами.']),
    limitations
  };
}

module.exports = {
  ANALYSIS_WINDOW_DAYS,
  MAX_FETCHED_GROUP_MESSAGES,
  prepareSuccessfulSalesCorpus,
  redactText,
  hasCommercialReference,
  sanitizeSuccessfulSalesPlaybook
};

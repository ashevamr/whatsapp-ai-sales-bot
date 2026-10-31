// Company documents the bot sends on request: the EAEU declaration of
// conformity (customers call it a certificate) and the sales contract.

const path = require('path');

const DOCUMENTS_DIR = path.join(__dirname, 'Vodel content', '18_Сертификаты_и_Гарантия');

const COMPANY_DOCUMENTS = {
  certificate: {
    filePath: path.join(DOCUMENTS_DIR, 'Декларация о соответствии VODEL.pdf'),
    caption: 'Вот наш сертификат: декларация о соответствии ЕАЭС на фильтры VODEL😊'
  },
  contract: {
    filePath: path.join(DOCUMENTS_DIR, 'Договор купли-продажи VODEL.pdf'),
    caption: 'Вот наш договор купли-продажи)'
  }
};

const CERTIFICATE_PATTERN = /сертификат|декларац[а-яё]*\s+(?:о\s+)?соответств|документ[а-яё]*\s+(?:о\s+|на\s+)?(?:соответств|качеств|оригинальн|фильтр|товар|продукц)|подтвержден[а-яё]*\s+оригинальност|certificate/i;
// "договорились / договоримся / договорённость" are not about the contract.
const CONTRACT_PATTERN = /(?<![а-яё])договор(?:а|у|ом|е|ы|ов|ам)?(?![а-яё])|келісімшарт|contract/i;
const NEGATED_PATTERN = /(?:не\s+нужен|не\s+надо|не\s+нужно|без)\s+(?:сертификат|договор)|(?:сертификат|договор)[а-яё]*\s+не\s+(?:нужен|надо|нужно)/i;
// Anything else the customer asked in the same message still goes to the AI.
const OTHER_QUESTION_PATTERN = /цен|стоим|сколько|достав|рассроч|kaspi|каспи|halyk|оплат|гаранти|сервис|картридж|установ|адрес|город|когда|модел|бак|кран|скидк|привез|фото|видео|размер/i;

function normalize(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е');
}

function detectDocumentRequest(text) {
  const lower = normalize(text);
  if (!lower.trim() || NEGATED_PATTERN.test(lower)) return [];
  const requested = [];
  if (CERTIFICATE_PATTERN.test(lower)) requested.push('certificate');
  if (CONTRACT_PATTERN.test(lower)) requested.push('contract');
  return requested;
}

// True when the message asks only for documents, so no AI reply is needed.
function isDocumentOnlyRequest(text) {
  const lower = normalize(text)
    .replace(CERTIFICATE_PATTERN, ' ')
    .replace(CONTRACT_PATTERN, ' ');
  return detectDocumentRequest(text).length > 0 && !OTHER_QUESTION_PATTERN.test(lower);
}

function buildDocumentsSentNote(documentKeys) {
  const names = documentKeys.map(key => (key === 'certificate' ? 'сертификат (декларация о соответствии ЕАЭС)' : 'договор купли-продажи'));
  return `[Система: клиенту только что отправлен файл: ${names.join(' и ')}. Не отправляй и не обещай его снова, просто ответь на остальной вопрос.]`;
}

module.exports = {
  COMPANY_DOCUMENTS,
  detectDocumentRequest,
  isDocumentOnlyRequest,
  buildDocumentsSentNote
};

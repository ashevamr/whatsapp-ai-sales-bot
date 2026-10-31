const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  COMPANY_DOCUMENTS,
  detectDocumentRequest,
  isDocumentOnlyRequest,
  buildDocumentsSentNote
} = require('./company_documents');

let checks = 0;
const check = (actual, expected, label) => { assert.deepStrictEqual(actual, expected, label); checks += 1; };

for (const [key, document] of Object.entries(COMPANY_DOCUMENTS)) {
  check(fs.existsSync(document.filePath), true, `${key} PDF exists`);
  check(document.filePath.endsWith('.pdf'), true, `${key} is a PDF`);
  const emojis = document.caption.match(/\p{Extended_Pictographic}/gu) || [];
  check(emojis.every(emoji => emoji === '😊' || emoji === '💐') && emojis.length <= 1, true, `${key} caption emoji style`);
}

for (const [text, expected] of [
  ['Скиньте сертификат', ['certificate']],
  ['У вас есть сертификаты на фильтр?', ['certificate']],
  ['Пришлите декларацию о соответствии', ['certificate']],
  ['Есть документы на фильтр?', ['certificate']],
  ['Можно договор посмотреть?', ['contract']],
  ['Договор заключаете?', ['contract']],
  ['Отправьте пожалуйста договор и сертификат', ['certificate', 'contract']],
  ['Келісімшарт бар ма?', ['contract']],
  ['Хорошо, договорились', []],
  ['Давайте договоримся на завтра', []],
  ['Договорённость в силе', []],
  ['Договор не нужен, просто привезите', []],
  ['Сколько стоит RO-H015?', []],
  ['', []]
]) check(detectDocumentRequest(text), expected, `document request: ${text || '(empty)'}`);

check(isDocumentOnlyRequest('Скиньте сертификат'), true, 'certificate-only request needs no AI reply');
check(isDocumentOnlyRequest('Можно договор посмотреть?'), true, 'contract-only request needs no AI reply');
check(isDocumentOnlyRequest('Пришлите договор, и сколько стоит доставка в Караганду?'), false, 'other questions still go to the AI');
check(isDocumentOnlyRequest('Какая гарантия? Есть сертификат?'), false, 'warranty question still goes to the AI');
check(isDocumentOnlyRequest('Хорошо, договорились'), false, 'no request, nothing to send');

check(buildDocumentsSentNote(['contract']).includes('договор купли-продажи'), true, 'AI is told the contract is sent');

const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
check(serverSource.includes("sendPic('certificate.pdf'"), false, 'old certificate file is no longer sent');
check(/detectDocumentRequest\(textContent\)[\s\S]{0,2500}\/\/ Запуск AI Workflow/.test(serverSource), true, 'documents are sent before the AI reply');

const workflowSource = fs.readFileSync(path.join(__dirname, 'ai_workflow.js'), 'utf8');
check(/never say there is no certificate or contract/.test(workflowSource), true, 'prompt knows the documents exist');

console.log(`Company document checks passed: ${checks} checks.`);

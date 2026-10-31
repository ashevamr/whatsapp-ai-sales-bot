const KAZAKHSTAN_OFFSET_MINUTES = 5 * 60;
const REPORT_HOUR = 22;

const THINKING_PATTERN = /(?:\bя\s+)?подума(?:ю|ем|ть)|надо\s+подумать|позже\s+напиш|пока\s+думаю|если\s+решу|сравню|посоветуюсь|ақылдас|ойланайын/i;
const REFUSAL_PATTERN = /не\s+интерес|не\s+буду\s+(?:брать|покупать)|покупать\s+не\s+буду|не\s+хочу\s+покупать|отказыва|передумал|передумала|не\s+подходит|не\s+пишите|не\s+беспокойте|удалите\s+номер|stop\b|бас\s+тартам|керек\s+емес|алмаймын/i;
const BOUGHT_FLAG_PATTERN = /оплачен|paid|подтвержден|подтверждён|confirmed|продан|completed|установлен/i;
const REFUSED_FLAG_PATTERN = /отмен|cancel|отказ|refund/i;

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function getTimestampMs(value) {
  if (typeof value === 'number') {
    const milliseconds = value < 1e12 ? value * 1000 : value;
    return Number.isFinite(milliseconds) ? milliseconds : NaN;
  }
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getKazakhstanDayWindow(now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const offsetMs = KAZAKHSTAN_OFFSET_MINUTES * 60 * 1000;
  const shifted = new Date(nowMs + offsetMs);
  const dateKey = shifted.toISOString().slice(0, 10);
  const startMs = Date.parse(`${dateKey}T00:00:00.000Z`) - offsetMs;
  return {
    dateKey,
    startMs,
    endMs: startMs + 24 * 60 * 60 * 1000,
    localHour: shifted.getUTCHours(),
    localMinute: shifted.getUTCMinutes()
  };
}

function isWithinWindow(timestamp, window) {
  const timestampMs = getTimestampMs(timestamp);
  return Number.isFinite(timestampMs) && timestampMs >= window.startMs && timestampMs < window.endMs;
}

function getLatestMessage(messages) {
  return [...(messages || [])]
    .filter(Boolean)
    .sort((left, right) => getTimestampMs(left.timestamp) - getTimestampMs(right.timestamp))
    .at(-1) || null;
}

function getSaleStateForToday(chat, completedSales, window) {
  const phone = normalizePhone(chat?.number);
  if (!phone) return null;
  const matchingSales = (completedSales || [])
    .filter(sale => normalizePhone(sale?.phone) === phone && isWithinWindow(sale?.timestamp, window))
    .sort((left, right) => getTimestampMs(right.timestamp) - getTimestampMs(left.timestamp));
  const sale = matchingSales[0];
  if (!sale) return null;
  const flag = String(sale.flag || '');
  if (REFUSED_FLAG_PATTERN.test(flag)) return 'refused';
  if (BOUGHT_FLAG_PATTERN.test(flag)) return 'bought';
  return 'processing';
}

function classifyDailyChat(chat, completedSales, window) {
  const messages = Array.isArray(chat?.messages) ? chat.messages.filter(Boolean) : [];
  const hasCustomerMessageToday = messages.some(message => (
    message.sender === 'user' && isWithinWindow(message.timestamp, window)
  ));
  if (!hasCustomerMessageToday) return null;

  const saleState = getSaleStateForToday(chat, completedSales, window);
  if (saleState === 'bought' || saleState === 'refused') return saleState;

  const latestMessage = getLatestMessage(messages);
  const latestCustomerText = [...messages].reverse().find(message => message.sender === 'user')?.text || '';
  if (REFUSAL_PATTERN.test(String(latestCustomerText))) return 'refused';
  if (THINKING_PATTERN.test(String(latestCustomerText))) return 'thinking';
  if (latestMessage && latestMessage.sender !== 'user') return 'ignored';
  return 'processing';
}

function buildDailySalesSummary(chats, completedSales, options = {}) {
  const window = getKazakhstanDayWindow(options.now || Date.now());
  const summary = {
    dateKey: window.dateKey,
    total: 0,
    ignored: 0,
    thinking: 0,
    processing: 0,
    refused: 0,
    bought: 0,
    conversionPercent: 0
  };

  for (const chat of Object.values(chats || {})) {
    const category = classifyDailyChat(chat, completedSales, window);
    if (!category) continue;
    summary.total += 1;
    summary[category] += 1;
  }

  summary.conversionPercent = summary.total > 0
    ? Math.round((summary.bought / summary.total) * 100)
    : 0;
  return summary;
}

function formatReportDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-');
  return `${day}.${month}.${year}`;
}

function formatDailySalesReport(summary) {
  return `📊 Отчёт VODEL за ${formatReportDate(summary.dateKey)}

Всего обращений: ${summary.total}

Не ответили: ${summary.ignored}
Думают о покупке: ${summary.thinking}
В обработке: ${summary.processing}
Отказались: ${summary.refused}
Купили: ${summary.bought}

Конверсия в покупку: ${summary.conversionPercent}%`;
}

function shouldSendDailyReport({ now = Date.now(), lastSentDate = null, clientReady = false } = {}) {
  const window = getKazakhstanDayWindow(now);
  return Boolean(clientReady)
    && window.localHour >= REPORT_HOUR
    && lastSentDate !== window.dateKey;
}

module.exports = {
  KAZAKHSTAN_OFFSET_MINUTES,
  REPORT_HOUR,
  getTimestampMs,
  getKazakhstanDayWindow,
  classifyDailyChat,
  buildDailySalesSummary,
  formatDailySalesReport,
  shouldSendDailyReport
};

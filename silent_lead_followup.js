// Daily follow-up for leads who stopped answering, modelled on the manager's
// own messages: one short nudge per day, at most MAX_SILENT_FOLLOW_UPS times,
// only in daytime, and never after a refusal, a sale or an operator takeover.

const HOUR_MS = 60 * 60 * 1000;
const MAX_SILENT_FOLLOW_UPS = 4;
const MIN_SILENCE_MS = 18 * HOUR_MS;
const MAX_LEAD_AGE_MS = 7 * 24 * HOUR_MS;
const SEND_WINDOW = { startHour: 11, endHour: 19 };

const OPT_OUT_PATTERN = /не\s+пишите|не\s+беспокойте|отпиш(?:ите|итесь|усь)|удалите\s+номер|не\s+интересно|не\s+нужно|не\s+надо|уже\s+купил|уже\s+купила|передумал|отказываюсь|stop\b/i;
const COMPLETED_PATTERN = /заказ\s+(?:оформлен|принят|подтвержден)|оплат(?:ил|ила|или|а)\b|установк[ау]\s+(?:назначен|подтвержден)/i;

// The manager's wording, one per day of silence.
const FOLLOW_UP_TEXTS = [
  'Что вы думаете по поводу фильтра? Дайте вашу обратную связь пожалуйста)',
  'Что вы решили по поводу фильтра? Может хотели бы варианты со скрытым баком рассмотреть?😊',
  'Можете ответить пожалуйста, что вас не устроило? У нас более 20 моделей, на любой вкус и бюджет',
  'Что вы решили по поводу фильтра? Вы оставили заявку, дайте пожалуйста ответ'
];

function timestampMs(message) {
  const value = Date.parse(message?.timestamp || '');
  return Number.isFinite(value) ? value : NaN;
}

function getSilentFollowUpDecision(chat, { now = Date.now(), kzHour, kzDateKey, completedPhones = new Set() } = {}) {
  const messages = Array.isArray(chat?.messages) ? chat.messages.filter(Boolean) : [];
  if (!chat || chat.status === 'human' || chat.manualTakeover) return { eligible: false, reason: 'HUMAN' };
  if (chat.checkoutAuthorized || chat.disengagementNotified) return { eligible: false, reason: 'HANDLED' };
  if (completedPhones.has(String(chat.number || '').replace(/\D/g, ''))) return { eligible: false, reason: 'SOLD' };
  if (kzHour < SEND_WINDOW.startHour || kzHour >= SEND_WINDOW.endHour) return { eligible: false, reason: 'OUTSIDE_HOURS' };

  const lastMessage = messages[messages.length - 1];
  const lastUserMessage = [...messages].reverse().find(message => message.sender === 'user');
  if (!lastMessage || !lastUserMessage) return { eligible: false, reason: 'NO_LEAD' };
  if (lastMessage.sender !== 'ai') return { eligible: false, reason: 'NOT_WAITING' };
  if (messages.some(message => message.sender === 'user' && OPT_OUT_PATTERN.test(String(message.text || '')))) {
    return { eligible: false, reason: 'OPTED_OUT' };
  }
  if (messages.some(message => COMPLETED_PATTERN.test(String(message.text || '')))) return { eligible: false, reason: 'SOLD' };

  const lastUserAt = timestampMs(lastUserMessage);
  const lastBotAt = timestampMs(lastMessage);
  if (!Number.isFinite(lastUserAt) || now - lastUserAt > MAX_LEAD_AGE_MS) return { eligible: false, reason: 'TOO_OLD' };
  if (!Number.isFinite(lastBotAt) || now - lastBotAt < MIN_SILENCE_MS) return { eligible: false, reason: 'TOO_SOON' };

  // The counter restarts whenever the customer writes again.
  const state = chat.silentFollowUp || {};
  const count = state.anchorUserMessageAt === lastUserMessage.timestamp ? Number(state.count) || 0 : 0;
  if (count >= MAX_SILENT_FOLLOW_UPS) return { eligible: false, reason: 'LIMIT' };
  if (state.lastSentDateKey === kzDateKey) return { eligible: false, reason: 'ALREADY_TODAY' };

  return { eligible: true, step: count, anchorUserMessageAt: lastUserMessage.timestamp, lastBotAt };
}

function buildSilentFollowUpText(step, kzHour) {
  const greeting = step === 0 && kzHour < 12 ? 'Доброе утро!' : 'Здравствуйте!';
  return `${greeting} ${FOLLOW_UP_TEXTS[Math.min(step, FOLLOW_UP_TEXTS.length - 1)]}`;
}

module.exports = {
  MAX_SILENT_FOLLOW_UPS,
  MIN_SILENCE_MS,
  MAX_LEAD_AGE_MS,
  SEND_WINDOW,
  getSilentFollowUpDecision,
  buildSilentFollowUpText
};

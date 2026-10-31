const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_FOLLOW_UP_AGE_MS = 2 * 60 * 60 * 1000;
const MAX_SUGGESTIONS = 20;

const THINKING_PATTERN = /\b(?:я\s+)?подума(?:ю|ем|ть)|надо\s+подумать|позже\s+напиш|не\s+сейчас|пока\s+думаю|если\s+решу|сравню|посоветуюсь/i;
const OPT_OUT_PATTERN = /не\s+пишите|не\s+беспокойте|отпиш(?:ите|итеcь|усь)|удалите\s+номер|stop\b/i;
const COMPLETED_PATTERN = /заказ\s+(?:оформлен|принят|подтвержден)|оплат(?:ил|ила|или|а)\b|установк[ау]\s+(?:назначен|подтвержден)/i;

function getTimestampMs(message) {
  const timestamp = new Date(message?.timestamp || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

function getCustomerName(chat) {
  const name = String(chat?.name || '').trim();
  return name && !/^\+?\d[\d\s-]*$/.test(name) ? name.split(/\s+/)[0] : '';
}

function hasOptedOut(messages) {
  return messages.some(message => message?.sender === 'user' && OPT_OUT_PATTERN.test(String(message?.text || '')));
}

function hasCompletedSale(messages) {
  return messages.some(message => COMPLETED_PATTERN.test(String(message?.text || '')));
}

function buildDraft(category, name) {
  const greeting = name ? `Здравствуйте, ${name}!` : 'Здравствуйте!';
  if (category === 'thinking') {
    return `${greeting} Подскажите, удалось определиться по фильтру? Если остались вопросы по цене, установке или обслуживанию — отвечу коротко😊`;
  }
  return `${greeting} Удалось посмотреть информацию по фильтру? Если остались вопросы, с радостью отвечу)`;
}

function buildFollowUpSuggestions(chats, completedSales = [], options = {}) {
  const now = options.now || Date.now();
  const dayStart = now - DAY_MS;
  const oldestEligibleTime = now - MIN_FOLLOW_UP_AGE_MS;
  const completedPhones = new Set(completedSales.map(sale => String(sale?.phone || '').replace(/\D/g, '')).filter(Boolean));
  const suggestions = [];

  for (const chat of Object.values(chats || {})) {
    const messages = Array.isArray(chat?.messages) ? chat.messages.filter(Boolean) : [];
    if (!chat?.id || messages.length === 0 || hasOptedOut(messages) || hasCompletedSale(messages)) continue;
    if (completedPhones.has(String(chat.number || '').replace(/\D/g, ''))) continue;

    const lastMessage = messages[messages.length - 1];
    const lastMessageAt = getTimestampMs(lastMessage);
    if (!Number.isFinite(lastMessageAt) || lastMessageAt < dayStart || lastMessageAt > oldestEligibleTime) continue;

    let category = null;
    let reason = '';
    if (lastMessage.sender === 'user' && THINKING_PATTERN.test(String(lastMessage.text || ''))) {
      category = 'thinking';
      reason = 'Клиент написал, что хочет подумать';
    } else if (lastMessage.sender === 'ai') {
      category = 'no_reply';
      reason = 'Клиент не ответил на последнее сообщение бота';
    }

    if (!category) continue;
    const name = getCustomerName(chat);
    suggestions.push({
      chatId: chat.id,
      chatName: chat.name || chat.number || 'Клиент',
      phone: chat.number || '',
      category,
      categoryLabel: category === 'thinking' ? 'Думает о покупке' : 'Нет ответа',
      reason,
      lastMessageAt: new Date(lastMessageAt).toISOString(),
      draft: buildDraft(category, name)
    });
  }

  return suggestions
    .sort((a, b) => new Date(a.lastMessageAt) - new Date(b.lastMessageAt))
    .slice(0, MAX_SUGGESTIONS);
}

module.exports = {
  DAY_MS,
  MIN_FOLLOW_UP_AGE_MS,
  MAX_SUGGESTIONS,
  buildFollowUpSuggestions
};

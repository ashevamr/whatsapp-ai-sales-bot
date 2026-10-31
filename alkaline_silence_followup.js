function normalize(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9әіңғүұқөһ\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function isAffirmative(text) {
  return /^(?:да|давай|давайте|хочу|можно|ок|окей|yes|sure|иә|ия|иа|жақсы|әрине)$/.test(normalize(text));
}

function hasConfirmedG75Interest(messages = []) {
  let assistantTurn = [];
  for (const message of messages) {
    if (message.sender === 'user') {
      const customerText = normalize(message.text);
      if (/alkaline\s*g\s*75|алкалайн\s*g?\s*75|\bg\s*75\b/.test(customerText)) return true;

      const offerText = assistantTurn.join(' ');
      if (isAffirmative(customerText)
        && /alkaline\s*g\s*75|алкалайн\s*g?\s*75|\bg\s*75\b/.test(offerText)
        && /расскаж|показ|отправ|присл|подроб|модель|вариант/.test(offerText)) {
        return true;
      }
      assistantTurn = [];
    } else {
      assistantTurn.push(normalize(message.text));
    }
  }
  return false;
}

function shouldScheduleAlkalineSilencePresentation({
  isFirstBotReplyInChat,
  cityReply,
  warehouseCityKnown,
  g75InterestConfirmed,
  alreadySent
}) {
  return !isFirstBotReplyInChat
    && Boolean(cityReply)
    && Boolean(warehouseCityKnown)
    && Boolean(g75InterestConfirmed)
    && !alreadySent;
}

function canSendAlkalineSilencePresentation({
  autoReplyAllowed,
  chatExists,
  chatStatus,
  latestSender,
  alreadySent,
  warehouseCityKnown,
  g75InterestConfirmed
}) {
  return Boolean(autoReplyAllowed)
    && Boolean(chatExists)
    && chatStatus !== 'human'
    && latestSender === 'ai'
    && !alreadySent
    && Boolean(warehouseCityKnown)
    && Boolean(g75InterestConfirmed);
}

function buildWarehouseG75FollowUp({ cityLocative = 'вашем городе', beforeCutoff = false } = {}) {
  const timing = beforeCutoff
    ? 'Работаем день в день: сегодня ещё можем привезти и установить фильтр в удобное время.'
    : 'Можем согласовать бесплатную установку на завтра или другой удобный день.';
  return `Кстати, в ${cityLocative} доставка и установка Alkaline G75 бесплатные. ${timing} 💧\n\nЧто вам удобнее — рассрочка через Halyk/Freedom или полная оплата мастеру после установки?`;
}

function buildWarehouseG75CityReply({ cityLocative = 'вашем городе', beforeCutoff = false } = {}) {
  const timing = beforeCutoff
    ? 'можем организовать установку сегодня в удобное время'
    : 'можем согласовать установку на завтра или другой удобный день';
  return `Отлично, в ${cityLocative} у нас есть склад. Доставка и установка Alkaline G75 бесплатные — ${timing}. 💧\n\nХотите, отправлю презентацию модели?`;
}

module.exports = {
  hasConfirmedG75Interest,
  shouldScheduleAlkalineSilencePresentation,
  canSendAlkalineSilencePresentation,
  buildWarehouseG75FollowUp,
  buildWarehouseG75CityReply
};

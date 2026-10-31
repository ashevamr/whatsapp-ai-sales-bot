'use strict';

// RO-H015 cartridge questions: the bot answers with the replacement prices and
// the price picture. If the customer then stays silent for 20 minutes and lives
// in a warehouse city, the bot offers the first replacement as a gift.

const CARTRIDGE_GIFT_DELAY_MS = 20 * 60 * 1000;

const CARTRIDGE_QUESTION_PATTERN = /картридж|колб|расходник|замен[аиуы]?\s+(?:фильтр|картридж|колб)|сколько\s+стоит\s+замен|обслуживан|картридждер|ауыстыр/i;

function isCartridgeQuestion(text) {
  return CARTRIDGE_QUESTION_PATTERN.test(String(text || '').toLowerCase().replace(/ё/g, 'е'));
}

function canSendCartridgeGiftFollowUp({
  autoReplyAllowed,
  chatExists,
  chatStatus,
  latestSender,
  alreadySent,
  warehouseCityKnown
}) {
  return Boolean(autoReplyAllowed && chatExists)
    && chatStatus !== 'human'
    && latestSender === 'ai'
    && !alreadySent
    && Boolean(warehouseCityKnown);
}

function buildCartridgeGiftFollowUp(language = 'ru') {
  if (language === 'kk') {
    return 'Сізге жақсы жаңалық бар 🎁\n\nRO-H015 орнатсаңыз, картридждердің алғашқы ауыстыруын (3 картридж, 15 500 ₸) сыйлыққа жасаймыз — шебер өзі келіп, тегін ауыстырады.\n\nОрнатуды рәсімдейік пе?';
  }
  return 'У меня для вас хорошая новость 🎁\n\nЕсли установите RO-H015, первую замену картриджей (3 картриджа, 15 500 ₸) сделаем в подарок — мастер сам приедет и бесплатно заменит.\n\nОформим установку?';
}

module.exports = {
  CARTRIDGE_GIFT_DELAY_MS,
  isCartridgeQuestion,
  canSendCartridgeGiftFollowUp,
  buildCartridgeGiftFollowUp
};

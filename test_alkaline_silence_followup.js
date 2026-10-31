const assert = require('assert');
const {
  hasConfirmedG75Interest,
  shouldScheduleAlkalineSilencePresentation,
  canSendAlkalineSilencePresentation,
  buildWarehouseG75FollowUp,
  buildWarehouseG75CityReply
} = require('./alkaline_silence_followup');

const g75History = [
  { sender: 'user', text: 'Если не одобрят' },
  { sender: 'ai', text: 'Есть более доступная модель Alkaline G75.' },
  { sender: 'ai', text: 'Хотите, расскажу подробнее про эту модель?' },
  { sender: 'user', text: 'Да' },
  { sender: 'ai', text: 'Alkaline G75 стоит 109 000 ₸.' },
  { sender: 'ai', text: 'В каком городе вы находитесь?' },
  { sender: 'user', text: 'Астана' },
  { sender: 'ai', text: 'В Астане у нас есть склад.' }
];

assert.strictEqual(hasConfirmedG75Interest(g75History), true, 'Acceptance of a G75 offer is remembered across the later city turn.');
assert.strictEqual(hasConfirmedG75Interest([
  { sender: 'ai', text: 'У нас также есть Alkaline G75.' },
  { sender: 'user', text: 'Астана' }
]), false, 'A model merely mentioned by the bot is not confirmed customer interest.');

assert.strictEqual(shouldScheduleAlkalineSilencePresentation({
  isFirstBotReplyInChat: false,
  cityReply: true,
  warehouseCityKnown: true,
  g75InterestConfirmed: true,
  alreadySent: false
}), true, 'The follow-up is scheduled only after confirmed G75 interest and a warehouse city reply.');

assert.strictEqual(shouldScheduleAlkalineSilencePresentation({
  isFirstBotReplyInChat: true,
  cityReply: true,
  warehouseCityKnown: true,
  g75InterestConfirmed: true,
  alreadySent: false
}), false, 'The welcome message must not trigger an Alkaline presentation.');

assert.strictEqual(shouldScheduleAlkalineSilencePresentation({
  isFirstBotReplyInChat: false,
  cityReply: true,
  warehouseCityKnown: false,
  g75InterestConfirmed: true,
  alreadySent: false
}), false, 'A village or unknown city must not receive a warehouse promise.');

assert.strictEqual(canSendAlkalineSilencePresentation({
  autoReplyAllowed: true,
  chatExists: true,
  chatStatus: 'ai',
  latestSender: 'ai',
  alreadySent: false,
  warehouseCityKnown: true,
  g75InterestConfirmed: true
}), true, 'A silent, active AI chat may receive one presentation.');

assert.strictEqual(canSendAlkalineSilencePresentation({
  autoReplyAllowed: true,
  chatExists: true,
  chatStatus: 'ai',
  latestSender: 'user',
  alreadySent: false,
  warehouseCityKnown: true,
  g75InterestConfirmed: true
}), false, 'A customer reply prevents the follow-up.');

assert.strictEqual(canSendAlkalineSilencePresentation({
  autoReplyAllowed: true,
  chatExists: true,
  chatStatus: 'human',
  latestSender: 'ai',
  alreadySent: false,
  warehouseCityKnown: true,
  g75InterestConfirmed: true
}), false, 'A human-taken chat prevents the follow-up.');

assert.strictEqual(canSendAlkalineSilencePresentation({
  autoReplyAllowed: true,
  chatExists: true,
  chatStatus: 'ai',
  latestSender: 'ai',
  alreadySent: true,
  warehouseCityKnown: true,
  g75InterestConfirmed: true
}), false, 'The presentation is never sent twice.');

const daytimeCityReply = buildWarehouseG75CityReply({ cityLocative: 'Астане', beforeCutoff: true });
assert.match(daytimeCityReply, /Астане/);
assert.match(daytimeCityReply, /бесплатные/);
assert.match(daytimeCityReply, /сегодня/);
assert.match(daytimeCityReply, /презентацию/);

const daytimeFollowUp = buildWarehouseG75FollowUp({ cityLocative: 'Астане', beforeCutoff: true });
assert.match(daytimeFollowUp, /день в день/);
assert.match(daytimeFollowUp, /Halyk\/Freedom/);
assert.doesNotMatch(daytimeFollowUp, /завтра/);

const eveningFollowUp = buildWarehouseG75FollowUp({ cityLocative: 'Астане', beforeCutoff: false });
assert.match(eveningFollowUp, /завтра/);
assert.doesNotMatch(eveningFollowUp, /сегодня ещё/);

console.log('Alkaline silence follow-up checks passed.');

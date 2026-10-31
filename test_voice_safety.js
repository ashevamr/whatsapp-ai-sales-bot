const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  isVoiceMessage,
  normalizeVoiceMimeType,
  cleanVoiceTranscription,
  buildVoiceTranscriptionPrompt,
  shouldPauseForUntranscribedVoice
} = require('./voice_safety');

assert.strictEqual(isVoiceMessage({ hasMedia: true, type: 'ptt' }), true);
assert.strictEqual(isVoiceMessage({ hasMedia: true, type: 'audio' }), true);
assert.strictEqual(isVoiceMessage({ hasMedia: true, type: 'image' }), false);
assert.strictEqual(normalizeVoiceMimeType('audio/ogg; codecs=opus'), 'audio/ogg');
assert.strictEqual(normalizeVoiceMimeType('audio/opus'), 'audio/ogg');
assert.strictEqual(normalizeVoiceMimeType('audio/x-m4a'), 'audio/mp4');
assert.strictEqual(normalizeVoiceMimeType('application/octet-stream'), 'audio/ogg');
assert.strictEqual(cleanVoiceTranscription('Расшифровка: Сколько стоит FOURA?'), 'Сколько стоит FOURA?');
assert.strictEqual(cleanVoiceTranscription('НЕРАЗБОРЧИВО'), '');
assert.ok(buildVoiceTranscriptionPrompt().includes('русским, казахским или смешанным'));
assert.strictEqual(
  shouldPauseForUntranscribedVoice({ isVoice: true, transcriptionSucceeded: false }),
  true,
  'An untranscribed voice message must use the safe retry path, not be guessed.'
);
assert.strictEqual(
  shouldPauseForUntranscribedVoice({ isVoice: true, transcriptionSucceeded: true }),
  false
);
assert.strictEqual(
  shouldPauseForUntranscribedVoice({ isVoice: false, transcriptionSucceeded: false }),
  false
);

const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
assert.ok(serverSource.includes("skipFirstLeadWelcome: receivedVoiceMessage"), 'A first voice note must bypass the generic welcome override.');
assert.ok(serverSource.includes("source: receivedVoiceMessage ? 'voice' : 'text'"), 'Voice origin must be stored with the customer message.');

const workflow = require('./ai_workflow');
assert.ok(
  workflow.buildSafeFallbackReply([], 'Голосовой вопрос', { skipFirstLeadWelcome: true }).startsWith('[HANDOVER]'),
  'A failed voice-answer generation must hand over instead of replacing the voice note with a generic welcome.'
);

console.log('Voice safety checks passed.');

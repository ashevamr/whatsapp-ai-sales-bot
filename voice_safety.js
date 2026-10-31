function isVoiceMessage(message) {
  return Boolean(message?.hasMedia && (message.type === 'audio' || message.type === 'ptt'));
}

function normalizeVoiceMimeType(mimeType) {
  const value = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (!value || value === 'application/ogg' || value === 'audio/opus') return 'audio/ogg';
  if (value === 'audio/x-m4a') return 'audio/mp4';
  return value.startsWith('audio/') ? value : 'audio/ogg';
}

function cleanVoiceTranscription(value) {
  const text = String(value || '')
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^(?:текст|транскрипция|расшифровка|audio transcription)\s*:\s*/i, '')
    .trim();
  if (!text || /^(?:неразборчиво|не удалось|не могу|аудио неразборчиво|тишина|нет речи)/i.test(text)) return '';
  return text;
}

function buildVoiceTranscriptionPrompt() {
  return 'Точно распознай речь в аудиосообщении. Язык может быть русским, казахским или смешанным. Верни только произнесённый текст без комментариев, кавычек и пояснений. Если речь неразборчива, верни: НЕРАЗБОРЧИВО.';
}

function shouldPauseForUntranscribedVoice({ isVoice = false, transcriptionSucceeded = false } = {}) {
  return Boolean(isVoice && !transcriptionSucceeded);
}

module.exports = {
  isVoiceMessage,
  normalizeVoiceMimeType,
  cleanVoiceTranscription,
  buildVoiceTranscriptionPrompt,
  shouldPauseForUntranscribedVoice
};

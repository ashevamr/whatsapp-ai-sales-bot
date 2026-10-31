const STARTUP_AUTOMATION_HOLD_MS = 0;

function getAutomaticReplySafety({
  botEnabled = true,
  clientStatus = 'READY',
  autoReplyAllowedAt = null,
  now = Date.now()
}) {
  if (!botEnabled) {
    return { allowed: false, reason: 'BOT_PAUSED', holdUntil: autoReplyAllowedAt || null };
  }

  if (clientStatus !== 'READY') {
    return { allowed: false, reason: 'WHATSAPP_NOT_READY', holdUntil: autoReplyAllowedAt || null };
  }

  if (Number.isFinite(autoReplyAllowedAt) && now < autoReplyAllowedAt) {
    return { allowed: false, reason: 'STARTUP_SAFETY_HOLD', holdUntil: autoReplyAllowedAt || null };
  }

  return { allowed: true, reason: 'READY', holdUntil: autoReplyAllowedAt };
}

function getReplyAllowedAt(readyAt = Date.now(), holdMs = STARTUP_AUTOMATION_HOLD_MS) {
  return readyAt + holdMs;
}

function isMessageNewForCurrentSession({
  messageTimestampSeconds,
  sessionReadyAtSeconds,
  graceSeconds = 3
}) {
  if (messageTimestampSeconds === null || messageTimestampSeconds === undefined || messageTimestampSeconds === '') return false;
  if (sessionReadyAtSeconds === null || sessionReadyAtSeconds === undefined || sessionReadyAtSeconds === '') return false;
  const timestamp = Number(messageTimestampSeconds);
  const readyAt = Number(sessionReadyAtSeconds);
  if (!Number.isFinite(timestamp) || !Number.isFinite(readyAt)) return false;
  return timestamp >= readyAt - Math.max(0, Number(graceSeconds) || 0);
}

module.exports = {
  STARTUP_AUTOMATION_HOLD_MS,
  getAutomaticReplySafety,
  getReplyAllowedAt,
  isMessageNewForCurrentSession
};

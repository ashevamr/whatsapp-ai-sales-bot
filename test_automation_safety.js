const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  STARTUP_AUTOMATION_HOLD_MS,
  getAutomaticReplySafety,
  getReplyAllowedAt,
  isMessageNewForCurrentSession
} = require('./automation_safety');

const readyAt = 1_000_000;
const allowedAt = getReplyAllowedAt(readyAt);

assert.strictEqual(STARTUP_AUTOMATION_HOLD_MS, 0);
assert.strictEqual(getAutomaticReplySafety({
  botEnabled: false,
  clientStatus: 'READY',
  autoReplyAllowedAt: allowedAt,
  now: allowedAt + 1
}).allowed, false, 'a paused bot must never reply');

assert.strictEqual(getAutomaticReplySafety({
  botEnabled: true,
  clientStatus: 'READY',
  autoReplyAllowedAt: allowedAt,
  now: allowedAt - 1
}).reason, 'STARTUP_SAFETY_HOLD', 'messages before allowed time must be held');

assert.strictEqual(getAutomaticReplySafety({
  botEnabled: true,
  clientStatus: 'DISCONNECTED',
  autoReplyAllowedAt: allowedAt,
  now: allowedAt + 1
}).reason, 'WHATSAPP_NOT_READY', 'a disconnected client must never reply');

assert.strictEqual(getAutomaticReplySafety({
  botEnabled: true,
  clientStatus: 'READY',
  autoReplyAllowedAt: allowedAt,
  now: allowedAt
}).allowed, true, 'an enabled, ready client may reply immediately');

assert.strictEqual(isMessageNewForCurrentSession({
  messageTimestampSeconds: 100,
  sessionReadyAtSeconds: 100
}), true, 'a new message in the current session is allowed');
assert.strictEqual(isMessageNewForCurrentSession({
  messageTimestampSeconds: 99,
  sessionReadyAtSeconds: 100
}), true, 'small timestamp skew is tolerated');
assert.strictEqual(isMessageNewForCurrentSession({
  messageTimestampSeconds: 90,
  sessionReadyAtSeconds: 100
}), false, 'replayed history cannot auto-trigger replies');
assert.strictEqual(isMessageNewForCurrentSession({
  messageTimestampSeconds: null,
  sessionReadyAtSeconds: 100
}), false, 'missing timestamp is fail-closed');

const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const outgoingHandler = serverSource.slice(serverSource.indexOf("client.on('message_create'"), serverSource.indexOf('// API Эндпоинты'));
assert.ok(outgoingHandler.includes('isMessageNewForCurrentSession'), 'Historical outgoing replay must not trigger human takeover');
assert.ok(outgoingHandler.indexOf('isMessageNewForCurrentSession') < outgoingHandler.indexOf('lockChatForHumanMessage'), 'Replay guard must run before takeover');

console.log('Startup automation safety checks passed.');

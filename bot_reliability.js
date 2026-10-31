const fs = require('fs');

function withTimeout(operation, timeoutMs, label = 'operation') {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

function isRecentUnansweredInbound({ message, chat, now = Date.now(), enabledAt = 0 }) {
  const timestamp = Number(message?.timestamp) * 1000;
  if (!message?.id?._serialized || !message.timestamp || !Number.isFinite(timestamp)) return false;
  if (timestamp < enabledAt - 3000 || timestamp < now - 15 * 60_000 || timestamp > now + 60_000) return false;
  if (chat?.status === 'human') return false;
  return !(chat?.messages || []).some(item =>
    (item.sender === 'ai' || item.sender === 'human') && Date.parse(item.timestamp) >= timestamp
  );
}

function createInboundLedger(file, now = () => Date.now()) {
  let state;
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = { enabledAt: now(), entries: {} };
  }
  if (!Number.isFinite(state.enabledAt) || !state.entries) throw new Error('Invalid inbound ledger');
  function save() {
    const entries = Object.entries(state.entries).filter(([, entry]) => entry.at >= now() - 86400_000);
    state.entries = Object.fromEntries(entries.slice(-5000));
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(state));
    fs.renameSync(`${file}.tmp`, file);
  }
  save();
  return {
    enabledAt: state.enabledAt,
    has: id => Boolean(state.entries[id]),
    mark(id, status, chatId) {
      if (!id) return;
      state.entries[id] = { at: now(), status, chatId };
      save();
    }
  };
}

function reconnectDelay(attempt) {
  return Math.min(60_000, 5000 * 2 ** Math.min(attempt, 4));
}

module.exports = { withTimeout, isRecentUnansweredInbound, createInboundLedger, reconnectDelay };

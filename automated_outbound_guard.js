function normalizeBody(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createAutomatedOutboundGuard({ ttlMs = 20_000, now = () => Date.now() } = {}) {
  const pendingByChat = new Map();

  function prune(chatId) {
    const cutoff = now() - ttlMs;
    const pending = (pendingByChat.get(chatId) || []).filter(item => item.createdAt >= cutoff);
    if (pending.length) pendingByChat.set(chatId, pending);
    else pendingByChat.delete(chatId);
    return pending;
  }

  function mark(chatId, { body = '', id = '', isMedia = false } = {}) {
    const pending = prune(chatId);
    pending.push({ body: normalizeBody(body), id: String(id || ''), isMedia, createdAt: now() });
    pendingByChat.set(chatId, pending);
  }

  function consume(chatId, { body = '', id = '', isMedia = false } = {}) {
    const pending = prune(chatId);
    const normalizedBody = normalizeBody(body);
    const messageId = String(id || '');
    const index = pending.findIndex(item => (
      (messageId && item.id && item.id === messageId)
      || (normalizedBody && item.body === normalizedBody)
      || (isMedia && item.isMedia && (!item.body || !normalizedBody || item.body === normalizedBody))
    ));
    if (index < 0) return false;
    pending.splice(index, 1);
    if (pending.length) pendingByChat.set(chatId, pending);
    else pendingByChat.delete(chatId);
    return true;
  }

  // WhatsApp can emit the outgoing echo under a different identifier (for
  // example, @lid instead of @c.us). Exact body/media matching is still a
  // reliable bot-echo signal within this very short pending window.
  function consumeAny(details = {}) {
    for (const chatId of [...pendingByChat.keys()]) {
      if (consume(chatId, details)) return true;
    }
    return false;
  }

  return { mark, consume, consumeAny };
}

module.exports = { createAutomatedOutboundGuard };

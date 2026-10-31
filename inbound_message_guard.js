function isOutgoingFromThisAccount(message) {
  return Boolean(message?.fromMe || message?.id?.fromMe);
}

function shouldProcessCustomerInboundMessage(message) {
  if (!message || isOutgoingFromThisAccount(message)) return false;
  const from = String(message.from || '');
  return Boolean(from) && !from.endsWith('@g.us') && from !== 'status@broadcast';
}

module.exports = { isOutgoingFromThisAccount, shouldProcessCustomerInboundMessage };

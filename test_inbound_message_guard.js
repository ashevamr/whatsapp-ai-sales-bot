const assert = require('assert');
const { isOutgoingFromThisAccount, shouldProcessCustomerInboundMessage } = require('./inbound_message_guard');

assert.strictEqual(
  shouldProcessCustomerInboundMessage({ from: '77010000000@c.us', fromMe: false }),
  true,
  'A customer direct message must be processed.'
);
assert.strictEqual(
  shouldProcessCustomerInboundMessage({ from: '77010000000@c.us', fromMe: true }),
  false,
  'The bot must never process its own outgoing message as customer input.'
);
assert.strictEqual(
  isOutgoingFromThisAccount({ fromMe: false, id: { fromMe: true } }),
  true,
  'WhatsApp ID metadata must also identify an outgoing phone message.'
);
assert.strictEqual(
  shouldProcessCustomerInboundMessage({ from: '77010000000@c.us', fromMe: false, id: { fromMe: true } }),
  false,
  'An outgoing message with only ID metadata must never trigger a bot reply.'
);
assert.strictEqual(
  shouldProcessCustomerInboundMessage({ from: 'group@g.us', fromMe: false }),
  false,
  'Group messages must stay outside the sales bot flow.'
);
assert.strictEqual(
  shouldProcessCustomerInboundMessage({ from: 'status@broadcast', fromMe: false }),
  false,
  'Status broadcasts must stay outside the sales bot flow.'
);

console.log('Inbound message guard checks passed.');

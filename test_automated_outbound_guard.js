const assert = require('assert');
const { createAutomatedOutboundGuard } = require('./automated_outbound_guard');

let clock = 1_000;
const guard = createAutomatedOutboundGuard({ ttlMs: 20_000, now: () => clock });

guard.mark('client@c.us', { body: 'Здравствуйте! 👋' });
assert.strictEqual(guard.consume('client@c.us', { body: 'Здравствуйте! 👋' }), true, 'The bot welcome must not trigger human takeover.');

guard.mark('client@c.us', { body: 'Подскажите, из какого вы города?' });
assert.strictEqual(guard.consume('client@c.us', { body: 'Алматы' }), false, 'A real operator message must still trigger takeover.');
assert.strictEqual(guard.consume('client@c.us', { body: 'Подскажите, из какого вы города?' }), true, 'The queued bot message remains recognizable.');

guard.mark('client@c.us', { isMedia: true });
assert.strictEqual(guard.consume('client@c.us', { isMedia: true, body: 'alkaline.pdf' }), true, 'A bot document echo must not trigger human takeover.');

guard.mark('lead@lid', { body: 'Здравствуйте! 👋' });
assert.strictEqual(guard.consumeAny({ body: 'Здравствуйте! 👋' }), true, 'A @c.us echo of a @lid bot message must not trigger human takeover.');

guard.mark('client@c.us', { body: 'старое сообщение' });
clock += 20_001;
assert.strictEqual(guard.consume('client@c.us', { body: 'старое сообщение' }), false, 'Expired acknowledgements cannot hide a real human reply.');

console.log('Automated outbound guard checks passed.');

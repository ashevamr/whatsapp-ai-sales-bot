'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { applyPatches, MARKER } = require('./scripts/patch_whatsapp_web');

for (const result of applyPatches()) {
  assert.ok(['ok', 'patched'].includes(result.status), `whatsapp-web.js patch failed: ${JSON.stringify(result)}`);
}

const utils = fs.readFileSync(path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Utils.js'), 'utf8');
assert.ok(utils.includes(`${MARKER} if (message.__x_id) delete message.__x_id;`), 'Media sends must drop MediaData __x_id.');

const Message = require('whatsapp-web.js/src/structures/Message');
const incoming = new Message({}, { id: { remote: '1@lid', id: 'ABC', $1: 'false_1@lid_ABC' }, hasMedia: true });
assert.strictEqual(incoming.id._serialized, 'false_1@lid_ABC', 'New WhatsApp ids ($1) must expose _serialized.');
const legacy = new Message({}, { id: { _serialized: 'legacy' } });
assert.strictEqual(legacy.id._serialized, 'legacy');

console.log('whatsapp-web.js media and id patch checks passed.');

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks += 1; };

// Listener guard: READY without message listeners must attach them.
check(/client\.attachEventListeners = async/.test(source), 'attachEventListeners is tracked per page');
check(/client\.on\('ready', \(\) => \{\s*void ensureMessageListenersAttached\(\);/.test(source), 'every ready event checks the message listeners');

// Sweeper: lost events are recovered through the normal inbound handler.
const sweep = source.slice(source.indexOf('async function sweepMissedInboundMessages'), source.indexOf('setInterval(() => { void sweepMissedInboundMessages(); }'));
check(sweep.length > 0, 'missed inbound sweeper exists');
check(/clientStatus !== 'READY'/.test(sweep), 'sweeper runs only when WhatsApp is READY');
check(/!chat\.groupMetadata/.test(sweep) && /@g\.us/.test(sweep) && /broadcast/.test(sweep), 'groups and broadcasts are skipped');
check(/last\.id\.fromMe\) return null/.test(sweep), 'chats already answered from this account are skipped');
check(/automated/.test(sweep), 'the WhatsApp Business greeting does not count as an answer');
check(/15 \* 60/.test(sweep), 'only the last 15 minutes are checked');
check(/processedMsgIds\.has\(messageId\) \|\| inboundLedger\.has\(messageId\)/.test(sweep), 'already processed messages are skipped');
check(/sweptInboundIds\.add\(messageId\)/.test(sweep), 'each message is swept at most once');
check(/await handleInboundMessage\(msg\)/.test(sweep), 'recovered messages use the normal guarded handler');
check(!/sendAutomatedMessage|client\.sendMessage/.test(sweep), 'the sweeper never sends anything itself');

console.log(`Missed inbound recovery checks passed: ${checks} checks.`);

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { withTimeout, isRecentUnansweredInbound, createInboundLedger, reconnectDelay } = require('./bot_reliability');

async function main() {
  const now = 2_000_000;
  const message = { id: { _serialized: 'customer-id' }, timestamp: (now - 60_000) / 1000 };
  const allowed = (overrides = {}) => isRecentUnansweredInbound({ message, now, enabledAt: now - 120_000, ...overrides });
  assert.equal(allowed(), true, 'A new lead sent while reconnecting must be recoverable');
  assert.equal(allowed({ enabledAt: now }), false, 'First deployment must not replay old leads');
  assert.equal(allowed({ message: { ...message, timestamp: (now - 901_000) / 1000 } }), false);
  assert.equal(allowed({ message: { ...message, timestamp: (now + 61_000) / 1000 } }), false);
  assert.equal(allowed({ message: { timestamp: now / 1000 } }), false);
  assert.equal(allowed({ chat: { status: 'human' } }), false, 'Operator takeover stays respected');
  for (const sender of ['ai', 'human']) {
    assert.equal(allowed({ chat: { messages: [{ sender, timestamp: new Date(now).toISOString() }] } }), false,
      'Already answered messages must not receive a replay');
  }
  assert.equal(allowed({ chat: { messages: [{ sender: 'ai', timestamp: new Date(now - 100_000).toISOString() }] } }), true);
  for (let age = 0; age < 900; age += 10) {
    assert.equal(allowed({ enabledAt: 0, message: { ...message, timestamp: (now - age * 1000) / 1000 } }), true);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vodel-ledger-test-'));
  const file = path.join(dir, 'ledger.json');
  try {
    const ledger = createInboundLedger(file, () => now);
    ledger.mark('id-1', 'processing', 'test-chat');
    const restarted = createInboundLedger(file, () => now + 1000);
    assert.equal(restarted.has('id-1'), true, 'Restart during a send cannot duplicate it');
    assert.equal(restarted.enabledAt, now, 'Recovery boundary survives restart');
    restarted.mark('id-1', 'handled', 'test-chat');
    assert.equal(createInboundLedger(file, () => now + 2000).has('id-1'), true);
    assert.equal(createInboundLedger(file, () => now + 86402_000).has('id-1'), false);
  } finally {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
  assert.equal(await withTimeout(() => Promise.resolve('ok'), 50), 'ok');
  await assert.rejects(withTimeout(() => new Promise(() => {}), 5, 'stalled lookup'), /stalled lookup timeout/);
  await assert.rejects(withTimeout(() => { throw new Error('lookup failed'); }, 50), /lookup failed/);
  assert.deepEqual([0, 1, 2, 3, 4, 20].map(reconnectDelay), [5000, 10000, 20000, 40000, 60000, 60000]);
  // Execute the real entry point with an isolated WhatsApp adapter. No sends/network.
  const source = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  assert.ok(source.includes("skipFirstLeadWelcome: true"), 'Recovered existing chats must answer the pending question directly');
  assert.ok(source.includes("recovery: 'legacy_catalog_choice'"), 'Legacy menu choice 4 must still recover the catalog');
  assert.ok(source.includes("recovery: 'budget_alternative'"), 'Price-sensitive pending leads must receive a cheaper option');
  assert.ok(source.includes("recovery: 'media_retry'"), 'Unreadable media must receive a retry request while AI remains active');
  assert.ok(source.includes("automationMode = 'new_leads_only'"), 'Enabling after a pause must default to new leads only');
  assert.ok(source.includes('protectedExistingChatIds.has(chatId)'), 'Existing chats must be excluded in new-leads-only mode');
  assert.ok(source.includes('saveBotRuntimeConfig()'), 'Automation mode must survive restart');
  assert.ok(source.includes('Math.min(...COMMERCIAL_FACTS.catalogProducts.map(product => product.price))'), 'Budget recovery must derive a valid catalog price');
  const handlerSource = source.slice(source.indexOf('async function handleInboundMessage(msg)'), source.indexOf("client.on('message', msg =>"));
  const ids = new Set();
  let executed = 0;
  const sandbox = {
    console: { log() {}, error() {} }, Date, Promise, Set, Map, setTimeout, clearTimeout,
    shouldProcessCustomerInboundMessage: require('./inbound_message_guard').shouldProcessCustomerInboundMessage,
    isRecentUnansweredInbound, withTimeout,
    isMessageNewForCurrentSession: require('./automation_safety').isMessageNewForCurrentSession,
    inboundLedger: { enabledAt: Date.now() - 120_000, has: id => ids.has(id), mark: id => ids.add(id) },
    chats: {}, deferredInbound: new Map(), processedMsgIds: new Set(), MAX_PROCESSED_IDS: 500,
    clientStatus: 'CONNECTING', botEnabled: true, currentSessionReadyAtSeconds: Math.floor(Date.now() / 1000),
    canAutomateChat: () => true,
    getAutoReplySafety: () => ({ allowed: true }),
    runForChat: async (id, fn) => { executed++; await fn(); },
    isVoiceMessage: () => false, getCatalogPreviewContext: () => '', detectAdvertisedProduct: () => '',
    isEmptyReferralEvent: () => true, savePersistentData() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(handlerSource, sandbox);
  const event = { from: 'isolated-test@lid', id: { _serialized: 'event-1' },
    timestamp: Math.floor(Date.now() / 1000) - 60, body: '',
    getContact: async () => { throw new Error('contact unavailable'); },
    getChat: async () => { throw new Error('chat unavailable'); } };
  await sandbox.handleInboundMessage(event);
  assert.equal(sandbox.deferredInbound.size, 1, 'Real handler queues arrivals before READY');
  assert.equal(executed, 0);
  sandbox.clientStatus = 'READY';
  await sandbox.handleInboundMessage(event);
  assert.equal(executed, 1, 'Recent reconnect event reaches real processing');
  assert.equal(sandbox.chats[event.from].name, event.from, 'Missing contact does not crash new lead creation');
  await sandbox.handleInboundMessage(event);
  assert.equal(executed, 1, 'Repeated WhatsApp ID cannot run the workflow twice');
  await sandbox.handleInboundMessage({ ...event, fromMe: true, id: { _serialized: 'own-message' } });
  assert.equal(executed, 1, 'Bot echoes never become customer messages');
  console.log('Reliability checks passed (fresh reconnect leads, replay suppression, restart dedup, timeout, backoff).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

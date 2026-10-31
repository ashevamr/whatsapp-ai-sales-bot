const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { withTimeout, isRecentUnansweredInbound, createInboundLedger, reconnectDelay } = require('./bot_reliability');
const inboundLedger = createInboundLedger(path.join(__dirname, 'inbound_ledger.json'));
const deferredInbound = new Map();
require('dotenv').config();

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const aiWorkflow = require('./ai_workflow');
const { COMMERCIAL_FACTS, formatTenge, formatInstallmentOptions, formatKaspiInstallmentOptions, getCommercialConversationPolicy, resolveWarehouseCityLocative, getCatalogPreviewContext, resolveLatestCatalogProduct, getKazakhstanIsoDate } = require('./commercial_facts');
const { STARTUP_AUTOMATION_HOLD_MS, getAutomaticReplySafety, getReplyAllowedAt, isMessageNewForCurrentSession } = require('./automation_safety');
const { DAY_MS, MIN_FOLLOW_UP_AGE_MS, buildFollowUpSuggestions } = require('./follow_up_suggestions');
const { MAX_SILENT_FOLLOW_UPS, getSilentFollowUpDecision, buildSilentFollowUpText } = require('./silent_lead_followup');
const { MAX_FETCHED_GROUP_MESSAGES, prepareSuccessfulSalesCorpus, sanitizeSuccessfulSalesPlaybook } = require('./successful_sales_analysis');
const { resolveProductAttachmentTargets, shouldUseLegacyProductAttachments } = require('./attachment_safety');
const { COMPANY_DOCUMENTS, detectDocumentRequest, isDocumentOnlyRequest, buildDocumentsSentNote } = require('./company_documents');
const {
  isVoiceMessage,
  normalizeVoiceMimeType,
  cleanVoiceTranscription,
  buildVoiceTranscriptionPrompt,
  shouldPauseForUntranscribedVoice
} = require('./voice_safety');
const {
  hasConfirmedG75Interest,
  shouldScheduleAlkalineSilencePresentation,
  canSendAlkalineSilencePresentation,
  buildWarehouseG75FollowUp,
  buildWarehouseG75CityReply
} = require('./alkaline_silence_followup');
const { createAutomatedOutboundGuard } = require('./automated_outbound_guard');
const { isOutgoingFromThisAccount, shouldProcessCustomerInboundMessage } = require('./inbound_message_guard');
const { detectAdvertisedProduct, isEmptyReferralEvent } = require('./ad_context');
const { classifyNativeBusinessGreeting, purgeNativeBusinessGreetings } = require('./native_business_greeting');
const { buildDailySalesSummary, formatDailySalesReport, shouldSendDailyReport } = require('./daily_sales_report');
const { sanitizeCustomerFacingText } = require('./customer_brand_safety');
const {
  analyzeConversationTurn,
  isRecentAssistantDuplicate,
  isBurstDuplicateCustomerMessage,
  detectProductMenuChoice,
  isPaymentVerificationEvent,
  isServiceHandoverRequest,
  isFouraPriceProofRequest,
  isFouraClosingRisk,
  shouldOfferG75BudgetAlternative,
  detectCustomerLanguage,
  isExplicitPurchaseIntent,
  hasAssistantAddressRequest,
  guardAddressRequest
} = require('./conversation_safety');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pictures', express.static(path.join(__dirname, 'pictures')));
app.use('/catalog_assets', express.static(path.join(__dirname, 'public', 'catalog_assets')));

// Web Catalog Subpage Route
app.get('/catalog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
});
app.get('/catalog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
});
app.get('/api/catalog-products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'catalog_products.json'));
});

// Хранилище в памяти и файлы на диске для сохранения при перезапуске
const fs = require('fs');
const CHATS_FILE = path.join(__dirname, 'chats_store.json');
const SALES_FILE = path.join(__dirname, 'sales_store.json');
const SUCCESS_CASES_REPORT_FILE = path.join(__dirname, 'successful_sales_playbook.json');
const DAILY_REPORT_STATE_FILE = path.join(__dirname, 'daily_report_state.json');
const BOT_RUNTIME_CONFIG_FILE = path.join(__dirname, 'bot_runtime_config.json');
// Private owner contacts live in .env so they never reach the repository.
const SUCCESS_CASES_GROUP_NAME = process.env.SUCCESS_CASES_GROUP_NAME || '';
const TAKEOVER_OWNER_PHONE = String(process.env.TAKEOVER_OWNER_PHONE || '').replace(/D/g, '');
const { foura: FOURA_FACTS, alkaline: ALKALINE_FACTS, alkalineSmart: ALKALINE_SMART_FACTS } = COMMERCIAL_FACTS.products;
const CATALOG_FACTS = COMMERCIAL_FACTS.catalog;

const ALKALINE_SMART_PRESENTATION_TEXT = `💧 ALKALINE SMART — КОРЕЙСКИЙ СМАРТ-ФИЛЬТР ДЛЯ ЧИСТОЙ И ЩЕЛОЧНОЙ ВОДЫ

Современная система очистки воды с интеллектуальным управлением, сенсорным дисплеем и 6 ступенями очистки. Фильтр обеспечивает два вида воды: щелочную и фильтрованную.

🇰🇷 Производство — Южная Корея

✅ ОСНОВНЫЕ ПРЕИМУЩЕСТВА:

✅ 6 ступеней очистки — эффективная многоступенчатая фильтрация воды
✅ 2 вида воды — щелочная и фильтрованная
✅ Бак-накопитель 8 литров — запас очищенной воды всегда под рукой
✅ Сенсорный дисплей управления — современное и удобное управление системой
✅ TDS-индикатор — контроль показателей очищенной воды
✅ Индикатор замены картриджей — система подскажет, когда необходимо обслуживание
✅ Датчик антипотоп — защита от протечек
✅ Датчик гидроудара — дополнительная защита системы
✅ Автоматическая промывка системы — поддержание эффективности фильтрации
✅ Двойной смеситель — отдельная подача разных видов воды
✅ Современный Smart-дизайн и компактное исполнение

🛡 ГАРАНТИЯ — 36 МЕСЯЦЕВ
🔧 Бесплатное сервисное обслуживание на весь срок службы (15 лет)
🚚 Доставка и установка — БЕСПЛАТНО

💰 СПЕЦИАЛЬНАЯ ЦЕНА
🔥 ${formatTenge(ALKALINE_SMART_FACTS.cashPrice)}
Скидка — 50%

💳 Рассрочка:
• ${formatInstallmentOptions(ALKALINE_SMART_FACTS)}

💧 ALKALINE SMART — это удобное решение для дома, которое объединяет многоступенчатую очистку, щелочную воду, интеллектуальное управление и защиту системы.

Напишите, если хотите оформить заказ или уточнить детали! 😊`;

const FOURA_PRESENTATION_TEXT = `💧 FOURA — ПЕРВЫЙ ОРИГИНАЛЬНЫЙ КОРЕЙСКИЙ СМАРТ-ФИЛЬТР В КАЗАХСТАНЕ

Компания VODEL первой завезла FOURA в Казахстан и является эксклюзивным поставщиком данной модели.

✅ Без накопительного бака — всегда свежая вода 24/7
✅ Нет застоя воды, запаха и постороннего привкуса
✅ Щелочная и минерализованная вода
✅ Мембрана 600 GPD — до 2200 литров чистой воды в сутки
✅ TDS-дисплей контроля качества воды в режиме реального времени
✅ Индикатор замены картриджей
✅ Автоматическая самоочистка системы
✅ Датчик защиты от протечек (антипотоп)
✅ Автоматический регулятор давления
✅ Компактный размер и полностью закрытый корпус
✅ Двойной смеситель
✅ Современные технологии и интеллектуальное управление
✅ Срок службы системы до 15–20 лет

💰 ОБСЛУЖИВАНИЕ FOURA

🔹 1-й год — ${formatTenge(FOURA_FACTS.service.replacementSchedule[0].price)}
Замена 2 картриджей через ${FOURA_FACTS.service.firstReplacementIntervalMonths} месяцев после установки.

🔹 2-й год — ${formatTenge(FOURA_FACTS.service.replacementSchedule[1].price)}
Замена 3 картриджей.

🔹 3-й год — ${formatTenge(FOURA_FACTS.service.replacementSchedule[2].price)}
Полная замена комплекта картриджей.

✅ Полупромышленная мембрана обратного осмоса 600 GPD служит до ${FOURA_FACTS.service.membraneAndOrpReplacementYears} лет.

✅ Щелочной ORP-картридж также меняется всего 1 раз в ${FOURA_FACTS.service.membraneAndOrpReplacementYears} года.

📌 В обычных фильтрах с баком замена картриджей требуется каждые 6 месяцев и обходится в среднем 50 000–60 000 ₸ в год. Кроме того, через несколько лет часто требуется замена бака стоимостью 40 000–50 000 ₸.

🇰🇷 Производство — Южная Корея
📄 Сертификат соответствия
🔬 Щелочная вода подтверждена лабораторными анализами

🚚 Условия доставки и установки подтверждаются отдельно по вашему городу
🛡 Гарантия ${FOURA_FACTS.warrantyYears} года
🔧 Бесплатное сервисное обслуживание ${FOURA_FACTS.freeServiceYears} лет

🔥 Стоимость FOURA — ${formatTenge(FOURA_FACTS.cashPrice)}

💳 Рассрочка:
• ${formatInstallmentOptions(FOURA_FACTS)}

Напишите, если хотите оформить заказ или уточнить детали.`;

let chats = {};
let completedSales = [];
let successfulSalesReport = null;
let dailyReportState = { lastSentDate: null, lastSentAt: null };
let dailyReportTimer = null;
let dailyReportSending = false;
const filterTypeFollowUpTimers = new Map();
const FILTER_TYPE_FOLLOW_UP_DELAY_MS = 3 * 60 * 1000;
const MAX_REMINDER_RESTART_OVERDUE_MS = 60 * 1000;
const alkalineSilenceFollowUpTimers = new Map();
const ALKALINE_SILENCE_FOLLOW_UP_DELAY_MS = 3 * 60 * 1000;
const automatedOutboundGuard = createAutomatedOutboundGuard();

function buildAlkalineSilencePresentationText() {
  return `Alkaline G75 — фильтр с накопительным баком. Он очищает воду и хранит запас в баке, чтобы чистая вода всегда была под рукой.\n\nСтоимость: ${formatTenge(ALKALINE_FACTS.cashPrice)} при полной оплате или ${formatTenge(ALKALINE_FACTS.installmentPrice)} в рассрочку.\n\nПодойдёт вам вариант с баком?`;
}

function loadPersistentData() {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const data = fs.readFileSync(CHATS_FILE, 'utf8');
      chats = JSON.parse(data);
      let removedNativeGreetings = 0;
      let unlockedChats = 0;
      for (const chat of Object.values(chats)) {
        const migration = purgeNativeBusinessGreetings(chat);
        removedNativeGreetings += migration.removed;
        if (migration.unlocked) unlockedChats += 1;
      }
      if (removedNativeGreetings > 0) {
        // Sales are loaded below. Never call the combined save here or an
        // empty in-memory sales array would overwrite sales_store.json.
        saveChatsData();
        console.log(`[NATIVE GREETING] Removed ${removedNativeGreetings} stored WhatsApp Business greeting(s); restored ${unlockedChats} chat(s) to AI mode.`);
      }
      console.log(`💾 Восстановлено чатов из диска: ${Object.keys(chats).length}`);
    }
  } catch (e) {
    console.error('Ошибка загрузки chats_store.json:', e.message);
    chats = {};
  }

  try {
    if (fs.existsSync(SALES_FILE)) {
      const data = fs.readFileSync(SALES_FILE, 'utf8');
      completedSales = JSON.parse(data);
      console.log(`💾 Восстановлено продаж из диска: ${completedSales.length}`);
    }
  } catch (e) {
    console.error('Ошибка загрузки sales_store.json:', e.message);
    completedSales = [];
  }
}

function loadSuccessfulSalesReport() {
  try {
    if (fs.existsSync(SUCCESS_CASES_REPORT_FILE)) {
      successfulSalesReport = JSON.parse(fs.readFileSync(SUCCESS_CASES_REPORT_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Ошибка загрузки отчета успешных кейсов:', error.message || error);
    successfulSalesReport = null;
  }
}

function loadDailyReportState() {
  try {
    if (fs.existsSync(DAILY_REPORT_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DAILY_REPORT_STATE_FILE, 'utf8'));
      dailyReportState = {
        lastSentDate: parsed?.lastSentDate || null,
        lastSentAt: parsed?.lastSentAt || null
      };
    }
  } catch (error) {
    console.error('Ошибка загрузки состояния ежедневного отчёта:', error.message || error);
    dailyReportState = { lastSentDate: null, lastSentAt: null };
  }
}

function saveDailyReportState() {
  fs.writeFileSync(DAILY_REPORT_STATE_FILE, JSON.stringify(dailyReportState, null, 2), 'utf8');
}

function saveSuccessfulSalesReport(report) {
  successfulSalesReport = report;
  fs.writeFileSync(SUCCESS_CASES_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
}

function saveChatsData() {
  const cleanChats = {};
  for (const [id, chat] of Object.entries(chats)) {
    const { followUpTimer1, followUpTimer2, ...clean } = chat;
    cleanChats[id] = clean;
  }
  fs.writeFileSync(CHATS_FILE, JSON.stringify(cleanChats, null, 2), 'utf8');
}

function saveSalesData() {
  fs.writeFileSync(SALES_FILE, JSON.stringify(completedSales, null, 2), 'utf8');
}

function savePersistentData() {
  try {
    saveChatsData();
    saveSalesData();
  } catch (e) {
    console.error('Ошибка сохранения данных на диск:', e.message);
  }
}

loadPersistentData();
loadSuccessfulSalesReport();
loadDailyReportState();

function getSupervisorChatId() {
  const raw = process.env.SUPERVISOR_PHONE || '';
  let cleanNumber = raw.split('#')[0].replace(/\D/g, '');
  if (cleanNumber) {
    if (cleanNumber.startsWith('8') && cleanNumber.length === 11) {
      cleanNumber = '7' + cleanNumber.substring(1);
    }
    if (cleanNumber !== '77000000000') {
      return `${cleanNumber}@c.us`;
    }
  }
  return null;
}

function getTakeoverOwnerChatId() {
  return TAKEOVER_OWNER_PHONE ? `${TAKEOVER_OWNER_PHONE}@c.us` : null;
}

function normalizeWhatsAppTitle(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

// whatsapp-web.js getChats() serializes every chat and can fail because of one
// unrelated, malformed group model. For this read-only report we only need the
// named group, so locate it from the live collection without serializing all
// conversations first.
async function findGroupIdByExactName(groupName) {
  const targetName = normalizeWhatsAppTitle(groupName);
  const matches = await client.pupPage.evaluate((target) => {
    const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
    const chatCollection = window.require('WAWebCollections').Chat;
    return chatCollection.getModelsArray()
      .filter(chat => Boolean(chat?.groupMetadata))
      .map(chat => ({
        id: chat?.id?._serialized || null,
        name: chat?.name || chat?.formattedTitle || chat?.formattedName || ''
      }))
      .filter(chat => chat.id && normalize(chat.name) === target);
  }, targetName);
  return matches[0]?.id || null;
}

// This mirrors Chat.fetchMessages but returns a small, plain-data subset. The
// implementation deliberately avoids opening the chat, sending a presence
// update, or marking the group as read.
async function fetchGroupMessagesReadOnly(chatId, limit) {
  return client.pupPage.evaluate(async (id, requestedLimit) => {
    const chat = await window.WWebJS.getChat(id, { getAsModel: false });
    if (!chat) throw new Error('GROUP_NOT_AVAILABLE');

    let messages = chat.msgs.getModelsArray().filter(message => !message.isNotification);
    while (messages.length < requestedLimit) {
      const earlierMessages = await window.require('WAWebChatLoadMessages').loadEarlierMsgs({ chat });
      if (!earlierMessages || !earlierMessages.length) break;
      messages = [...earlierMessages.filter(message => !message.isNotification), ...messages];
    }
    messages.sort((left, right) => Number(left.t || 0) - Number(right.t || 0));
    if (messages.length > requestedLimit) messages = messages.slice(-requestedLimit);

    return messages.map(message => ({
      timestamp: message.t,
      fromMe: Boolean(message.id?.fromMe),
      author: message.author?._serialized || message.from?._serialized || '',
      from: message.from?._serialized || '',
      type: message.type || 'chat',
      body: message.body || message.caption || ''
    }));
  }, chatId, limit);
}

let qrCodeData = null;
let clientStatus = 'DISCONNECTED'; // DISCONNECTED, QR_READY, READY
let botEnabled = false;
let automationMode = 'paused';
let protectedExistingChatIds = new Set();

function saveBotRuntimeConfig() {
  const serialized = JSON.stringify({
    mode: automationMode,
    protectedExistingChatIds: [...protectedExistingChatIds],
    updatedAt: new Date().toISOString()
  });
  fs.writeFileSync(`${BOT_RUNTIME_CONFIG_FILE}.tmp`, serialized);
  fs.renameSync(`${BOT_RUNTIME_CONFIG_FILE}.tmp`, BOT_RUNTIME_CONFIG_FILE);
}

function loadBotRuntimeConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(BOT_RUNTIME_CONFIG_FILE, 'utf8'));
    automationMode = ['paused', 'new_leads_only', 'all'].includes(saved.mode) ? saved.mode : 'paused';
    protectedExistingChatIds = new Set(Array.isArray(saved.protectedExistingChatIds) ? saved.protectedExistingChatIds : []);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[BOT MODE] Could not load runtime config:', error.message);
    automationMode = 'paused';
    protectedExistingChatIds = new Set(Object.keys(chats));
    saveBotRuntimeConfig();
  }
  botEnabled = automationMode !== 'paused';
  console.log(`[BOT MODE] ${automationMode}; protected existing chats: ${protectedExistingChatIds.size}.`);
}

function canAutomateChat(chatId) {
  if (!botEnabled || automationMode === 'paused') return false;
  return automationMode === 'all' || !protectedExistingChatIds.has(chatId);
}

loadBotRuntimeConfig();
let autoReplyAllowedAt = Date.now();
let currentSessionReadyAtSeconds = null;
let startupSafetyTimer = null;
let readyRecoveryTimer = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let authenticationRequired = false;
let lastInboundAt = null;
const READY_RECOVERY_DELAY_MS = 20 * 1000;

function scheduleReconnect() {
  if (reconnectTimer || authenticationRequired || isShuttingDown) return;
  const delay = reconnectDelay(reconnectAttempt++);
  console.log(`[RECONNECT] Retrying connection in ${delay / 1000}s.`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (isShuttingDown || authenticationRequired || clientStatus === 'READY' || isInitializing) return;
    try {
      await withTimeout(() => client.destroy(), 10_000, 'WhatsApp close');
    } catch (error) { console.warn('[RECONNECT] Cleanup:', error.message); }
    void safeInitializeClient();
  }, delay);
}

function cancelAllFilterTypeFollowUps() {
  for (const timer of filterTypeFollowUpTimers.values()) clearTimeout(timer);
  filterTypeFollowUpTimers.clear();
  for (const timer of alkalineSilenceFollowUpTimers.values()) clearTimeout(timer);
  alkalineSilenceFollowUpTimers.clear();
}

function disarmAutomaticReplies(reason) {
  autoReplyAllowedAt = null;
  if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
  startupSafetyTimer = null;
  cancelReadyRecovery();
  cancelAllFilterTypeFollowUps();
  console.log(`[SAFETY HOLD] Automatic replies paused: ${reason}.`);
}

function cancelReadyRecovery() {
  if (readyRecoveryTimer) clearTimeout(readyRecoveryTimer);
  readyRecoveryTimer = null;
}

function scheduleReadyRecovery() {
  cancelReadyRecovery();
  readyRecoveryTimer = setTimeout(async () => {
    readyRecoveryTimer = null;
    if (clientStatus !== 'CONNECTING' || !isInitializing || !client.pupPage) return;

    try {
      // WhatsApp Web can finish authentication before whatsapp-web.js registers
      // its hasSynced listener. This only completes that already-authorized
      // local callback; it does not send, read, or modify any WhatsApp chat.
      const result = await client.pupPage.evaluate(async () => {
        if (typeof window.onAppStateHasSyncedEvent !== 'function') return 'callback_unavailable';
        await window.onAppStateHasSyncedEvent();
        return 'callback_completed';
      });
      console.log(`[READY RECOVERY] ${result}`);
    } catch (error) {
      console.warn('[READY RECOVERY] Could not complete missed sync callback:', error.message || error);
    }
  }, READY_RECOVERY_DELAY_MS);
}

function getAutoReplySafety() {
  return getAutomaticReplySafety({
    botEnabled,
    clientStatus,
    autoReplyAllowedAt
  });
}

function getBotConfig() {
  const safety = getAutoReplySafety();
  return {
    botEnabled,
    automationMode,
    protectedExistingChats: protectedExistingChatIds.size,
    autoReplyReady: safety.allowed,
    autoReplyReason: safety.reason,
    autoReplyAllowedAt: safety.holdUntil
  };
}

function beginStartupSafetyHold() {
  if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
  autoReplyAllowedAt = Date.now();
  console.log('[BOT READY] WhatsApp is ready and bot is actively listening for incoming messages.');
  broadcast('bot_config_change', getBotConfig());
}

// Настройка WhatsApp Web Client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-quic',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

let isInitializing = false;
async function safeInitializeClient() {
  if (isInitializing) return;
  isInitializing = true;
  try {
    clientStatus = 'CONNECTING';
    broadcast('status', { status: clientStatus });
    await client.initialize();
  } catch (err) {
    console.error('⚠️ Ошибка инициализации WhatsApp (перехват сбоя навигации):', err.message || err);
    clientStatus = 'DISCONNECTED';
    broadcast('status', { status: clientStatus });
    isInitializing = false;
    disarmAutomaticReplies('initialization error');
    scheduleReconnect();
  }
}

let healthCheckRunning = false;
let healthFailures = 0;
setInterval(async () => {
  if (healthCheckRunning || clientStatus !== 'READY' || isShuttingDown) return;
  healthCheckRunning = true;
  try {
    const state = await withTimeout(() => client.getState(), 8000, 'WhatsApp health');
    if (state !== 'CONNECTED') throw new Error(`WhatsApp state: ${state}`);
    healthFailures = 0;
  } catch (error) {
    console.warn('[HEALTH]', error.message);
    if (++healthFailures >= 2) {
      clientStatus = 'DISCONNECTED';
      isInitializing = false;
      disarmAutomaticReplies('health check failed');
      broadcast('status', { status: clientStatus });
      scheduleReconnect();
    }
  } finally { healthCheckRunning = false; }
}, 20_000).unref();

function getCleanChat(chat) {
  if (!chat) return null;
  const { followUpTimer1, followUpTimer2, ...cleanChat } = chat;
  return cleanChat;
}

function broadcast(type, payload) {
  let cleanPayload = payload;
  if (payload && payload.chat) {
    cleanPayload = { ...payload, chat: getCleanChat(payload.chat) };
  } else if (payload && payload.chats) {
    cleanPayload = { ...payload, chats: payload.chats.map(getCleanChat) };
  }
  const message = JSON.stringify({ type, payload: cleanPayload });
  wss.clients.forEach(wsClient => {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(message);
    }
  });
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

// Read-only recovery for a small, explicitly requested set of leads that wrote
// while a device was in the startup safety hold. It never sends a WhatsApp
// message; recovery is deliberately separated from delivery.
async function recoverMissedInboundLeads(phoneNumbers) {
  if (clientStatus !== 'READY') throw new Error('WhatsApp is not connected.');

  const requestedNumbers = [...new Set((phoneNumbers || [])
    .map(normalizePhone)
    .filter(number => /^\d{10,15}$/.test(number)))].slice(0, 3);
  const remoteChats = await client.getChats();
  const recovered = [];

  for (const requestedNumber of requestedNumbers) {
    let matchedChat = null;
    let matchedContact = null;

    for (const remoteChat of remoteChats) {
      if (remoteChat.isGroup) continue;
      try {
        const contact = await remoteChat.getContact();
        const candidates = [contact?.number, contact?.id?.user, remoteChat?.id?.user];
        try { candidates.push(await contact?.getFormattedNumber?.()); } catch (_) {}
        if (candidates.some(candidate => normalizePhone(candidate) === requestedNumber)) {
          matchedChat = remoteChat;
          matchedContact = contact;
          break;
        }
      } catch (_) {
        // A deleted/inaccessible chat is simply not a recovery candidate.
      }
    }

    if (!matchedChat) {
      recovered.push({ phone: requestedNumber, recovered: false, reason: 'CHAT_NOT_FOUND' });
      continue;
    }

    const recentMessages = await matchedChat.fetchMessages({ limit: 30 });
    const latestInbound = recentMessages
      .filter(message => !message.fromMe && String(message.body || '').trim())
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))[0];

    if (!latestInbound) {
      recovered.push({ phone: requestedNumber, recovered: false, reason: 'NO_TEXT_MESSAGE' });
      continue;
    }

    const chatId = latestInbound.from || matchedChat.id?._serialized;
    if (!chatId) {
      recovered.push({ phone: requestedNumber, recovered: false, reason: 'CHAT_ID_UNAVAILABLE' });
      continue;
    }

    const chatName = matchedContact?.name || matchedContact?.pushname || requestedNumber;
    const timestamp = new Date(Number(latestInbound.timestamp || Date.now() / 1000) * 1000).toISOString();
    const userMessage = { sender: 'user', text: String(latestInbound.body).trim(), timestamp };
    if (!chats[chatId]) {
      chats[chatId] = {
        id: chatId,
        name: chatName,
        number: requestedNumber,
        status: 'ai',
        messages: [],
        albumSent: { foura: false, alkaline: false, alkalineSmart: false }
      };
    }
    if (!chats[chatId].messages) chats[chatId].messages = [];
    chats[chatId].name = chatName;
    chats[chatId].number = requestedNumber;
    const alreadyStored = chats[chatId].messages.some(message => (
      message.sender === 'user' && message.text === userMessage.text && message.timestamp === userMessage.timestamp
    ));
    if (!alreadyStored) chats[chatId].messages.push(userMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: userMessage, chat: chats[chatId] });
    recovered.push({ phone: requestedNumber, recovered: true, chatId, name: chatName, message: userMessage });
  }

  return recovered;
}

async function sendFirstReplyForRecoveredLead(chatId) {
  const chat = chats[chatId];
  if (!chat || clientStatus !== 'READY') throw new Error('Chat is unavailable for delivery.');
  if (!getAutoReplySafety().allowed || !botEnabled) throw new Error('Automatic replies are not enabled.');
  if (!canAutomateChat(chatId)) throw new Error('Automation is disabled for this existing chat.');
  if (chat.status === 'human') throw new Error('Human takeover is active for this chat.');
  if (chat.messages.some(message => message.sender === 'ai' || message.sender === 'human')) {
    throw new Error('This chat already has a consultant reply.');
  }

  const latestUserMessage = [...chat.messages].reverse().find(message => message.sender === 'user');
  if (!latestUserMessage) throw new Error('No customer message is available.');

  const reply = aiWorkflow.buildWelcomeMessage();
  const cleanReply = String(reply || '').trim();
  if (!cleanReply || cleanReply === 'HANDOVER' || cleanReply.startsWith('[HANDOVER]')) {
    throw new Error('A safe first reply could not be generated.');
  }

  await sendAutomatedMessage(chatId, cleanReply);
  const botMessage = { sender: 'ai', text: cleanReply, timestamp: new Date().toISOString() };
  chat.messages.push(botMessage);
  chat.awaitingProductMenu = true;
  chat.productMenuReminderSent = false;
  chat.productMenuVersion = 'current3';
  savePersistentData();
  broadcast('new_message', { chatId, message: botMessage, chat });
  scheduleFilterTypeFollowUp(chatId);
  updateChatAnalytics(chatId);
  return botMessage;
}

// Утилита: имитация человеческого набора текста (Анти-бан + Smart Seen + Typing indicator)
async function simulateHumanTyping(chatObj, textLength) {
  try {
    if (chatObj && typeof chatObj.sendSeen === 'function') {
      chatObj.sendSeen().catch(() => {});
    }
    if (chatObj && typeof chatObj.sendStateTyping === 'function') {
      chatObj.sendStateTyping().catch(() => {});
    }
    if (clientStatus === 'READY' && chatObj) {
      const duration = Math.min(1800, Math.max(500, (textLength || 20) * 15));
      await new Promise(r => setTimeout(r, duration));
      if (typeof chatObj.clearState === 'function') {
        chatObj.clearState().catch(() => {});
      }
    }
  } catch (e) {}
}

async function sendAutomatedMessage(chatId, content, options = {}) {
  const isMedia = typeof content !== 'string';
  const safeContent = isMedia ? content : sanitizeCustomerFacingText(content);
  const safeOptions = isMedia && typeof options.caption === 'string'
    ? { ...options, caption: sanitizeCustomerFacingText(options.caption) }
    : options;
  const body = isMedia ? (safeOptions.caption || '') : safeContent;
  // whatsapp-web.js emits message_create for our own sends too. Record the
  // expected echo before sending so the Smart Takeover listener cannot mistake
  // the bot's welcome or reply for a message from the operator's phone.
  automatedOutboundGuard.mark(chatId, { body, isMedia });
  return client.sendMessage(chatId, safeContent, safeOptions);
}

async function handoverWithAcknowledgement({ chatId, chatName, acknowledgement, notification, notificationFlag }) {
  const chat = chats[chatId];
  if (!chat) return;
  chat.status = 'human';
  chat.manualTakeover = true;
  savePersistentData();
  broadcast('chat_status_change', { chatId, status: 'human' });

  if (acknowledgement && !isRecentAssistantDuplicate(chat.messages, acknowledgement)) {
    await sendAutomatedMessage(chatId, acknowledgement);
    const botMessage = { sender: 'ai', text: acknowledgement, timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat });
  }

  if (notificationFlag && !chat[notificationFlag]) {
    chat[notificationFlag] = true;
    savePersistentData();
    const ownerChatId = getTakeoverOwnerChatId();
    if (ownerChatId) {
      await sendAutomatedMessage(ownerChatId, `${notification}\n\nКлиент: ${chatName}\nТел: +${chat.number || ''}\n\nОткройте чат и ответьте вручную.`);
    }
  }
}

async function maybeSendDailySalesReport(now = Date.now()) {
  if (dailyReportSending) return false;
  if (!shouldSendDailyReport({
    now,
    lastSentDate: dailyReportState.lastSentDate,
    clientReady: clientStatus === 'READY'
  })) return false;

  dailyReportSending = true;
  try {
    const summary = buildDailySalesSummary(chats, completedSales, { now });
    const reportText = formatDailySalesReport(summary);
    const ownerChatId = getTakeoverOwnerChatId();
    if (!ownerChatId) return false;
    await sendAutomatedMessage(ownerChatId, reportText);
    dailyReportState = {
      lastSentDate: summary.dateKey,
      lastSentAt: new Date().toISOString()
    };
    saveDailyReportState();
    console.log(`[DAILY REPORT] Отчёт за ${summary.dateKey} отправлен владельцу.`);
    return true;
  } catch (error) {
    console.error('Ошибка отправки ежедневного отчёта:', error.message || error);
    return false;
  } finally {
    dailyReportSending = false;
  }
}

function scheduleDailySalesReportChecks() {
  if (dailyReportTimer) clearTimeout(dailyReportTimer);
  const delayToNextMinute = 60 * 1000 - (Date.now() % (60 * 1000)) + 250;
  dailyReportTimer = setTimeout(async () => {
    await maybeSendDailySalesReport();
    scheduleDailySalesReportChecks();
  }, delayToNextMinute);
  dailyReportTimer.unref?.();
}

// One nudge per check keeps outbound traffic spread out, even after downtime.
const SILENT_FOLLOW_UP_CHECK_MS = 2 * 60 * 1000;
let silentFollowUpRunning = false;

async function maybeSendSilentLeadFollowUp(now = Date.now()) {
  if (silentFollowUpRunning || !getAutoReplySafety().allowed) return false;
  silentFollowUpRunning = true;
  try {
    const kzHour = getKazakhstanHour(new Date(now));
    const kzDateKey = getKazakhstanIsoDate(new Date(now));
    const completedPhones = new Set(completedSales.map(sale => String(sale?.phone || '').replace(/\D/g, '')).filter(Boolean));
    const candidate = Object.entries(chats)
      .filter(([chatId]) => canAutomateChat(chatId) && !chatLocks.has(chatId))
      .map(([chatId, chat]) => ({ chatId, chat, decision: getSilentFollowUpDecision(chat, { now, kzHour, kzDateKey, completedPhones }) }))
      .filter(item => item.decision.eligible)
      .sort((a, b) => a.decision.lastBotAt - b.decision.lastBotAt)[0];
    if (!candidate) return false;

    const { chatId, chat, decision } = candidate;
    const text = buildSilentFollowUpText(decision.step, kzHour);
    await sendAutomatedMessage(chatId, text);
    const botMessage = { sender: 'ai', text, source: 'silent_follow_up', timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    chat.silentFollowUp = {
      count: decision.step + 1,
      anchorUserMessageAt: decision.anchorUserMessageAt,
      lastSentDateKey: kzDateKey,
      lastSentAt: botMessage.timestamp
    };
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat });
    console.log(`[SILENT FOLLOW-UP] Напоминание ${decision.step + 1}/${MAX_SILENT_FOLLOW_UPS} отправлено ${chat.name || chatId}.`);
    return true;
  } catch (error) {
    console.error('[SILENT FOLLOW-UP] Ошибка отправки:', error.message || error);
    return false;
  } finally {
    silentFollowUpRunning = false;
  }
}

setInterval(() => { void maybeSendSilentLeadFollowUp(); }, SILENT_FOLLOW_UP_CHECK_MS).unref();

// Safety net for lost 'message' events: once a minute, look in WhatsApp Web for
// direct chats whose latest real message is an unanswered customer message
// from the last 15 minutes, and pass it through the normal inbound handler.
// Dedupe, age limits, automation mode and safety holds all still apply there.
const MISSED_INBOUND_CHECK_MS = 60 * 1000;
const MISSED_INBOUND_MIN_AGE_SECONDS = 20;
let missedInboundSweepRunning = false;
const sweptInboundIds = new Set();

async function sweepMissedInboundMessages() {
  if (missedInboundSweepRunning || clientStatus !== 'READY' || !client.pupPage) return;
  missedInboundSweepRunning = true;
  try {
    const candidates = await withTimeout(() => client.pupPage.evaluate(({ minAge }) => {
      const now = Date.now() / 1000;
      const isService = type => /notification|e2e|ciphertext|protocol|revoked|call_log|gp2|automated/.test(String(type || ''));
      return window.require('WAWebCollections').Chat.getModelsArray()
        .filter(chat => !chat.groupMetadata && Number(chat.t || 0) >= now - 15 * 60)
        .map(chat => {
          const id = chat.id._serialized;
          if (id.endsWith('@g.us') || id.includes('broadcast') || id.endsWith('@newsletter')) return null;
          const last = (chat.msgs?.getModelsArray?.() || []).filter(msg => !isService(msg.type)).slice(-1)[0];
          if (!last || last.id.fromMe) return null;
          const age = now - Number(last.t || 0);
          return age >= minAge && age <= 15 * 60 ? last.id._serialized : null;
        })
        .filter(Boolean);
    }, { minAge: MISSED_INBOUND_MIN_AGE_SECONDS }), 15_000, 'missed inbound sweep');

    for (const messageId of candidates) {
      if (sweptInboundIds.has(messageId) || processedMsgIds.has(messageId) || inboundLedger.has(messageId)) continue;
      sweptInboundIds.add(messageId);
      if (sweptInboundIds.size > 1000) sweptInboundIds.delete(sweptInboundIds.values().next().value);
      const msg = await client.getMessageById(messageId).catch(() => null);
      if (!msg) continue;
      console.warn(`[MISSED INBOUND] 'message' event was not received for ${msg.from}; processing it now.`);
      await handleInboundMessage(msg).catch(error => console.error('[INBOUND FAILURE]', error.stack || error));
    }
  } catch (error) {
    console.error('[MISSED INBOUND] Sweep failed:', error.message || error);
  } finally {
    missedInboundSweepRunning = false;
  }
}

setInterval(() => { void sweepMissedInboundMessages(); }, MISSED_INBOUND_CHECK_MS).unref();

async function sendBubblesSequentially(chatId, chatObj, bubbles, chatRecord) {
  let sentCount = 0;
  let skippedCount = 0;
  for (let i = 0; i < bubbles.length; i++) {
    const bubble = bubbles[i];
    if (!bubble || !bubble.trim()) continue;
    if (isRecentAssistantDuplicate(chatRecord.messages, bubble)) {
      console.log(`[NO REPEAT] Skipped a recent duplicate reply for ${chatId}.`);
      skippedCount += 1;
      continue;
    }

    await simulateHumanTyping(chatObj, bubble.length);
    await sendAutomatedMessage(chatId, bubble);

    const botMsg = {
      sender: 'ai',
      text: bubble,
      timestamp: new Date().toISOString()
    };
    chatRecord.messages.push(botMsg);
    sentCount += 1;
    savePersistentData();
    broadcast('new_message', { chatId, message: botMsg, chat: chatRecord });

    if (i < bubbles.length - 1 && clientStatus === 'READY' && chatObj) {
      await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 300)));
    }
  }
  return { sentCount, skippedCount };
}

async function sendFouraPresentationBundle(chatId, chatObj, chatRecord) {
  if (chatRecord.albumSent?.foura) return false;
  const pdfPath = path.join(__dirname, 'Vodel content', 'FOURA', 'FOURA ПРЕЗЕНТАЦИЯ.pdf');
  const examplePath = path.join(__dirname, 'Vodel content', 'FOURA', 'foura example.jpeg');
  if (!fs.existsSync(pdfPath) || !fs.existsSync(examplePath)) {
    throw new Error('FOURA presentation assets are missing.');
  }

  if (!chatRecord.presentationProgress) chatRecord.presentationProgress = {};
  if (!chatRecord.presentationProgress.foura) {
    chatRecord.presentationProgress.foura = { pdf: false, text: false, example: false };
  }
  const progress = chatRecord.presentationProgress.foura;

  if (!progress.pdf) {
    await sendAutomatedMessage(chatId, MessageMedia.fromFilePath(pdfPath), { sendMediaAsDocument: true });
    progress.pdf = true;
    savePersistentData();
  }
  if (clientStatus === 'READY' && chatObj && !progress.text) await new Promise(resolve => setTimeout(resolve, 700));
  if (!progress.text) {
    await sendAutomatedMessage(chatId, FOURA_PRESENTATION_TEXT);
    progress.text = true;
    const botMessage = { sender: 'ai', text: FOURA_PRESENTATION_TEXT, timestamp: new Date().toISOString() };
    chatRecord.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });
  }
  if (clientStatus === 'READY' && chatObj && !progress.example) await new Promise(resolve => setTimeout(resolve, 700));
  if (!progress.example) {
    await sendAutomatedMessage(chatId, MessageMedia.fromFilePath(examplePath), { caption: '💧 Пример установленного фильтра FOURA' });
    progress.example = true;
    savePersistentData();
  }

  if (!chatRecord.albumSent) chatRecord.albumSent = { foura: false, alkaline: false, alkalineSmart: false };
  chatRecord.albumSent.foura = true;
  savePersistentData();
  return true;
}

async function sendAlkalineG75PresentationBundle(chatId, chatObj, chatRecord, language = 'ru') {
  if (chatRecord.albumSent?.alkaline) return false;
  const pdfPath = path.join(__dirname, 'Vodel content', 'Alkaline G75', 'Alkaline G75 ПРЕЗЕНТАЦИЯ.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error('Alkaline G75 presentation PDF is missing.');
  }

  if (!chatRecord.presentationProgress) chatRecord.presentationProgress = {};
  if (!chatRecord.presentationProgress.alkaline) {
    chatRecord.presentationProgress.alkaline = { pdf: false, text: false };
  }
  const progress = chatRecord.presentationProgress.alkaline;
  const text = aiWorkflow.buildG75PresentationReply(language);

  if (!progress.pdf) {
    await sendAutomatedMessage(chatId, MessageMedia.fromFilePath(pdfPath), { sendMediaAsDocument: true });
    progress.pdf = true;
    savePersistentData();
  }
  if (clientStatus === 'READY' && chatObj && !progress.text) {
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  if (!progress.text) {
    await sendAutomatedMessage(chatId, text);
    progress.text = true;
    const botMessage = { sender: 'ai', text, timestamp: new Date().toISOString() };
    chatRecord.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });
  }

  if (!chatRecord.albumSent) chatRecord.albumSent = { foura: false, alkaline: false, alkalineSmart: false };
  chatRecord.albumSent.alkaline = true;
  savePersistentData();
  return true;
}

async function sendAlkalineSmartMenuBundle(chatId, chatObj, chatRecord) {
  if (chatRecord.albumSent?.alkalineSmart) return false;
  const imagePath = path.join(__dirname, 'Vodel content', 'Alkaline Smart', 'Alkaline Smart.png');
  if (!fs.existsSync(imagePath)) {
    throw new Error('Alkaline Smart presentation image is missing.');
  }

  const text = `💧 Alkaline SMART — система с баком 8 л, 6 ступенями очистки и двумя видами воды: фильтрованной и щелочной.

Цена по акции — ${formatTenge(ALKALINE_SMART_FACTS.cashPrice)}. Рассрочка: ${formatInstallmentOptions(ALKALINE_SMART_FACTS)}.

Хотите, расскажу про обслуживание или установку?`;
  if (!chatRecord.presentationProgress) chatRecord.presentationProgress = {};
  if (!chatRecord.presentationProgress.alkalineSmart) {
    chatRecord.presentationProgress.alkalineSmart = { image: false, text: false };
  }
  const progress = chatRecord.presentationProgress.alkalineSmart;

  if (!progress.image) {
    await sendAutomatedMessage(
      chatId,
      MessageMedia.fromFilePath(imagePath),
      { caption: '💧 Alkaline SMART — фото и характеристики' }
    );
    progress.image = true;
    savePersistentData();
  }
  if (clientStatus === 'READY' && chatObj && !progress.text) await new Promise(resolve => setTimeout(resolve, 700));
  if (!progress.text) {
    await sendAutomatedMessage(chatId, text);
    progress.text = true;
    const botMessage = { sender: 'ai', text, timestamp: new Date().toISOString() };
    chatRecord.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });
  }

  if (!chatRecord.albumSent) chatRecord.albumSent = { foura: false, alkaline: false, alkalineSmart: false };
  chatRecord.albumSent.alkalineSmart = true;
  savePersistentData();
  return true;
}

async function sendOtherSystemsMenuReply(chatId, chatObj, chatRecord) {
  const text = `Есть системы обратного осмоса от 65 000 ₸ — с баком и без бака. 💧

Чтобы предложить подходящие варианты, подскажите: какой бюджет вам комфортен?`;
  await simulateHumanTyping(chatObj, text.length);
  await sendAutomatedMessage(chatId, text);
  const botMessage = { sender: 'ai', text, timestamp: new Date().toISOString() };
  chatRecord.messages.push(botMessage);
  savePersistentData();
  broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });
}

async function sendProductCatalog(chatId, chatObj, chatRecord) {
  if (chatRecord.catalogSent) return false;
  const text = CATALOG_FACTS.promoCaption.replace('https://catalog-vodel-kz.pages.dev/', CATALOG_FACTS.webUrl);
  await simulateHumanTyping(chatObj, text.length);
  await sendAutomatedMessage(chatId, text);
  const botMessage = { sender: 'ai', text, timestamp: new Date().toISOString() };
  chatRecord.messages.push(botMessage);
  savePersistentData();
  broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });

  chatRecord.catalogSent = true;
  savePersistentData();
  return true;
}

// First reply to a new ad lead: greeting, short RO-H015 specs, the ad poster
// with the current price and the video, the warranty, and the city question
// last. The old ro_h015_poster.png shows an outdated price and is never sent.
const RO_H015_OPENER_MEDIA = [
  path.join(__dirname, 'Vodel content', '01_RO-H015', 'ro_h015_poster_65000.jpeg'),
  path.join(__dirname, 'Vodel content', '01_RO-H015', 'ro_h015_video.mp4')
];

async function sendAdvertisedModelOpener(chatId, chatObj, chatRecord) {
  const opener = aiWorkflow.buildAdvertisedModelOpener(getKazakhstanHour());
  const pushBotMessage = text => {
    const botMessage = { sender: 'ai', text, timestamp: new Date().toISOString() };
    chatRecord.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });
  };

  for (const text of [opener.greeting, opener.specs]) {
    await simulateHumanTyping(chatObj, text.length);
    await sendAutomatedMessage(chatId, text);
    pushBotMessage(text);
  }
  // WhatsApp Web sometimes fails to prepare media right after connecting
  // ("Data passed to getter must include an id property"). Retry once; a photo
  // that still fails must not stop the warranty message or hand the lead over.
  for (const mediaPath of RO_H015_OPENER_MEDIA) {
    if (!fs.existsSync(mediaPath)) continue;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await sendAutomatedMessage(chatId, MessageMedia.fromFilePath(mediaPath));
        break;
      } catch (error) {
        console.warn(`[AD OPENER] Media ${path.basename(mediaPath)} attempt ${attempt} failed: ${error.message || error}`);
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  for (const text of [opener.warranty, opener.cityQuestion]) {
    await simulateHumanTyping(chatObj, text.length);
    await sendAutomatedMessage(chatId, text);
    pushBotMessage(text);
  }

  if (!chatRecord.roH015Sent) chatRecord.roH015Sent = { photos: false, size: false, video: false };
  chatRecord.roH015Sent.video = true;
  chatRecord.advertisedModelOpenerSentAt = new Date().toISOString();
  savePersistentData();
}

async function sendFouraClosingProof(chatId, chatObj, chatRecord) {
  if (chatRecord.fouraValueProofSent) return false;
  const proofPath = path.join(__dirname, 'pictures', 'kaspi marketplace screenshot.jpeg');
  if (!fs.existsSync(proofPath)) throw new Error(`FOURA price comparison screenshot is missing: ${proofPath}`);

  const caption = `Кстати, для сравнения: у других продавцов FOURA стоит около 420 000 ₸, а у нас — 185 000 ₸ благодаря прямой поставке. 💧\n\nОстались вопросы по модели, которые помогут вам принять решение?`;
  await simulateHumanTyping(chatObj, caption.length);
  await sendAutomatedMessage(chatId, MessageMedia.fromFilePath(proofPath), { caption });

  chatRecord.fouraValueProofSent = true;
  chatRecord.kaspiSent = true;
  const botMessage = { sender: 'ai', text: caption, timestamp: new Date().toISOString() };
  chatRecord.messages.push(botMessage);
  savePersistentData();
  broadcast('new_message', { chatId, message: botMessage, chat: chatRecord });
  return true;
}

// Fallback for a specifically approved, visible phone number when WhatsApp Web
// temporarily cannot enumerate its chat history. It sends only the preserved
// welcome, once per number, and never scans or contacts other people.
async function sendWelcomeToExplicitPhone(phoneNumber) {
  const phone = normalizePhone(phoneNumber);
  if (!/^\d{10,15}$/.test(phone)) throw new Error('Invalid phone number.');
  if (clientStatus !== 'READY') throw new Error('WhatsApp is not connected.');
  if (!getAutoReplySafety().allowed || !botEnabled) throw new Error('Automatic replies are not enabled.');

  const existingChat = Object.values(chats).find(chat => normalizePhone(chat.number) === phone);
  if (existingChat && !canAutomateChat(existingChat.id)) throw new Error('Automation is disabled for this existing chat.');
  if (existingChat?.messages?.some(message => message.sender === 'ai' || message.sender === 'human')) {
    throw new Error('This phone already has a consultant reply.');
  }

  const chatId = existingChat?.id || `${phone}@c.us`;
  const welcome = aiWorkflow.buildWelcomeMessage();
  const cleanWelcome = String(welcome || '').trim();
  if (!cleanWelcome) throw new Error('A safe welcome could not be generated.');

  const chat = existingChat || {
    id: chatId,
    name: phone,
    number: phone,
    status: 'ai',
    messages: [],
    albumSent: { foura: false, alkaline: false, alkalineSmart: false }
  };
  chats[chatId] = chat;
  chat.awaitingProductMenu = true;
  chat.productMenuReminderSent = false;
  chat.productMenuVersion = 'current3';

  let chatObj = null;
  try {
    chatObj = await client.getChatById(chatId);
  } catch (e) {}

  const bubbles = aiWorkflow.splitIntoBubbles(cleanWelcome);
  if (bubbles && bubbles.length > 0) {
    await sendBubblesSequentially(chatId, chatObj, bubbles, chat);
  } else {
    await sendAutomatedMessage(chatId, cleanWelcome);
    const botMessage = { sender: 'ai', text: cleanWelcome, timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat });
  }

  scheduleFilterTypeFollowUp(chatId);
  return chat.messages[chat.messages.length - 1];
}

function cancelFilterTypeFollowUp(chatId, { clearDeadline = false } = {}) {
  const timer = filterTypeFollowUpTimers.get(chatId);
  if (timer) clearTimeout(timer);
  filterTypeFollowUpTimers.delete(chatId);
  if (clearDeadline && chats[chatId]) chats[chatId].productMenuReminderDueAt = null;
}

function scheduleFilterTypeFollowUp(chatId, { preserveDeadline = false } = {}) {
  cancelFilterTypeFollowUp(chatId);
  if (!canAutomateChat(chatId)) return;
  const chat = chats[chatId];
  if (!chat) return;
  const storedDeadline = Date.parse(chat.productMenuReminderDueAt || '');
  const deadline = preserveDeadline && Number.isFinite(storedDeadline)
    ? storedDeadline
    : Date.now() + FILTER_TYPE_FOLLOW_UP_DELAY_MS;
  chat.productMenuReminderDueAt = new Date(deadline).toISOString();
  savePersistentData();

  const timer = setTimeout(async () => {
    filterTypeFollowUpTimers.delete(chatId);
    const chat = chats[chatId];
    const latestMessage = chat?.messages?.[chat.messages.length - 1];

    // One reminder only. Any real customer activity cancels this timer before
    // it gets here, so the bot never interrupts an active conversation.
    if (!getAutoReplySafety().allowed || !canAutomateChat(chatId) || !chat || chat.status === 'human' || !chat.awaitingProductMenu || chat.productMenuReminderSent || latestMessage?.sender !== 'ai') return;

    const text = aiWorkflow.buildProductMenuReminder(chat.productMenuVersion);
    try {
      await sendAutomatedMessage(chatId, text);
      const botMsg = { sender: 'ai', text, timestamp: new Date().toISOString() };
      chat.messages.push(botMsg);
      chat.productMenuReminderSent = true;
      chat.productMenuReminderDueAt = null;
      savePersistentData();
      broadcast('new_message', { chatId, message: botMsg, chat });
      updateChatAnalytics(chatId);
    } catch (error) {
      console.error('Ошибка напоминания о выборе в меню:', error.message || error);
    }
  }, Math.max(250, deadline - Date.now()));
  filterTypeFollowUpTimers.set(chatId, timer);
}

function restorePendingProductMenuReminders() {
  const now = Date.now();
  let restoredOverdueReminder = false;
  for (const [chatId, chat] of Object.entries(chats)) {
    if (!chat || !canAutomateChat(chatId) || chat.status === 'human' || !chat.awaitingProductMenu || chat.productMenuReminderSent) continue;
    const deadline = Date.parse(chat.productMenuReminderDueAt || '');
    if (!Number.isFinite(deadline)) continue;
    if (deadline < now - MAX_REMINDER_RESTART_OVERDUE_MS || (deadline <= now && restoredOverdueReminder)) {
      // Never replay a backlog after downtime: that can create a dangerous
      // burst of unsolicited messages when WhatsApp reconnects.
      chat.productMenuReminderDueAt = null;
      continue;
    }
    if (deadline <= now) restoredOverdueReminder = true;
    scheduleFilterTypeFollowUp(chatId, { preserveDeadline: true });
  }
  savePersistentData();
}

function cancelAlkalineSilenceFollowUp(chatId, { clearDeadline = false } = {}) {
  const timer = alkalineSilenceFollowUpTimers.get(chatId);
  if (timer) clearTimeout(timer);
  alkalineSilenceFollowUpTimers.delete(chatId);
  if (clearDeadline && chats[chatId]) chats[chatId].g75WarehouseFollowUpDueAt = null;
}

function getKazakhstanHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    hourCycle: 'h23'
  }).format(date));
}

function scheduleAlkalineSilenceFollowUp(chatId, { preserveDeadline = false } = {}) {
  cancelAlkalineSilenceFollowUp(chatId);
  if (!canAutomateChat(chatId)) return;
  const scheduledChat = chats[chatId];
  if (!scheduledChat) return;
  const storedDeadline = Date.parse(scheduledChat.g75WarehouseFollowUpDueAt || '');
  const deadline = preserveDeadline && Number.isFinite(storedDeadline)
    ? storedDeadline
    : Date.now() + ALKALINE_SILENCE_FOLLOW_UP_DELAY_MS;
  scheduledChat.g75WarehouseFollowUpDueAt = new Date(deadline).toISOString();
  savePersistentData();

  const timer = setTimeout(async () => {
    alkalineSilenceFollowUpTimers.delete(chatId);
    const chat = chats[chatId];
    const latestMessage = chat?.messages?.[chat.messages.length - 1];
    const policy = getCommercialConversationPolicy(chat?.messages || [], '');
    const g75InterestConfirmed = hasConfirmedG75Interest(chat?.messages || []);
    const isEligible = canSendAlkalineSilencePresentation({
      autoReplyAllowed: getAutoReplySafety().allowed && canAutomateChat(chatId),
      chatExists: Boolean(chat),
      chatStatus: chat?.status,
      latestSender: latestMessage?.sender,
      alreadySent: Boolean(chat?.g75WarehouseFollowUpSent),
      warehouseCityKnown: policy.warehouseCityKnown,
      g75InterestConfirmed
    });
    if (chat) chat.g75WarehouseFollowUpDueAt = null;
    if (!isEligible) {
      savePersistentData();
      return;
    }

    const cityLocative = resolveWarehouseCityLocative(chat.messages) || 'вашем городе';
    const beforeCutoff = getKazakhstanHour() < COMMERCIAL_FACTS.logistics.warehouseCitySameDayCutoffHour;
    const text = buildWarehouseG75FollowUp({ cityLocative, beforeCutoff });
    try {
      const chatObj = await client.getChatById(chatId).catch(() => null);
      await sendAlkalineG75PresentationBundle(chatId, chatObj, chat, detectCustomerLanguage('', chat.messages));
      if (clientStatus === 'READY' && chatObj) await new Promise(resolve => setTimeout(resolve, 700));
      await sendAutomatedMessage(chatId, text);
      chat.alkalineSilencePresentationSent = true;
      chat.g75WarehouseFollowUpSent = true;
      const botMsg = { sender: 'ai', text, timestamp: new Date().toISOString() };
      chat.messages.push(botMsg);
      savePersistentData();
      broadcast('new_message', { chatId, message: botMsg, chat });
      updateChatAnalytics(chatId);
    } catch (error) {
      console.error('Alkaline silence follow-up failed:', error.message || error);
    }
  }, Math.max(250, deadline - Date.now()));
  alkalineSilenceFollowUpTimers.set(chatId, timer);
}

function restorePendingAlkalineSilenceFollowUps() {
  const now = Date.now();
  for (const [chatId, chat] of Object.entries(chats)) {
    if (!canAutomateChat(chatId)) continue;
    const deadline = Date.parse(chat?.g75WarehouseFollowUpDueAt || '');
    if (!Number.isFinite(deadline)) continue;
    // Never replay overdue sales messages after downtime; only restore timers
    // that were still pending when the process restarted.
    if (deadline <= now) {
      chat.g75WarehouseFollowUpDueAt = null;
      continue;
    }
    scheduleAlkalineSilenceFollowUp(chatId, { preserveDeadline: true });
  }
  savePersistentData();
}

client.on('qr', (qr) => {
  authenticationRequired = true;
  console.log('--- SCAN QR CODE ---');
  qrCodeData = qr;
  clientStatus = 'QR_READY';
  currentSessionReadyAtSeconds = null;
  isInitializing = false;
  broadcast('status', { status: clientStatus, qr });
});

// whatsapp-web.js attaches its message listeners only on the first sync
// callback that finds the page uninjected. When that run fails or races with
// READY recovery, the client still becomes READY but never emits 'message'.
// Track the page the listeners were attached to and attach them if missing.
let listenersAttachedPage = null;
const attachWhatsAppEventListeners = client.attachEventListeners.bind(client);
client.attachEventListeners = async (...args) => {
  const result = await attachWhatsAppEventListeners(...args);
  listenersAttachedPage = client.pupPage;
  return result;
};

async function ensureMessageListenersAttached() {
  if (!client.pupPage || listenersAttachedPage === client.pupPage) return;
  console.warn('[LISTENERS] WhatsApp is READY without message listeners; attaching them now.');
  try {
    await client.attachEventListeners();
    console.log('[LISTENERS] Message listeners attached.');
  } catch (error) {
    console.error('[LISTENERS] Could not attach message listeners:', error.message || error);
  }
}

client.on('ready', () => {
  void ensureMessageListenersAttached();
  // WhatsApp Web can emit 'ready' several times for one connection. Timers,
  // reminders and the inbound queue were already handled by the first event.
  if (clientStatus === 'READY') {
    currentSessionReadyAtSeconds = Math.floor(Date.now() / 1000);
    return;
  }
  authenticationRequired = false;
  reconnectAttempt = 0;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  console.log('✅ WhatsApp Client готов и подключен!');
  cancelReadyRecovery();
  qrCodeData = null;
  clientStatus = 'READY';
  currentSessionReadyAtSeconds = Math.floor(Date.now() / 1000);
  isInitializing = false;
  beginStartupSafetyHold();
  restorePendingProductMenuReminders();
  restorePendingAlkalineSilenceFollowUps();
  void maybeSendDailySalesReport();
  broadcast('status', { status: clientStatus });
  broadcast('bot_config_change', getBotConfig());
  // Only events actually received while reconnecting are drained; no history scan.
  const pending = [...deferredInbound.values()].sort((a, b) => a.timestamp - b.timestamp);
  deferredInbound.clear();
  void (async () => {
    for (const message of pending) {
      await handleInboundMessage(message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  })().catch(error => console.error('[INBOUND QUEUE]', error.message));
});

client.on('authenticated', () => {
  console.log('🔑 WhatsApp клиент успешно авторизован');
  scheduleReadyRecovery();
});

client.on('auth_failure', (msg) => {
  authenticationRequired = true;
  console.error('❌ Ошибка авторизации WhatsApp:', msg);
  clientStatus = 'DISCONNECTED';
  currentSessionReadyAtSeconds = null;
  isInitializing = false;
  disarmAutomaticReplies('authentication failure');
  cancelReadyRecovery();
  broadcast('status', { status: clientStatus });
});

client.on('disconnected', (reason) => {
  if (String(reason).toUpperCase().includes('LOGOUT')) authenticationRequired = true;
  console.log('❌ WhatsApp отключен:', reason);
  clientStatus = 'DISCONNECTED';
  currentSessionReadyAtSeconds = null;
  isInitializing = false;
  disarmAutomaticReplies('WhatsApp disconnected');
  cancelReadyRecovery();
  broadcast('status', { status: clientStatus });
  scheduleReconnect();
});

// Защита от падения процесса при ошибках puppeteer/навигации ("Execution context was destroyed")
process.on('uncaughtException', (err) => {
  console.error('⚠️ Неперехваченная ошибка (процесс НЕ убит):', err.message || err);
  if (err.message && err.message.includes('Execution context was destroyed')) {
    console.log('🔄 Ошибка контекста навигации — переподключаем WhatsApp...');
    clientStatus = 'DISCONNECTED';
    isInitializing = false;
    disarmAutomaticReplies('WhatsApp navigation error');
    scheduleReconnect();
  }
});

process.on('unhandledRejection', (reason) => {
  // Known whatsapp-web.js issue on Windows: after LOGOUT, LocalAuth tries to
  // delete the session lockfile while Chromium still holds it. Harmless.
  const text = String(reason?.message || reason || '');
  if (text.includes('EBUSY') && text.includes('lockfile')) {
    console.warn('[LOGOUT] Session lockfile is still busy; it will be released when Chromium closes.');
    return;
  }
  console.error('⚠️ Необработанный Promise rejection (процесс НЕ убит):', reason);
});

// Мьютекс-очередь для каждого чата (Защита от параллельных гонок и поддержка мульти-пользователей)
const chatLocks = new Map();
function runForChat(chatId, taskFn) {
  let lock = chatLocks.get(chatId) || Promise.resolve();
  const nextLock = lock.then(async () => {
    const repliesBefore = (chats[chatId]?.messages || []).filter(item => item.sender === 'ai').length;
    try {
      await taskFn();
    } catch (e) {
      console.error(`Ошибка при обработке сообщения для чата ${chatId}:`, e.message || e);
      const chat = chats[chatId];
      if (chat) {
        chat.lastProcessingError = {
          timestamp: new Date().toISOString(),
          message: String(e.message || e).slice(0, 300)
        };
        const lastNotification = Date.parse(chat.processingErrorNotifiedAt || '');
        const shouldNotify = !Number.isFinite(lastNotification) || Date.now() - lastNotification > 10 * 60 * 1000;
        if (shouldNotify) chat.processingErrorNotifiedAt = new Date().toISOString();
        savePersistentData();
        if (shouldNotify && getAutoReplySafety().allowed && chat.status !== 'human'
          && chat.messages.filter(item => item.sender === 'ai').length === repliesBefore) {
          try {
            const text = 'Извините, произошла техническая задержка. Напишите, пожалуйста, ваш вопрос ещё раз — помогу с выбором.';
            await sendAutomatedMessage(chatId, text);
            chat.messages.push({ sender: 'ai', text, timestamp: new Date().toISOString() });
            savePersistentData();
          } catch (error) { console.error('[ERROR ACK]', error.message); }
        }

        if (shouldNotify && clientStatus === 'READY') {
          try {
            const ownerChatId = getTakeoverOwnerChatId();
            if (ownerChatId) {
              await sendAutomatedMessage(ownerChatId, `⚠️ [СБОЙ ОТВЕТА]\n\nКлиент: ${chat.name || chat.number || chatId}\nТел: +${chat.number || ''}\n\nПроверьте последний ответ. ИИ остаётся включён для следующих сообщений.`);
            }
          } catch (notifyError) {
            console.error('Не удалось уведомить владельца о сбое чата:', notifyError.message || notifyError);
          }
        }
      }
    }
  }).finally(() => {
    // Очистка: если этот промис всё ещё последний в очереди, удаляем запись из Map
    if (chatLocks.get(chatId) === settled) {
      chatLocks.delete(chatId);
    }
  });
  const settled = nextLock.catch(() => {});
  chatLocks.set(chatId, settled);
  return nextLock;
}

// Защита от дублирования сообщений (WhatsApp Multi-Device может доставить одно сообщение дважды)
const processedMsgIds = new Set();
const MAX_PROCESSED_IDS = 500;

// Обработка входящих сообщений WhatsApp
async function handleInboundMessage(msg) {
  // whatsapp-web.js may surface an outgoing bot message here on some
  // multi-device sessions. Processing it as customer input creates an AI echo
  // loop: one reply turns into several unrelated replies. Only real inbound
  // direct messages are allowed into the sales workflow.
  if (!shouldProcessCustomerInboundMessage(msg)) return;
  lastInboundAt = new Date().toISOString();
  const recentUnanswered = isRecentUnansweredInbound({
    message: msg, chat: chats[msg.from], enabledAt: inboundLedger.enabledAt
  });
  if (clientStatus !== 'READY') {
    if (recentUnanswered && canAutomateChat(msg.from) && !inboundLedger.has(msg.id._serialized)) {
      if (deferredInbound.size < 500) deferredInbound.set(msg.id._serialized, msg);
      else console.error('[INBOUND QUEUE] Capacity reached; operator review required:', msg.from);
    }
    return;
  }

  // Never treat WhatsApp's reconnect/history replay as fresh customer input.
  // Only messages created for the currently READY session may auto-trigger.
  if (!isMessageNewForCurrentSession({
    messageTimestampSeconds: msg.timestamp,
    sessionReadyAtSeconds: currentSessionReadyAtSeconds
  }) && !recentUnanswered) {
    console.log(`⏭️ Пропуск сообщения из истории/синхронизации от ${msg.from}.`);
    return;
  }

  // Пропускаем только явно старые исторические сообщения при первой синхронизации (старше 15 минут)
  const messageTimestamp = Number(msg.timestamp);
  const messageAgeSeconds = (Date.now() / 1000) - messageTimestamp;
  if (Number.isFinite(messageTimestamp) && messageAgeSeconds > 900) {
    console.log(`⏭️ Пропуск старого исторического сообщения от ${msg.from} (Возраст: ${Math.floor(messageAgeSeconds / 60)} мин).`);
    return;
  }

  // Проверка готовности автоответов
  const autoReplySafety = getAutoReplySafety();

  // Дедупликация: пропускаем если это сообщение уже обработано
  const msgUniqueId = msg.id && msg.id._serialized ? msg.id._serialized : null;
  if (msgUniqueId) {
    if (processedMsgIds.has(msgUniqueId) || inboundLedger.has(msgUniqueId)) {
      console.log(`⏭️ Пропуск дубликата сообщения: ${msgUniqueId}`);
      return;
    }
    processedMsgIds.add(msgUniqueId);
    inboundLedger.mark(msgUniqueId, 'processing', msg.from);
    // Ограничиваем размер Set чтобы не течь по памяти
    if (processedMsgIds.size > MAX_PROCESSED_IDS) {
      const first = processedMsgIds.values().next().value;
      processedMsgIds.delete(first);
    }
  }

  const chatId = msg.from;
  await runForChat(chatId, async () => {
    let contact = null;
    let chatObj = null;
    try {
      contact = await Promise.race([
        msg.getContact(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('contact timeout')), 2000))
      ]);
    } catch (e) {}
    try {
      chatObj = await Promise.race([
        msg.getChat(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('chat timeout')), 2000))
      ]);
    } catch (e) {}
  
  // WhatsApp Multi-Device LID Resolution
  let realUser = "";
  try {
    const formatted = contact && typeof contact.getFormattedNumber === 'function'
      ? await withTimeout(() => contact.getFormattedNumber(), 2000, 'phone lookup') : "";
    if (formatted) realUser = formatted.replace(/\D/g, '');
  } catch (e) {}

  if (!realUser || realUser.startsWith('5198')) {
    if (contact && contact.number && !contact.number.startsWith('5198')) {
      realUser = contact.number;
    } else if (msg.from && !msg.from.includes('@lid') && !msg.from.startsWith('5198')) {
      realUser = msg.from.split('@')[0];
    } else {
      try {
        const chatObj = await withTimeout(() => msg.getChat(), 2000, 'chat lookup');
        if (chatObj && chatObj.contact && chatObj.contact.number) {
          realUser = chatObj.contact.number;
        }
      } catch (e) {}
    }
  }

  if (!realUser && contact && contact.id) realUser = contact.id.user;

  const cleanPhone = realUser.replace(/\D/g, '');
  const chatName = (contact?.name && contact.name !== cleanPhone) ? contact.name : (contact?.pushname || cleanPhone || msg.from);

  if (!chats[chatId]) {
    chats[chatId] = {
      id: chatId,
      name: chatName,
      number: cleanPhone,
      status: 'ai', // по умолчанию отвечает ИИ
      createdAt: new Date().toISOString(),
      messages: []
    };
  } else {
    chats[chatId].name = chatName;
    chats[chatId].number = cleanPhone;
  }

  let textContent = msg.body || '';
  const receivedVoiceMessage = isVoiceMessage(msg);
  let voiceTranscriptionSucceeded = false;
  let mediaAnalysisFailed = false;
  if (receivedVoiceMessage) {
    console.log(`🎙️ Получено голосовое сообщение от ${chatName}. Обрабатываем...`);
    textContent = "[Голосовое сообщение от клиента]";
    try {
      const media = await withTimeout(() => msg.downloadMedia(), 20_000, 'voice download');
      if (media && media.data && aiWorkflow.genAI) {
        const rawTranscription = await aiWorkflow.executeWithFallback(async (model) => {
          const result = await model.generateContent([
            buildVoiceTranscriptionPrompt(),
            { inlineData: { data: media.data, mimeType: normalizeVoiceMimeType(media.mimetype) } }
          ]);
          return result.response.text().trim();
        });
        const transcribedText = cleanVoiceTranscription(rawTranscription);
        
        if (transcribedText) {
          voiceTranscriptionSucceeded = true;
          console.log(`🎙️ Текст голосового сообщения: "${transcribedText}"`);
          textContent = transcribedText;
        }
      }
    } catch (audioErr) {
      console.error('Ошибка обработки голосового сообщения:', audioErr.message || audioErr);
    }
  } else if (msg.hasMedia && (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.mimetype?.includes('pdf') || msg.mimetype?.includes('image') || msg.mimetype?.includes('video'))) {
    console.log(`🖼️ Получено медиа (фото/видео/документ) от ${chatName}. Анализируем через Gemini Vision...`);
    try {
      const media = await withTimeout(() => msg.downloadMedia(), 20_000, 'media download');
      if (media && media.data && aiWorkflow.genAI) {
        const promptText = `Проанализируй данное изображение или видеозапись от клиента в чате продаж фильтров для воды VODEL.
Выбери ЕДИНСТВЕННЫЙ подходящий вариант:

ВАРИАНТ А (Если это чек, квитанция или скриншот перевода Kaspi):
Внимательно найди БИН получателя и итоговую сумму перевода.
Напиши ответ СТРОГО в таком формате: "КВИТАНЦИЯ: БИН [извлеченный БИН или 'отсутствует'], Сумма [сумма] тг."

ВАРИАНТ Б (Если это фото или видео смесителя/крана/мойки/кухни/пространства под раковиной):
Подробно опиши цвет и тип смесителя (например: золотой классический смеситель, черный матовый кран, хромированный смеситель), тип мойки и свободное место.
Начни ответ строго со слов: "ФОТО/ВИДЕО СМЕСИТЕЛЯ И МОЙКИ: [твое описание]"

ВАРИАНТ В (Для остальных фото/видео):
Кратко опиши, что на фото/видео. Начни со слов: "МЕДИА: [описание]"`;

        const mime = media.mimetype || (msg.type === 'image' ? 'image/jpeg' : (msg.type === 'video' ? 'video/mp4' : 'application/pdf'));
        const visionResult = await aiWorkflow.executeWithFallback(async (model) => {
          const result = await model.generateContent([
            promptText,
            { inlineData: { data: media.data, mimeType: mime } }
          ]);
          return result.response.text().trim();
        });
        
        console.log(`🔍 Результат анализа медиа Gemini Vision: ${visionResult}`);

        if (visionResult.startsWith('КВИТАНЦИЯ:')) {
          const cleanVerif = visionResult.replace('КВИТАНЦИЯ:', '').trim();
          textContent = `[РЕЗУЛЬТАТ ПРОВЕРКИ КВИТАНЦИИ В РЕАЛЬНОМ ВРЕМЕНИ: ${cleanVerif}]`;
        } else if (visionResult.startsWith('ФОТО/ВИДЕО СМЕСИТЕЛЯ И МОЙКИ:')) {
          const description = visionResult.replace('ФОТО/ВИДЕО СМЕСИТЕЛЯ И МОЙКИ:', '').trim();
          textContent = `[Клиент прислал фото/видео своего смесителя и кухонной мойки: ${description}]. ${msg.body || ''}`;
        } else {
          textContent = `[Клиент прислал фото/видео: ${visionResult}]. ${msg.body || ''}`;
        }
      }
    } catch (docErr) {
      console.error('Ошибка анализа медиа:', docErr.message || docErr);
      mediaAnalysisFailed = true;
      textContent = msg.body || "[Клиент прислал медиафайл]";
    }
  }

  // WhatsApp link previews keep the product name in title/description, while
  // msg.body may contain only a vague caption such as "Этот хочу". Preserve the
  // visible caption for the dashboard and pass the allow-listed VODEL model to AI.
  const visibleTextContent = textContent;
  const catalogPreviewContext = getCatalogPreviewContext(msg);
  if (catalogPreviewContext) {
    textContent = [textContent, catalogPreviewContext].filter(Boolean).join('\n');
  }

  if (!chats[chatId]) {
    chats[chatId] = { id: chatId, name: chatName, number: cleanPhone, status: 'ai', createdAt: new Date().toISOString(), messages: [], albumSent: { foura: false, alkaline: false, alkalineSmart: false } };
  }
  if (!chats[chatId].messages) chats[chatId].messages = [];

  // A click-to-WhatsApp ad can arrive as a separate, empty referral event
  // before the customer's actual text. Keep its model context, but never
  // reply to it: replying here creates a duplicated greeting.
  const advertisedProduct = detectAdvertisedProduct(msg);
  if (advertisedProduct) chats[chatId].advertisedProduct = advertisedProduct;
  const isSilentAdReferral = Boolean(advertisedProduct) && !String(textContent || '').trim() && !receivedVoiceMessage;
  if (isSilentAdReferral || isEmptyReferralEvent({ text: textContent, hasMedia: msg.hasMedia, isVoice: receivedVoiceMessage })) {
    savePersistentData();
    console.log(`[AD CONTEXT] Empty referral event recorded for ${chatName}; waiting for the customer's text.`);
    return;
  }

  // Some WhatsApp multi-device sessions can deliver the same visible text
  // twice with different internal message IDs. Ignore only an immediate burst
  // duplicate with no bot turn in between; a later repeated customer answer is
  // still valid and must be processed normally.
  if (isBurstDuplicateCustomerMessage(chats[chatId].messages, textContent)) {
    console.log(`[NO REPEAT] Ignored an immediate duplicate customer event for ${chatId}.`);
    return;
  }

  // Instagram ad leads often begin with a prefilled "Подробнее" message. The
  // only immediate reply to any brand-new lead is the fixed welcome — never a
  // generated answer to that prefilled text. Any real customer activity then
  // cancels the optional three-minute model-choice question.
  const isFirstBotReplyInChat = !chats[chatId].messages.some(message => message.sender === 'ai' || message.sender === 'human');
  cancelFilterTypeFollowUp(chatId, { clearDeadline: true });
  cancelAlkalineSilenceFollowUp(chatId, { clearDeadline: true });

  const userMsg = {
    sender: 'user',
    messageId: msgUniqueId,
    text: visibleTextContent,
    context: catalogPreviewContext || undefined,
    source: receivedVoiceMessage ? 'voice' : 'text',
    timestamp: new Date().toISOString()
  };

  chats[chatId].messages.push(userMsg);
  const historyBeforeCurrent = chats[chatId].messages.slice(0, -1);
  const turnContext = analyzeConversationTurn({
    text: textContent,
    history: historyBeforeCurrent,
    advertisedProduct: chats[chatId].advertisedProduct
  });
  if (isExplicitPurchaseIntent(textContent, turnContext.previousAssistant)) {
    chats[chatId].checkoutAuthorized = true;
    chats[chatId].checkoutAuthorizedAt = new Date().toISOString();
  }
  savePersistentData();
  broadcast('new_message', { chatId, message: userMsg, chat: chats[chatId] });

  if (!autoReplySafety.allowed) {
    console.log(`[SAFETY HOLD] Recorded inbound event from ${msg.from}; automatic reply remains blocked: ${autoReplySafety.reason}.`);
    return;
  }

  // Проверка глобального выключателя бота
  if (!botEnabled) {
    console.log(`[BOT OFF] ИИ молчит для ${chatName}.`);
    return;
  }

  if (!canAutomateChat(chatId)) {
    console.log(`[EXISTING CHAT PAUSED] No automatic reply for ${chatName}.`);
    return;
  }

  // Проверка Smart Takeover: если статус 'human', ИИ не отвечает
  if (chats[chatId].status === 'human') {
    console.log(`[HANDOVER ACTIVE] Оператор в чате с ${chatName}. ИИ молчит.`);
    return;
  }

  // Never guess unreadable content, but always acknowledge the customer and
  // keep the chat in AI mode so a retry is handled automatically.
  if (shouldPauseForUntranscribedVoice({
    isVoice: receivedVoiceMessage,
    transcriptionSucceeded: voiceTranscriptionSucceeded
  })) {
    const reply = 'Не удалось разобрать голосовое сообщение. Напишите, пожалуйста, ваш вопрос текстом или отправьте аудио ещё раз — я сразу отвечу.';
    await sendAutomatedMessage(chatId, reply);
    const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
    chats[chatId].messages.push(botMessage);
    chats[chatId].voiceTranscriptionNotified = false;
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat: chats[chatId] });
    return;
  }

  if (mediaAnalysisFailed) {
    const reply = 'Не удалось открыть вложение. Отправьте, пожалуйста, файл или фото ещё раз и при возможности добавьте короткое пояснение — я сразу отвечу.';
    await sendAutomatedMessage(chatId, reply);
    const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
    chats[chatId].messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat: chats[chatId] });
    return;
  }

  // Payment proof and post-installation problems are high-stakes. Gemini may
  // transcribe/describe the media, but it must never approve a payment or give
  // repair advice. One safe acknowledgement is sent, then a human takes over.
  if (isPaymentVerificationEvent(textContent)) {
    await handoverWithAcknowledgement({
      chatId,
      chatName,
      acknowledgement: 'Спасибо, чек получила. Передала его менеджеру на ручную проверку — оплату подтвердим после сверки.',
      notification: '🧾 [ЧЕК НА РУЧНУЮ ПРОВЕРКУ]',
      notificationFlag: 'paymentReviewNotified'
    });
    return;
  }

  if (isServiceHandoverRequest(textContent)) {
    await handoverWithAcknowledgement({
      chatId,
      chatName,
      acknowledgement: 'Поняла вас. Передаю сообщение сервисному специалисту, чтобы он помог без догадок.',
      notification: '🛠️ [СЕРВИСНЫЙ ЗАПРОС]',
      notificationFlag: 'serviceRequestNotified'
    });
    return;
  }

  // A customer who is politely leaving is more valuable to a human manager
  // than to another automated sales message. Pause the bot and alert the owner.
  const disengagementSignals = [
    /я\s+подума(?:ю|ла)/i,
    /надо\s+подумать/i,
    /пока\s+подумаю/i,
    /позже\s+напишу/i,
    /я\s+(?:сам|сама)\s+напишу/i,
    /если\s+решу/i,
    /не\s+сейчас/i,
    /не\s+пишите/i,
    /не\s+беспокойте/i,
    /всё,?\s+спасибо/i,
    /все,?\s+спасибо/i
  ];
  const clientIsDisengaging = disengagementSignals.some(pattern => pattern.test(textContent || ''));
  const activeClosingProduct = resolveLatestCatalogProduct(chats[chatId].messages, textContent);
  const shouldUseFouraCloser = isFouraClosingRisk(
    textContent,
    activeClosingProduct?.id,
    chats[chatId].fouraValueProofSent
  );
  let fouraCloserSentNow = false;
  if (shouldUseFouraCloser) {
    try {
      fouraCloserSentNow = await sendFouraClosingProof(chatId, chatObj, chats[chatId]);
    } catch (error) {
      console.error('FOURA closing proof failed:', error.message || error);
    }
  }

  // For an ordinary price hesitation, the comparison is the complete reply.
  // A polite exit continues into human takeover below after the proof is sent.
  if (fouraCloserSentNow && !clientIsDisengaging) return;
  if (clientIsDisengaging) {
    chats[chatId].status = 'human';
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'human' });

    if (!chats[chatId].disengagementNotified) {
      chats[chatId].disengagementNotified = true;
      savePersistentData();

      const compactClientText = String(textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
      const ownerChatId = getTakeoverOwnerChatId();
      if (ownerChatId) try {
        await client.sendMessage(
          ownerChatId,
          `🔔 [КЛИЕНТ МОЖЕТ УЙТИ]\n\n👤 Клиент: ${chatName}\n📞 Тел: +${chats[chatId].number}\n💬 Сообщение: «${compactClientText}»\n\nЧат переведён в ручной режим — можно ответить лично.`
        );
      } catch (error) {
        console.error('Ошибка уведомления владельцу о клиенте на паузе:', error.message || error);
      }
    }
    return;
  }

  // Alkaline SMART price resistance is a sales moment, not a reason to repeat
  // 150 000 ₸ or push checkout. Offer one cheaper model first; send its PDF
  // only after the customer explicitly accepts the offer.
  if (chats[chatId].awaitingG75BudgetConfirmation) {
    const language = chats[chatId].g75BudgetOfferLanguage
      || detectCustomerLanguage(textContent, historyBeforeCurrent);
    chats[chatId].awaitingG75BudgetConfirmation = false;
    savePersistentData();

    if (turnContext.affirmative) {
      chats[chatId].selectedMenuProduct = 'alkaline';
      savePersistentData();
      try {
        await sendAlkalineG75PresentationBundle(chatId, chatObj, chats[chatId], language);
      } catch (error) {
        console.error('Alkaline G75 presentation bundle failed:', error.message || error);
        chats[chatId].status = 'human';
        savePersistentData();
        broadcast('chat_status_change', { chatId, status: 'human' });
      }
      return;
    }

    if (turnContext.negative) {
      const budgetQuestion = language === 'kk'
        ? 'Жақсы, түсіндім. Онда 65 000 ₸-ден басталатын басқа нұсқаларды қарайық — сізге қандай бюджет ыңғайлы?'
        : 'Поняла. Тогда подберём другой вариант от 65 000 ₸ — какой бюджет вам комфортен?';
      await sendBubblesSequentially(chatId, chatObj, [budgetQuestion], chats[chatId]);
      return;
    }
  }

  // Gemini may naturally offer G75 while answering a financing objection.
  // If the customer accepts that exact offer, send the real G75 materials
  // deterministically instead of generating another generic paragraph.
  if (turnContext.confirmG75Presentation) {
    chats[chatId].selectedMenuProduct = 'alkaline';
    savePersistentData();
    try {
      await sendAlkalineG75PresentationBundle(
        chatId,
        chatObj,
        chats[chatId],
        detectCustomerLanguage(textContent, historyBeforeCurrent)
      );
    } catch (error) {
      console.error('Confirmed Alkaline G75 presentation bundle failed:', error.message || error);
      chats[chatId].status = 'human';
      savePersistentData();
      broadcast('chat_status_change', { chatId, status: 'human' });
    }
    return;
  }

  const shouldOfferCheaperG75 = shouldOfferG75BudgetAlternative({
    text: textContent,
    history: historyBeforeCurrent,
    activeProductId: activeClosingProduct?.id,
    selectedProduct: chats[chatId].selectedMenuProduct,
    alreadyOffered: Boolean(chats[chatId].g75BudgetOfferSent)
  });
  if (shouldOfferCheaperG75) {
    const language = detectCustomerLanguage(textContent, historyBeforeCurrent);
    const offerText = aiWorkflow.buildG75BudgetAlternativeReply(language);
    const delivery = await sendBubblesSequentially(chatId, chatObj, [offerText], chats[chatId]);
    if (delivery.sentCount > 0) {
      chats[chatId].g75BudgetOfferSent = true;
      chats[chatId].g75BudgetOfferLanguage = language;
      chats[chatId].awaitingG75BudgetConfirmation = true;
      savePersistentData();
    }
    return;
  }

  // The welcome menu is intentionally deterministic. A standalone option number
  // must never go through Gemini, otherwise a simple "2" can be mistaken for a
  // city, price, or a vague affirmative and create duplicate presentations.
  const productMenuChoice = chats[chatId].awaitingProductMenu
    ? detectProductMenuChoice(textContent)
    : null;
  const productMenuAction = ({ 1: 'catalog', 2: 'foura', 3: 'alkalineSmart' })[productMenuChoice];
  if (productMenuAction) {
    chats[chatId].awaitingProductMenu = false;
    chats[chatId].productMenuReminderDueAt = null;
    chats[chatId].selectedMenuProduct = productMenuAction;
    savePersistentData();
    try {
      if (productMenuAction === 'catalog') {
        await sendProductCatalog(chatId, chatObj, chats[chatId]);
      } else if (productMenuAction === 'foura') {
        await sendFouraPresentationBundle(chatId, chatObj, chats[chatId]);
      } else if (productMenuAction === 'alkalineSmart') {
        await sendAlkalineSmartMenuBundle(chatId, chatObj, chats[chatId]);
      } else if (productMenuAction === 'other') {
        await sendOtherSystemsMenuReply(chatId, chatObj, chats[chatId]);
      }
    } catch (error) {
      console.error('Product menu delivery failed:', error.message || error);
      chats[chatId].status = 'human';
      savePersistentData();
      broadcast('chat_status_change', { chatId, status: 'human' });
    }
    return;
  }

  if (turnContext.confirmFouraPresentation) {
    try {
      await sendFouraPresentationBundle(chatId, chatObj, chats[chatId]);
    } catch (error) {
      console.error('FOURA presentation bundle failed:', error.message || error);
      chats[chatId].status = 'human';
      savePersistentData();
      broadcast('chat_status_change', { chatId, status: 'human' });
    }
    return;
  }

  // A simple "Да / Иа / Иә" after an offer to send the catalog must be
  // deterministic. Gemini's sentence formatter must never touch the URL.
  if (turnContext.confirmCatalog) {
    await sendProductCatalog(chatId, chatObj, chats[chatId]);
    return;
  }

  // Certificate / contract on request. A message that asks only for the
  // documents needs no AI reply; otherwise the AI answers the rest and is told
  // the files are already sent.
  const requestedDocuments = detectDocumentRequest(textContent);
  if (requestedDocuments.length > 0) {
    try {
      for (const key of requestedDocuments) {
        const document = COMPANY_DOCUMENTS[key];
        if (!fs.existsSync(document.filePath)) throw new Error(`Document is missing: ${document.filePath}`);
        await simulateHumanTyping(chatObj, document.caption.length);
        await sendAutomatedMessage(chatId, MessageMedia.fromFilePath(document.filePath), {
          sendMediaAsDocument: true,
          caption: document.caption
        });
        const botMessage = { sender: 'ai', text: document.caption, timestamp: new Date().toISOString() };
        chats[chatId].messages.push(botMessage);
        savePersistentData();
        broadcast('new_message', { chatId, message: botMessage, chat: chats[chatId] });
      }
      console.log(`[DOCUMENTS] ${requestedDocuments.join(', ')} отправлены ${chatName}.`);
    } catch (error) {
      console.error('[DOCUMENTS] Ошибка отправки:', error.message || error);
      chats[chatId].status = 'human';
      savePersistentData();
      broadcast('chat_status_change', { chatId, status: 'human' });
      return;
    }
    if (isDocumentOnlyRequest(textContent)) return;
    const currentUserMessage = [...chats[chatId].messages].reverse().find(message => message.sender === 'user');
    if (currentUserMessage) currentUserMessage.context = [currentUserMessage.context, buildDocumentsSentNote(requestedDocuments)].filter(Boolean).join('\n');
  }

  // Запуск AI Workflow
  console.log(`🤖 Акбота генерирует ответ для ${chatName}...`);
  const historyForAi = chats[chatId].messages.map(m => ({
    sender: m.sender === 'user' ? 'user' : 'model',
    text: [m.text, m.context].filter(Boolean).join('\n')
  }));

  const currentCommercialPolicy = getCommercialConversationPolicy(historyBeforeCurrent, textContent);
  const isG75WarehouseCityTurn = turnContext.cityReply
    && currentCommercialPolicy.warehouseCityKnown
    && hasConfirmedG75Interest(chats[chatId].messages);
  const g75WarehouseCityReply = isG75WarehouseCityTurn
    ? buildWarehouseG75CityReply({
        cityLocative: resolveWarehouseCityLocative(chats[chatId].messages) || 'вашем городе',
        beforeCutoff: getKazakhstanHour() < COMMERCIAL_FACTS.logistics.warehouseCitySameDayCutoffHour
      })
    : null;

  if (!g75WarehouseCityReply && isFirstBotReplyInChat && !receivedVoiceMessage
    && !['foura', 'alkaline', 'alkalineSmart'].includes(chats[chatId].advertisedProduct)
    && aiWorkflow.shouldOfferAdvertisedModel(textContent, catalogPreviewContext)) {
    try {
      await sendAdvertisedModelOpener(chatId, chatObj, chats[chatId]);
      console.log(`[AD OPENER] RO-H015 и вопрос о городе отправлены ${chatName}.`);
    } catch (error) {
      console.error('[AD OPENER] Ошибка отправки:', error.message || error);
      chats[chatId].status = 'human';
      savePersistentData();
      broadcast('chat_status_change', { chatId, status: 'human' });
    }
    return;
  }

  const generatedReply = g75WarehouseCityReply
    || (isFirstBotReplyInChat && !receivedVoiceMessage
    ? aiWorkflow.buildWelcomeMessage()
    : await aiWorkflow.generateResponse(historyForAi, textContent, {
      skipFirstLeadWelcome: receivedVoiceMessage,
      checkoutAuthorized: Boolean(chats[chatId].checkoutAuthorized)
    }));
  const aiReply = String(generatedReply || '').trim()
    || '[HANDOVER] Один момент, уточню это у специалиста и вернусь к вам.';

  if (aiReply === 'HANDOVER' || aiReply.startsWith('[HANDOVER]')) {
    chats[chatId].status = 'human';
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'human' });

    let finalMessageToClient = '';
    if (aiReply.startsWith('[HANDOVER]')) {
      finalMessageToClient = aiReply.replace('[HANDOVER]', '').trim();
      if (finalMessageToClient) {
        await sendAutomatedMessage(chatId, finalMessageToClient);
        const botMsg = { sender: 'ai', text: finalMessageToClient, timestamp: new Date().toISOString() };
        chats[chatId].messages.push(botMsg);
        savePersistentData();
        broadcast('new_message', { chatId, message: botMsg });
      }
    }

    const supChatId = getSupervisorChatId();
    if (supChatId) {
      await client.sendMessage(supChatId, `⚠️ [СЕРВИС/ТЕХПОДДЕРЖКА] Клиент ${chatName} (+${chats[chatId].number}) требует вмешательства живого человека! Чат переведен в ручной режим.`);
    }
    return;
  }

  const sendPic = async (fileName, captionText) => {
    try {
      let filePath = path.isAbsolute(fileName) ? fileName : path.join(__dirname, 'pictures', fileName);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, fileName);
      }
      if (fs.existsSync(filePath)) {
        if (clientStatus === 'READY' && chatObj) {
          await new Promise(r => setTimeout(r, 600));
        }
        const media = MessageMedia.fromFilePath(filePath);
        const options = { caption: captionText };
        if (fileName.toLowerCase().endsWith('.pdf')) {
          options.sendMediaAsDocument = true;
        }
        await sendAutomatedMessage(chatId, media, options);
      }
    } catch (err) {
      console.error(`Ошибка отправки медиа ${fileName}:`, err.message || err);
    }
  };

  // Очистка ответа ИИ от случайно написанных им имён файлов в скобках [foura...jpeg]
  const addressAlreadyAsked = Boolean(chats[chatId].addressQuestionAskedAt)
    || hasAssistantAddressRequest(historyBeforeCurrent);
  const checkoutGuard = guardAddressRequest(
    aiWorkflow.stripCustomerFileReferences(aiReply),
    {
      checkoutAuthorized: Boolean(chats[chatId].checkoutAuthorized),
      addressAlreadyAsked,
      language: detectCustomerLanguage(textContent, historyBeforeCurrent)
    }
  );
  const cleanedAiReply = checkoutGuard.text;
  if (checkoutGuard.blocked) {
    console.log(`[CHECKOUT GUARD] Removed an unauthorized or repeated address request for ${chatId}.`);
  }
  if (!cleanedAiReply) {
    const safeHandoverText = 'Один момент, уточню это у специалиста и вернусь к вам.';
    await sendAutomatedMessage(chatId, safeHandoverText);
    const botMsg = { sender: 'ai', text: safeHandoverText, timestamp: new Date().toISOString() };
    chats[chatId].messages.push(botMsg);
    chats[chatId].status = 'human';
    savePersistentData();
    broadcast('new_message', { chatId, message: botMsg, chat: chats[chatId] });
    broadcast('chat_status_change', { chatId, status: 'human' });
    return;
  }
  const bubbles = aiWorkflow.splitIntoBubbles(cleanedAiReply);

  if (bubbles && bubbles.length > 0) {
    const delivery = await sendBubblesSequentially(chatId, chatObj, bubbles, chats[chatId]);
    if (delivery.sentCount === 0) {
      const noRepeatQuestion = 'Чтобы не повторяться: что для вас сейчас важнее — цена, обслуживание или установка?';
      if (!isRecentAssistantDuplicate(chats[chatId].messages, noRepeatQuestion)) {
        await simulateHumanTyping(chatObj, noRepeatQuestion.length);
        await sendAutomatedMessage(chatId, noRepeatQuestion);
        const botMsg = { sender: 'ai', text: noRepeatQuestion, timestamp: new Date().toISOString() };
        chats[chatId].messages.push(botMsg);
        savePersistentData();
        broadcast('new_message', { chatId, message: botMsg, chat: chats[chatId] });
      } else {
        chats[chatId].status = 'human';
        savePersistentData();
        broadcast('chat_status_change', { chatId, status: 'human' });
        const ownerChatId = getTakeoverOwnerChatId();
        if (ownerChatId) {
          await sendAutomatedMessage(ownerChatId, `⚠️ [ЗАЩИТА ОТ ЦИКЛА]\n\nКлиент: ${chatName}\nТел: +${chats[chatId].number}\n\nБот дважды сформировал уже отправленный ответ. Чат переведён в ручной режим.`);
        }
        return;
      }
    }
  } else {
    await sendAutomatedMessage(chatId, cleanedAiReply);
    const botMsg = {
      sender: 'ai',
      text: cleanedAiReply,
      timestamp: new Date().toISOString()
    };
    chats[chatId].messages.push(botMsg);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMsg, chat: chats[chatId] });
  }

  if (checkoutGuard.addressRequestAllowed) {
    chats[chatId].addressQuestionAskedAt = new Date().toISOString();
    savePersistentData();
  }

  if (isFirstBotReplyInChat && cleanedAiReply === aiWorkflow.buildWelcomeMessage()) {
    chats[chatId].awaitingProductMenu = true;
    chats[chatId].productMenuReminderSent = false;
    chats[chatId].productMenuVersion = 'current3';
    savePersistentData();
    scheduleFilterTypeFollowUp(chatId);
  }

  // УМНЫЙ АНАЛИЗ ДИАЛОГА ДЛЯ ОТПРАВКИ ФОТОГРАФИЙ (СТРОГО ПО ЗАПРОСУ ИЛИ ПРЕЗЕНТАЦИИ):
  if (!chats[chatId].albumSent) chats[chatId].albumSent = { foura: false, alkaline: false, alkalineSmart: false };

  // The full catalogue is a single fallback, never a silent follow-up. It is
  // available when the customer asks for other models or clearly rejects a
  // priority model because of price, budget, or format.
  if (typeof chats[chatId].catalogSent !== 'boolean') chats[chatId].catalogSent = false;
  const lowerUserText = String(textContent || '').toLowerCase().replace(/ё/g, 'е');
  const lowerAiReply = String(cleanedAiReply || '').toLowerCase().replace(/ё/g, 'е');
  // RO-H015 has its own photos, video and size image in Vodel content/01_RO-H015.
  const isRoH015Context = resolveLatestCatalogProduct(chats[chatId].messages, textContent)?.id === 'ro_h015';
  const isExplicitFouraRequest = /(?:foura|фоура|фоур\w*)/i.test(lowerUserText);
  const isDirectTanklessSelection = /без\s*(?:бака|бачка)|безбачков|прямоточ/i.test(lowerUserText);
  const isConfirmedTanklessChoice = isDirectTanklessSelection || (chats[chatId].advertisedProduct === 'foura' && turnContext.affirmative && /без\s+накопительного\s+бака|foura/i.test(turnContext.previousAssistant));
  const isConfirmedTankChoice = /(?:с|c)\s*(?:накопительным\s*)?(?:баком|бачком)|баковый/i.test(lowerUserText) && !isDirectTanklessSelection;
  const isFouraNoTankContext = isExplicitFouraRequest || isDirectTanklessSelection || isConfirmedTanklessChoice || chats[chatId].advertisedProduct === 'foura';
  const catalogPolicy = getCommercialConversationPolicy(chats[chatId].messages, textContent);
  const hasSeenPriorityPresentation = chats[chatId].albumSent.foura || chats[chatId].albumSent.alkaline || chats[chatId].albumSent.alkalineSmart;
  const explicitlyRequestsCatalog = /каталог|другие\s+(?:модел|фильтр|вариант)|другой\s+(?:фильтр|вариант|модел)|все\s+модел|ещ[её]\s+вариант|other\s+models|catalog/i.test(lowerUserText);
  const clearFallbackSignal = /не\s+подход|не\s+интерес|дорог|дешевле|бюджет|не\s+потян|доступн(?:ее|ый)|другой\s+вариант|другие\s+модел/i.test(lowerUserText);
  const shouldSendProductCatalog = !chats[chatId].catalogSent
    && (explicitlyRequestsCatalog || (hasSeenPriorityPresentation && clearFallbackSignal))
    && !catalogPolicy.eligibleForAlkalineCashOffer;

  const userAsksAlkalineSmart = /alkaline\s*smart|алкалайн\s*смарт|смарт\s*(?:фильтр\s*)?с\s*баком|smart\s*(?:фильтр\s*)?с\s*баком|корейск\w*\s*(?:смарт\s*)?(?:фильтр\s*)?с\s*баком/i.test(lowerUserText);
  const userAsksFoura = lowerUserText.includes('foura') || lowerUserText.includes('фоур') || lowerUserText.includes('дорогой') || lowerUserText.includes('дороже') || lowerUserText.includes('expensive');
  const userAsksAlkaline = ((lowerUserText.includes('alkaline') && !userAsksAlkalineSmart) || (lowerUserText.includes('алкалайн') && !userAsksAlkalineSmart) || lowerUserText.includes('g75') || lowerUserText.includes('дешев') || lowerUserText.includes('cheaper') || isConfirmedTankChoice) && !userAsksAlkalineSmart;
  
  // Специфический запрос доказательства цены 420к на Kaspi (расширенный список):
  const isExplicitKaspiOrProof = lowerUserText.includes('kaspi') || lowerUserText.includes('каспи') || lowerUserText.includes('скидк') || lowerUserText.includes('уступ') || lowerUserText.includes('420') || lowerUserText.includes('маркетплейс') || lowerUserText.includes('докажи') || lowerUserText.includes('скрин') || lowerUserText.includes('почему так дорого') || lowerUserText.includes('почему дорого');

  // Явные запросы альбома фотографий самого фильтра со стороны пользователя:
  const isPhotoWord = lowerUserText.includes('фото') || lowerUserText.includes('картинк') || lowerUserText.includes('сним') || lowerUserText.includes('покажи') || lowerUserText.includes('покажите') || lowerUserText.includes('как выглядит') || lowerUserText.includes('презентац') || lowerUserText.includes('посмотр') || lowerUserText.includes('пришли') || lowerUserText.includes('присылай') || lowerUserText.includes('отправь') || lowerUserText.includes('скинь') || lowerUserText.includes('photo') || lowerUserText.includes('picture') || lowerUserText.includes('pic') || lowerUserText.includes('show') || lowerUserText.includes('send') || lowerUserText.includes('сурет') || lowerUserText.includes('көрсет') || lowerUserText.includes('жібер');
  const hasExactYes = /\b(да|давайте|давай|пришли|присылайте|хочу|отправляй|отправляйте|yes|ok|okay|sure|yeah|yep|иә|ия|жақсы|мақұл|әрине|аха|жіберіңіз|көрейік)\b/i.test(lowerUserText);
  const lastMsgWasAiAskingPhoto = chats[chatId]?.messages?.slice(-3).some(m => m.sender === 'ai' && (m.text.toLowerCase().includes('фото') || m.text.toLowerCase().includes('пришлю') || m.text.toLowerCase().includes('photo') || m.text.toLowerCase().includes('send') || m.text.toLowerCase().includes('сурет')));
  const userConfirmedPhoto = hasExactYes && lastMsgWasAiAskingPhoto;

  const explicitPhotoRequest = (isPhotoWord || userConfirmedPhoto) && !isExplicitKaspiOrProof;

  // Вопрос ИИ ИМЕННО с предложением отправить фото ("Хотите я пришлю фото?", "Прислать вам фото?"):
  const aiIsAskingToSend = (lowerAiReply.includes('прислать') || lowerAiReply.includes('хотите') || lowerAiReply.includes('показать')) && (lowerAiReply.includes('фото') || lowerAiReply.includes('флагман')) && lowerAiReply.includes('?');
  
  // Утверждение ИИ о факте отправки ФОТО ПРОДУКТА (все формы глаголов: настоящее, будущее, прошедшее):
  const aiTalksAboutKaspiProof = lowerAiReply.includes('скриншот') || lowerAiReply.includes('маркетплейс') || lowerAiReply.includes('доказательств');
  const aiSaysSendingPhotos = (lowerAiReply.includes('отправляю') || lowerAiReply.includes('отправила') || lowerAiReply.includes('отправил ') || lowerAiReply.includes('присылаю') || lowerAiReply.includes('прислала') || lowerAiReply.includes('высылаю') || lowerAiReply.includes('сейчас отправлю') || lowerAiReply.includes('сейчас пришлю') || lowerAiReply.includes('вот презентац') || lowerAiReply.includes('презентац')) && !aiTalksAboutKaspiProof;

  let isFoura = false;
  let isAlkaline = false;
  let isAlkalineSmart = false;
  const explicitlySelectedFoura = isExplicitFouraRequest || isDirectTanklessSelection || isConfirmedTanklessChoice;
  const explicitlySelectedAlkaline = userAsksAlkaline;
  const explicitlySelectedAlkalineSmart = userAsksAlkalineSmart;
  const explicitlyRequestedBothProducts = /\u043e\u0431\u0435\s+\u043c\u043e\u0434\u0435\u043b\u0438|\u043e\u0431\u0435\s+\u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u0438|\u043e\u0431\u0430\s+\u0444\u0438\u043b\u044c\u0442\u0440\u0430|\u0434\u0432\u0430\s+\u0444\u0438\u043b\u044c\u0442\u0440\u0430|\u0434\u0432\u0430\s+\u0432\u0430\u0440\u0438\u0430\u043d\u0442\u0430|\u0441\u0440\u0430\u0432\u043d\u0438\u0442\u044c\s+\u043e\u0431\u0430|both models|both filters/i.test(lowerUserText)
    || (explicitlySelectedFoura && (explicitlySelectedAlkaline || explicitlySelectedAlkalineSmart));
  const legacyTargets = resolveProductAttachmentTargets({
    wantsFoura: explicitlySelectedFoura,
    wantsAlkaline: explicitlySelectedAlkaline,
    wantsAlkalineSmart: explicitlySelectedAlkalineSmart,
    wantsBoth: explicitlyRequestedBothProducts,
    fouraAlreadyPresented: chats[chatId].albumSent.foura,
    alkalineAlreadyPresented: chats[chatId].albumSent.alkaline,
    alkalineSmartAlreadyPresented: chats[chatId].albumSent.alkalineSmart
  });

  // Альбом отправляется СТРОГО если:
  // 1. Пользователь явно попросил фото фильтра ("покажи фото", "как выглядит"), ИЛИ
  // 2. ИИ в ТЕКУЩЕМ ответе прямо утверждает "отправляю/присылаю вам фото" (это происходит когда 
  //    пользователь ранее сказал "Давайте" и ИИ ответил "Отлично, сейчас отправлю фото!")
  // ВАЖНО: Простое "Да"/"Давайте"/"Хочу" БЕЗ подтверждения отправки фото в ответе ИИ НЕ триггерит альбом!
  // ДВОЙНАЯ ЗАЩИТА: блокируем альбом если (1) пользователь спрашивает про Kaspi/цену, (2) ИИ говорит про скриншот, ИЛИ (3) клиент спрашивает про сертификат/происхождение
  const isCertificateRequested = /сертификат|сертификаты|покаж.*документ|пришл.*документ|документ.*соответств|подтверждени.*оригинальност|сертификат.*соответств/i.test(lowerUserText);

  const explicitPresentationRequest = lowerUserText.includes('дешев') || lowerUserText.includes('дорож') || lowerUserText.includes('дорогой') || lowerUserText.includes('презентац') || lowerUserText.includes('инструкц') || lowerUserText.includes('покажи') || lowerUserText.includes('пдф') || lowerUserText.includes('pdf') || userAsksAlkalineSmart;
  const shouldSendAlbum = (explicitPhotoRequest || aiSaysSendingPhotos || explicitPresentationRequest || isConfirmedTankChoice || isConfirmedTanklessChoice || userAsksAlkalineSmart) && !isExplicitKaspiOrProof && !aiTalksAboutKaspiProof && !isCertificateRequested && !shouldSendProductCatalog;

  if (shouldSendAlbum) {
    const userAsksBoth = /обе модели|обе презентации|оба фильтра|два фильтра|два варианта|сравнить оба|both models|both filters|екеуі де/i.test(lowerUserText);
    const aiAsksBoth = /обе модели|обе презентации|оба фильтра|два фильтра|два варианта|сравнить оба|both models|both filters|екеуі де/i.test(lowerAiReply);

    if (userAsksBoth || aiAsksBoth || (userAsksAlkaline && userAsksFoura)) {
      isFoura = true;
      isAlkaline = true;
    } else if (userAsksAlkalineSmart || (lowerAiReply.includes('alkaline smart') || lowerAiReply.includes('алкалайн смарт'))) {
      isAlkalineSmart = true;
    } else if (userAsksAlkaline || (lowerAiReply.includes('alkaline') && !lowerAiReply.includes('foura'))) {
      isAlkaline = true;
    } else {
      isFoura = true; // По умолчанию или при запросе FOURA
    }
  }

  // 1. ОФИЦИАЛЬНЫЙ СЕРТИФИКАТ (Строго при явном запросе сертификата или оригинальности от пользователя)
  // A legacy PDF can only follow an explicit customer model choice. This gate
  // overrides older broad keyword rules that treated any "show" request as
  // a FOURA request.
  const safeShouldSendAlbum = shouldUseLegacyProductAttachments({
    hasAttachmentRequest: explicitPhotoRequest || aiSaysSendingPhotos || explicitPresentationRequest || isConfirmedTankChoice || isConfirmedTanklessChoice || userAsksAlkalineSmart,
    hasProductTarget: legacyTargets.foura || legacyTargets.alkaline || legacyTargets.alkalineSmart,
    isFouraThreeStepContext: isFouraNoTankContext,
    isKaspiProof: isExplicitKaspiOrProof,
    aiTalksAboutKaspiProof,
    isCertificateRequested,
    shouldSendProductCatalog
  });
  isFoura = safeShouldSendAlbum ? legacyTargets.foura : false;
  isAlkaline = safeShouldSendAlbum ? legacyTargets.alkaline : false;
  isAlkalineSmart = safeShouldSendAlbum ? legacyTargets.alkalineSmart : false;
  // RO-H015 is also a tank model: a generic "с баком" in its dialogue must not
  // pull in the G75 or FOURA presentation.
  if (isRoH015Context && !/foura|фоур|alkaline|алкалайн|g75|smart|смарт/i.test(lowerUserText)) {
    isFoura = false;
    isAlkaline = false;
    isAlkalineSmart = false;
  }

  // The certificate itself is sent before the AI reply (COMPANY_DOCUMENTS).

  // 2. СРАВНЕНИЕ И МЕМБРАНА (Отправляется при объяснении принципа очистки, сравнении систем или вопросах про мембрану)
  if (!chats[chatId].membraneSent) chats[chatId].membraneSent = false;
  // A comparison of the two models is not a request for a membrane lesson.
  // Send this extra image only when the customer explicitly asks how cleaning works.
  const isExplainingPurification = /мембран|как\s+очищ|как\s+работает\s+фильтр|принцип\s+очистк/i.test(lowerUserText);
  if (isExplainingPurification && !chats[chatId].membraneSent) {
    chats[chatId].membraneSent = true;
    savePersistentData();
    await sendPic('when explain membrain use this picture.jpg', '🔬 Высокоэффективная молекулярная мембрана VODEL (сердце системы очистки)');
  }

  // 2.5. ДИЗАЙНЕРСКИЙ СМЕСИТЕЛЬ ПОД ИНТЕРЬЕР (СТРОГО ПРИ ЯВНОМ ЗАПРОСЕ ПОЛЬЗОВАТЕЛЯ!)
  const isDesignRequested = lowerUserText.includes('дизайн') || lowerUserText.includes('интерьер') || lowerUserText.includes('другой кран') || lowerUserText.includes('стиль крана') || lowerUserText.includes('цвет крана') || lowerUserText.includes('золот') || lowerUserText.includes('черн') || lowerAiReply.includes('высылаю дизайнерский каталог');
  if (isDesignRequested) {
    await sendPic('faucets.pdf', '🚰 Каталог дизайнерских смесителей VODEL под интерьер вашей кухни — 15 000 тг');
  }

  // 2.6. СТАНДАРТНЫЙ КРАН ИЗ КОМПЛЕКТА (СТРОГО ПРИ ЯВНОМ СПЕЦИФИЧЕСКОМ ЗАПРОСЕ ПОЛЬЗОВАТЕЛЯ ПРО КРАН!)
  const isStandardFaucetRequested = (lowerUserText.includes('кран') || lowerUserText.includes('смеситель')) && (lowerUserText.includes('как выглядит') || lowerUserText.includes('покажи') || lowerUserText.includes('комплект') || lowerUserText.includes('входит') || lowerUserText.includes('какой')) && !isDesignRequested;
  if (isStandardFaucetRequested) {
    await sendPic('faucet.jpeg', '🚰 Фирменный двойной смеситель VODEL, который бесплатно идет в комплекте с фильтром');
  }

  // A question about installation space needs a real visual answer, not a file
  // name in the text. Send the FOURA parameter image only once per chat.
  if (!chats[chatId].fouraSpaceImagesSent) chats[chatId].fouraSpaceImagesSent = false;
  const asksAboutUnderSinkSpace = /\u043c\u0435\u0441\u0442\u043e\s+\u043f\u043e\u0434\s+(?:\u043c\u043e\u0439\u043a\u043e\u0439|\u0440\u0430\u043a\u043e\u0432\u0438\u043d\u043e\u0439)|\u0440\u0430\u0437\u043c\u0435\u0440\s+\u043f\u043e\u0434\s+(?:\u043c\u043e\u0439\u043a\u0443|\u0440\u0430\u043a\u043e\u0432\u0438\u043d\u043e\u0439)/i.test(lowerUserText);
  if (asksAboutUnderSinkSpace && !isRoH015Context && !chats[chatId].fouraSpaceImagesSent) {
    chats[chatId].fouraSpaceImagesSent = true;
    savePersistentData();
    await sendPic(path.join('Vodel content', 'FOURA', 'foura parameters.jpeg'), '💧 Параметры компактного FOURA — ширина корпуса 16 см');
  }

  // 2.7. МАТЕРИАЛЫ RO-H015 — только в диалоге об этой модели и по запросу клиента.
  // Each set (photos, size, video) goes out once per chat.
  if (isRoH015Context && !isCertificateRequested && !isExplicitKaspiOrProof) {
    if (!chats[chatId].roH015Sent) chats[chatId].roH015Sent = { photos: false, size: false, video: false };
    const roH015Sent = chats[chatId].roH015Sent;
    const roH015Dir = path.join('Vodel content', '01_RO-H015');
    const roH015AiSendsNow = /отправляю|присылаю|высылаю|сейчас отправлю|сейчас пришлю/.test(lowerAiReply);
    const roH015WantsVideo = /видео|ролик|video/.test(lowerUserText) || (roH015AiSendsNow && /видео/.test(lowerAiReply));
    const roH015WantsSize = asksAboutUnderSinkSpace
      || /размер|габарит|сколько\s+места|высот|ширин|глубин|поместит|влез/.test(lowerUserText)
      || (roH015AiSendsNow && /размер/.test(lowerAiReply));
    const userNamesPhotos = /фото|photo|сурет|картинк/.test(lowerUserText);
    const roH015WantsPhotos = (explicitPhotoRequest || /презентац/.test(lowerUserText) || (roH015AiSendsNow && /фото|презентац/.test(lowerAiReply)))
      && (userNamesPhotos || (!roH015WantsVideo && !roH015WantsSize));

    if (roH015WantsPhotos && !roH015Sent.photos) {
      roH015Sent.photos = true;
      savePersistentData();
      await sendPic(path.join(roH015Dir, 'ro_h015_1_main.jpeg'), '💧 Фильтр RO-H015 (США) — 6 ступеней очистки обратным осмосом с минерализацией');
      await sendPic(path.join(roH015Dir, 'ro_h015_2_komplekt.jpeg'), '📦 В комплекте: электрический насос для подачи давления, бак-накопитель на 8 литров и евро-кран');
      await sendPic(path.join(roH015Dir, 'ro_h015_3_ochistka_99.jpeg'), '🛡️ Удаляет до 99% примесей: бактерии и вирусы, тяжелые металлы, хлор, пестициды, ржавчину');
      await sendPic(path.join(roH015Dir, 'ro_h015_ustanovka.jpeg'), '🏠 Так RO-H015 выглядит после установки под мойкой');
    }
    if (roH015WantsSize && !roH015Sent.size) {
      roH015Sent.size = true;
      savePersistentData();
      await sendPic(path.join(roH015Dir, 'ro_h015_razmery.jpeg'), '📏 Размеры RO-H015: фильтр 37 × 20 × 42 см (Д × Ш × В), бак 25 × 33 см (Ш × В)');
    }
    if (roH015WantsVideo && !roH015Sent.video) {
      roH015Sent.video = true;
      savePersistentData();
      await sendPic(path.join(roH015Dir, 'ro_h015_video.mp4'), '🎥 Видео фильтра RO-H015');
    }
  }

  // 3. СКРИНШОТ ЦЕНЫ FOURA — только при явной просьбе доказать/показать цену.
  // Обычный вопрос о Kaspi или рассрочке получает только текстовый ответ по
  // текущей модели и никогда не запускает чужое изображение.
  if (!chats[chatId].kaspiSent) chats[chatId].kaspiSent = false;
  const isCheckoutPhase = lowerUserText.includes('адрес') || lowerUserText.includes('дом') || lowerUserText.includes('кв') || lowerUserText.includes('подъезд') || lowerUserText.includes('вечер') || lowerUserText.includes('утро') || lowerUserText.includes('записал') || lowerAiReply.includes('телефон');
  const activeProductContext = resolveLatestCatalogProduct(chats[chatId].messages, textContent);
  const shouldSendFouraPriceProof = isFouraPriceProofRequest(lowerUserText, activeProductContext?.id);
  if (shouldSendFouraPriceProof && !isCheckoutPhase) {
    chats[chatId].kaspiSent = true;
    savePersistentData();
    const proofCaption = `📱 Стоимость FOURA 600 GPD — ${formatTenge(FOURA_FACTS.cashPrice)}. ${formatKaspiInstallmentOptions(FOURA_FACTS)}.`;
    await sendPic('kaspi marketplace screenshot.jpeg', proofCaption);
  }

  // 4. ПРЕЗЕНТАЦИЯ FOURA (PDF презентация)
  if (isFoura && !isFouraNoTankContext && !chats[chatId].albumSent.foura) {
    chats[chatId].albumSent.foura = true;
    savePersistentData();
    await sendPic('foura.pdf', '✨ Прямоточный смарт-фильтр VODEL FOURA 600 GPD (Презентация и характеристики)');
  }

  // 5. ПРЕЗЕНТАЦИЯ ALKALINE G75 (PDF презентация)
  if (isAlkaline && !chats[chatId].albumSent.alkaline) {
    chats[chatId].albumSent.alkaline = true;
    savePersistentData();
    await sendPic('alkaline.pdf', '🛢️ Стационарный фильтр VODEL Alkaline G75 (Презентация)');
  }

  // 5.1. ПРЕЗЕНТАЦИЯ ALKALINE SMART (Фото)
  if (isAlkalineSmart && !chats[chatId].albumSent.alkalineSmart) {
    chats[chatId].albumSent.alkalineSmart = true;
    savePersistentData();
    const smartImagePath = path.join('Vodel content', 'Alkaline Smart', 'Alkaline Smart.png');
    await sendPic(smartImagePath, '💧 Корейский смарт-фильтр VODEL Alkaline Smart с накопительным баком 8 л (Фото и характеристики)');
  }

  // 5.2. ВИДЕО ALKALINE SMART (При явном запросе видео)
  const isVideoRequested = /видео|ролик|клип|video/i.test(lowerUserText);
  if (isVideoRequested && (userAsksAlkalineSmart || isAlkalineSmart)) {
    const smartVideoPath = path.join('Vodel content', 'Alkaline Smart', 'Alkaline Smart video.mp4');
    await sendPic(smartVideoPath, '🎥 Видеообзор корейского смарт-фильтра VODEL Alkaline Smart');
  }

  if (shouldSendProductCatalog) {
    const catalogWasSent = await sendProductCatalog(chatId, chatObj, chats[chatId]);
    if (catalogWasSent) {
      chats[chatId].catalogSent = true;
      savePersistentData();
    }
  }

  // Проверка на отмену или завершение продажи
  const lowerProcessedText = (textContent || '').toLowerCase();
  const lowerAiConfirm = (cleanedAiReply || '').toLowerCase();

  // Триггеры отмены заказа со стороны клиента или ИИ
  const clientCancelTriggers = ['отмен', 'не надо', 'передумал', 'передумала', 'не буду', 'отказыв', 'не хочу', 'отмените', 'снимите заказ', 'отменяю'];
  const aiCancelTriggers = ['заказ отменен', 'отменила заказ', 'отменил заказ', 'заявка отменена'];

  const clientCancelled = clientCancelTriggers.some(t => lowerProcessedText.includes(t));
  const aiCancelled = aiCancelTriggers.some(t => lowerAiConfirm.includes(t));

  // СТРОГИЕ клиентские триггеры подтверждения и финализации заказа:
  const clientSaleTriggers = [
    'подтверждаю заказ', 'все верно', 'всё верно', 'всё правильно', 'все правильно',
    'да, верно', 'да верно', 'оформляйте', 'заказываю', 'давайте оформ'
  ];

  // СТРОГИЕ ИИ-триггеры финализации заказа:
  const aiSaleConfirmTriggers = [
    'заказ оформлен', 'заказ принят', 'заказ подтвержд', 'запись подтвержд', 'доставка оформлена'
  ];

  const clientTriggered = clientSaleTriggers.some(t => lowerProcessedText.includes(t));
  const aiTriggered = aiSaleConfirmTriggers.some(t => lowerAiConfirm.includes(t));

  if (clientCancelled || aiCancelled) {
    setTimeout(async () => {
      if (!chats[chatId]) return;
      const cleanPhone = chats[chatId].number;
      const existingIndex = completedSales.findIndex(s => s.phone === cleanPhone);
      if (existingIndex >= 0) {
        if (completedSales[existingIndex].flag !== 'Отменен') {
          completedSales[existingIndex].flag = 'Отменен';
          completedSales[existingIndex].lastNotifiedFlag = 'Отменен';
          savePersistentData();
          broadcast('sales_updated', completedSales);

          if ((chats[chatId].supervisorNotifCount || 0) < 3) {
            const supChatId = getSupervisorChatId();
            if (supChatId) {
              try {
                chats[chatId].supervisorNotifCount = (chats[chatId].supervisorNotifCount || 0) + 1;
                savePersistentData();
                const summaryText = `❌ [ОТМЕНА ЗАКАЗА!]\n\n👤 Клиент: ${chatName}\n📞 Тел: +${cleanPhone}\n📍 Статус в системе: Заказ отменен клиентом.`;
                await client.sendMessage(supChatId, summaryText);
              } catch (err) {
                console.error('Ошибка отправки отмены супервайзеру:', err.message || err);
              }
            }
          }
        }
      }
    }, 1500);
  } else if (clientTriggered || aiTriggered) {
    setTimeout(async () => {
      if (!chats[chatId] || !chats[chatId].messages) return;
      
      // СТРОГИЙ ЛИМИТ: Не более 3 уведомлений супервайзеру на один чат с клиентом!
      if ((chats[chatId].supervisorNotifCount || 0) >= 3) return;

      const leadInfo = await aiWorkflow.extractLeadSummary(chats[chatId].messages);
      if (leadInfo) {
        // DOUBLE CHECK STRICT VALIDATION: Игнорируем ложные срабатывания (например, когда клиент сказал "да, верно" на другой вопрос)
        const isMissingInfo = !leadInfo.address || leadInfo.address.includes('Не указан') || 
                              !leadInfo.model || leadInfo.model.includes('Не определена') ||
                              !leadInfo.payment || leadInfo.payment.includes('Не указан') ||
                              !leadInfo.city || leadInfo.city.includes('Не указано');
        
        if (isMissingInfo && !aiTriggered) {
          console.log(`⚠️ Ложное срабатывание подтверждения заказа для ${chatName}. Не хватает данных, продолжаем диалог.`);
          return;
        }

        leadInfo.timestamp = new Date().toISOString();
        leadInfo.phone = chats[chatId].number;
        if (leadInfo.name === 'Имя или Не указано') leadInfo.name = chatName;

        const existingIndex = completedSales.findIndex(s => s.phone === leadInfo.phone);
        const newFlag = leadInfo.payment && leadInfo.payment.toLowerCase().includes('kaspi') ? 'Ожидает оплаты' : 'Подтвержден';
        leadInfo.flag = newFlag;

        let shouldNotifySupervisor = false;

        if (existingIndex >= 0) {
          const oldSale = completedSales[existingIndex];
          if (oldSale.lastNotifiedFlag !== newFlag) {
            shouldNotifySupervisor = true;
            leadInfo.lastNotifiedFlag = newFlag;
          } else {
            leadInfo.lastNotifiedFlag = oldSale.lastNotifiedFlag;
          }
          completedSales[existingIndex] = { ...completedSales[existingIndex], ...leadInfo };
        } else {
          leadInfo.lastNotifiedFlag = newFlag;
          completedSales.push(leadInfo);
          shouldNotifySupervisor = true;
        }

        savePersistentData();
        broadcast('sales_updated', completedSales);

        if (shouldNotifySupervisor && (chats[chatId].supervisorNotifCount || 0) < 3) {
          const supChatId = getSupervisorChatId();
          if (supChatId) {
            try {
              chats[chatId].supervisorNotifCount = (chats[chatId].supervisorNotifCount || 0) + 1;
              savePersistentData();
              const statusHeader = newFlag === 'Ожидает оплаты' ? '🟡 [ЗАКАЗ ОЖИДАЕТ ОПЛАТЫ / РАССРОЧКА]' : '🎉 [НОВАЯ ПРОДАЖА / ЗАКАЗ ПОДТВЕРЖДЕН!]';
              const summaryText = `${statusHeader}\n\n👤 Клиент (Имя): ${leadInfo.name}\n📞 Тел: +${leadInfo.phone}\n📍 Город: ${leadInfo.city}\n🏠 Адрес: ${leadInfo.address || 'Не указан'}\n📅 День и время монтажа: ${leadInfo.installationTime || 'Не указаны'}\n📦 Модель: ${leadInfo.model}\n💳 Оплата: ${leadInfo.payment}\n📝 Детали: ${leadInfo.summary}`;
              await client.sendMessage(supChatId, summaryText);
            } catch (err) {
              console.error('Ошибка отправки сообщения супервайзеру:', err.message || err);
            }
          }
        }
      }
    }, 2000);
  }

  // One tightly-scoped sales follow-up: only after a customer has explicitly
  // accepted Alkaline G75, answered our city question with a warehouse city,
  // then stayed silent for three minutes. Any reply or manual takeover cancels it.
  if (shouldScheduleAlkalineSilencePresentation({
    isFirstBotReplyInChat,
    cityReply: turnContext.cityReply,
    warehouseCityKnown: catalogPolicy.warehouseCityKnown,
    g75InterestConfirmed: hasConfirmedG75Interest(chats[chatId].messages),
    alreadySent: Boolean(chats[chatId].g75WarehouseFollowUpSent)
  })) {
    scheduleAlkalineSilenceFollowUp(chatId);
  }
  });
  inboundLedger.mark(msgUniqueId, 'handled', chatId);
}
client.on('message', msg => {
  void handleInboundMessage(msg).catch(error => console.error('[INBOUND FAILURE]', error.stack || error));
});

function lockChatForHumanMessage(chatId, message) {
  if (!chatId) return;
  const outboundText = String(message.body || message.caption || '').trim();
  if (!chats[chatId]) {
    chats[chatId] = {
      id: chatId,
      name: '',
      number: normalizePhone(chatId),
      status: 'human',
      createdAt: new Date().toISOString(),
      messages: [],
      albumSent: { foura: false, alkaline: false, alkalineSmart: false }
    };
  }

  const chat = chats[chatId];
  chat.status = 'human';
  chat.manualTakeover = true;
  if (!chat.messages) chat.messages = [];
  if (outboundText) {
    const messageId = message.id?._serialized || '';
    const alreadyStored = chat.messages.some(entry => entry.sender === 'human' && entry.messageId === messageId);
    if (!alreadyStored) {
      chat.messages.push({
        sender: 'human',
        text: outboundText,
        messageId,
        timestamp: new Date().toISOString()
      });
    }
  }
  savePersistentData();
  broadcast('chat_status_change', { chatId, status: 'human' });
}

// If the operator sends a message from the phone, lock the conversation before
// any subsequent client reply can reach the AI. This also covers a brand-new
// chat that does not yet exist in the dashboard store.
client.on('message_create', async (msg) => {
  if (isOutgoingFromThisAccount(msg) && !String(msg.to || '').endsWith('@g.us')) {
    const chatId = msg.to;
    // Multi-device replays old outgoing history after every reconnect. Only an
    // outgoing message created in this READY session can mean a live takeover.
    if (!isMessageNewForCurrentSession({
      messageTimestampSeconds: msg.timestamp,
      sessionReadyAtSeconds: currentSessionReadyAtSeconds
    })) {
      console.log(`[HUMAN REPLAY] Ignored historical outgoing message for ${chatId}.`);
      return;
    }
    const outboundDetails = {
      id: msg.id?._serialized,
      body: msg.body || msg.caption || '',
      isMedia: Boolean(msg.hasMedia || (msg.type && msg.type !== 'chat'))
    };
    const isAutomatedEcho = automatedOutboundGuard.consume(chatId, outboundDetails)
      || automatedOutboundGuard.consumeAny(outboundDetails);
    if (isAutomatedEcho) {
      console.log(`[BOT ECHO] Ignoring automated outgoing message for ${chatId}.`);
      return;
    }
    const nativeGreetingKind = classifyNativeBusinessGreeting(outboundDetails.body);
    if (nativeGreetingKind) {
      // This message is generated by WhatsApp/Meta, not by the manager and not
      // by our bot. Ignore it completely so the real inbound handler still
      // sends the approved VODEL welcome and owns the three-minute reminder.
      console.log(`[NATIVE GREETING] Ignored WhatsApp Business ${nativeGreetingKind} template for ${chatId}.`);
      return;
    }
    console.log(`👤 Human message detected. Smart Takeover locked for ${chatId}.`);
    lockChatForHumanMessage(chatId, msg);
  }
});

// API Эндпоинты для веб-интерфейса
app.get('/api/status', (req, res) => {
  res.json({
    status: clientStatus,
    qr: qrCodeData,
    botEnabled,
    reliabilityVersion: 1,
    lastInboundAt,
    reconnectAttempt,
    authenticationRequired,
    deferredInbound: deferredInbound.size,
    activeChats: chatLocks.size,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.post('/api/whatsapp/reconnect', async (req, res) => {
  console.log('🔄 Запрос на повторную инициализацию WhatsApp...');
  // A second click while Chromium is opening creates a competing browser for
  // the same LocalAuth profile and leaves WhatsApp permanently disconnected.
  // Fail fast instead of destroying the in-flight connection.
  if (isInitializing || clientStatus === 'CONNECTING') {
    return res.status(409).json({
      success: false,
      error: 'WhatsApp is already connecting. Please wait; no second connection was started.',
      status: clientStatus
    });
  }
  try {
    disarmAutomaticReplies('manual reconnect requested');
    await client.destroy().catch(() => {});
    safeInitializeClient();
    res.json({ success: true, status: clientStatus });
  } catch (e) {
    console.error('Ошибка инициализации WhatsApp:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/config', (req, res) => {
  const { enabled, mode } = req.body;
  const currentSafety = getAutoReplySafety();
  if (enabled === true && currentSafety.reason === 'STARTUP_SAFETY_HOLD') {
    const config = getBotConfig();
    broadcast('bot_config_change', config);
    return res.status(409).json({
      success: false,
      error: 'Safety hold is active. Wait for WhatsApp synchronization to finish before enabling automation.',
      ...config
    });
  }

  if (mode !== undefined) {
    if (!['paused', 'new_leads_only', 'all'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid automation mode.' });
    }
    automationMode = mode;
    if (mode === 'new_leads_only') protectedExistingChatIds = new Set(Object.keys(chats));
    botEnabled = mode !== 'paused';
    cancelAllFilterTypeFollowUps();
    saveBotRuntimeConfig();
  } else if (enabled !== undefined) {
    if (enabled === false) automationMode = 'paused';
    else if (automationMode === 'paused') automationMode = 'new_leads_only';
    botEnabled = automationMode !== 'paused';
    if (botEnabled && automationMode === 'new_leads_only' && protectedExistingChatIds.size === 0) {
      protectedExistingChatIds = new Set(Object.keys(chats));
    }
    cancelAllFilterTypeFollowUps();
    saveBotRuntimeConfig();
  }

  const config = getBotConfig();
  broadcast('bot_config_change', config);
  res.json({ success: true, ...config });
});

app.get('/api/sales', (req, res) => {
  res.json(completedSales);
});

app.delete('/api/sales/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  if (!isNaN(idx) && idx >= 0 && idx < completedSales.length) {
    completedSales.splice(idx, 1);
    savePersistentData();
    broadcast('sales_updated', completedSales);
    res.json({ success: true, sales: completedSales });
  } else {
    res.status(404).json({ error: 'Sale not found' });
  }
});

app.post('/api/sales/:index/flag', (req, res) => {
  const idx = parseInt(req.params.index);
  const { flag } = req.body;
  if (!isNaN(idx) && idx >= 0 && idx < completedSales.length) {
    completedSales[idx].flag = flag; // e.g. 'Paid', 'Pending', 'Cancelled'
    savePersistentData();
    broadcast('sales_updated', completedSales);
    res.json({ success: true, sale: completedSales[idx] });
  } else {
    res.status(404).json({ error: 'Sale not found' });
  }
});

app.get('/api/chats', (req, res) => {
  res.json(Object.values(chats).map(getCleanChat));
});

// Operator-triggered, read-only export of recent direct chats for analysing the
// manager's sales style. It never sends, reads-receipts or modifies a chat.
app.post('/api/analysis/export-recent-chats', async (req, res) => {
  if (clientStatus !== 'READY') return res.status(409).json({ error: 'WhatsApp is not connected.' });
  const days = Math.min(Math.max(Number(req.body?.days) || 10, 1), 30);
  const sinceSeconds = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  try {
    // client.getChats() refreshes every group's metadata and fails on some
    // groups, so list direct chats straight from the WhatsApp Web store.
    const recentIds = await withTimeout(() => client.pupPage.evaluate(since => window.require('WAWebCollections').Chat
      .getModelsArray()
      .filter(chat => !chat.groupMetadata && Number(chat.t || 0) >= since)
      .map(chat => chat.id._serialized)
      .filter(id => !id.endsWith('@broadcast') && !id.endsWith('@g.us') && !id.endsWith('@newsletter')), sinceSeconds), 30_000, 'chat list');
    const exported = [];
    for (const chatId of recentIds) {
      try {
        const remoteChat = await withTimeout(() => client.getChatById(chatId), 15_000, 'chat lookup');
        const messages = await withTimeout(() => remoteChat.fetchMessages({ limit: 300 }), 30_000, 'chat history');
        const inWindow = messages.filter(message => Number(message.timestamp || 0) >= sinceSeconds);
        if (!inWindow.length) continue;
        exported.push({
          chatId: remoteChat.id._serialized,
          name: remoteChat.name || '',
          messages: inWindow.map(message => ({
            fromMe: Boolean(message.fromMe),
            type: message.type,
            body: String(message.body || message.caption || ''),
            hasMedia: Boolean(message.hasMedia),
            timestamp: new Date(Number(message.timestamp) * 1000).toISOString()
          }))
        });
      } catch (error) {
        exported.push({ chatId, error: error.message });
      }
    }
    const outDir = path.join(__dirname, 'analysis');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `recent_chats_${days}d.json`);
    fs.writeFileSync(outFile, JSON.stringify({ exportedAt: new Date().toISOString(), days, chats: exported }, null, 2));
    res.json({ success: true, chats: exported.length, file: outFile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Operator-triggered recovery only. This reads up to three named direct chats
// and stores their latest text; it never sends a customer message.
app.post('/api/inbox/recover', async (req, res) => {
  const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : [];
  if (numbers.length < 1 || numbers.length > 3) {
    return res.status(400).json({ error: 'Provide one to three phone numbers.' });
  }

  try {
    const recovered = await recoverMissedInboundLeads(numbers);
    res.json({ success: true, recovered });
  } catch (error) {
    console.error('Ошибка восстановления пропущенных лидов:', error.message || error);
    res.status(500).json({ error: 'Missed leads could not be recovered. No WhatsApp message was sent.' });
  }
});

// The response is intentionally a separate, narrow action. It can only answer
// a recovered chat with no prior consultant message and respects the safety hold.
app.post('/api/inbox/recovered/:id/reply', async (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId]
    ? rawId
    : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : null);
  if (!chatId) return res.status(404).json({ error: 'Recovered chat not found.' });

  try {
    const message = await sendFirstReplyForRecoveredLead(chatId);
    res.json({ success: true, message });
  } catch (error) {
    const text = error.message || 'The reply was not sent.';
    const isSafetyBlock = /not enabled|Human takeover|already has a consultant/i.test(text);
    res.status(isSafetyBlock ? 409 : 500).json({ error: text });
  }
});

// Narrow emergency fallback for an operator-approved number when chat-history
// enumeration is unavailable. At most three named numbers may receive one
// welcome each; no history scan and no bulk messaging are possible here.
app.post('/api/inbox/explicit-welcome', async (req, res) => {
  const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : [];
  if (numbers.length < 1 || numbers.length > 3) {
    return res.status(400).json({ error: 'Provide one to three approved phone numbers.' });
  }

  try {
    const delivered = [];
    for (const number of numbers) {
      const message = await sendWelcomeToExplicitPhone(number);
      delivered.push({ phone: normalizePhone(number), message });
    }
    res.json({ success: true, delivered });
  } catch (error) {
    console.error('Ошибка точечной отправки приветствия:', error.message || error);
    res.status(409).json({ error: error.message || 'The welcome was not sent.' });
  }
});

// Review-only scan: this endpoint reads saved chats and never sends WhatsApp messages.
app.get('/api/follow-up-suggestions', (req, res) => {
  res.json({
    generatedAt: new Date().toISOString(),
    windowHours: DAY_MS / (60 * 60 * 1000),
    minimumWaitHours: MIN_FOLLOW_UP_AGE_MS / (60 * 60 * 1000),
    suggestions: buildFollowUpSuggestions(chats, completedSales)
  });
});

app.post('/api/follow-up-suggestions/send', async (req, res) => {
  const rawChatId = String(req.body?.chatId || '');
  const approvedText = String(req.body?.text || '').trim();
  const chatId = chats[rawChatId]
    ? rawChatId
    : (chats[decodeURIComponent(rawChatId)] ? decodeURIComponent(rawChatId) : null);

  if (!chatId || !approvedText || approvedText.length > 600) {
    return res.status(400).json({ error: 'Invalid follow-up approval.' });
  }
  if (clientStatus !== 'READY') {
    return res.status(409).json({ error: 'WhatsApp is not connected. The follow-up was not sent.' });
  }

  // Re-check at click time: no send if the client replied, opted out, or ordered.
  const isStillEligible = buildFollowUpSuggestions(chats, completedSales)
    .some(suggestion => suggestion.chatId === chatId);
  if (!isStillEligible) {
    return res.status(409).json({ error: 'This chat is no longer eligible for a follow-up. Nothing was sent.' });
  }

  try {
    // Explicit approval means this becomes a human-managed conversation.
    chats[chatId].status = 'human';
    await client.sendMessage(chatId, approvedText);
    const humanMsg = { sender: 'human', text: approvedText, timestamp: new Date().toISOString() };
    chats[chatId].messages.push(humanMsg);
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'human' });
    broadcast('new_message', { chatId, message: humanMsg, chat: chats[chatId] });
    updateChatAnalytics(chatId);
    res.json({ success: true, message: humanMsg });
  } catch (error) {
    console.error('Ошибка подтвержденной отправки follow-up:', error.message || error);
    res.status(500).json({ error: 'The follow-up was not sent.' });
  }
});

app.get('/api/success-case-analysis', (req, res) => {
  res.json({
    groupName: SUCCESS_CASES_GROUP_NAME,
    report: successfulSalesReport
  });
});

app.post('/api/success-case-analysis/run', async (req, res) => {
  if (clientStatus !== 'READY') {
    return res.status(409).json({ error: 'WhatsApp is not connected. Analysis was not started.' });
  }
  if (!aiWorkflow.genAI) {
    return res.status(503).json({ error: 'Gemini API is not configured. Analysis was not started.' });
  }

  try {
    const successCasesGroupId = await findGroupIdByExactName(SUCCESS_CASES_GROUP_NAME);
    if (!successCasesGroupId) {
      return res.status(404).json({ error: `Group “${SUCCESS_CASES_GROUP_NAME}” was not found in this WhatsApp account.` });
    }

    // Read only: this does not open the group, mark messages as read, or send.
    const groupMessages = await fetchGroupMessagesReadOnly(successCasesGroupId, MAX_FETCHED_GROUP_MESSAGES);
    const corpus = prepareSuccessfulSalesCorpus(groupMessages);
    if (!corpus.metadata.analyzedMessages) {
      return res.status(422).json({ error: 'No text messages from the last 60 days were available in this group.' });
    }

    const playbook = sanitizeSuccessfulSalesPlaybook(
      await aiWorkflow.analyzeSuccessfulSalesCases(corpus.transcript, corpus.metadata)
    );
    const report = {
      groupName: SUCCESS_CASES_GROUP_NAME,
      generatedAt: new Date().toISOString(),
      source: corpus.metadata,
      playbook
    };
    saveSuccessfulSalesReport(report);
    broadcast('success_case_analysis_updated', report);
    res.json({ success: true, report });
  } catch (error) {
    const detail = error && (error.stack || error.message) ? (error.stack || error.message) : String(error || 'Unknown error');
    console.error('Ошибка анализа успешных кейсов:', detail);
    res.status(500).json({ error: 'Не удалось прочитать группу для анализа. Клиентам ничего не отправлялось — попробуйте ещё раз через минуту.' });
  }
});

app.delete('/api/chats/:id/clear', (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId] ? rawId : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : Object.keys(chats).find(k => k.includes(rawId.replace(/\D/g, ''))));
  
  if (chatId && chats[chatId]) {
    chats[chatId].messages = [];
    chats[chatId].albumSent = { foura: false, alkaline: false, alkalineSmart: false };
    chats[chatId].catalogSent = false;
    chats[chatId].kaspiSent = false;
    chats[chatId].membraneSent = false;
    chats[chatId].disengagementNotified = false;
    chats[chatId].checkoutAuthorized = false;
    chats[chatId].checkoutAuthorizedAt = null;
    chats[chatId].addressQuestionAskedAt = null;
    savePersistentData();
    broadcast('chat_cleared', { chatId });
    res.json({ success: true, chat: getCleanChat(chats[chatId]) });
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

app.delete('/api/chats/:id', (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId] ? rawId : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : Object.keys(chats).find(k => k.includes(rawId.replace(/\D/g, ''))));

  if (chatId && chats[chatId]) {
    delete chats[chatId];
    savePersistentData();
    broadcast('chat_deleted', { chatId });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

app.post('/api/chats/:id/toggle-status', (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId] ? rawId : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : Object.keys(chats).find(k => k.includes(rawId.replace(/\D/g, ''))));
  const { status } = req.body;

  if (chatId && chats[chatId]) {
    chats[chatId].status = status;
    if (status === 'ai') chats[chatId].disengagementNotified = false;
    savePersistentData();
    broadcast('chat_status_change', { chatId, status });
    res.json({ success: true, status });
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

// Recovery-only action for a customer message that arrived while a chat was
// incorrectly put into manual mode. It sends one normal AI reply and keeps the
// chat in AI mode; it never replays older messages.
app.post('/api/chats/:id/retry-pending', async (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId] ? rawId : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : Object.keys(chats).find(k => k.includes(rawId.replace(/\D/g, ''))));
  const chat = chatId && chats[chatId];
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (clientStatus !== 'READY' || !getAutoReplySafety().allowed || !botEnabled) {
    return res.status(409).json({ error: 'Automatic replies are not ready' });
  }
  if (!canAutomateChat(chatId)) {
    return res.status(409).json({ error: 'Automation is disabled for this existing chat' });
  }
  const latestUserIndex = (chat.messages || []).findLastIndex(message => message.sender === 'user');
  const latestUserMessage = latestUserIndex >= 0 ? chat.messages[latestUserIndex] : null;
  if (!latestUserMessage) return res.status(422).json({ error: 'No customer message to answer' });

  chat.status = 'ai';
  chat.manualTakeover = false;
  if (latestUserMessage.source === 'voice' || /^\[Голосовое сообщение от клиента\]$/i.test(String(latestUserMessage.text || '').trim())) {
    const reply = 'Не удалось разобрать голосовое сообщение. Напишите, пожалуйста, ваш вопрос текстом или отправьте аудио ещё раз — я сразу отвечу.';
    if (isRecentAssistantDuplicate(chat.messages, reply)) {
      return res.status(409).json({ error: 'Recovery reply duplicates a recent bot message' });
    }
    await sendAutomatedMessage(chatId, reply);
    const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    chat.voiceTranscriptionNotified = false;
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'ai' });
    broadcast('new_message', { chatId, message: botMessage, chat });
    return res.json({ success: true, recovery: 'voice_retry', message: botMessage });
  }
  if (/^\[Клиент прислал медиафайл\]$/i.test(String(latestUserMessage.text || '').trim())) {
    const reply = 'Не удалось открыть вложение. Отправьте, пожалуйста, файл или фото ещё раз и при возможности добавьте короткое пояснение — я сразу отвечу.';
    if (isRecentAssistantDuplicate(chat.messages, reply)) {
      return res.status(409).json({ error: 'Recovery reply duplicates a recent bot message' });
    }
    await sendAutomatedMessage(chatId, reply);
    const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'ai' });
    broadcast('new_message', { chatId, message: botMessage, chat });
    return res.json({ success: true, recovery: 'media_retry', message: botMessage });
  }
  const recentUserTexts = chat.messages
    .slice(Math.max(0, latestUserIndex - 2), latestUserIndex + 1)
    .filter(message => message.sender === 'user')
    .map(message => String(message.text || '').trim());
  if (!chat.catalogSent && recentUserTexts.some(text => /^4$/.test(text))) {
    const chatObj = await client.getChatById(chatId).catch(() => null);
    const sent = await sendProductCatalog(chatId, chatObj, chat);
    broadcast('chat_status_change', { chatId, status: 'ai' });
    return res.json({ success: true, recovery: 'legacy_catalog_choice', catalog: true, sent });
  }
  if (/пенсионер|дорог/i.test(String(latestUserMessage.text || ''))) {
    const startingPrice = Math.min(...COMMERCIAL_FACTS.catalogProducts.map(product => product.price));
    const reply = `Понимаю вас. Есть более доступные фильтры от ${formatTenge(startingPrice)}, а Alkaline G75 стоит ${formatTenge(ALKALINE_FACTS.cashPrice)} при полной оплате или ${formatTenge(ALKALINE_FACTS.installmentPrice)} в рассрочку. Показать самые недорогие варианты без обязательств?`;
    if (isRecentAssistantDuplicate(chat.messages, reply)) {
      return res.status(409).json({ error: 'Recovery reply duplicates a recent bot message' });
    }
    await sendAutomatedMessage(chatId, reply);
    const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'ai' });
    broadcast('new_message', { chatId, message: botMessage, chat });
    return res.json({ success: true, recovery: 'budget_alternative', message: botMessage });
  }
  const recoveryTurn = analyzeConversationTurn({
    text: latestUserMessage.text,
    history: chat.messages.slice(0, latestUserIndex),
    advertisedProduct: chat.advertisedProduct
  });
  if (isExplicitPurchaseIntent(latestUserMessage.text, recoveryTurn.previousAssistant)) {
    chat.checkoutAuthorized = true;
    chat.checkoutAuthorizedAt = new Date().toISOString();
  }
  if (recoveryTurn.confirmFouraPresentation) {
    const chatObj = await client.getChatById(chatId).catch(() => null);
    await sendFouraPresentationBundle(chatId, chatObj, chat);
    broadcast('chat_status_change', { chatId, status: 'ai' });
    return res.json({ success: true, presentation: 'foura' });
  }
  if (recoveryTurn.confirmCatalog) {
    const chatObj = await client.getChatById(chatId).catch(() => null);
    const sent = await sendProductCatalog(chatId, chatObj, chat);
    broadcast('chat_status_change', { chatId, status: 'ai' });
    return res.json({ success: true, catalog: true, sent });
  }
  const recoveredMenuChoice = chat.awaitingProductMenu
    ? detectProductMenuChoice(latestUserMessage.text)
    : null;
  if (recoveredMenuChoice) {
    const chatObj = await client.getChatById(chatId).catch(() => null);
    chat.awaitingProductMenu = false;
    chat.selectedMenuProduct = recoveredMenuChoice;
    if (recoveredMenuChoice === 1) await sendProductCatalog(chatId, chatObj, chat);
    if (recoveredMenuChoice === 2) await sendFouraPresentationBundle(chatId, chatObj, chat);
    if (recoveredMenuChoice === 3) await sendAlkalineSmartMenuBundle(chatId, chatObj, chat);
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'ai' });
    return res.json({ success: true, menuChoice: recoveredMenuChoice });
  }

  // Resume the exact warehouse-city + G75 sales moment deterministically.
  // This keeps a manually resumed chat in AI mode instead of using the
  // dashboard's human-send endpoint, which intentionally takes over the chat.
  const recoveryHistory = chat.messages.slice(0, latestUserIndex);
  const recoveryCommercialPolicy = getCommercialConversationPolicy(recoveryHistory, latestUserMessage.text);
  const isRecoveredG75WarehouseCityTurn = recoveryTurn.cityReply
    && recoveryCommercialPolicy.warehouseCityKnown
    && hasConfirmedG75Interest(chat.messages);
  if (isRecoveredG75WarehouseCityTurn) {
    const reply = buildWarehouseG75CityReply({
      cityLocative: resolveWarehouseCityLocative(chat.messages) || 'вашем городе',
      beforeCutoff: getKazakhstanHour() < COMMERCIAL_FACTS.logistics.warehouseCitySameDayCutoffHour
    });
    if (isRecentAssistantDuplicate(chat.messages, reply)) {
      return res.status(409).json({ error: 'Recovery reply duplicates a recent bot message' });
    }
    await sendAutomatedMessage(chatId, reply);
    const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
    chat.messages.push(botMessage);
    savePersistentData();
    broadcast('new_message', { chatId, message: botMessage, chat });
    scheduleAlkalineSilenceFollowUp(chatId);
    broadcast('chat_status_change', { chatId, status: 'ai' });
    return res.json({ success: true, followUp: 'g75_warehouse_city', message: botMessage });
  }

  // An operator can explicitly resume an older quiet lead from the dashboard.
  // If the last customer message itself is a known warehouse city and G75 was
  // already confirmed, continue with the missing presentation only once.
  const latestUserIsWarehouseCity = Boolean(resolveWarehouseCityLocative([
    { sender: 'user', text: latestUserMessage.text }
  ]));
  const shouldResumeMissingG75Materials = latestUserIsWarehouseCity
    && recoveryCommercialPolicy.warehouseCityKnown
    && hasConfirmedG75Interest(chat.messages)
    && !chat.albumSent?.alkaline;
  if (shouldResumeMissingG75Materials) {
    const chatObj = await client.getChatById(chatId).catch(() => null);
    await sendAlkalineG75PresentationBundle(
      chatId,
      chatObj,
      chat,
      detectCustomerLanguage('', chat.messages)
    );
    broadcast('chat_status_change', { chatId, status: 'ai' });
    return res.json({ success: true, presentation: 'alkaline_g75' });
  }
  const history = chat.messages.map(message => ({ sender: message.sender === 'user' ? 'user' : 'model', text: message.text }));
  const rawReply = String(
    await aiWorkflow.generateResponse(history, latestUserMessage.text, {
      checkoutAuthorized: Boolean(chat.checkoutAuthorized),
      skipFirstLeadWelcome: true
    })
    || ''
  ).trim();
  const recoveryGuard = guardAddressRequest(rawReply, {
    checkoutAuthorized: Boolean(chat.checkoutAuthorized),
    addressAlreadyAsked: Boolean(chat.addressQuestionAskedAt)
      || hasAssistantAddressRequest(chat.messages.slice(0, latestUserIndex)),
    language: detectCustomerLanguage(latestUserMessage.text, chat.messages.slice(0, latestUserIndex))
  });
  const reply = recoveryGuard.text;
  if (!reply || reply === 'HANDOVER' || reply.startsWith('[HANDOVER]')) {
    return res.status(422).json({ error: 'A safe recovery reply could not be generated' });
  }
  if (isRecentAssistantDuplicate(chat.messages, reply)) {
    return res.status(409).json({ error: 'Recovery reply duplicates a recent bot message' });
  }

  await sendAutomatedMessage(chatId, reply);
  const botMessage = { sender: 'ai', text: reply, timestamp: new Date().toISOString() };
  chat.messages.push(botMessage);
  if (recoveryGuard.addressRequestAllowed) {
    chat.addressQuestionAskedAt = botMessage.timestamp;
  }
  savePersistentData();
  broadcast('chat_status_change', { chatId, status: 'ai' });
  broadcast('new_message', { chatId, message: botMessage, chat });
  res.json({ success: true, message: botMessage });
});

app.post('/api/chats/:id/send', async (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId] ? rawId : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : Object.keys(chats).find(k => k.includes(rawId.replace(/\D/g, ''))));
  const { text } = req.body;

  if (chatId && chats[chatId] && text) {
    // Включение перехвата при отправке менеджером с веб-панели
    chats[chatId].status = 'human';
    savePersistentData();
    broadcast('chat_status_change', { chatId, status: 'human' });

    await client.sendMessage(chatId, text);
    const humanMsg = {
      sender: 'human',
      text: text,
      timestamp: new Date().toISOString()
    };
    chats[chatId].messages.push(humanMsg);
    savePersistentData();
    broadcast('new_message', { chatId, message: humanMsg });
    updateChatAnalytics(chatId);
    res.json({ success: true, message: humanMsg });
  } else {
    res.status(400).json({ error: 'Invalid request' });
  }
});

const lastAnalyticsUpdate = {};
async function updateChatAnalytics(chatId) {
  if (!chats[chatId] || !chats[chatId].messages) return;
  const now = Date.now();
  if (lastAnalyticsUpdate[chatId] && (now - lastAnalyticsUpdate[chatId]) < 15000) {
    return; // Throttle to max once per 15s per chat to prevent Gemini 429 rate limit
  }
  lastAnalyticsUpdate[chatId] = now;
  try {
    const analytics = await aiWorkflow.analyzeLeadScoreAndProbability(chats[chatId].messages);
    if (analytics) {
      chats[chatId].analytics = analytics;
      savePersistentData();
      broadcast('chat_analytics_updated', { chatId, analytics });
    }
  } catch (e) {
    console.error('Ошибка расчета аналитики чата:', e.message || e);
  }
}

app.get('/api/chats/:id/analytics', async (req, res) => {
  const rawId = req.params.id;
  const chatId = chats[rawId] ? rawId : (chats[decodeURIComponent(rawId)] ? decodeURIComponent(rawId) : Object.keys(chats).find(k => k.includes(rawId.replace(/\D/g, ''))));
  if (chatId && chats[chatId]) {
    if (!chats[chatId].analytics) {
      await updateChatAnalytics(chatId);
    }
    res.json(chats[chatId].analytics || { successRate: 75, leadScore: 80, sentiment: "Консультация", trend: "+10%" });
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

app.post('/api/translate-batch', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.json({ translations: {} });
  }
  try {
    const prompt = `Translate each of these WhatsApp chat messages into clear natural English.
Return strictly a valid JSON object mapping each message index (as string key) to its English translation string.
Example format: {"0": "English text 1", "1": "English text 2"}

Messages to translate:
${JSON.stringify(messages)}`;

    const translations = await aiWorkflow.executeWithFallback(async (model) => {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    });
    res.json({ translations: translations || {} });
  } catch (e) {
    console.error('Ошибка пакетного перевода:', e.message || e);
    res.json({ translations: {} });
  }
});

// Инициализация WebSocket и Сервера
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      status: clientStatus,
      qr: qrCodeData,
      chats: Object.values(chats).map(getCleanChat),
      sales: completedSales,
      botConfig: getBotConfig()
    }
  }));
});

const PORT = process.env.PORT || 8888;
server.listen(PORT, () => {
  console.log(`🚀 VODEL Sales Bot Dashboard запущен на http://localhost:${PORT}`);
  scheduleDailySalesReportChecks();
  safeInitializeClient();
});

// Плавное завершение работы для сохранения сессии WhatsApp при перезапуске (Ctrl+C или nodemon)
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  console.log(`\n🛑 Получен сигнал ${signal}. Завершение работы WhatsApp клиента и сохранение сессии...`);
  try {
    savePersistentData();
    if (client) {
      await client.destroy();
      console.log('✅ WhatsApp клиент успешно остановлен и сессия сохранена.');
    }
  } catch (err) {
    console.error('Ошибка при остановке WhatsApp клиента:', err.message || err);
  } finally {
    process.exit(0);
  }
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

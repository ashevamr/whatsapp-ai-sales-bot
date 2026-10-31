let ws;
let activeChatId = null;
let chatsData = {};
let salesData = [];
let botConfig = { botEnabled: false, autoReplyReady: false };
let followUpSuggestions = [];
let successfulSalesReport = null;
let isEnglishMode = false;

function init() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWsMessage(data);
  };

  setupEventListeners();
  loadFollowUpSuggestions();
  loadSuccessCaseAnalysis();
}

function handleWsMessage(data) {
  switch (data.type) {
    case 'init':
      updateStatus(data.payload.status, data.payload.qr);
      renderChats(data.payload.chats);
      if (data.payload.sales) renderSales(data.payload.sales);
      if (data.payload.botConfig) updateBotConfigUI(data.payload.botConfig);
      break;
    case 'status':
      updateStatus(data.payload.status, data.payload.qr);
      break;
    case 'new_message':
      onNewMessage(data.payload);
      break;
    case 'chat_status_change':
      onChatStatusChange(data.payload);
      break;
    case 'new_sale':
      salesData.push(data.payload);
      renderSales(salesData);
      break;
    case 'sales_updated':
      renderSales(data.payload);
      break;
    case 'chat_cleared':
      if (chatsData[data.payload.chatId]) {
        chatsData[data.payload.chatId].messages = [];
        if (activeChatId === data.payload.chatId) renderMessages([]);
      }
      break;
    case 'chat_deleted':
      delete chatsData[data.payload.chatId];
      if (activeChatId === data.payload.chatId) {
        activeChatId = null;
        document.getElementById('chatView').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
      }
      renderChats(Object.values(chatsData));
      break;
    case 'bot_config_change':
      updateBotConfigUI(data.payload);
      break;
    case 'chat_analytics_updated':
      if (chatsData[data.payload.chatId]) {
        chatsData[data.payload.chatId].analytics = data.payload.analytics;
        if (activeChatId === data.payload.chatId) {
          updateAnalyticsUI(data.payload.analytics);
        }
      }
      break;
    case 'success_case_analysis_updated':
      successfulSalesReport = data.payload;
      renderSuccessCaseAnalysis();
      break;
  }
}

function updateStatus(status, qr) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const qrModal = document.getElementById('qrModal');
  const qrContainer = document.getElementById('qrContainer');

  if (status === 'READY') {
    statusDot.className = 'block w-2.5 h-2.5 bg-success-green rounded-full pulse-dot';
    statusText.innerText = 'Connected';
    statusText.className = 'font-caption text-caption text-success-green';
    qrModal.classList.add('hidden');
  } else if (status === 'QR_READY' && qr) {
    statusDot.className = 'block w-2.5 h-2.5 bg-human-amber rounded-full pulse-dot';
    statusText.innerText = 'Scan QR';
    statusText.className = 'font-caption text-caption text-human-amber';
    qrModal.classList.remove('hidden');

    qrContainer.innerHTML = '';
    const qrCode = qrcode(0, 'M');
    qrCode.addData(qr);
    qrCode.make();
    qrContainer.innerHTML = qrCode.createImgTag(6);
  } else {
    statusDot.className = 'block w-2.5 h-2.5 bg-danger-red rounded-full';
    statusText.innerText = 'Disconnected';
    statusText.className = 'font-caption text-caption text-danger-red';
    qrModal.classList.add('hidden');
  }
}

function updateBotConfigUI(config) {
  botConfig = config;
  const btn = document.getElementById('globalBotToggle');
  if (config.botEnabled && config.autoReplyReady) {
    btn.className = 'w-full py-1.5 px-md rounded-full bg-ai-cyan text-slate-900 font-label-ui text-label-ui transition-all duration-300 font-bold shadow-md';
    btn.innerText = 'Agent Active';
  } else if (config.botEnabled) {
    btn.className = 'w-full py-1.5 px-md rounded-full bg-human-amber text-slate-900 font-label-ui text-label-ui transition-all duration-300 font-bold shadow-md';
    btn.innerText = 'Safety Hold';
  } else {
    btn.className = 'w-full py-1.5 px-md rounded-full bg-danger-red text-white font-label-ui text-label-ui transition-all duration-300 font-bold shadow-md';
    btn.innerText = 'Agent Paused';
  }
}

function getTabClass(active) {
  return active
    ? 'tab-btn active py-2 px-3 rounded-lg text-center font-label-ui text-label-ui text-ai-cyan bg-ai-cyan/10 font-bold transition-all'
    : 'tab-btn py-2 px-3 rounded-lg text-center font-label-ui text-label-ui text-on-surface-variant hover:text-on-surface transition-all';
}

function loadFollowUpSuggestions() {
  fetch('/api/follow-up-suggestions')
    .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to scan conversations')))
    .then(data => {
      followUpSuggestions = data.suggestions || [];
      renderFollowUpSuggestions();
    })
    .catch(() => {
      const list = document.getElementById('followUpList');
      if (list) list.innerHTML = '<p class="font-caption text-caption text-on-surface-variant/50 p-4 text-center">Не удалось загрузить предложения.</p>';
    });
}

function formatSuggestionTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function renderFollowUpSuggestions() {
  const list = document.getElementById('followUpList');
  if (!list) return;
  if (followUpSuggestions.length === 0) {
    list.innerHTML = '<p class="font-caption text-caption text-on-surface-variant/50 p-4 text-center">Нет подходящих диалогов за последние 24 часа.</p>';
    return;
  }

  list.innerHTML = `
    <div class="px-2 pb-1 flex items-center justify-between gap-2">
      <p class="font-caption text-caption text-on-surface-variant/70 text-[10px]">Каждое сообщение отправляется только после вашего подтверждения.</p>
      <button id="refreshFollowUpsBtn" class="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-ai-cyan" title="Обновить">refresh</button>
    </div>
    ${followUpSuggestions.map(item => {
      const chatId = encodeURIComponent(item.chatId);
      return `<article class="follow-up-card bg-surface-container-high/30 border border-outline-variant/25 rounded-xl p-3 space-y-2" data-chat-id="${chatId}">
        <div class="flex items-start justify-between gap-2">
          <button class="follow-up-open text-left min-w-0" data-chat-id="${chatId}">
            <p class="font-label-ui text-label-ui text-on-surface truncate font-bold">${escapeHtml(item.chatName)}</p>
            <p class="text-[10px] text-human-amber font-semibold">${escapeHtml(item.categoryLabel)}</p>
          </button>
          <span class="text-[9px] text-on-surface-variant/50 whitespace-nowrap">${escapeHtml(formatSuggestionTime(item.lastMessageAt))}</span>
        </div>
        <p class="text-[10px] leading-relaxed text-on-surface-variant/70">${escapeHtml(item.reason)}</p>
        <textarea class="follow-up-draft w-full min-h-[76px] resize-y rounded-lg bg-surface-container-low border border-outline-variant/30 p-2 text-[11px] leading-relaxed text-on-surface focus:outline-none focus:border-ai-cyan/60">${escapeHtml(item.draft)}</textarea>
        <button class="follow-up-send w-full py-2 rounded-lg bg-ai-cyan text-slate-900 text-[11px] font-bold hover:brightness-110 active:scale-[0.99] transition-all" data-chat-id="${chatId}">Отправить</button>
      </article>`;
    }).join('')}`;

  document.getElementById('refreshFollowUpsBtn')?.addEventListener('click', loadFollowUpSuggestions);
  list.querySelectorAll('.follow-up-open').forEach(button => {
    button.addEventListener('click', () => selectChat(decodeURIComponent(button.dataset.chatId)));
  });
  list.querySelectorAll('.follow-up-send').forEach(button => {
    button.addEventListener('click', () => sendApprovedFollowUp(button));
  });
}

function sendApprovedFollowUp(button) {
  const chatId = decodeURIComponent(button.dataset.chatId);
  const card = button.closest('.follow-up-card');
  const text = card?.querySelector('.follow-up-draft')?.value.trim();
  const suggestion = followUpSuggestions.find(item => item.chatId === chatId);
  if (!text || !suggestion) return;
  if (!confirm(`Отправить сообщение клиенту ${suggestion.chatName}?`)) return;

  button.disabled = true;
  button.innerText = 'Отправляем…';
  fetch('/api/follow-up-suggestions/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, text })
  })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Сообщение не отправлено');
      loadFollowUpSuggestions();
    })
    .catch(error => {
      button.disabled = false;
      button.innerText = 'Отправить';
      alert(error.message);
    });
}

function loadSuccessCaseAnalysis() {
  fetch('/api/success-case-analysis')
    .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load analysis')))
    .then(data => {
      successfulSalesReport = data.report || null;
      renderSuccessCaseAnalysis();
    })
    .catch(() => renderSuccessCaseAnalysis('Не удалось загрузить сохраненный отчёт.'));
}

function renderTextList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `<ul class="space-y-1.5">${items.slice(0, 8).map(item => `<li class="text-[10px] leading-relaxed text-on-surface-variant/80 flex gap-1.5"><span class="text-ai-cyan">•</span><span>${escapeHtml(typeof item === 'string' ? item : item.rule || item.bestPractice || item.title || '')}</span></li>`).join('')}</ul>`;
}

function renderSuccessCaseAnalysis(errorMessage = '') {
  const container = document.getElementById('successCaseAnalysisReport');
  const button = document.getElementById('runSuccessCaseAnalysisBtn');
  if (!container || !button) return;

  button.disabled = false;
  button.innerText = 'Проанализировать';
  if (errorMessage) {
    container.innerHTML = `<p class="text-[10px] leading-relaxed text-danger-red">${escapeHtml(errorMessage)}</p>`;
    return;
  }
  if (!successfulSalesReport) {
    container.innerHTML = '<p class="text-[10px] leading-relaxed text-on-surface-variant/60">Отчёт ещё не создан. Нажмите кнопку, чтобы построить playbook из обезличенных сообщений.</p>';
    return;
  }

  const source = successfulSalesReport.source || {};
  const playbook = successfulSalesReport.playbook || {};
  const patterns = Array.isArray(playbook.observedPatterns) ? playbook.observedPatterns : [];
  const flow = Array.isArray(playbook.conversationFlow) ? playbook.conversationFlow : [];
  const pacing = Array.isArray(playbook.messagePacing) ? playbook.messagePacing : [];
  container.innerHTML = `
    <div class="border-t border-ai-cyan/15 pt-3 space-y-3">
      <p class="font-caption text-caption text-on-surface-variant/55">${escapeHtml(String(source.analyzedMessages || 0))} из ${escapeHtml(String(source.availableMessages || 0))} сообщений · ${escapeHtml(new Date(successfulSalesReport.generatedAt).toLocaleString('ru-RU'))}</p>
      <p class="text-[11px] leading-relaxed text-on-surface">${escapeHtml(playbook.executiveSummary || 'Итоговый вывод не сформирован.')}</p>
      ${patterns.length ? `<div><p class="text-[10px] font-bold text-ai-cyan mb-1.5">Рабочие паттерны</p>${renderTextList(patterns)}</div>` : ''}
      ${flow.length ? `<div><p class="text-[10px] font-bold text-ai-cyan mb-1.5">Сценарий диалога</p>${renderTextList(flow)}</div>` : ''}
      ${pacing.length ? `<div><p class="text-[10px] font-bold text-ai-cyan mb-1.5">Подача сообщений</p>${renderTextList(pacing.map(item => item.recommendation || item))}</div>` : ''}
      ${playbook.trainingInstructions?.length ? `<div><p class="text-[10px] font-bold text-ai-cyan mb-1.5">Правила для бота</p>${renderTextList(playbook.trainingInstructions)}</div>` : ''}
      ${playbook.limitations?.length ? `<div><p class="text-[10px] font-bold text-human-amber mb-1.5">Ограничения вывода</p>${renderTextList(playbook.limitations)}</div>` : ''}
    </div>`;
}

function runSuccessCaseAnalysis() {
  const button = document.getElementById('runSuccessCaseAnalysisBtn');
  if (!button) return;
  if (!confirm('Прочитать последние 60 дней группы со сделками и построить обезличенный playbook? Сообщения в WhatsApp никому не отправляются.')) return;

  button.disabled = true;
  button.innerText = 'Анализируем…';
  fetch('/api/success-case-analysis/run', { method: 'POST' })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Анализ не выполнен');
      successfulSalesReport = data.report;
      renderSuccessCaseAnalysis();
    })
    .catch(error => renderSuccessCaseAnalysis(error.message));
}

function renderChats(chats) {
  const chatList = document.getElementById('chatList');
  chatsData = {};
  chats.forEach(c => chatsData[c.id] = c);

  chatList.innerHTML = '';

  if (chats.length === 0) {
    chatList.innerHTML = '<p class="font-caption text-caption text-on-surface-variant/50 p-4 text-center">No active conversations</p>';
    return;
  }

  // A brand-new lead (e.g. an ad click) may have no messages yet; use the time
  // the chat was created so it still appears at the top.
  const lastActivity = chat => {
    const last = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].timestamp : chat.createdAt;
    return last ? new Date(last).getTime() || 0 : 0;
  };
  chats.sort((a, b) => lastActivity(b) - lastActivity(a));

  chats.forEach(chat => {
    const chatEl = document.createElement('div');
    const isActive = chat.id === activeChatId;
    chatEl.className = `chat-item p-3 rounded-xl border border-outline-variant/10 cursor-pointer transition-all flex items-center justify-between ${
      isActive 
        ? 'bg-ai-cyan/10 border-ai-cyan/40 text-ai-cyan font-bold shadow-sm' 
        : 'bg-surface-container-high/20 hover:bg-surface-container-high/40 text-on-surface-variant'
    }`;
    chatEl.onclick = () => selectChat(chat.id);

    const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'No messages';
    const isAi = chat.status === 'ai';

    chatEl.innerHTML = `
      <div class="chat-item-info flex-1 pr-2 overflow-hidden">
        <h4 class="font-headline-sm text-sm text-on-surface truncate font-semibold mb-0.5">${escapeHtml(chat.name || chat.number || chat.id)}</h4>
        <p class="font-caption text-xs text-on-surface-variant/70 truncate">${escapeHtml(lastMsg)}</p>
      </div>
      <span class="font-metadata text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
        isAi ? 'bg-ai-cyan/20 text-ai-cyan border border-ai-cyan/30' : 'bg-human-amber/20 text-human-amber border border-human-amber/30'
      }">
        ${isAi ? 'AI' : 'HUMAN'}
      </span>
    `;
    chatList.appendChild(chatEl);
  });
}

function renderSales(sales) {
  salesData = sales;
  const salesList = document.getElementById('salesList');
  salesList.innerHTML = '';

  if (sales.length === 0) {
    salesList.innerHTML = '<p class="font-caption text-caption text-on-surface-variant/50 p-4 text-center">No completed sales yet.</p>';
    return;
  }

  sales.forEach((sale, index) => {
    const card = document.createElement('div');
    card.className = 'sale-card bg-surface-container-high/30 border border-outline-variant/20 border-l-4 border-l-success-green p-3.5 rounded-xl text-xs space-y-1.5';
    const time = new Date(sale.timestamp).toLocaleString();
    const currentFlag = sale.flag || 'Подтвержден';

    card.innerHTML = `
      <h4 class="font-bold text-ai-cyan text-sm flex items-center gap-1.5">👤 ${escapeHtml(sale.name)} <span class="text-on-surface-variant/60 font-normal text-xs">(+${escapeHtml(sale.phone)})</span></h4>
      <p class="text-on-surface"><strong class="text-on-surface-variant">📍 City:</strong> ${escapeHtml(sale.city)} | <strong class="text-on-surface-variant">📦 Model:</strong> ${escapeHtml(sale.model)}</p>
      <p class="text-on-surface"><strong class="text-on-surface-variant">🏠 Address:</strong> ${escapeHtml(sale.address || 'Not specified')}</p>
      <p class="text-on-surface"><strong class="text-on-surface-variant">📅 Install:</strong> ${escapeHtml(sale.installationTime || 'Not specified')}</p>
      <p class="text-on-surface"><strong class="text-on-surface-variant">💳 Payment:</strong> ${escapeHtml(sale.payment)}</p>
      <p class="text-on-surface"><strong class="text-on-surface-variant">📝 Recap:</strong> ${escapeHtml(sale.summary)}</p>
      <div class="sale-actions flex items-center gap-2 pt-2 border-t border-outline-variant/10">
        <select class="sale-flag-select flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-lg p-1 text-[11px] outline-none" onchange="flagSale(${index}, this.value)">
          <option value="Подтвержден" ${currentFlag === 'Подтвержден' ? 'selected' : ''}>🟢 Confirmed</option>
          <option value="Ожидает оплаты" ${currentFlag === 'Ожидает оплаты' ? 'selected' : ''}>🟡 Pending Payment</option>
          <option value="Оплачен" ${currentFlag === 'Оплачен' ? 'selected' : ''}>✅ Paid</option>
          <option value="Отменен" ${currentFlag === 'Отменен' ? 'selected' : ''}>🔴 Cancelled</option>
        </select>
        <button class="px-2.5 py-1 rounded-lg bg-danger-red/10 border border-danger-red/30 text-danger-red hover:bg-danger-red hover:text-white transition-all font-bold text-[10px]" onclick="deleteSale(${index})">Delete</button>
      </div>
      <span class="text-[10px] text-on-surface-variant/40 block text-right pt-0.5">${time}</span>
    `;
    salesList.appendChild(card);
  });
}

function flagSale(index, flag) {
  fetch(`/api/sales/${index}/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flag })
  });
}

function deleteSale(index) {
  if (confirm('Delete this record from sales history?')) {
    fetch(`/api/sales/${index}`, { method: 'DELETE' });
  }
}

function selectChat(chatId) {
  activeChatId = chatId;
  const chat = chatsData[chatId];
  if (!chat) return;

  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('chatView').classList.remove('hidden');

  document.getElementById('chatTitle').innerText = chat.name;
  document.getElementById('chatPhone').innerText = `+${chat.number}`;
  document.getElementById('chatAvatar').innerText = chat.name.charAt(0).toUpperCase();

  updateModeToggle(chat.status);
  renderMessages(chat.messages);
  renderChats(Object.values(chatsData));

  if (chat.analytics) {
    updateAnalyticsUI(chat.analytics);
  } else {
    fetch(`/api/chats/${encodeURIComponent(chatId)}/analytics`)
      .then(r => r.json())
      .then(analytics => {
        if (chatsData[chatId]) chatsData[chatId].analytics = analytics;
        if (activeChatId === chatId) updateAnalyticsUI(analytics);
      })
      .catch(() => {});
  }
}

function updateAnalyticsUI(analytics) {
  if (!analytics) return;
  const rate = analytics.successRate !== undefined ? analytics.successRate : 50;
  const score = analytics.leadScore !== undefined ? analytics.leadScore : 50;
  const trend = analytics.trend || '+0%';
  const sentiment = analytics.sentiment || '';

  const successEl = document.getElementById('salesSuccessRate');
  if (successEl) successEl.innerText = `${rate}%`;

  // Update SVG circle chart - set dasharray first, then offset
  const chartCircle = document.querySelector('.chart-path');
  if (chartCircle) {
    const radius = parseFloat(chartCircle.getAttribute('r')) || 84;
    const circ = 2 * Math.PI * radius;
    chartCircle.setAttribute('stroke-dasharray', circ);
    chartCircle.style.strokeDashoffset = circ * (1 - rate / 100);
  }

  // Update trend text
  const trendContainer = document.querySelector('.text-success-green.mt-1, .text-danger-red.mt-1, .text-human-amber.mt-1');
  if (trendContainer) {
    const trendIcon = trendContainer.querySelector('.material-symbols-outlined');
    const trendText = trendContainer.querySelector('.font-metadata');
    if (rate >= 70) {
      trendContainer.className = 'flex items-center gap-1 text-success-green mt-1';
      if (trendIcon) trendIcon.innerText = 'trending_up';
    } else if (rate >= 40) {
      trendContainer.className = 'flex items-center gap-1 text-human-amber mt-1';
      if (trendIcon) trendIcon.innerText = 'trending_flat';
    } else {
      trendContainer.className = 'flex items-center gap-1 text-danger-red mt-1';
      if (trendIcon) trendIcon.innerText = 'trending_down';
    }
    if (trendText) trendText.innerText = `${trend} this week`;
  }

  // Update lead score bar + text
  const scoreEl = document.getElementById('overallLeadScore');
  if (scoreEl) scoreEl.innerText = `${score}/100`;

  const scoreBar = document.getElementById('leadScoreBar');
  if (scoreBar) {
    scoreBar.style.width = `${score}%`;
    if (score >= 70) {
      scoreBar.className = 'bg-success-green h-full rounded-full';
      scoreBar.style.boxShadow = '0 0 12px rgba(34,197,94,0.4)';
    } else if (score >= 40) {
      scoreBar.className = 'bg-human-amber h-full rounded-full';
      scoreBar.style.boxShadow = '0 0 12px rgba(245,158,11,0.4)';
    } else {
      scoreBar.className = 'bg-danger-red h-full rounded-full';
      scoreBar.style.boxShadow = '0 0 12px rgba(239,68,68,0.4)';
    }
  }

  // Update histogram bars dynamically based on rate
  const barHeights = generateBarHeights(rate);
  for (let i = 0; i < 7; i++) {
    const bar = document.getElementById(`hBar${i}`);
    if (bar) {
      bar.style.height = `${barHeights[i]}%`;
      bar.style.transition = 'height 0.8s ease-out';
      const opacity = 0.15 + (barHeights[i] / 100) * 0.85;
      bar.style.background = `rgba(56, 189, 248, ${opacity.toFixed(2)})`;
    }
  }
}

function generateBarHeights(rate) {
  // Generate 7 bar heights that visually reflect the success rate progression
  const base = Math.max(10, rate * 0.3);
  const heights = [];
  for (let i = 0; i < 7; i++) {
    const progress = i / 6; // 0 to 1
    const target = base + (rate - base) * progress;
    const jitter = (Math.sin(i * 2.1 + rate * 0.1) * 0.15 + 1) * target;
    heights.push(Math.min(100, Math.max(5, Math.round(jitter))));
  }
  return heights;
}

function updateModeToggle(status) {
  const badge = document.getElementById('modeBadge');
  const icon = document.getElementById('modeIcon');
  const text = document.getElementById('modeText');

  if (status === 'ai') {
    badge.className = 'px-xl py-2 flex items-center gap-sm bg-ai-cyan text-slate-900 rounded-lg font-label-ui text-label-ui font-bold transition-all duration-300 shadow-md';
    icon.innerText = 'smart_toy';
    text.innerText = 'AI MODE';
  } else {
    badge.className = 'px-xl py-2 flex items-center gap-sm bg-human-amber text-slate-900 rounded-lg font-label-ui text-label-ui font-bold transition-all duration-300 shadow-md';
    icon.innerText = 'person';
    text.innerText = 'OVERRIDE';
  }
}

function renderMessages(messages) {
  const feed = document.getElementById('messagesFeed');
  feed.innerHTML = '';

  if (messages.length === 0) {
    feed.innerHTML = `
      <div class="flex justify-center">
        <span class="font-caption text-caption text-on-surface-variant/40 bg-surface-container-high/20 px-md py-1.5 rounded-full uppercase tracking-widest text-[9px]">Start of Dialogue</span>
      </div>
    `;
    return;
  }

  feed.innerHTML = `
    <div class="flex justify-center mb-2">
      <span class="font-caption text-caption text-on-surface-variant/40 bg-surface-container-high/20 px-md py-1.5 rounded-full uppercase tracking-widest text-[9px]">Encrypted WhatsApp Workspace ${isEnglishMode ? '• [EN TRANSLATION ACTIVE]' : ''}</span>
    </div>
  `;

  const untranslatedBatch = [];

  messages.forEach((msg, idx) => {
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bubbleId = `msg-bubble-${idx}`;
    const displayText = (isEnglishMode && msg.englishText) ? msg.englishText : msg.text;

    if (isEnglishMode && !msg.englishText && msg.text) {
      untranslatedBatch.push({ id: idx, text: msg.text });
    }

    if (msg.sender === 'user') {
      const msgEl = document.createElement('div');
      msgEl.className = 'flex flex-col items-start gap-xs max-w-[80%] self-start';
      msgEl.innerHTML = `
        <div id="${bubbleId}" class="bg-surface-container-high/60 border border-outline-variant/20 rounded-2xl rounded-tl-none px-xl py-md text-on-surface font-body-default text-body-default shadow-sm">
          ${escapeHtml(displayText)}
        </div>
        <span class="font-caption text-caption text-on-surface-variant/60 text-[10px] pl-1">${time} • Client</span>
      `;
      feed.appendChild(msgEl);
    } else if (msg.sender === 'ai') {
      const msgEl = document.createElement('div');
      msgEl.className = 'flex flex-col items-end gap-xs max-w-[80%] self-end';
      msgEl.innerHTML = `
        <div class="flex items-center gap-sm mb-1">
          <span class="w-1.5 h-1.5 bg-ai-cyan rounded-full pulse-dot"></span>
          <span class="font-metadata text-metadata text-ai-cyan uppercase tracking-wider">AI Agent</span>
        </div>
        <div id="${bubbleId}" class="glass-card ai-glow rounded-2xl rounded-tr-none px-xl py-md text-on-surface font-body-default text-body-default border-ai-cyan/30 shadow-md">
          ${escapeHtml(displayText)}
        </div>
        <span class="font-caption text-caption text-on-surface-variant/60 text-[10px] pr-1">${time} • AI Generated</span>
      `;
      feed.appendChild(msgEl);
    } else {
      const msgEl = document.createElement('div');
      msgEl.className = 'flex flex-col items-end gap-xs max-w-[80%] self-end';
      msgEl.innerHTML = `
        <div class="flex items-center gap-sm mb-1">
          <span class="material-symbols-outlined text-human-amber text-[14px]">person</span>
          <span class="font-metadata text-metadata text-human-amber uppercase tracking-wider">Human Operator</span>
        </div>
        <div id="${bubbleId}" class="glass-card human-glow rounded-2xl rounded-tr-none px-xl py-md text-on-surface font-body-default text-body-default border-human-amber/30 shadow-md">
          ${escapeHtml(displayText)}
        </div>
        <span class="font-caption text-caption text-on-surface-variant/60 text-[10px] pr-1">${time} • Operator Override</span>
      `;
      feed.appendChild(msgEl);
    }
  });

  if (isEnglishMode && untranslatedBatch.length > 0) {
    fetch('/api/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: untranslatedBatch })
    })
    .then(r => r.json())
    .then(data => {
      if (data.translations) {
        Object.keys(data.translations).forEach(idx => {
          const numIdx = parseInt(idx);
          if (messages[numIdx]) {
            messages[numIdx].englishText = data.translations[idx];
            const bubbleNode = document.getElementById(`msg-bubble-${numIdx}`);
            if (bubbleNode && isEnglishMode) {
              bubbleNode.innerHTML = escapeHtml(data.translations[idx]);
            }
          }
        });
      }
    })
    .catch(() => {});
  }

  feed.scrollTop = feed.scrollHeight;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function onNewMessage({ chatId, message, chat }) {
  if (chat) chatsData[chatId] = chat;
  else if (chatsData[chatId]) chatsData[chatId].messages.push(message);

  if (activeChatId === chatId) {
    renderMessages(chatsData[chatId].messages);
  }
  renderChats(Object.values(chatsData));
}

function onChatStatusChange({ chatId, status }) {
  if (chatsData[chatId]) {
    chatsData[chatId].status = status;
    if (activeChatId === chatId) {
      updateModeToggle(status);
    }
    renderChats(Object.values(chatsData));
  }
}

function setupEventListeners() {
  const runSuccessCaseAnalysisBtn = document.getElementById('runSuccessCaseAnalysisBtn');
  if (runSuccessCaseAnalysisBtn) {
    runSuccessCaseAnalysisBtn.onclick = runSuccessCaseAnalysis;
  }

  document.getElementById('globalBotToggle').onclick = () => {
    const newStatus = !botConfig.botEnabled;
    fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newStatus })
    });
  };

  document.getElementById('tabChats').onclick = () => {
    document.getElementById('tabChats').className = getTabClass(true);
    document.getElementById('tabSales').className = getTabClass(false);
    document.getElementById('tabFollowUps').className = getTabClass(false);
    document.getElementById('chatList').classList.remove('hidden');
    document.getElementById('salesList').classList.add('hidden');
    document.getElementById('followUpList').classList.add('hidden');
  };

  document.getElementById('tabSales').onclick = () => {
    document.getElementById('tabSales').className = getTabClass(true);
    document.getElementById('tabChats').className = getTabClass(false);
    document.getElementById('tabFollowUps').className = getTabClass(false);
    document.getElementById('salesList').classList.remove('hidden');
    document.getElementById('chatList').classList.add('hidden');
    document.getElementById('followUpList').classList.add('hidden');
  };

  document.getElementById('tabFollowUps').onclick = () => {
    document.getElementById('tabFollowUps').className = getTabClass(true);
    document.getElementById('tabChats').className = getTabClass(false);
    document.getElementById('tabSales').className = getTabClass(false);
    document.getElementById('followUpList').classList.remove('hidden');
    document.getElementById('chatList').classList.add('hidden');
    document.getElementById('salesList').classList.add('hidden');
    loadFollowUpSuggestions();
  };

  const openQrBtn = document.getElementById('openQrBtn');
  if (openQrBtn) {
    openQrBtn.onclick = () => {
      document.getElementById('qrModal').classList.remove('hidden');
      fetch('/api/whatsapp/reconnect', { method: 'POST' })
        .then(r => r.json())
        .then(data => console.log('Reconnect requested:', data))
        .catch(err => console.error(err));
    };
  }

  const refreshStatusBtn = document.getElementById('refreshStatusBtn');
  if (refreshStatusBtn) {
    refreshStatusBtn.onclick = () => {
      fetch('/api/whatsapp/reconnect', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          fetch('/api/status').then(r => r.json()).then(st => updateStatus(st.status, st.qr));
        });
    };
  }

  document.getElementById('toggleStatusBtn').onclick = () => {
    if (!activeChatId) return;
    const currentStatus = chatsData[activeChatId].status;
    const newStatus = currentStatus === 'ai' ? 'human' : 'ai';

    fetch(`/api/chats/${encodeURIComponent(activeChatId)}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const translateBtn = document.getElementById('translateBtn');
  const translateText = document.getElementById('translateText');
  if (translateBtn) {
    translateBtn.onclick = () => {
      isEnglishMode = !isEnglishMode;
      if (isEnglishMode) {
        translateBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ai-cyan/20 border border-ai-cyan text-ai-cyan text-xs font-bold transition-all cursor-pointer shadow-md shadow-ai-cyan/20';
        if (translateText) translateText.innerText = 'EN: ON';
      } else {
        translateBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high/60 border border-outline-variant/30 text-on-surface-variant hover:text-ai-cyan text-xs font-bold transition-all cursor-pointer';
        if (translateText) translateText.innerText = 'EN: OFF';
      }
      if (activeChatId && chatsData[activeChatId]) {
        renderMessages(chatsData[activeChatId].messages);
      }
    };
  }

  document.getElementById('clearChatBtn').onclick = () => {
    if (!activeChatId) return;
    if (confirm('Clear message history for this dialogue?')) {
      fetch(`/api/chats/${encodeURIComponent(activeChatId)}/clear`, { method: 'DELETE' });
    }
  };

  document.getElementById('deleteChatBtn').onclick = () => {
    if (!activeChatId) return;
    if (confirm('Delete this dialogue from active chats?')) {
      fetch(`/api/chats/${encodeURIComponent(activeChatId)}`, { method: 'DELETE' });
    }
  };

  document.getElementById('sendForm').onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !activeChatId) return;

    fetch(`/api/chats/${encodeURIComponent(activeChatId)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    input.value = '';
  };

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.oninput = () => {
      const q = searchInput.value.toLowerCase().trim();
      
      const chatItems = document.querySelectorAll('.chat-item');
      chatItems.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
      });

      const saleCards = document.querySelectorAll('.sale-card');
      saleCards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    };
  }
}

window.onload = init;

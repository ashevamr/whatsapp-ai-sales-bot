// VODEL Client-facing Product Catalog Application

// The only public sales number used by every catalog CTA.
const WA_PHONE = '77004790001';
const MAX_SELECTED_PRODUCTS = 3;
const PROMOTIONS = Object.freeze({
  kaspiZero24EndsOn: '2026-09-06',
  ar01ProductId: 'ar01a',
  timeZone: 'Asia/Almaty'
});

let productsData = [];
let selectedProductIds = new Set();
let currentCategory = 'all';
let currentCountry = 'all';
let searchQuery = '';
let currentSort = 'recommended';
let modalOpener = null;

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortSelect = document.getElementById('sortSelect');
const categoryTabs = document.querySelectorAll('.filter-tab');
const countryTabs = document.querySelectorAll('.country-tab');
const productModal = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartSelectedNames = document.getElementById('cartSelectedNames');
const cartChipsContainer = document.getElementById('cartChipsContainer');
const cartBtnCount = document.getElementById('cartBtnCount');
const consultWhatsappBtn = document.getElementById('consultWhatsappBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const headerWhatsappBtn = document.getElementById('headerWhatsappBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const arPromoDetailsBtn = document.getElementById('arPromoDetailsBtn');
const kettlePromoShopBtn = document.getElementById('kettlePromoShopBtn');
const kettlePromoDates = document.querySelectorAll('[data-kettle-promo-date]');
const kaspiCampaignTicker = document.getElementById('kaspiCampaignTicker');
const stickyHeader = document.querySelector('header');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupHeaderWhatsApp();
  await loadProducts();
  setupPromotions();
  setupEventListeners();
  loadCartFromStorage();
  updateCartUI();
});

function setupHeaderWhatsApp() {
  const text = encodeURIComponent('Здравствуйте! Я перешёл(а) с сайта VODEL и хочу подобрать фильтр для воды. Подскажите, пожалуйста, с чего начать?');
  headerWhatsappBtn.href = `https://wa.me/${WA_PHONE}?text=${text}`;
}

function getKazakhstanDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PROMOTIONS.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    iso: `${values.year}-${values.month}-${values.day}`,
    label: new Intl.DateTimeFormat('ru-RU', {
      timeZone: PROMOTIONS.timeZone,
      day: 'numeric',
      month: 'long'
    }).format(date)
  };
}

function isKaspiCampaignActive(date = new Date()) {
  return getKazakhstanDateParts(date).iso <= PROMOTIONS.kaspiZero24EndsOn;
}

function setupPromotions(date = new Date()) {
  const today = getKazakhstanDateParts(date);
  kettlePromoDates.forEach((node) => {
    node.textContent = today.label;
  });
  if (kaspiCampaignTicker && !isKaspiCampaignActive(date)) {
    kaspiCampaignTicker.classList.add('hidden');
    stickyHeader?.classList.remove('top-[34px]');
    stickyHeader?.classList.add('top-0');
  }

  if (arPromoDetailsBtn) {
    arPromoDetailsBtn.addEventListener('click', () => {
      const ar01 = productsData.find((product) => product.id === PROMOTIONS.ar01ProductId);
      if (ar01) openModal(ar01);
    });
  }

  if (kettlePromoShopBtn) {
    kettlePromoShopBtn.addEventListener('click', () => {
      document.getElementById('catalogControls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

async function loadProducts() {
  try {
    const res = await fetch('./catalog_products.json');
    if (!res.ok) throw new Error('Не удалось загрузить каталог');
    productsData = await res.json();
    updateCategoryCounts();
    renderProducts();
  } catch (err) {
    console.error(err);
    productsGrid.innerHTML = `
      <div class="col-span-full text-center py-12 text-red-300 bg-red-950/40 border border-red-800/60 rounded-3xl p-6 backdrop-blur-md">
        <p class="font-bold mb-2">Произошла ошибка при загрузке каталога</p>
        <p class="text-xs text-slate-400 mb-4">${err.message}</p>
        <button onclick="location.reload()" class="px-4 py-2 bg-sky-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-sky-400 transition-colors">Повторить попытку</button>
      </div>
    `;
  }
}

function updateCategoryCounts() {
  const countEl = document.getElementById('countAll');
  if (countEl) countEl.textContent = productsData.length;
}

function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    renderProducts();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderProducts();
  });

  // Sort select
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProducts();
  });

  // Category filter tabs
  categoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach((t) => {
        t.classList.remove('active', 'bg-sky-500', 'text-slate-950', 'shadow-[0_0_15px_rgba(56,189,248,0.35)]');
        t.classList.add('bg-slate-950/60', 'text-slate-300', 'border', 'border-slate-800');
      });
      tab.classList.add('active', 'bg-sky-500', 'text-slate-950', 'shadow-[0_0_15px_rgba(56,189,248,0.35)]');
      tab.classList.remove('bg-slate-950/60', 'text-slate-300', 'border-slate-800');
      currentCategory = tab.dataset.category;
      renderProducts();
    });
  });

  // Country filter tabs
  countryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      countryTabs.forEach((t) => {
        t.classList.remove('active', 'bg-sky-500/20', 'text-sky-300', 'border-sky-500/40');
        t.classList.add('bg-slate-950/60', 'text-slate-400', 'border-slate-800');
      });
      tab.classList.add('active', 'bg-sky-500/20', 'text-sky-300', 'border-sky-500/40');
      tab.classList.remove('bg-slate-950/60', 'text-slate-400');
      currentCountry = tab.dataset.country;
      renderProducts();
    });
  });

  // Reset filters
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      currentCategory = 'all';
      currentCountry = 'all';
      searchQuery = '';
      searchInput.value = '';
      clearSearchBtn.classList.add('hidden');
      categoryTabs[0]?.click();
      countryTabs[0]?.click();
      renderProducts();
    });
  }

  // Clear Cart
  clearCartBtn.addEventListener('click', () => {
    selectedProductIds.clear();
    saveCartToStorage();
    updateCartUI();
    renderProducts();
    showToast('Выбор очищен', '🗑️');
  });

  // Modal controls
  closeModalBtn.addEventListener('click', closeModal);
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !productModal.classList.contains('hidden')) {
      closeModal();
      return;
    }
    if (e.key === 'Tab' && !productModal.classList.contains('hidden')) {
      trapModalFocus(e);
    }
  });
}

function getFilteredProducts() {
  return productsData.filter((p) => {
    // Category match
    const matchCategory = currentCategory === 'all' || p.category === currentCategory;
    // Country match
    const matchCountry = currentCountry === 'all' || p.originCode === currentCountry;
    // Search match
    const searchTarget = `${p.name} ${p.shortName} ${p.origin} ${p.categoryLabel} ${p.waterTypes.join(' ')} ${p.features.join(' ')}`.toLowerCase();
    const matchSearch = searchQuery === '' || searchTarget.includes(searchQuery);

    return matchCategory && matchCountry && matchSearch;
  });
}

function getSortedProducts(products) {
  const list = [...products];
  if (currentSort === 'price-asc') {
    return list.sort((a, b) => a.price - b.price);
  }
  if (currentSort === 'price-desc') {
    return list.sort((a, b) => b.price - a.price);
  }
  if (currentSort === 'stages-desc') {
    return list.sort((a, b) => b.stages - a.stages);
  }
  // Default recommended priority (FOURA, Alkaline Smart, Alkaline G75, Hydrogen)
  const priority = {
    'foura_600gpd': 100,
    'alkaline_smart': 95,
    'alkaline_g75': 90,
    'ro_h910': 85,
    'hydrogen_o1': 80,
    'blue_tech': 75,
    'ro_h015': 70
  };
  return list.sort((a, b) => (priority[b.id] || 0) - (priority[a.id] || 0));
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const sorted = getSortedProducts(filtered);

  if (sorted.length === 0) {
    productsGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  productsGrid.innerHTML = sorted.map((p) => createProductCardHTML(p)).join('');

  // Attach card event listeners
  sorted.forEach((p) => {
    const card = document.getElementById(`card-${p.id}`);
    if (!card) return;

    const selectBtn = card.querySelector('.btn-select');
    const detailsBtn = card.querySelector('.btn-details');
    const directWaBtn = card.querySelector('.btn-direct-wa');

    selectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSelectProduct(p.id);
    });

    detailsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(p);
    });

    directWaBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const message = generateSingleProductMessage(p);
      window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
    });

    card.addEventListener('click', () => {
      openModal(p);
    });
  });
}

function formatPrice(val) {
  return Number(val).toLocaleString('ru-RU') + ' ₸';
}

function getProductPaymentSummary(product) {
  const cashPrice = formatPrice(product.price);
  return product.installmentPrice
    ? `${cashPrice} при полной оплате или ${formatPrice(product.installmentPrice)} в рассрочку`
    : cashPrice;
}

function getCompactCartPrice(product) {
  return product.installmentPrice
    ? `${formatPrice(product.price)} наличными / ${formatPrice(product.installmentPrice)} в рассрочку`
    : formatPrice(product.price);
}

function createProductCardHTML(p) {
  const isSelected = selectedProductIds.has(p.id);
  const badgeHtml = p.badge ? `
    <span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm">
      ${p.badge}
    </span>
  ` : '';

  const isTankless = p.tankType === 'direct';

  return `
    <article id="card-${p.id}" class="product-card group relative bg-slate-900/80 border ${isSelected ? 'selected border-sky-400 ring-2 ring-sky-500/30' : 'border-slate-800/90'} rounded-3xl p-4 flex flex-col justify-between hover:cursor-pointer shadow-lg backdrop-blur-md">
      
      <!-- Top Tags -->
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-bold text-slate-200">
            <span>${p.flag}</span>
            <span>${p.origin}</span>
          </div>
          <div class="flex items-center gap-1.5">
            ${badgeHtml}
            <span class="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-red-500/15 text-red-400 border border-red-500/25">
              -${p.discountPercent || 50}%
            </span>
          </div>
        </div>

        <!-- Product Image Stage -->
        <div class="relative w-full aspect-[4/5] rounded-2xl bg-slate-950/90 border border-slate-800/80 overflow-hidden mb-4 group-hover:border-sky-500/40 transition-colors flex items-center justify-center p-1.5">
          <img src="${p.image}" alt="${p.name}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy">
          
          <div class="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] backdrop-blur-md shadow-md">
            <span class="text-slate-300 font-semibold">${p.stages} ступеней</span>
            <span class="font-extrabold ${isTankless ? 'text-sky-400' : 'text-slate-300 font-semibold'}">${isTankless ? '⚡ Без бака' : 'Бак 8 л'}</span>
          </div>
        </div>

        <!-- Product Title -->
        <h3 class="text-base sm:text-lg font-extrabold text-white group-hover:text-sky-400 transition-colors line-clamp-1 mb-1">
          ${p.name}
        </h3>

        <!-- Water types & key traits -->
        <p class="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          ${p.waterTypes.join(' • ')}. Гарантия 3 года, сервис 15 лет.
        </p>
      </div>

      <!-- Pricing & Actions Block -->
      <div class="mt-4 pt-4 border-t border-slate-800/80">
        <div class="mb-3">
          <div class="text-[11px] text-slate-500 line-through">${formatPrice(p.oldPrice)}</div>
          <div class="text-2xl font-extrabold text-sky-400 tabular-nums">${formatPrice(p.price)}</div>
          ${p.installmentPrice ? `<div class="mt-1 text-[11px] font-bold text-slate-300">В рассрочку: ${formatPrice(p.installmentPrice)}</div>` : ''}
        </div>
        <div class="grid grid-cols-2 gap-2 mb-4" aria-label="Варианты рассрочки">
          <div class="bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-800/80">
            <div class="text-[10px] font-bold text-slate-400">0-0-12</div>
            <div class="mt-0.5 text-xs font-extrabold text-slate-200 tabular-nums">~${p.monthlyKaspi.toLocaleString('ru-RU')} ₸/мес</div>
          </div>
          <div class="bg-slate-950/80 rounded-xl px-3 py-2 border border-slate-800/80">
            <div class="text-[10px] font-bold text-slate-400">0-0-24</div>
            <div class="mt-0.5 text-xs font-extrabold text-slate-200 tabular-nums">~${p.monthlyHalyk.toLocaleString('ru-RU')} ₸/мес</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-details w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-extrabold border border-slate-700 transition-colors flex items-center justify-center gap-1">
            <span>Подробнее</span>
          </button>

          <button class="btn-select w-full py-2.5 px-3 rounded-xl ${isSelected ? 'bg-sky-400 text-slate-950' : 'bg-sky-500 hover:bg-sky-400 text-slate-950'} text-xs font-extrabold transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] flex items-center justify-center gap-1.5">
            <span>${isSelected ? '✓ Выбрано' : '+ Выбрать'}</span>
          </button>
        </div>

        <!-- Direct Ask WhatsApp -->
        <button class="btn-direct-wa w-full mt-2 py-2 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-[11px] font-bold border border-emerald-800/50 transition-colors flex items-center justify-center gap-1.5">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.575 4.181 1.579 5.926l-1.681 6.143 6.299-1.652c1.701.928 3.647 1.455 5.717 1.455 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>Задать вопрос по этой модели</span>
        </button>

      </div>
    </article>
  `;
}

function toggleSelectProduct(id) {
  if (selectedProductIds.has(id)) {
    selectedProductIds.delete(id);
    showToast('Удалено из выбора', '🗑️');
  } else {
    if (selectedProductIds.size >= MAX_SELECTED_PRODUCTS) {
      showToast('Рекомендуем выбрать 1–3 фильтра для точного сравнения!', '💡');
      return;
    }
    selectedProductIds.add(id);
    showToast('Добавлено к выбору! Нажмите «Перейти в WhatsApp»', '✅');
  }
  saveCartToStorage();
  updateCartUI();
  renderProducts();
}

function updateCartUI() {
  const count = selectedProductIds.size;
  cartCountBadge.textContent = count;
  cartBtnCount.textContent = count;

  if (count === 0) {
    cartDrawer.classList.add('translate-y-full');
    return;
  }

  cartDrawer.classList.remove('translate-y-full');

  const selectedItems = productsData.filter((p) => selectedProductIds.has(p.id));
  const names = selectedItems.map((p) => p.shortName).join(', ');
  cartSelectedNames.textContent = names;

  // Chips container
  cartChipsContainer.innerHTML = selectedItems.map((p) => `
    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-[11px] text-slate-200 font-bold whitespace-nowrap shadow-sm">
      <span>${p.flag}</span>
      <span>${p.shortName}</span>
      <button onclick="event.stopPropagation(); toggleSelectProduct('${p.id}')" class="text-slate-400 hover:text-red-400 ml-1 font-bold" aria-label="Удалить ${p.shortName} из выбора">×</button>
    </span>
  `).join('');

  // Update WhatsApp Link
  const message = generateSelectedCartMessage(selectedItems);
  consultWhatsappBtn.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`;
}

function generateSingleProductMessage(p) {
  const promo = getProductPromotionSummary(p);
  return `Здравствуйте! Я выбрал(а) на сайте VODEL модель ${p.name}: ${getProductPaymentSummary(p)}.

Подтвердите, пожалуйста, цену и подарок: ${promo}. Какие есть варианты оплаты?`;
}

function getProductPromotionSummary(product) {
  const gifts = ['чайник в подарок сегодня'];
  if (product.id === PROMOTIONS.ar01ProductId) {
    gifts.unshift('пылесос или аэрогриль на выбор');
  }
  return gifts.join(' + ');
}

function generateSelectedCartMessage(items) {
  if (items.length === 1) {
    return generateSingleProductMessage(items[0]);
  }

  const itemsList = items.map((p, idx) => {
    return `${idx + 1}. ${p.name} — ${getCompactCartPrice(p)}`;
  }).join('\n');
  const selectedAr01 = items.some((product) => product.id === PROMOTIONS.ar01ProductId);
  const promoLine = selectedAr01
    ? 'По акции хочу уточнить чайник и подарок к AR-01A: пылесос или аэрогриль на выбор.'
    : 'По акции хочу уточнить чайник в подарок сегодня.';

  return `Здравствуйте! Я выбрал(а) на сайте VODEL следующие модели:

${itemsList}

${promoLine}

Помогите, пожалуйста, сравнить эти варианты и подскажите, какой лучше подойдет для моей кухни и воды! 💧`;
}

function createProductModalHTML(p) {
  const isSelected = selectedProductIds.has(p.id);
  const isTankless = p.tankType === 'direct';
  const ar01PromoHtml = p.id === PROMOTIONS.ar01ProductId ? `
    <div class="mb-4 rounded-2xl bg-red-950/40 border border-red-800/60 p-3.5 text-sm text-red-200 backdrop-blur-sm">
      <strong class="text-red-300">Подарок на выбор:</strong> пылесос или аэрогриль при покупке AR-01A.
    </div>
  ` : '';

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Left Poster/Image -->
      <div class="relative rounded-2xl bg-slate-950/90 border border-slate-800 p-2 sm:p-4 flex items-center justify-center min-h-[360px]">
        <img src="${p.image}" alt="${p.name}" class="w-full max-h-[500px] object-contain rounded-xl">
        <span class="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold bg-slate-900/90 border border-slate-700 text-slate-200 shadow-md">
          ${p.flag} ${p.origin}
        </span>
      </div>

      <!-- Right Details -->
      <div class="flex flex-col justify-between text-left">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wide">
              -${p.discountPercent || 50}% СКИДКА
            </span>
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/25">
              ${p.categoryLabel}
            </span>
          </div>

          <h2 class="text-2xl font-extrabold text-white mb-3 pr-10">${p.name}</h2>
          ${ar01PromoHtml}
          
          <!-- Prices -->
          <div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-4">
            <div class="flex items-baseline justify-between mb-2">
              <div>
                <span class="text-xs text-slate-500 line-through mr-2">${formatPrice(p.oldPrice)}</span>
                <span class="text-2xl sm:text-3xl font-extrabold text-sky-400 tabular-nums">
                  ${formatPrice(p.price)}
                </span>
              </div>
            </div>
            ${p.installmentPrice ? `<div class="text-xs font-bold text-slate-300 mb-2">В рассрочку: ${formatPrice(p.installmentPrice)}</div>` : ''}
            <div class="text-xs text-slate-300 space-y-1.5 pt-3 border-t border-slate-800">
              <div>💳 <strong>0-0-12:</strong> ~${p.monthlyKaspi.toLocaleString('ru-RU')} ₸ в месяц</div>
              <div>💳 <strong>0-0-24:</strong> ~${p.monthlyHalyk.toLocaleString('ru-RU')} ₸ в месяц</div>
            </div>
          </div>

          <!-- Specs List -->
          <div class="space-y-2 mb-4 text-xs sm:text-sm">
            <div class="flex justify-between gap-4 py-1.5 border-b border-slate-800/80">
              <span class="text-slate-400">Ступеней очистки:</span>
              <span class="font-extrabold text-white">${p.stages}</span>
            </div>
            <div class="flex justify-between gap-4 py-1.5 border-b border-slate-800/80">
              <span class="text-slate-400">Тип системы:</span>
              <span class="font-extrabold text-right ${isTankless ? 'text-sky-400' : 'text-white'}">${p.tank}</span>
            </div>
            <div class="flex justify-between gap-4 py-1.5 border-b border-slate-800/80">
              <span class="text-slate-400">Виды воды:</span>
              <span class="font-extrabold text-right text-white">${p.waterTypes.join(', ')}</span>
            </div>
            <div class="flex justify-between gap-4 py-1.5 border-b border-slate-800/80">
              <span class="text-slate-400">Гарантия и сервис:</span>
              <span class="font-extrabold text-right text-emerald-400">3 года + 15 лет сервиса</span>
            </div>
            <div class="flex justify-between gap-4 py-1.5 border-b border-slate-800/80">
              <span class="text-slate-400">Доставка и монтаж:</span>
              <span class="font-extrabold text-right text-sky-400">В городах со складами — бесплатно</span>
            </div>
          </div>

          <!-- Features bullet points -->
          <div class="mb-6">
            <h4 class="text-xs font-extrabold text-slate-300 mb-2">Особенности и преимущества</h4>
            <ul class="space-y-1.5 text-xs text-slate-400">
              ${p.features.map((f) => `<li class="flex items-start gap-2"><span class="text-sky-400 mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Modal CTA -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800">
          <button onclick="toggleSelectProduct('${p.id}'); closeModal();" class="w-full py-3 px-4 rounded-xl ${isSelected ? 'bg-slate-800 text-sky-300 border border-sky-500/30' : 'bg-sky-500 hover:bg-sky-400 text-slate-950'} font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center justify-center gap-2">
            <span>${isSelected ? '✓ Выбрано в корзине' : '+ Добавить к выбору'}</span>
          </button>

          <button onclick="askSingleModelWa('${p.id}')" class="w-full py-3 px-4 rounded-xl bg-whatsapp hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.575 4.181 1.579 5.926l-1.681 6.143 6.299-1.652c1.701.928 3.647 1.455 5.717 1.455 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>Спросить в WhatsApp</span>
          </button>
        </div>
      </div>

    </div>
  `;
}

function openModal(p) {
  modalOpener = document.activeElement;
  modalContent.innerHTML = createProductModalHTML(p);
  productModal.classList.remove('hidden');
  productModal.setAttribute('aria-hidden', 'false');
  setBackgroundInteractionDisabled(true);
  closeModalBtn.focus?.();
}

function askSingleModelWa(id) {
  const p = productsData.find((item) => item.id === id);
  if (!p) return;
  const message = generateSingleProductMessage(p);
  window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
}

function closeModal() {
  productModal.classList.add('hidden');
  productModal.setAttribute('aria-hidden', 'true');
  setBackgroundInteractionDisabled(false);
  modalOpener?.focus?.();
  modalOpener = null;
}

function setBackgroundInteractionDisabled(disabled) {
  document.querySelectorAll('body > :not(#productModal):not(script)').forEach((element) => {
    if (disabled) {
      element.dataset.previousAriaHidden = element.getAttribute('aria-hidden') || '';
      element.setAttribute('aria-hidden', 'true');
      element.inert = true;
      return;
    }

    const previousValue = element.dataset.previousAriaHidden;
    if (previousValue) element.setAttribute('aria-hidden', previousValue);
    else element.removeAttribute('aria-hidden');
    delete element.dataset.previousAriaHidden;
    element.inert = false;
  });
}

function trapModalFocus(event) {
  const focusable = [...productModal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getClientRects().length > 0);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    last.focus();
  }
}

function showToast(msg, icon = '✅') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg = document.getElementById('toastMsg');
  if (toastIcon) toastIcon.textContent = icon;
  if (toastMsg) toastMsg.textContent = msg;

  toast.classList.remove('translate-y-[-320%]');
  setTimeout(() => {
    toast.classList.add('translate-y-[-320%]');
  }, 2500);
}

function saveCartToStorage() {
  try {
    localStorage.setItem('vodel_selected_products', JSON.stringify(Array.from(selectedProductIds)));
  } catch (e) {
    console.error(e);
  }
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem('vodel_selected_products');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validIds = new Set(productsData.map((product) => product.id));
        const sanitized = parsed
          .filter((id) => typeof id === 'string' && validIds.has(id))
          .slice(0, MAX_SELECTED_PRODUCTS);
        selectedProductIds = new Set(sanitized);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

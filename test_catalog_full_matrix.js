require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { COMMERCIAL_FACTS, detectCatalogModelsInText } = require('./commercial_facts');
const {
  detectProductMenuChoice,
  isRecentAssistantDuplicate,
  isBurstDuplicateCustomerMessage,
  analyzeConversationTurn
} = require('./conversation_safety');
const {
  isVoiceMessage,
  normalizeVoiceMimeType,
  cleanVoiceTranscription,
  buildVoiceTranscriptionPrompt,
  shouldPauseForUntranscribedVoice
} = require('./voice_safety');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PUBLISH_DIR = path.join(__dirname, 'catalog-site');
const EXPECTED_PHONE = '77004790001';
const html = fs.readFileSync(path.join(PUBLIC_DIR, 'catalog.html'), 'utf8');
const jsSource = fs.readFileSync(path.join(PUBLIC_DIR, 'catalog.js'), 'utf8');
const products = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'catalog_products.json'), 'utf8'));
const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const workflow = require('./ai_workflow');

let checks = 0;
function check(name, fn) {
  try {
    fn();
    checks += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function createCatalogApi() {
  const genericElement = {
    classList: { add() {}, remove() {}, toggle() {}, contains() { return true; } },
    addEventListener() {},
    querySelector() { return genericElement; },
    querySelectorAll() { return []; },
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    focus() {},
    getClientRects() { return [1]; },
    scrollIntoView() {},
    textContent: '',
    innerHTML: '',
    value: '',
    href: '',
    dataset: {},
    inert: false
  };
  const sandbox = {
    console,
    URLSearchParams,
    window: { location: { search: '' }, open() {} },
    document: {
      getElementById() { return { ...genericElement }; },
      querySelector() { return { ...genericElement }; },
      querySelectorAll() { return []; },
      addEventListener() {},
      activeElement: { ...genericElement }
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    fetch: async () => ({ ok: true, json: async () => products }),
    setTimeout() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(`${jsSource}\n;globalThis.__catalogApi = { WA_PHONE, MAX_SELECTED_PRODUCTS, PROMOTIONS, formatPrice, generateSingleProductMessage, generateSelectedCartMessage, createProductCardHTML, createProductModalHTML, getKazakhstanDateParts, isKaspiCampaignActive };`, sandbox);
  return sandbox.__catalogApi;
}

const api = createCatalogApi();

// Public URL and deployment safety.
check('catalog uses the approved WhatsApp number', () => assert.strictEqual(api.WA_PHONE, EXPECTED_PHONE));
check('catalog phone cannot be overridden by query params', () => assert.ok(!jsSource.includes('URLSearchParams')));
// The owner's private number is read from .env and never written into the repository.
const OWNER_PHONE = String(process.env.TAKEOVER_OWNER_PHONE || '').replace(/D/g, '');
if (OWNER_PHONE) {
  check('old takeover phone is absent from public HTML', () => assert.ok(!html.includes(OWNER_PHONE)));
  check('old takeover phone is absent from public JS', () => assert.ok(!jsSource.includes(OWNER_PHONE)));
}
check('header CTA uses approved phone', () => assert.ok(html.includes(`https://wa.me/${EXPECTED_PHONE}?text=`)));
check('header runtime uses approved phone', () => assert.ok(jsSource.includes("const WA_PHONE = '77004790001'")));
check('stylesheet path is GitHub Pages-safe', () => assert.ok(html.includes('href="./catalog.css"')));
check('script path is GitHub Pages-safe', () => assert.ok(html.includes('src="./catalog.js"')));
check('production page does not use Tailwind CDN', () => assert.ok(!html.includes('cdn.tailwindcss.com')));
check('compiled catalog stylesheet exists', () => assert.ok(fs.statSync(path.join(PUBLIC_DIR, 'catalog.css')).size > 20_000));
check('data path is GitHub Pages-safe', () => assert.ok(jsSource.includes("fetch('./catalog_products.json')")));
check('home link is GitHub Pages-safe', () => assert.ok(html.includes('href="./catalog.html"')));
check('catalog limits comparison to three models', () => assert.strictEqual(api.MAX_SELECTED_PRODUCTS, 3));
check('fourth selection returns before adding', () => assert.ok(/size >= MAX_SELECTED_PRODUCTS[\s\S]{0,180}return;/.test(jsSource)));
check('purchase strip does not promise free delivery', () => assert.ok(!html.includes('0 ₸ в городах со складами')));
check('installation claim is city-qualified in modal', () => assert.ok(jsSource.includes('В городах со складами — бесплатно')));
check('catalog uses the requested dark water-technology visual world', () => {
  assert.ok(html.includes('bg-[#060b18] text-slate-100'));
  assert.ok(html.includes('<html lang="ru" class="dark">'));
});
check('Kaspi campaign ticker is present', () => assert.ok(html.includes('KASPI 0-0-24 ДО 6 СЕНТЯБРЯ')));
check('ticker repeats across the full viewport width', () => {
  const sourceCss = fs.readFileSync(path.join(PUBLIC_DIR, 'catalog.source.css'), 'utf8');
  assert.ok(sourceCss.includes('min-width: 100vw'));
  assert.ok(sourceCss.includes('justify-content: space-between'));
});
check('Kaspi campaign has a controlled expiry date', () => {
  assert.strictEqual(api.PROMOTIONS.kaspiZero24EndsOn, '2026-09-06');
  assert.strictEqual(api.isKaspiCampaignActive(new Date('2026-09-06T12:00:00+05:00')), true);
  assert.strictEqual(api.isKaspiCampaignActive(new Date('2026-09-07T12:00:00+05:00')), false);
});
check('expired Kaspi campaign removes the ticker header offset', () => {
  assert.ok(jsSource.includes("stickyHeader?.classList.remove('top-[34px]')"));
  assert.ok(jsSource.includes("stickyHeader?.classList.add('top-0')"));
});
check('daily kettle promotion uses Kazakhstan date', () => {
  assert.strictEqual(api.getKazakhstanDateParts(new Date('2026-08-27T12:00:00+05:00')).label, '27 августа');
  assert.ok(html.includes('id="kettlePromoDate"'));
});
check('AR-01A promotion includes both gift choices', () => {
  assert.ok(html.includes('AR-01A + пылесос или аэрогриль'));
  assert.ok(html.includes('id="arPromoDetailsBtn"'));
});
for (const promoAsset of ['promo-vacuum.png', 'promo-air-fryer.png', 'promo-kettle.png']) {
  check(`promotion asset ${promoAsset} is wired and exists`, () => {
    assert.ok(html.includes(`./catalog_assets/${promoAsset}`));
    const assetPath = path.join(PUBLIC_DIR, 'catalog_assets', promoAsset);
    assert.ok(fs.existsSync(assetPath));
    assert.ok(fs.statSync(assetPath).size > 100_000);
  });
}
check('air fryer and kettle gift photos fill their promotion frames', () => {
  assert.ok(html.includes('promo-air-fryer.png" alt="Аэрогриль — подарок на выбор к AR-01A"'));
  assert.ok(html.includes('promo-kettle.png" alt="Электрический чайник — подарок к любому фильтру"'));
});
check('purchase strip lists installment banks instead of a free-delivery claim', () => {
  assert.ok(html.includes('Банки для рассрочки'));
  assert.ok(html.includes('Kaspi, Freedom, Halyk'));
  assert.ok(!html.includes('0 ₸ в городах со складами'));
});
check('header lead does not request a PDF catalog', () => {
  const match = html.match(/id="headerWhatsappBtn" href="([^"]+)"/);
  assert.ok(match);
  const message = new URL(match[1].replace(/&amp;/g, '&')).searchParams.get('text');
  assert.ok(message.includes('с сайта VODEL'));
  assert.ok(!/каталог/i.test(message));
});

// The GitHub Desktop publish folder must contain only the public catalog.
check('publish bundle exists', () => assert.ok(fs.existsSync(PUBLISH_DIR)));
check('publish bundle contains only approved top-level entries', () => {
  const actual = fs.readdirSync(PUBLISH_DIR).sort();
  const expected = ['.nojekyll', 'catalog.css', 'catalog.js', 'catalog_assets', 'catalog_products.json', 'favicon.svg', 'index.html'].sort();
  assert.deepStrictEqual(actual, expected);
});
check('publish bundle JavaScript matches tested source', () => {
  assert.strictEqual(fs.readFileSync(path.join(PUBLISH_DIR, 'catalog.js'), 'utf8'), jsSource);
});
check('publish bundle CSS matches tested source', () => {
  assert.strictEqual(
    fs.readFileSync(path.join(PUBLISH_DIR, 'catalog.css'), 'utf8'),
    fs.readFileSync(path.join(PUBLIC_DIR, 'catalog.css'), 'utf8')
  );
});
check('publish bundle product data matches tested source', () => {
  assert.deepStrictEqual(
    JSON.parse(fs.readFileSync(path.join(PUBLISH_DIR, 'catalog_products.json'), 'utf8')),
    products
  );
});
check('publish index differs only by its self-link', () => {
  const publishHtml = fs.readFileSync(path.join(PUBLISH_DIR, 'index.html'), 'utf8');
  assert.strictEqual(publishHtml, html.replace('href="./catalog.html"', 'href="./index.html"'));
});
check('publish favicon matches source', () => {
  assert.strictEqual(
    fs.readFileSync(path.join(PUBLISH_DIR, 'favicon.svg'), 'utf8'),
    fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), 'utf8')
  );
});
check('publish bundle contains no bot credentials or private stores', () => {
  const names = fs.readdirSync(PUBLISH_DIR, { recursive: true }).map(String);
  assert.ok(!names.some((name) => /\.env|wwebjs|chats_store|sales_store|successful_sales|bot\..*log/i.test(name)));
});

for (const imageName of fs.readdirSync(path.join(PUBLIC_DIR, 'catalog_assets'))) {
  check(`publish asset ${imageName} matches source`, () => {
    const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PUBLIC_DIR, 'catalog_assets', imageName))).digest('hex');
    const publishHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(PUBLISH_DIR, 'catalog_assets', imageName))).digest('hex');
    assert.strictEqual(publishHash, sourceHash);
  });
}

// Product data, assets, finance arithmetic, actual CTA messages, search and detection.
check('catalog has exactly sixteen models', () => assert.strictEqual(products.length, 16));
check('catalog product IDs are unique', () => assert.strictEqual(new Set(products.map((p) => p.id)).size, products.length));
check('all commercial catalog IDs are unique', () => assert.strictEqual(new Set(COMMERCIAL_FACTS.catalogProducts.map((p) => p.id)).size, products.length));

const requiredFields = [
  'id', 'name', 'shortName', 'origin', 'originCode', 'flag', 'category', 'categoryLabel',
  'tankType', 'tank', 'stages', 'oldPrice', 'price', 'discountPercent', 'monthlyKaspi',
  'monthlyHalyk', 'features', 'image', 'waterTypes'
];

for (const product of products) {
  check(`${product.id}: all required fields`, () => {
    for (const field of requiredFields) assert.notStrictEqual(product[field], undefined, `missing ${field}`);
  });
  check(`${product.id}: non-empty names`, () => {
    assert.ok(product.name.trim().length > 3);
    assert.ok(product.shortName.trim().length > 1);
  });
  check(`${product.id}: valid prices`, () => {
    assert.ok(Number.isInteger(product.price) && product.price > 0);
    assert.ok(Number.isInteger(product.oldPrice) && product.oldPrice > product.price);
  });
  check(`${product.id}: discount badge matches prices`, () => {
    assert.strictEqual(product.discountPercent, Math.round((1 - product.price / product.oldPrice) * 100));
    // The advertised RO-H015 has its own ad price; every other model keeps the 50% campaign.
    if (product.id !== 'ro_h015') assert.strictEqual(product.oldPrice, product.price * 2);
  });
  check(`${product.id}: Kaspi 12-month arithmetic`, () => {
    const financedTotal = product.installmentPrice || product.price;
    assert.ok(Math.abs(product.monthlyKaspi - financedTotal / 12) <= 20);
  });
  check(`${product.id}: Halyk/Freedom 24-month arithmetic`, () => {
    const financedTotal = product.installmentPrice || product.price;
    assert.ok(Math.abs(product.monthlyHalyk - financedTotal / 24) <= 10);
  });
  check(`${product.id}: image uses a relative path`, () => assert.ok(product.image.startsWith('./catalog_assets/')));
  check(`${product.id}: image exists and is not empty`, () => {
    const imagePath = path.join(PUBLIC_DIR, product.image.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(imagePath), imagePath);
    assert.ok(fs.statSync(imagePath).size > 10_000, `${imagePath} is suspiciously small`);
  });
  check(`${product.id}: list fields are usable`, () => {
    assert.ok(Array.isArray(product.features) && product.features.length >= 2);
    assert.ok(Array.isArray(product.waterTypes) && product.waterTypes.length >= 1);
  });
  check(`${product.id}: category and tank type are allowed`, () => {
    assert.ok(['tank', 'direct', 'hydrogen', 'commercial'].includes(product.category));
    assert.ok(['tank', 'direct'].includes(product.tankType));
  });
  check(`${product.id}: single-product CTA is concise and model-specific`, () => {
    const message = api.generateSingleProductMessage(product);
    assert.ok(message.includes(product.name));
    assert.ok(message.includes(api.formatPrice(product.price)));
    if (product.installmentPrice) assert.ok(message.includes(api.formatPrice(product.installmentPrice)));
    assert.ok(message.length < 260, `message is ${message.length} chars`);
    assert.ok(!/каталог/i.test(message), 'must not trigger a redundant PDF catalog');
    assert.ok(message.includes('чайник'), 'daily kettle gift context must survive the WhatsApp handoff');
    if (product.id === 'ar01a') {
      assert.ok(message.includes('пылесос'));
      assert.ok(message.includes('аэрогриль'));
    } else {
      assert.ok(!message.includes('пылесос'));
      assert.ok(!message.includes('аэрогриль'));
    }
  });
  check(`${product.id}: single-product CTA URL targets approved number`, () => {
    const url = new URL(`https://wa.me/${api.WA_PHONE}?text=${encodeURIComponent(api.generateSingleProductMessage(product))}`);
    assert.strictEqual(url.hostname, 'wa.me');
    assert.strictEqual(url.pathname, `/${EXPECTED_PHONE}`);
    assert.ok(url.searchParams.get('text').includes(product.name));
  });
  check(`${product.id}: product card shows both plans without bank names`, () => {
    const card = api.createProductCardHTML(product);
    assert.ok(card.includes('0-0-12'));
    assert.ok(card.includes('0-0-24'));
    assert.ok(card.includes(product.monthlyKaspi.toLocaleString('ru-RU')));
    assert.ok(card.includes(product.monthlyHalyk.toLocaleString('ru-RU')));
    if (product.installmentPrice) assert.ok(card.includes(product.installmentPrice.toLocaleString('ru-RU')));
    assert.ok(!/Kaspi|Halyk|Freedom/i.test(card));
  });
  check(`${product.id}: search by short name finds model`, () => {
    const needle = product.shortName.toLowerCase();
    const found = products.filter((p) => `${p.name} ${p.shortName} ${p.origin} ${p.features.join(' ')}`.toLowerCase().includes(needle));
    assert.ok(found.some((p) => p.id === product.id));
  });
  check(`${product.id}: commercial facts stay synchronized`, () => {
    const fact = COMMERCIAL_FACTS.catalogProducts.find((p) => p.id === product.id);
    assert.ok(fact, 'missing from commercial facts');
    assert.strictEqual(fact.name, product.name);
    assert.strictEqual(fact.price, product.price);
    assert.strictEqual(fact.oldPrice, product.oldPrice);
    assert.strictEqual(fact.installmentPrice, product.installmentPrice);
  });
  check(`${product.id}: bot recognizes exact model name`, () => {
    const detected = detectCatalogModelsInText(`Меня заинтересовала модель ${product.name}`);
    assert.ok(detected.some((p) => p.id === product.id));
  });
}

for (const category of ['tank', 'direct', 'hydrogen', 'commercial']) {
  check(`category ${category} returns products`, () => assert.ok(products.filter((p) => p.category === category).length > 0));
}
for (const country of ['KR', 'USA', 'DE', 'TR']) {
  check(`country ${country} returns products`, () => assert.ok(products.filter((p) => p.originCode === country).length > 0));
}

check('multi-product CTA is concise and avoids redundant catalog trigger', () => {
  const message = api.generateSelectedCartMessage(products.slice(0, 3));
  assert.ok(message.length < 500);
  assert.ok(!/каталог/i.test(message));
  for (const product of products.slice(0, 3)) assert.ok(message.includes(product.name));
});
check('multi-product CTA preserves AR-01A and daily gift context', () => {
  const ar01 = products.find((product) => product.id === 'ar01a');
  const other = products.find((product) => product.id !== 'ar01a');
  const message = api.generateSelectedCartMessage([ar01, other]);
  assert.ok(message.includes('пылесос'));
  assert.ok(message.includes('аэрогриль'));
  assert.ok(message.includes('чайник'));
});
check('multi-product CTA URL targets approved number', () => {
  const url = new URL(`https://wa.me/${api.WA_PHONE}?text=${encodeURIComponent(api.generateSelectedCartMessage(products.slice(0, 3)))}`);
  assert.strictEqual(url.pathname, `/${EXPECTED_PHONE}`);
});
check('Alkaline G75 naming is correct', () => {
  assert.strictEqual(products.find((p) => p.id === 'alkaline_g75').name, 'Фильтр Alkaline G75 (White)');
});
check('FOURA public price is correct', () => assert.strictEqual(products.find((p) => p.id === 'foura_600gpd').price, 185000));
check('Alkaline G75 public price is correct', () => assert.strictEqual(products.find((p) => p.id === 'alkaline_g75').price, 109000));
check('all 109 000 ₸ filters use the 120 000 ₸ installment total', () => {
  const financedModels = products.filter((product) => product.price === 109000);
  assert.deepStrictEqual(financedModels.map((product) => product.id).sort(), ['alkaline_g75', 'blue_tech', 'ro_h910']);
  for (const product of financedModels) {
    assert.strictEqual(product.installmentPrice, 120000);
    assert.strictEqual(product.monthlyKaspi, 10000);
    assert.strictEqual(product.monthlyHalyk, 5000);
  }
});
check('Alkaline Smart public price is correct', () => assert.strictEqual(products.find((p) => p.id === 'alkaline_smart').price, 150000));
check('modal installment labels do not show bank names', () => {
  const modal = api.createProductModalHTML(products[0]);
  assert.ok(modal.includes('<strong>0-0-12:</strong>'));
  assert.ok(modal.includes('<strong>0-0-24:</strong>'));
  assert.ok(!/Kaspi|Halyk|Freedom/i.test(modal));
});
check('modal exposes accessible state and focus lifecycle', () => {
  assert.ok(html.includes('id="productModal"'));
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(html.includes('role="document"'));
  assert.ok(jsSource.includes("productModal.setAttribute('aria-hidden', 'false')"));
  assert.ok(jsSource.includes('modalOpener?.focus?.()'));
  assert.ok(jsSource.includes('trapModalFocus(e)'));
  assert.ok(jsSource.includes('setBackgroundInteractionDisabled(true)'));
});

// With-catalog and without-catalog bot routing safeguards.
for (const [input, expected] of [['1', 1], ['2️⃣', 2], ['вариант 3', 3], ['каталог', 1], ['FOURA', 2], ['Alkaline Smart', 3]]) {
  check(`menu route ${input}`, () => assert.strictEqual(detectProductMenuChoice(input), expected));
}
for (const input of ['12', '185000', 'Alkaline G75', '0-0-12', '5', '4', '2026', 'Сколько стоит FOURA?']) {
  check(`menu rejects ambiguous input ${input}`, () => assert.strictEqual(detectProductMenuChoice(input), null));
}
check('option 1 catalog link is wired', () => {
  assert.ok(serverSource.includes('sendProductCatalog(chatId, chatObj, chats[chatId])'));
  assert.ok(serverSource.includes('CATALOG_FACTS.webUrl'));
});
check('catalog is sent only once per chat', () => assert.ok(serverSource.includes("typeof chats[chatId].catalogSent !== 'boolean'")));
check('website CTA cannot trigger catalog keyword policy', () => {
  for (const product of products) assert.ok(!/каталог/i.test(api.generateSingleProductMessage(product)));
});
check('direct FOURA choice is recognized', () => assert.ok(detectCatalogModelsInText('Хочу FOURA без бака').some((p) => p.id === 'foura_600gpd')));
check('direct G75 choice is recognized', () => assert.ok(detectCatalogModelsInText('Хочу Alkaline G75 с баком').some((p) => p.id === 'alkaline_g75')));
check('tankless price question is not misrouted to service costs', () => {
  assert.strictEqual(workflow.shouldAnswerServiceCost('Сколько стоит фильтр Фоура без бака?'), false);
});
check('tankless price question has a deterministic concise route', () => {
  assert.strictEqual(workflow.shouldAnswerTanklessPrice('Сколько стоит фильтр Фоура без бака?'), true);
  const reply = workflow.buildTanklessPriceAnswer();
  assert.ok(reply.includes('185 000'));
  assert.ok(reply.includes('15 400'));
  assert.ok(reply.includes('7 700'));
  assert.ok(!reply.includes('Alkaline G75'));
  assert.ok(reply.length < 300);
});
check('real cartridge-cost question still routes to service costs', () => {
  assert.strictEqual(workflow.shouldAnswerServiceCost('Сколько стоят картриджи и когда их менять?'), true);
});

// Voice-message safety matrix: Russian, Kazakh, mixed speech and media variants.
for (const message of [
  { hasMedia: true, type: 'ptt' },
  { hasMedia: true, type: 'audio' },
  { hasMedia: true, type: 'ptt', mimetype: 'audio/ogg' },
  { hasMedia: true, type: 'audio', mimetype: 'audio/mp4' }
]) {
  check(`voice recognized: ${JSON.stringify(message)}`, () => assert.strictEqual(isVoiceMessage(message), true));
}
for (const message of [
  { hasMedia: false, type: 'ptt' },
  { hasMedia: true, type: 'image' },
  { hasMedia: true, type: 'video' },
  null
]) {
  check(`non-voice rejected: ${JSON.stringify(message)}`, () => assert.strictEqual(isVoiceMessage(message), false));
}
for (const [mime, expected] of [
  ['audio/ogg; codecs=opus', 'audio/ogg'],
  ['application/ogg', 'audio/ogg'],
  ['audio/opus', 'audio/ogg'],
  ['audio/x-m4a', 'audio/mp4'],
  ['audio/mp4', 'audio/mp4'],
  ['audio/mpeg', 'audio/mpeg'],
  ['application/octet-stream', 'audio/ogg'],
  ['', 'audio/ogg']
]) {
  check(`voice MIME ${mime || 'empty'}`, () => assert.strictEqual(normalizeVoiceMimeType(mime), expected));
}
for (const [raw, expected] of [
  ['Расшифровка: Сколько стоит FOURA?', 'Сколько стоит FOURA?'],
  ['Текст: Хочу фильтр без бака', 'Хочу фильтр без бака'],
  ['Транскрипция: Бағасы қанша?', 'Бағасы қанша?'],
  ['audio transcription: Kaspi бар ма?', 'Kaspi бар ма?'],
  ['```text\nНужен Alkaline G75\n```', 'Нужен Alkaline G75'],
  ['НЕРАЗБОРЧИВО', ''],
  ['тишина', ''],
  ['нет речи', '']
]) {
  check(`voice transcript ${raw.slice(0, 20)}`, () => assert.strictEqual(cleanVoiceTranscription(raw), expected));
}
check('voice prompt supports Russian', () => assert.ok(buildVoiceTranscriptionPrompt().includes('русским')));
check('voice prompt supports Kazakh', () => assert.ok(buildVoiceTranscriptionPrompt().includes('казахским')));
check('failed voice pauses instead of guessing', () => assert.strictEqual(shouldPauseForUntranscribedVoice({ isVoice: true, transcriptionSucceeded: false }), true));
check('successful voice continues', () => assert.strictEqual(shouldPauseForUntranscribedVoice({ isVoice: true, transcriptionSucceeded: true }), false));
check('text message never enters voice pause', () => assert.strictEqual(shouldPauseForUntranscribedVoice({ isVoice: false, transcriptionSucceeded: false }), false));
check('server stores voice source', () => assert.ok(serverSource.includes("source: receivedVoiceMessage ? 'voice' : 'text'")));
check('first voice bypasses generic welcome', () => assert.ok(serverSource.includes('skipFirstLeadWelcome: receivedVoiceMessage')));

// Anti-spam and context retention smoke tests.
const now = Date.now();
const assistantHistory = [{ sender: 'ai', text: 'Из какого вы города?', timestamp: new Date(now - 1_000).toISOString() }];
check('exact assistant repeat is blocked', () => assert.strictEqual(isRecentAssistantDuplicate(assistantHistory, 'Из какого вы города?', 600_000, now), true));
check('same-intent assistant repeat is blocked', () => assert.strictEqual(isRecentAssistantDuplicate(assistantHistory, 'Подскажите, из какого вы города?', 600_000, now), true));
check('unrelated assistant question is allowed', () => assert.strictEqual(isRecentAssistantDuplicate(assistantHistory, 'Какой фильтр вам нужен?', 600_000, now), false));
check('duplicate customer burst is detected', () => assert.strictEqual(isBurstDuplicateCustomerMessage([{ sender: 'user', text: 'Да', timestamp: new Date(now - 1_000).toISOString() }], 'Да', 45_000, now), true));
check('non-duplicate customer reply is allowed', () => assert.strictEqual(isBurstDuplicateCustomerMessage([{ sender: 'user', text: 'Да', timestamp: new Date(now - 1_000).toISOString() }], 'Астана', 45_000, now), false));
check('city reply retains context', () => {
  const turn = analyzeConversationTurn({ text: 'Астана', history: assistantHistory });
  assert.strictEqual(turn.cityReply, true);
});
check('generic yes is not treated as a city', () => {
  const turn = analyzeConversationTurn({ text: 'Да', history: assistantHistory });
  assert.strictEqual(turn.cityReply, false);
});

assert.ok(checks >= 100, `Expected at least 100 checks, got ${checks}`);
console.log(`Catalog + bot full matrix passed: ${checks} checks (including voice, catalog/no-catalog, WhatsApp, anti-repeat).`);

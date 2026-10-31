const COMMERCIAL_FACTS = Object.freeze({
  currency: '₸',
  campaigns: {
    kaspiZero24: {
      startsOn: '2026-08-27',
      endsOn: '2026-09-06',
      displayEndsOn: '6 сентября',
      label: 'Kaspi 0-0-24 до 6 сентября'
    },
    ar01GiftChoice: {
      productId: 'ar01a',
      gifts: ['пылесос', 'аэрогриль'],
      label: 'К AR-01A — один подарок на выбор: пылесос или аэрогриль'
    }
  },
  warehouseCities: ['астана', 'astana', 'алматы', 'almaty', 'шымкент', 'shymkent', 'атырау', 'atyrau'],
  warehouseCityLocatives: {
    'астана': 'Астане',
    'astana': 'Астане',
    'алматы': 'Алматы',
    'almaty': 'Алматы',
    'шымкент': 'Шымкенте',
    'shymkent': 'Шымкенте',
    'атырау': 'Атырау',
    'atyrau': 'Атырау'
  },
  products: {
    foura: {
      name: 'FOURA 600 GPD',
      cashPrice: 185000,
      installment: {
        kaspi: {
          provider: 'Kaspi',
          termMonths: 12,
          monthlyPayment: 15400,
          label: 'Kaspi 0-0-12 — около 15 400 ₸ в месяц'
        },
        halykFreedom: {
          providers: ['Halyk', 'Freedom'],
          termMonths: 24,
          monthlyPayment: 7700,
          label: 'Halyk/Freedom 0-0-24 — около 7 700 ₸ в месяц'
        }
      },
      warrantyYears: 3,
      freeServiceYears: 15,
      service: {
        labourIncluded: true,
        firstReplacementIntervalMonths: '6–9',
        replacementSchedule: [
          { year: 1, price: 15000, description: 'замена 2 картриджей' },
          { year: 2, price: 17500, description: 'замена 3 картриджей' },
          { year: 3, price: 35000, description: 'полная замена комплекта картриджей' }
        ],
        membraneAndOrpReplacementYears: 3
      }
    },
    alkaline: {
      name: 'Alkaline G75',
      cashPrice: 109000,
      installmentPrice: 120000,
      installment: {
        kaspi: {
          provider: 'Kaspi',
          termMonths: 12,
          monthlyPayment: 10000,
          label: 'Kaspi 0-0-12 — около 10 000 ₸ в месяц'
        },
        halykFreedom: {
          providers: ['Halyk', 'Freedom'],
          termMonths: 24,
          monthlyPayment: 5000,
          label: 'Halyk/Freedom 0-0-24 — около 5 000 ₸ в месяц'
        }
      },
      warrantyYears: 3,
      freeServiceYears: 15,
      service: {
        labourIncluded: true,
        replacementSchedule: [
          { timing: 'через 6–9 месяцев после установки', price: 12500, description: 'плановая замена картриджей' },
          { timing: 'через 1 год после установки', price: 15000, description: 'плановая замена картриджей' },
          { timing: 'через 2–2,5 года после установки', price: 30000, description: 'полная замена комплекта картриджей' }
        ]
      },
      sameDayWarehouseCashOffer: {
        price: 100000,
        conditions: [
          'Клиент находится в городе со складом.',
          'Клиент явно рассматривает Alkaline G75.',
          'Клиент возражает именно из-за цены или готов отказаться из-за цены.',
          'Клиент оплачивает полную сумму сегодня.'
        ]
      }
    },
    alkalineSmart: {
      name: 'Alkaline Smart',
      cashPrice: 150000,
      discountPercent: 50,
      origin: 'Южная Корея',
      tankCapacityLiters: 8,
      stages: 6,
      waterTypes: ['щелочная', 'фильтрованная'],
      installment: {
        kaspi: {
          provider: 'Kaspi',
          termMonths: 12,
          monthlyPayment: 12500,
          label: 'Kaspi 0-0-12 — около 12 500 ₸ в месяц'
        },
        halykFreedom: {
          providers: ['Halyk', 'Freedom'],
          termMonths: 24,
          monthlyPayment: 6250,
          label: 'Halyk/Freedom 0-0-24 — около 6 250 ₸ в месяц'
        }
      },
      warrantyYears: 3,
      warrantyMonths: 36,
      freeServiceYears: 15,
      service: {
        labourIncluded: true
      },
      features: [
        'Производство — Южная Корея',
        '6 ступеней очистки — эффективная многоступенчатая фильтрация воды',
        '2 вида воды — щелочная и фильтрованная',
        'Бак-накопитель 8 литров — запас очищенной воды всегда под рукой',
        'Сенсорный дисплей управления — современное и удобное управление системой',
        'TDS-индикатор — контроль показателей очищенной воды в реальном времени',
        'Индикатор замены картриджей — подскажет, когда необходимо обслуживание',
        'Датчик антипотоп — защита от протечек',
        'Датчик гидроудара — дополнительная защита системы',
        'Автоматическая промывка системы — поддержание эффективности фильтрации',
        'Двойной смеситель — отдельная подача разных видов воды',
        'Современный Smart-дизайн и компактное исполнение'
      ]
    }
  },
  catalogProducts: [
    { id: 'ro_h015', name: 'Фильтр RO - H 015', origin: 'США', price: 65000, installmentPrice: 75000, oldPrice: 120000, stages: 6, tank: 'Бак 8 л', category: 'Классический с баком', features: 'Обратный осмос, 6 ступеней с минерализацией; в комплекте электрический насос для подачи давления, бак-накопитель 8 л и евро-кран; удаляет до 99% примесей (бактерии и вирусы, тяжелые металлы, хлор и химикаты, пестициды, ржавчину и осадок); мембрана 75 GPD; 3 года гарантии, 15 лет сервиса', dimensions: 'блок фильтра 37 см (длина) × 20 см (ширина) × 42 см (высота); бак 25 см (ширина) × 33 см (высота)', materials: 'фото презентации, фото реальной установки под мойкой, фото с размерами и видео' },
    { id: 'blue_tech', name: 'Фильтр BLUE TECH', origin: 'Германия', price: 109000, installmentPrice: 120000, oldPrice: 218000, stages: 6, tank: 'Бак 8 л', category: 'Классический с баком', features: 'Немецкое качество, помпа давления, датчик протечки, евро-кран' },
    { id: 'ro_h910', name: 'Фильтр RO - H910 (Alkaline Black)', origin: 'Южная Корея', price: 109000, installmentPrice: 120000, oldPrice: 218000, stages: 6, tank: 'Бак 8 л', category: 'Смарт с баком', features: 'Сенсорный дисплей, щелочная и минерализованная вода, датчик антипотопа' },
    { id: 'alkaline_g75', name: 'Фильтр Alkaline G75 (White)', origin: 'Южная Корея', price: 109000, installmentPrice: 120000, oldPrice: 218000, stages: 5, tank: 'Бак 8 л', category: 'Смарт с баком', features: 'Сенсорный дисплей, щелочная и минерализованная вода, датчик антипотопа' },
    { id: 'jemmy_leon', name: 'Фильтр JEMMY LEON', origin: 'Турция', price: 120000, oldPrice: 240000, stages: 6, tank: 'Бак 8 л', category: 'Классический с баком', features: 'Датчик давления, датчик антипотопа, надежный закрытый корпус' },
    { id: 'alkaline_smart', name: 'Фильтр ALKALINE SMART', origin: 'Южная Корея', price: 150000, oldPrice: 300000, stages: 6, tank: 'Бак 8 л', category: 'Смарт с баком (Хит)', features: 'Сенсорный дисплей, 2 вида воды, датчик антипотопа, автопромывка, TDS смеситель' },
    { id: 'ravent_lux', name: 'Фильтр RAVENT LUX', origin: 'Турция', price: 170000, oldPrice: 340000, stages: 6, tank: 'Бак 8 л', category: 'Классический с баком', features: 'Насос подачи давления, регулятор давления, датчик от протечки' },
    { id: 'ro_wt01', name: 'Фильтр RO - WT 01', origin: 'Южная Корея', price: 180000, oldPrice: 360000, stages: 5, tank: 'Бак 8 л', category: 'Смарт с баком', features: 'Сенсорная панель, щелочная вода, двойной кран с насосом' },
    { id: 'foura_600gpd', name: 'Фильтр FOURA 600 GPD (БЕЗ БАКА)', origin: 'Южная Корея', price: 185000, oldPrice: 370000, stages: 5, tank: 'БЕЗ БАКА (600 GPD прямоток)', category: 'Прямоточный без бака (Главный Флагман)', features: 'Мембрана 600 GPD, TDS-дисплей в реальном времени, щелочная турмалин + минеральная, самоочистка, антипотоп, 16 см корпус' },
    { id: 'wt02_direct', name: 'Фильтр WT-02 БЕЗ БАКА', origin: 'Южная Корея', price: 150000, installmentPrice: 160000, oldPrice: 250000, stages: 6, tank: 'БЕЗ БАКА (600 GPD прямоток)', category: 'Прямоточный без бака', features: 'Мембрана 600 GPD, сенсорный TDS дисплей, антипотоп, датчик давления' },
    { id: 'ar01a', name: 'Фильтр AR-01A', origin: 'Южная Корея', price: 250000, oldPrice: 500000, stages: 6, tank: 'Бак 8 л', category: 'Смарт с баком (Премиум)', features: 'Премиум Корея, 6 ступеней, двойной кран, антипотоп и датчик давления' },
    { id: 'ro_wt02_usa', name: 'Фильтр RO WT -02 (USA)', origin: 'США', price: 250000, oldPrice: 500000, stages: 6, tank: 'Бак 8 л', category: 'Смарт с баком (США)', features: 'Премиум США, сенсорный экран с TDS, щелочная и минерализованная вода' },
    { id: 'hydrogen_o1', name: 'Фильтр HYDROGEN O1 (Водородная вода)', origin: 'Южная Корея', price: 400000, oldPrice: 800000, stages: 7, tank: '375 л/сутки прямоток', category: 'Водородный Премиум (H2)', features: 'Водородная вода H2 + щелочная вода, природный антиоксидант, 375 л/сутки, сенсорный дисплей' },
    { id: 'hydrogen_o2', name: 'Фильтр HYDROGEN O2 (Водородная вода)', origin: 'Южная Корея', price: 400000, oldPrice: 800000, stages: 5, tank: 'Встроенный бак 2 л', category: 'Водородный Премиум (H2)', features: 'Водородная вода H2 + щелочная, компактный корпус со встроенным баком 2 л, сенсорный дисплей' },
    { id: 'semi_400g', name: 'Фильтр 400G Галлон (Полупромышленный)', origin: 'Германия', price: 310000, oldPrice: 620000, stages: 6, tank: 'Большой бак 40 л', category: 'Полупромышленный (Для кафе / Офисов)', features: 'Немецкие технологии, 400 GPD мембрана, мощный насос, бак 40 литров, для кафе и столовых' },
    { id: 'semi_eco_ro4', name: 'Фильтр ECO RO-4 (Полупромышленный)', origin: 'Германия', price: 450000, oldPrice: 900000, stages: 6, tank: 'Большой бак 40 л', category: 'Полупромышленный (Для общепита)', features: 'Немецкие технологии, массивная станция с предфильтрацией, насос, бак 40 л, для ресторанов и столовых' }
  ],
  // Set a real number here only when it is confirmed for the current day.
  stock: {
    fouraPromoUnits: null,
    alkalinePromoUnits: null,
    alkalineSmartPromoUnits: null
  },
  catalog: {
    fileName: 'VODEL 19.08 50 процентов скидка.pdf',
    // Keep the URL on its own line. WhatsApp then renders one clean, clickable
    // link instead of a preview or a document reference.
    promoCaption: 'Вот наш каталог со всеми моделями и ценами:\nhttps://catalog-vodel-kz.pages.dev/\n\nВ нём указаны акционные цены до конца месяца. Если появится вопрос по модели — напишите, помогу 😊',
    webUrl: 'https://catalog-vodel-kz.pages.dev/'
  },
  logistics: {
    warehouseCitySameDayCutoffHour: 17
  }
});

function formatTenge(amount) {
  return `${Number(amount).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₸`;
}

function getKazakhstanIsoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isKaspiZero24Active(date = new Date()) {
  const currentDate = getKazakhstanIsoDate(date);
  const campaign = COMMERCIAL_FACTS.campaigns.kaspiZero24;
  return currentDate >= campaign.startsOn && currentDate <= campaign.endsOn;
}

function formatKaspiInstallmentOptions(product, date = new Date()) {
  const options = [product.installment.kaspi.label];
  if (isKaspiZero24Active(date)) {
    options.push(`Kaspi 0-0-24 до ${COMMERCIAL_FACTS.campaigns.kaspiZero24.displayEndsOn} — около ${formatTenge(product.installment.halykFreedom.monthlyPayment)} в месяц`);
  }
  return options.join('; ');
}

function formatInstallmentOptions(product, date = new Date()) {
  return `${formatKaspiInstallmentOptions(product, date)}; ${product.installment.halykFreedom.label}`;
}

function normalize(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е');
}

function isWarehouseCityMentioned(messages) {
  const transcript = messages.map(message => normalize(message.text)).join('\n');
  const isRuralOrRegionalLocation = /(?:село|аул|ауыл|пос[её]лок|деревн|област|район)/.test(transcript);
  return !isRuralOrRegionalLocation && COMMERCIAL_FACTS.warehouseCities.some(city => transcript.includes(city));
}

function isRuralOrRegionalLocationMentioned(messages) {
  const transcript = messages.map(message => normalize(message.text)).join('\n');
  return /(?:село|аул|ауыл|пос[её]лок|деревн|област|район)/.test(transcript);
}

function resolveWarehouseCityLocative(messages = []) {
  const customerMessages = messages.filter(message => !message.sender || message.sender === 'user');
  if (!isWarehouseCityMentioned(customerMessages)) return null;
  const transcript = customerMessages.map(message => normalize(message.text)).join('\n');
  const alias = COMMERCIAL_FACTS.warehouseCities.find(city => transcript.includes(city));
  return alias ? COMMERCIAL_FACTS.warehouseCityLocatives[alias] : null;
}

function getCommercialConversationPolicy(chatHistory, lastMessageContent) {
  const messages = [...(chatHistory || []), { sender: 'user', text: lastMessageContent || '' }];
  const customerMessages = messages.filter(message => !message.sender || message.sender === 'user');
  const transcript = customerMessages.map(message => normalize(message.text)).join('\n');
  const latestMessage = normalize(lastMessageContent);
  const isInterestedInAlkaline = /alkaline|алкалайн|g75|с баком|баковый/.test(transcript);
  const hasCurrentPriceObjection = /дорог|не потян|нет денег|не могу себе позвол|слишком много|скидк|дешевле|бюджет|too expensive|cheaper|discount/.test(latestMessage);
  const warehouseCityKnown = isWarehouseCityMentioned(customerMessages);
  const ruralOrRegionalLocationMentioned = isRuralOrRegionalLocationMentioned(customerMessages);
  const discountAlreadyMentioned = messages.some(message => message.sender !== 'user' && /alkaline g75.{0,80}100\s?000|100\s?000.{0,80}alkaline g75/i.test(String(message.text || '')));
  const eligibleForAlkalineCashOffer = warehouseCityKnown && isInterestedInAlkaline && hasCurrentPriceObjection && !discountAlreadyMentioned;

  return {
    eligibleForAlkalineCashOffer,
    warehouseCityKnown,
    ruralOrRegionalLocationMentioned,
    isInterestedInAlkaline,
    hasCurrentPriceObjection,
    discountAlreadyMentioned
  };
}

function detectCatalogModelsInText(text) {
  const norm = normalize(text);
  const found = [];
  const patterns = [
    { id: 'ro_h015', regex: /ro[\s-]?h[\s-]?015|h[\s-]?015/i },
    { id: 'blue_tech', regex: /blue\s*tech|блю\s*тек|немецк.*109/i },
    { id: 'ro_h910', regex: /ro[\s-]?h[\s-]?910|h[\s-]?910|alkaline\s*black/i },
    { id: 'alkaline_g75', regex: /alkaline\s*g[\s-]?75|g[\s-]?75|alkaline\s*white/i },
    { id: 'jemmy_leon', regex: /jemmy\s*leon|джемми\s*леон/i },
    { id: 'alkaline_smart', regex: /alkaline\s*smart|алкалайн\s*смарт|смарт.*150/i },
    { id: 'ravent_lux', regex: /ravent\s*lux|равент\s*люкс/i },
    { id: 'ro_wt01', regex: /ro[\s-]?wt[\s-]?01|wt[\s-]?01/i },
    { id: 'foura_600gpd', regex: /foura|фоура|600\s*gpd|прямоточ.*185/i },
    // A plain "WT-02" (or "Alkaline WT-02") means the tankless model; only
    // "WT-02 USA/США" is the tank version below.
    { id: 'wt02_direct', regex: /wt[\s-]?02(?![\s()\-]*(?:usa|сша))/i },
    { id: 'ar01a', regex: /ar[\s-]?01a?|ар[\s-]?01/i },
    { id: 'ro_wt02_usa', regex: /ro[\s-]*wt[\s-]*02[\s()\-]*(?:usa|сша)|wt[\s-]*02[\s()\-]*(?:usa|сша)/i },
    { id: 'hydrogen_o1', regex: /hydrogen\s*o?1|водородн.*o?1|водородн.*375/i },
    { id: 'hydrogen_o2', regex: /hydrogen\s*o?2|водородн.*o?2|водородн.*2\s*л/i },
    { id: 'semi_400g', regex: /400g|400\s*галлон|полупром.*310/i },
    { id: 'semi_eco_ro4', regex: /eco\s*ro[\s-]?4|ro[\s-]?4|полупром.*450/i }
  ];

  for (const p of patterns) {
    if (p.regex.test(norm)) {
      const match = COMMERCIAL_FACTS.catalogProducts.find(cp => cp.id === p.id);
      if (match) found.push(match);
    }
  }
  return found;
}

function getCatalogPreviewContext(message = {}) {
  const data = message._data || {};
  const previewUrl = [message.matchedText, message.canonicalUrl, data.matchedText, data.canonicalUrl]
    .filter(Boolean)
    .join('\n');
  if (!/catalog-vodel-kz\.pages\.dev/i.test(previewUrl)) return '';
  const previewText = [
    message.title,
    message.description,
    data.title,
    data.description,
    data.matchedText,
    data.canonicalUrl
  ].filter(Boolean).join('\n');
  const models = detectCatalogModelsInText(previewText);
  if (models.length !== 1) return '';
  return `[Выбранная карточка сайта VODEL: ${models[0].name}]`;
}

function resolveLatestCatalogProduct(messages = [], currentText = '') {
  const candidates = [currentText, ...[...(messages || [])].reverse().map(message => (
    [message.text, message.context].filter(Boolean).join('\n')
  ))];
  for (const candidate of candidates) {
    const models = detectCatalogModelsInText(candidate);
    if (models.length === 1) return models[0];
  }
  return null;
}

function getCommercialFactsForPrompt(policy, contextText = '') {
  const { foura, alkaline, alkalineSmart } = COMMERCIAL_FACTS.products;
  const facts = [
    'КОММЕРЧЕСКИЕ ФАКТЫ — ЭТО ЕДИНСТВЕННЫЙ ИСТОЧНИК ЦЕН, РАССРОЧКИ, ГАРАНТИИ И СЕРВИСА. Любые отличающиеся цифры из базы знаний игнорируй.',
    isKaspiZero24Active()
      ? `ВРЕМЕННАЯ АКЦИЯ: ${COMMERCIAL_FACTS.campaigns.kaspiZero24.label}. Для платежа на 24 месяца используй сумму 0-0-24 конкретной модели. После ${COMMERCIAL_FACTS.campaigns.kaspiZero24.displayEndsOn} не обещай Kaspi 0-0-24.`
      : 'Рассрочка Kaspi на 24 месяца сейчас не подтверждена. Для Kaspi используй только 0-0-12; срок 24 месяца доступен через Halyk/Freedom.',
    `АКЦИИ ИЗ ВЕБ-КАТАЛОГА — актуальный источник условий: ${COMMERCIAL_FACTS.campaigns.ar01GiftChoice.label}. Не говори, что этот подарок неактуален. Для AR-01A можно обещать ровно один из этих двух подарков, не оба сразу.`,
    'Акция «чайник в подарок» закончилась. Не обещай чайник и другие подарки, кроме подарка к AR-01A. Если клиент спрашивает про чайник, вежливо скажи, что эта акция завершилась.',
    `FOURA 600 GPD: ${formatTenge(foura.cashPrice)}; ${formatInstallmentOptions(foura)}; гарантия ${foura.warrantyYears} года; бесплатное сервисное обслуживание ${foura.freeServiceYears} лет.`,
    'FOURA — прямоточная система без накопительного бака; полупромышленная мембрана 600 GPD очищает воду сразу при открытии крана. Есть TDS-контроль, самоочистка и защита от протечек.',
    `Alkaline Smart (Корейский смарт-фильтр с баком 8 л): ${formatTenge(alkalineSmart.cashPrice)} (акция со скидкой 50%); ${formatInstallmentOptions(alkalineSmart)}; гарантия ${alkalineSmart.warrantyYears} года (36 месяцев); бесплатное сервисное обслуживание ${alkalineSmart.freeServiceYears} лет.`,
    `Alkaline G75: ${formatTenge(alkaline.cashPrice)} при полной оплате или ${formatTenge(alkaline.installmentPrice)} в рассрочку; ${formatInstallmentOptions(alkaline)}; гарантия ${alkaline.warrantyYears} года; бесплатное сервисное обслуживание ${alkaline.freeServiceYears} лет.`,
    'Alkaline G75 и Alkaline Smart — ДВЕ РАЗНЫЕ МОДЕЛИ одной фирмы. Если клиент выбрал G75 или карточку Alkaline G75 White, называй только Alkaline G75, её цену и характеристики. Никогда не переименовывай G75 в Alkaline Smart и не отправляй материалы другой модели.',
    `ОБЩИЙ КАТАЛОГ: веб-каталог «${COMMERCIAL_FACTS.catalog.webUrl}» отправляй клиенту, который выбрал пункт «Каталог» или попросил другие модели. В каталоге указаны актуальные модели и цены.`,
    'Бесплатный сервис означает выезд и работу мастера (15 лет); расходные картриджи оплачиваются отдельно.',
    'Не называй остатки товара или цену следующей поставки: актуальный остаток не задан в коммерческих фактах.'
  ];

  // The second tankless model must be known even before the customer names it:
  // it is the answer to "другой вариант без бака" after FOURA.
  const wt02 = COMMERCIAL_FACTS.catalogProducts.find(product => product.id === 'wt02_direct');
  if (wt02) {
    facts.push(`ВТОРОЙ ВАРИАНТ БЕЗ БАКА — ${wt02.name}: ${formatTenge(wt02.price)} при полной оплате или ${formatTenge(wt02.installmentPrice)} в рассрочку (Kaspi 0-0-12 — около ${formatTenge(Math.round(wt02.installmentPrice / 12))} в месяц; Halyk/Freedom 0-0-24 — около ${formatTenge(Math.round(wt02.installmentPrice / 24))} в месяц). Он дешевле FOURA. Предлагай его, когда клиенту без бака нужен другой или более доступный вариант, чем FOURA.`);
  }
  facts.push('Презентацию FOURA система отправляет сама, как только речь заходит о FOURA. Не спрашивай «отправить презентацию?» и не обещай её отдельно.');

  // If customer message or context mentions specific catalog models, append their facts
  const detectedModels = detectCatalogModelsInText(contextText);
  if (detectedModels.length > 0) {
    facts.push('ВЫБРАННЫЕ КЛИЕНТОМ МОДЕЛИ ИЗ КАТАЛОГА:');
    for (const m of detectedModels) {
      const paymentPrice = m.installmentPrice ? ` или ${formatTenge(m.installmentPrice)} в рассрочку` : '';
      const financed = m.installmentPrice || m.price;
      const monthly = `рассрочка: Kaspi 0-0-12 — около ${formatTenge(Math.round(financed / 12))} в месяц; Halyk/Freedom 0-0-24 — около ${formatTenge(Math.round(financed / 24))} в месяц`;
      facts.push(`- ${m.name} (${m.origin}): ${formatTenge(m.price)} при полной оплате${paymentPrice} (скидка ${Math.round((1 - m.price / m.oldPrice) * 100)}%, старая цена ${formatTenge(m.oldPrice)}), ${m.stages} ступеней, ${m.tank}, ${m.category}. Особенности: ${m.features}. ${monthly[0].toUpperCase()}${monthly.slice(1)}. Гарантия 3 года, сервис 15 лет.`);
      if (m.price === Math.min(...COMMERCIAL_FACTS.catalogProducts.map(product => product.price))) {
        facts.push(`  ${m.name} — самая доступная модель. На «дорого» по ней предлагай только её рассрочку; не называй другие модели «более доступными».`);
      }
      if (!m.service) facts.push(`  Сроки и стоимость замены картриджей для ${m.name} в фактах не указаны: не называй цифры и сроки, верни [HANDOVER] Один момент, уточню это у специалиста и вернусь к вам.`);
      if (m.dimensions) facts.push(`  Размеры ${m.name}: ${m.dimensions}.`);
      if (m.materials) facts.push(`  Материалы ${m.name} (${m.materials}) система отправляет сама, когда клиент просит фото, видео или размеры. Можно коротко предложить их прислать; не пиши имена файлов.`);
    }
  }

  if (policy && policy.eligibleForAlkalineCashOffer) {
    facts.push(`РАЗРЕШЁННАЯ РАЗОВАЯ ОФЕРТА: клиент соответствует всем условиям. Можно один раз предложить Alkaline G75 за ${formatTenge(alkaline.sameDayWarehouseCashOffer.price)} только при полной оплате сегодня. Сначала коротко уточни, готов ли клиент оплатить сегодня.`);
  } else {
    facts.push('СПЕЦЦЕНУ Alkaline G75 за 100 000 ₸ не упоминай: хотя бы одно обязательное условие не выполнено.');
  }

  return facts.join('\n');
}

function getLogisticsForPrompt(policy, astanaHour) {
  const cutoffHour = COMMERCIAL_FACTS.logistics.warehouseCitySameDayCutoffHour;
  if (policy && policy.ruralOrRegionalLocationMentioned) {
    return 'ЛОГИСТИКА — СЕЛО/ОБЛАСТЬ: клиент указал населённый пункт вне подтверждённого города со складом. Не называй доставку, выезд или установку бесплатными и не обещай дату. Если клиент спрашивает об установке, скажи только, что уточнишь возможность выезда по населённому пункту. Не спрашивай точный адрес на этом этапе и не обсуждай стоимость доставки до подтверждения возможности выезда.';
  }
  if (!policy || !policy.warehouseCityKnown) {
    return 'ЛОГИСТИКА: город клиента не подтверждён как город со складом. Склады есть только в Астане, Алматы, Шымкенте и Атырау (и их пригородах). Если клиент назвал другой город, не говори, что там есть склад, и не обещай доставку сегодня: доставка и установка будет завтра или в любой другой удобный для клиента день. Пока город не известен, не обещай доставку или установку в конкретный день.';
  }

  if (astanaHour < cutoffHour) {
    return `ЛОГИСТИКА — ОБЯЗАТЕЛЬНО: клиент находится в городе со складом, а сейчас до ${cutoffHour}:00 по Астане. Предложи бесплатную доставку и установку сегодня, в удобное клиенту время. Не говори «завтра» и не переноси установку на другой день, если клиент сам этого не попросил.`;
  }

  return `ЛОГИСТИКА: клиент находится в городе со складом, но сейчас после ${cutoffHour}:00 по Астане. Предложи бесплатную доставку и установку завтра либо в другой удобный для клиента день.`;
}

module.exports = {
  COMMERCIAL_FACTS,
  formatTenge,
  getKazakhstanIsoDate,
  isKaspiZero24Active,
  formatKaspiInstallmentOptions,
  formatInstallmentOptions,
  getCommercialConversationPolicy,
  resolveWarehouseCityLocative,
  getCommercialFactsForPrompt,
  getLogisticsForPrompt,
  detectCatalogModelsInText,
  getCatalogPreviewContext,
  resolveLatestCatalogProduct
};

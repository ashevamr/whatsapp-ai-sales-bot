const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  COMMERCIAL_FACTS,
  detectCatalogModelsInText,
  getCommercialFactsForPrompt
} = require('./commercial_facts');

console.log('--- Starting Catalog Workflow & Models Test Suite ---');

// 1. Verify catalog_products.json
const catalogJsonPath = path.join(__dirname, 'public', 'catalog_products.json');
assert.ok(fs.existsSync(catalogJsonPath), 'public/catalog_products.json must exist');
const products = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
assert.strictEqual(products.length, 16, 'Catalog must contain exactly 16 filter models');

// Verify all required fields for each model
const requiredFields = ['id', 'folder', 'name', 'shortName', 'origin', 'originCode', 'flag', 'category', 'stages', 'tank', 'oldPrice', 'price', 'discountPercent', 'monthlyKaspi', 'monthlyHalyk', 'features', 'image', 'waterTypes'];
for (const p of products) {
  for (const f of requiredFields) {
    assert.ok(p[f] !== undefined && p[f] !== null, `Product ${p.id} must have field ${f}`);
  }
  assert.strictEqual(p.discountPercent, Math.round((1 - p.price / p.oldPrice) * 100), `Product ${p.id} discount badge must match its prices`);
  assert.ok(p.price > 0 && p.price < p.oldPrice, `Product ${p.id} discounted price must be less than oldPrice`);
}
console.log('✓ Verified public/catalog_products.json structure (16 models, discounts match prices, full specs)');

// 2. Verify all folders in Vodel content
const baseVodel = path.join(__dirname, 'Vodel content');
const expectedFolders = [
  '01_RO-H015',
  '02_Blue_Tech',
  '03_RO-H910',
  '04_Alkaline_G75',
  '05_Jemmy_Leon',
  '06_Alkaline_Smart',
  '07_Ravent_Lux',
  '08_RO-WT01',
  '09_FOURA_600GPD',
  '10_WT-02_Direct',
  '11_AR-01A',
  '12_RO-WT02_USA',
  '13_Hydrogen_O1',
  '14_Hydrogen_O2',
  '15_SemiIndustrial_400G',
  '16_SemiIndustrial_ECO_RO4',
  '17_Дизайны_кранов_и_смесителей',
  '18_Сертификаты_и_Гарантия'
];

for (const folder of expectedFolders) {
  const fullPath = path.join(baseVodel, folder);
  assert.ok(fs.existsSync(fullPath), `Folder ${folder} must exist in Vodel content`);
  if (!folder.startsWith('17_') && !folder.startsWith('18_')) {
    const infoPath = path.join(fullPath, 'info.txt');
    assert.ok(fs.existsSync(infoPath), `info.txt must exist in ${folder}`);
    const posterPath = fs.readdirSync(fullPath).some(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    assert.ok(posterPath, `Media asset must exist in ${folder}`);
  }
}
console.log('✓ Verified all 18 folders in Vodel content with info.txt and media assets');

// 3. Verify Model Detection
const tests = [
  { text: 'Здравствуйте! Я выбрал в каталоге VODEL: 1. Фильтр FOURA 600 GPD 2. Фильтр ALKALINE SMART', expected: ['foura_600gpd', 'alkaline_smart'] },
  { text: 'Меня интересует водородный фильтр Hydrogen O1', expected: ['hydrogen_o1'] },
  { text: 'Подскажите про немецкий фильтр Blue Tech за 109 000', expected: ['blue_tech'] },
  { text: 'Какой фильтр самый дешевый? RO-H015 за 75000?', expected: ['ro_h015'] },
  { text: 'Нам в кафе нужен полупромышленный 400G или ECO RO-4 с баком 40 литров', expected: ['semi_400g', 'semi_eco_ro4'] }
];

for (const t of tests) {
  const detected = detectCatalogModelsInText(t.text);
  const detectedIds = detected.map(d => d.id);
  for (const exp of t.expected) {
    assert.ok(detectedIds.includes(exp), `Expected ${exp} to be detected in "${t.text}", got ${JSON.stringify(detectedIds)}`);
  }
}
console.log('✓ Verified model detection from incoming catalog customer messages');

// 4. Verify getCommercialFactsForPrompt with detected models
const promptFactsSingle = getCommercialFactsForPrompt({}, 'Меня заинтересовал HYDROGEN O1');
assert.ok(promptFactsSingle.includes('HYDROGEN O1'), 'Prompt facts must include detected HYDROGEN O1');
assert.ok(promptFactsSingle.includes('400 000'), 'Prompt facts must include price for HYDROGEN O1');

const promptFactsMulti = getCommercialFactsForPrompt({}, 'Здравствуйте! Я выбрал в каталоге: 1. FOURA 600 GPD 2. Фильтр BLUE TECH');
assert.ok(promptFactsMulti.includes('BLUE TECH'), 'Prompt facts must include BLUE TECH');
assert.ok(promptFactsMulti.includes('109 000'), 'Prompt facts must include price for BLUE TECH');

console.log('✓ Verified commercial facts injection into AI prompt for catalog models');

// 5. Verify HTML & JS assets exist
assert.ok(fs.existsSync(path.join(__dirname, 'public', 'catalog.html')), 'public/catalog.html must exist');
assert.ok(fs.existsSync(path.join(__dirname, 'public', 'catalog.css')), 'public/catalog.css must exist');
assert.ok(fs.existsSync(path.join(__dirname, 'public', 'catalog.js')), 'public/catalog.js must exist');
console.log('✓ Verified public/catalog.html, public/catalog.css, public/catalog.js existence');

console.log('\n🌟 ALL CATALOG WORKFLOW TESTS PASSED SUCCESSFULLY! 🌟');

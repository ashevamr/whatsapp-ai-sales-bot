import fitz
import os
import json
import shutil

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base_vodel = os.path.join(base_dir, 'Vodel content')
public_assets = os.path.join(base_dir, 'public', 'catalog_assets')
os.makedirs(public_assets, exist_ok=True)

models = [
    {
        'id': 'ro_h015',
        'folder': '01_RO-H015',
        'name': 'Фильтр RO - H 015',
        'shortName': 'RO-H 015',
        'origin': 'США',
        'originCode': 'USA',
        'flag': '🇺🇸',
        'category': 'tank',
        'categoryLabel': 'Классический с баком',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Мембрана обратного осмоса 75 GPD',
        'pump': 'Насос для подачи давления',
        'faucet': 'Евро-кран',
        'waterTypes': ['Очищенная минерализованная вода'],
        'features': [
            'Производство — США',
            '6 ступеней глубокой очистки воды',
            'Насос для стабильной подачи давления',
            'Бак накопитель на 8 литров (всегда запас чистой воды)',
            'Евро-кран в комплекте',
            'Устраняет накипь, хлор, бактерии, тяжелые металлы',
            'Бесплатная доставка и профессиональная установка',
            '36 месяцев (3 года) полной гарантии',
            'Бесплатное сервисное обслуживание 15 лет'
        ],
        'oldPrice': 150000,
        'price': 75000,
        'discountPercent': 50,
        'monthlyKaspi': 6250,
        'monthlyHalyk': 3125,
        'badge': 'Супер цена',
        'pdfPage': 4
    },
    {
        'id': 'blue_tech',
        'folder': '02_Blue_Tech',
        'name': 'Фильтр BLUE TECH',
        'shortName': 'BLUE TECH',
        'origin': 'Германия',
        'originCode': 'DE',
        'flag': '🇩🇪',
        'category': 'tank',
        'categoryLabel': 'Классический с баком',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Немецкая мембрана обратного осмоса',
        'pump': 'Помпа для подачи давления',
        'faucet': 'Евро-кран',
        'waterTypes': ['Очищенная минерализованная вода'],
        'features': [
            'Производство — Германия',
            '6 ступеней очистки',
            'Помпа для подачи давления',
            'Бак накопитель на 8 литров',
            'Датчик защиты от протечки',
            'Евро-кран в комплекте',
            'Бесплатная доставка и установка',
            '36 месяцев гарантии + 15 лет сервиса'
        ],
        'oldPrice': 218000,
        'price': 109000,
        'discountPercent': 50,
        'monthlyKaspi': 9080,
        'monthlyHalyk': 4540,
        'badge': 'Немецкое качество',
        'pdfPage': 5
    },
    {
        'id': 'ro_h910',
        'folder': '03_RO-H910',
        'name': 'Фильтр RO - H910 (Alkaline Black)',
        'shortName': 'RO-H910 Alkaline Black',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'tank',
        'categoryLabel': 'Смарт с баком',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Корейская мембрана обратного осмоса',
        'pump': 'Встроенная помпа',
        'faucet': 'Двойной евро-кран',
        'waterTypes': ['Щелочная вода (pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — Южная Корея',
            '6 ступеней очистки',
            'Сенсорный дисплей управления',
            '2 вида воды: щелочная и минерализованная',
            'Бак накопитель на 8 литров',
            'Датчик антипотопа',
            'Индикатор ресурса картриджей',
            'Двойной кран для раздельной подачи'
        ],
        'oldPrice': 218000,
        'price': 109000,
        'discountPercent': 50,
        'monthlyKaspi': 9080,
        'monthlyHalyk': 4540,
        'badge': 'Стильный дизайн',
        'pdfPage': 6
    },
    {
        'id': 'alkaline_g75',
        'folder': '04_Alkaline_G75',
        'name': 'Фильтр G - 75 (Alkaline G75 White)',
        'shortName': 'Alkaline G-75',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'tank',
        'categoryLabel': 'Смарт с баком',
        'stages': 5,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Мембрана 75 GPD',
        'pump': 'Встроенная помпа',
        'faucet': 'Двойной кран',
        'waterTypes': ['Щелочная вода (pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — Южная Корея',
            '5 ступеней глубокой очистки',
            'Сенсорный дисплей управления',
            'Щелочная и минерализованная вода',
            'Бак накопитель на 8 литров',
            'Датчик антипотопа',
            'Индикатор замены картриджей',
            'Двойной кран в комплекте'
        ],
        'oldPrice': 218000,
        'price': 109000,
        'discountPercent': 50,
        'monthlyKaspi': 9080,
        'monthlyHalyk': 4540,
        'badge': 'Популярный выбор',
        'pdfPage': 7
    },
    {
        'id': 'jemmy_leon',
        'folder': '05_Jemmy_Leon',
        'name': 'Фильтр JEMMY LEON',
        'shortName': 'JEMMY LEON',
        'origin': 'Турция',
        'originCode': 'TR',
        'flag': '🇹🇷',
        'category': 'tank',
        'categoryLabel': 'Классический с баком',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Турецкая мембрана обратного осмоса',
        'pump': 'Датчик давления и насос',
        'faucet': 'Евро-кран',
        'waterTypes': ['Очищенная минерализованная вода'],
        'features': [
            'Производство — Турция',
            '6 ступеней очистки',
            'Датчик давления',
            'Бак накопитель на 8 литров',
            'Датчик антипотопа',
            'Евро-кран',
            '36 месяцев гарантии + 15 лет сервиса'
        ],
        'oldPrice': 240000,
        'price': 120000,
        'discountPercent': 50,
        'monthlyKaspi': 10000,
        'monthlyHalyk': 5000,
        'badge': 'Надежный корпус',
        'pdfPage': 8
    },
    {
        'id': 'alkaline_smart',
        'folder': '06_Alkaline_Smart',
        'name': 'Фильтр ALKALINE SMART',
        'shortName': 'Alkaline Smart',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'tank',
        'categoryLabel': 'Смарт с баком (Хит)',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Корейская смарт-мембрана',
        'pump': 'Интеллектуальная помпа',
        'faucet': 'Двойной смеситель с TDS индикатором',
        'waterTypes': ['Щелочная вода (pH+)', 'Фильтрованная вода'],
        'features': [
            'Производство — Южная Корея',
            '6 ступеней очистки — глубокая многоуровневая фильтрация',
            'Сенсорный дисплей управления',
            '2 вида воды: щелочная (pH+) и фильтрованная',
            'Бак накопитель на 8 литров',
            'Датчик антипотопа и датчик гидроудара',
            'Автоматическая промывка системы',
            'Двойной смеситель с показателем TDS и индикатором картриджей'
        ],
        'oldPrice': 300000,
        'price': 150000,
        'discountPercent': 50,
        'monthlyKaspi': 12500,
        'monthlyHalyk': 6250,
        'badge': 'ХИТ ПРОДАЖ',
        'pdfPage': 9
    },
    {
        'id': 'ravent_lux',
        'folder': '07_Ravent_Lux',
        'name': 'Фильтр RAVENT LUX',
        'shortName': 'RAVENT LUX',
        'origin': 'Турция',
        'originCode': 'TR',
        'flag': '🇹🇷',
        'category': 'tank',
        'categoryLabel': 'Классический с баком',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Премиум мембрана обратного осмоса',
        'pump': 'Насос для подачи давления',
        'faucet': 'Евро-кран',
        'waterTypes': ['Очищенная минерализованная вода'],
        'features': [
            'Производство — Турция',
            '6 ступеней очистки',
            'Насос для подачи давления',
            'Бак накопитель на 8 литров',
            'Датчик регулятор давления',
            'Датчик от протечки',
            'Евро-кран'
        ],
        'oldPrice': 340000,
        'price': 170000,
        'discountPercent': 50,
        'monthlyKaspi': 14160,
        'monthlyHalyk': 7080,
        'badge': 'Премиум Турция',
        'pdfPage': 10
    },
    {
        'id': 'ro_wt01',
        'folder': '08_RO-WT01',
        'name': 'Фильтр RO - WT 01',
        'shortName': 'RO-WT 01',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'tank',
        'categoryLabel': 'Смарт с баком',
        'stages': 5,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Корейская мембрана',
        'pump': 'Встроенный насос высокого давления',
        'faucet': 'Двойной кран с насосом',
        'waterTypes': ['Щелочная вода (pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — Южная Корея',
            '5 ступеней очистки',
            'Сенсорная панель управления',
            'Щелочная и очищенная вода',
            'Бак накопитель на 8 литров',
            'Двойной кран с насосом',
            '36 месяцев гарантии'
        ],
        'oldPrice': 360000,
        'price': 180000,
        'discountPercent': 50,
        'monthlyKaspi': 15000,
        'monthlyHalyk': 7500,
        'badge': 'Сенсорная панель',
        'pdfPage': 11
    },
    {
        'id': 'foura_600gpd',
        'folder': '09_FOURA_600GPD',
        'name': 'Фильтр FOURA 600 GPD (БЕЗ БАКА)',
        'shortName': 'FOURA 600 GPD (Флагман)',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'direct',
        'categoryLabel': 'Прямоточный без бака (Флагман)',
        'stages': 5,
        'tank': 'БЕЗ БАКА (прямоточная система 600 GPD)',
        'tankType': 'direct',
        'membrane': 'Полупромышленная мембрана 600 GPD (до 2200 л/сутки)',
        'pump': 'Интеллектуальный бустерный насос',
        'faucet': 'Фирменный двойной смеситель',
        'waterTypes': ['Щелочная вода (Турмалин pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — Южная Корея (Главный Флагман VODEL)',
            'Прямоточная фильтрация 600 GPD без накопительного бака',
            'Всегда свежая прохладная вода в секунду открытия крана (нет застоя)',
            'Сенсорная панель управления и TDS-дисплей качества в реальном времени',
            'Настоящая щелочная вода (турмалиновый картридж) и минерализованная',
            'Индикатор ресурса картриджей и автосамоочистка',
            'Датчик антипотопа и автоматический регулятор давления',
            'Ультракомпактный закрытый корпус (ширина всего 16 см)',
            'Минимальный сброс в дренаж (всего ~5 л/сутки)'
        ],
        'oldPrice': 370000,
        'price': 185000,
        'discountPercent': 50,
        'monthlyKaspi': 15400,
        'monthlyHalyk': 7700,
        'badge': 'ГЛАВНЫЙ ФЛАГМАН',
        'pdfPage': 12
    },
    {
        'id': 'wt02_direct',
        'folder': '10_WT-02_Direct',
        'name': 'Фильтр WT-02 БЕЗ БАКА',
        'shortName': 'WT-02 Прямоточный',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'direct',
        'categoryLabel': 'Прямоточный без бака',
        'stages': 6,
        'tank': 'БЕЗ БАКА (прямой поток 600 GPD)',
        'tankType': 'direct',
        'membrane': 'Мембрана на 600 галлон (600 GPD)',
        'pump': 'Высокопроизводительная помпа',
        'faucet': 'Двойной кран',
        'waterTypes': ['Щелочная вода (pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — Южная Корея',
            'Мембрана на 600 галлон — мгновенная подача чистой воды',
            '6 ступеней глубокой очистки',
            'Сенсорный дисплей управления с TDS',
            'Датчик антипотопа и датчик давления',
            'Щелочная и минерализованная вода',
            '36 месяцев гарантии'
        ],
        'oldPrice': 500000,
        'price': 250000,
        'discountPercent': 50,
        'monthlyKaspi': 20830,
        'monthlyHalyk': 10415,
        'badge': '600 GPD Прямоток',
        'pdfPage': 13
    },
    {
        'id': 'ar01a',
        'folder': '11_AR-01A',
        'name': 'Фильтр AR-01A',
        'shortName': 'AR-01A',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'tank',
        'categoryLabel': 'Смарт с баком (Премиум)',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Корейская мембрана премиум-класса',
        'pump': 'Интеллектуальная помпа',
        'faucet': 'Двойной кран',
        'waterTypes': ['Щелочная вода (pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — Южная Корея',
            '6 ступеней очистки',
            'Двойной кран в комплекте',
            'Бак накопитель на 8 литров',
            'Датчик антипотопа и давления',
            'Щелочная и минерализованная вода',
            '36 месяцев гарантии + 15 лет сервиса'
        ],
        'oldPrice': 500000,
        'price': 250000,
        'discountPercent': 50,
        'monthlyKaspi': 20830,
        'monthlyHalyk': 10415,
        'badge': 'Премиум Корея',
        'pdfPage': 14
    },
    {
        'id': 'ro_wt02_usa',
        'folder': '12_RO-WT02_USA',
        'name': 'Фильтр RO WT -02 (USA)',
        'shortName': 'RO WT-02 USA',
        'origin': 'США',
        'originCode': 'USA',
        'flag': '🇺🇸',
        'category': 'tank',
        'categoryLabel': 'Смарт с баком (США)',
        'stages': 6,
        'tank': 'Бак накопитель на 8 литров',
        'tankType': 'tank',
        'membrane': 'Американская мембрана Filmtec/RO',
        'pump': 'Насос высокого давления',
        'faucet': 'Двойной кран',
        'waterTypes': ['Щелочная вода (pH+)', 'Минерализованная вода'],
        'features': [
            'Производство — США',
            '6 ступеней очистки',
            'Сенсорный экран управления с TDS',
            'Бак накопитель на 8 литров',
            'Датчик антипотопа и регулятор давления',
            'Щелочная и минерализованная вода',
            'Двойной кран в комплекте'
        ],
        'oldPrice': 500000,
        'price': 250000,
        'discountPercent': 50,
        'monthlyKaspi': 20830,
        'monthlyHalyk': 10415,
        'badge': 'Премиум США',
        'pdfPage': 15
    },
    {
        'id': 'hydrogen_o1',
        'folder': '13_Hydrogen_O1',
        'name': 'Фильтр HYDROGEN O1 (Водородная вода)',
        'shortName': 'HYDROGEN O1',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'hydrogen',
        'categoryLabel': 'Водородный Премиум (H2)',
        'stages': 7,
        'tank': 'Производительность 375 л/сутки',
        'tankType': 'direct',
        'membrane': 'Корейская водородная генерационная мембрана',
        'pump': 'Интеллектуальная система электролиза и давления',
        'faucet': 'Двойной премиум смеситель',
        'waterTypes': ['Водородная вода (H2)', 'Щелочная вода (pH+)'],
        'features': [
            'Производство — Южная Корея',
            '7 ступеней глубокой фильтрации и обогащения водородом',
            'Генерация молекулярного водорода (H2) — сильнейший природный антиоксидант',
            'Щелочная и водородная вода для здоровья, красоты и детокса',
            'Производительность: 375 литров в сутки',
            'Сенсорный дисплей управления и индикации',
            'Двойной смеситель',
            '36 месяцев гарантии + 15 лет сервиса'
        ],
        'oldPrice': 800000,
        'price': 400000,
        'discountPercent': 50,
        'monthlyKaspi': 33330,
        'monthlyHalyk': 16665,
        'badge': 'ВОДОРОДНАЯ ВОДА H2',
        'pdfPage': 16
    },
    {
        'id': 'hydrogen_o2',
        'folder': '14_Hydrogen_O2',
        'name': 'Фильтр HYDROGEN O2 (Водородная вода)',
        'shortName': 'HYDROGEN O2',
        'origin': 'Южная Корея',
        'originCode': 'KR',
        'flag': '🇰🇷',
        'category': 'hydrogen',
        'categoryLabel': 'Водородный Премиум (H2)',
        'stages': 5,
        'tank': 'Бак на 2 литра встроен внутри корпуса',
        'tankType': 'tank',
        'membrane': 'Водородно-осмотическая система',
        'pump': 'Компактная водородная помпа',
        'faucet': 'Двойной кран с индикатором',
        'waterTypes': ['Водородная вода (H2)', 'Щелочная вода (pH+)'],
        'features': [
            'Производство — Южная Корея',
            '5 ступеней очистки и водородной ионизации',
            'Щелочная и водородная вода',
            'Сенсорный дисплей управления',
            'Компактный встроенный бак на 2 литра внутри корпуса',
            'Датчик антипотопа',
            'Двойной кран с индикатором',
            '36 месяцев гарантии'
        ],
        'oldPrice': 800000,
        'price': 400000,
        'discountPercent': 50,
        'monthlyKaspi': 33330,
        'monthlyHalyk': 16665,
        'badge': 'ВОДОРОДНАЯ ВОДА H2',
        'pdfPage': 17
    },
    {
        'id': 'semi_400g',
        'folder': '15_SemiIndustrial_400G',
        'name': 'Фильтр 400G Галлон (Полупромышленный)',
        'shortName': '400G Полупромышленный',
        'origin': 'Германия',
        'originCode': 'DE',
        'flag': '🇩🇪',
        'category': 'commercial',
        'categoryLabel': 'Полупромышленный (Для бизнеса / Кафе)',
        'stages': 6,
        'tank': 'Большой накопительный бак на 40 литров',
        'tankType': 'tank',
        'membrane': 'Полупромышленная мембрана 400 GPD (до 1500 л/сутки)',
        'pump': 'Мощный насос подачи высокого давления',
        'faucet': 'Евро-кран высокой пропускной способности',
        'waterTypes': ['Глубоко очищенная питьевая вода'],
        'features': [
            'Изготовлен по немецким технологиям',
            '6 ступеней очистки',
            'Насос для подачи давления',
            'Бак накопитель на 40 литров',
            'Предназначен для кафе, ресторанов, кофеен, офисов и столовых',
            'Евро-кран в комплекте',
            '36 месяцев гарантии + 15 лет сервиса'
        ],
        'oldPrice': 620000,
        'price': 310000,
        'discountPercent': 50,
        'monthlyKaspi': 25830,
        'monthlyHalyk': 12915,
        'badge': 'ДЛЯ КАФЕ И ОФИСОВ',
        'pdfPage': 18
    },
    {
        'id': 'semi_eco_ro4',
        'folder': '16_SemiIndustrial_ECO_RO4',
        'name': 'Фильтр ECO RO-4 (Полупромышленный)',
        'shortName': 'ECO RO-4 Полупромышленный',
        'origin': 'Германия',
        'originCode': 'DE',
        'flag': '🇩🇪',
        'category': 'commercial',
        'categoryLabel': 'Полупромышленный (Для бизнеса / Общепита)',
        'stages': 6,
        'tank': 'Большой накопительный бак на 40 литров',
        'tankType': 'tank',
        'membrane': 'Усиленная полупромышленная станция обратного осмоса',
        'pump': 'Промышленный насос подачи давления',
        'faucet': 'Евро-кран повышенной производительности',
        'waterTypes': ['Глубоко очищенная питьевая вода высокой производительности'],
        'features': [
            'Изготовлен по немецким технологиям',
            '6 ступеней очистки с массивными колбами предфильтрации',
            'Насос для подачи давления',
            'Бак накопитель на 40 литров',
            'Предназначен для кафе, ресторанов, столовых и предприятий',
            'Евро-кран в комплекте',
            '36 месяцев гарантии + 15 лет сервиса'
        ],
        'oldPrice': 900000,
        'price': 450000,
        'discountPercent': 50,
        'monthlyKaspi': 37500,
        'monthlyHalyk': 18750,
        'badge': 'МОЩНАЯ СТАНЦИЯ 40Л',
        'pdfPage': 19
    }
]

pdf_path = os.path.join(base_vodel, 'VODEL 19.08 50 процентов скидка.pdf')
doc = fitz.open(pdf_path)

for m in models:
    folder_path = os.path.join(base_vodel, m['folder'])
    os.makedirs(folder_path, exist_ok=True)

    page_idx = m['pdfPage'] - 1
    page = doc[page_idx]
    
    # Save high quality page render
    pix = page.get_pixmap(dpi=200)
    page_filename = f"{m['id']}_page.png"
    asset_path = os.path.join(public_assets, page_filename)
    pix.save(asset_path)
    
    # Also save poster in folder
    pix.save(os.path.join(folder_path, f"{m['id']}_poster.png"))
    m['image'] = f"/catalog_assets/{page_filename}"

    # Write info.txt
    features_list = '\n'.join([f"- {f}" for f in m['features']])
    water_str = ', '.join(m['waterTypes'])
    info_text = f"""# МОДЕЛЬ: {m['name']}
Страна производства: {m['origin']} {m['flag']}
Категория: {m['categoryLabel']}
Цена со скидкой 50%: {m['price']:,} ₸ (старая цена: {m['oldPrice']:,} ₸)
Рассрочка: Kaspi 0-0-12 (~{m['monthlyKaspi']:,} ₸/мес) | Halyk/Freedom 0-0-24 (~{m['monthlyHalyk']:,} ₸/мес)
Гарантия: 36 месяцев (3 года)
Сервисное обслуживание: 15 лет бесплатного сервиса (выезд и работа мастера)

Ступени очистки: {m['stages']}
Тип системы: {m['tank']}
Мембрана: {m['membrane']}
Помпа / Насос: {m['pump']}
Кран: {m['faucet']}
Виды воды: {water_str}

Ключевые преимущества:
{features_list}

---
ПАПКА ДЛЯ МАТЕРИАЛОВ:
В эту папку вы можете загружать:
1. Живые фотографии установленного фильтра
2. Короткие видео-демонстрации работы
3. Фотографии под мойкой
4. Отзывы клиентов
Эти материалы бот сможет отправлять клиентам при консультации!
"""
    with open(os.path.join(folder_path, 'info.txt'), 'w', encoding='utf-8') as f:
        f.write(info_text)

# Copy existing FOURA, Alkaline, etc. media into their numbered folders for convenience
foura_existing = os.path.join(base_vodel, 'FOURA')
foura_new = os.path.join(base_vodel, '09_FOURA_600GPD')
if os.path.exists(foura_existing):
    for item in os.listdir(foura_existing):
        s = os.path.join(foura_existing, item)
        d = os.path.join(foura_new, item)
        if not os.path.exists(d) and os.path.isfile(s):
            shutil.copy2(s, d)

alkaline_existing = os.path.join(base_vodel, 'Alkaline G75')
alkaline_new = os.path.join(base_vodel, '04_Alkaline_G75')
if os.path.exists(alkaline_existing):
    for item in os.listdir(alkaline_existing):
        s = os.path.join(alkaline_existing, item)
        d = os.path.join(alkaline_new, item)
        if not os.path.exists(d) and os.path.isfile(s):
            shutil.copy2(s, d)

smart_existing = os.path.join(base_vodel, 'Alkaline Smart')
smart_new = os.path.join(base_vodel, '06_Alkaline_Smart')
if os.path.exists(smart_existing):
    for item in os.listdir(smart_existing):
        s = os.path.join(smart_existing, item)
        d = os.path.join(smart_new, item)
        if not os.path.exists(d) and os.path.isfile(s):
            shutil.copy2(s, d)

ar01_existing = os.path.join(base_vodel, 'AR-01 filter')
ar01_new = os.path.join(base_vodel, '11_AR-01A')
if os.path.exists(ar01_existing):
    for item in os.listdir(ar01_existing):
        s = os.path.join(ar01_existing, item)
        d = os.path.join(ar01_new, item)
        if not os.path.exists(d) and os.path.isfile(s):
            shutil.copy2(s, d)

# Also create folders for Faucets, Certificates, and Warranty
faucets_folder = os.path.join(base_vodel, '17_Дизайны_кранов_и_смесителей')
certs_folder = os.path.join(base_vodel, '18_Сертификаты_и_Гарантия')
os.makedirs(faucets_folder, exist_ok=True)
os.makedirs(certs_folder, exist_ok=True)

# Copy certificate / faucet files into those folders
if os.path.exists(os.path.join(base_vodel, 'Каталог кранов.pdf')):
    shutil.copy(os.path.join(base_vodel, 'Каталог кранов.pdf'), os.path.join(faucets_folder, 'Каталог кранов.pdf'))
if os.path.exists(os.path.join(base_vodel, 'Гарантия.pdf')):
    shutil.copy(os.path.join(base_vodel, 'Гарантия.pdf'), os.path.join(certs_folder, 'Гарантия.pdf'))

# Export catalog JSON to public
with open(os.path.join(base_dir, 'public', 'catalog_products.json'), 'w', encoding='utf-8') as f_json:
    json.dump(models, f_json, ensure_ascii=False, indent=2)

print(f"Successfully processed all {len(models)} models, created folders and generated public/catalog_products.json")

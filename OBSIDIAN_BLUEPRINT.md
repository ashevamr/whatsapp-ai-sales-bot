# 💎 VODEL AI SALES BOT (AKBOTA) — OBSIDIAN BLUEPRINT & KNOWLEDGE GRAPH

This blueprint serves as the central documentation, knowledge graph, and interaction manual for your WhatsApp AI Sales Bot **Akbota** (operating for VODEL in Kazakhstan).

---

## 🗺️ Visual Knowledge Graph (Mermaid Architecture)

Below is the complete flowchart and decision matrix of how **Akbota** processes every incoming WhatsApp message, qualifies leads, handles objections, and routes alerts to your second phone (**Phone B**).

```mermaid
flowchart TD
    Start([📥 New Customer Message on WhatsApp - Phone A]) --> Greeting[🤖 Send Time-based Greeting & Ask for City]
    
    Greeting --> CityReply{Client replies with City?}
    CityReply -->|No reply for 3 mins| FollowUp[⏰ Send 3-min Trigger Message]
    FollowUp --> CityReply
    
    CityReply -->|Replies City| CheckCity{Is city a warehouse hub?<br>Astana, Almaty, Shymkent, Atyrau}
    
    CheckCity -->|Yes - Warehouse City| ScenarioA[Say: Same-day installation available!<br>Ask: Tank or Tankless preference?]
    CheckCity -->|No - Other City| ScenarioB[Ask: Tank or Tankless preference?]
    
    ScenarioA --> BranchChoice{Client Response}
    ScenarioB --> BranchChoice
    
    BranchChoice -->|Wants explanation| PitchDifference[⚡ Send Detailed Explanation:<br>75 GPD Tank vs 600 GPD Direct-Flow]
    BranchChoice -->|Specified Tank| PresentG75[📦 Present Alkaline G75<br>109k cash / 120k credit]
    BranchChoice -->|Specified Tankless| PresentFOURA[⚡ Present FOURA Flagship<br>185k promo price]
    BranchChoice -->|Declined explanation| PresentBoth[Offer promo models G75 & FOURA]
    
    PitchDifference --> ModelSelection{Model Choice}
    ModelSelection -->|Tank| PresentG75
    ModelSelection -->|Tankless| PresentFOURA
    
    PresentG75 --> Closing[Closing Question: Kaspi 0-0-12 or Cash?]
    PresentFOURA --> Closing
    
    Closing --> ObjectionCheck{Customer Reply / Request}
    
    ObjectionCheck -->|Asks for Discount| RuleDiscount[⛔ Politely decline: Fixed promo prices include 3yr warranty & 15yr service]
    ObjectionCheck -->|Asks for Office/Corporate| RuleB2C[⛔ Politely decline: We strictly install residential filters for homes]
    ObjectionCheck -->|Water bottles objection| PitchBottles[Explain hidden costs, plastic risks, physical labor]
    ObjectionCheck -->|Family decision - Сыйластық| PitchFamily[Respect family decision & offer visual materials]
    
    ObjectionCheck -->|Unknown Question / Custom Request| TriggerTakeover[🚨 TRIGGER HUMAN TAKEOVER]
    
    TriggerTakeover --> SendNotice[🤖 Tell client: One moment, connecting senior specialist...]
    SendNotice --> AlertPhoneB[📲 Send WhatsApp Alert to Phone B & Dashboard]
    AlertPhoneB --> HumanMode[👤 Freeze AI & Enable Manual Mode]
```

---

## 📚 Best Interaction Scenarios (English Reference & Russian Bot Text)

### 🔹 Scenario 1: The Ideal Fast Sale (Direct-Flow FOURA)
* **Context:** Customer in Astana looking for a modern filter under the sink.

| Speaker | Language | Dialogue Content |
| :--- | :--- | :--- |
| 👤 **Customer** | Russian | Здравствуйте! Хочу поставить фильтр под раковину. |
| 🤖 **Akbota** | Russian | Добрый день! Вас приветствует компания “VODEL”🇰🇿 💧<br>Доставка, установка по всему Казахстану✔️<br>Гарантия 3 года, бесплатное сервисное обслуживание 15 лет<br>Подскажите, с какого города вы обращаетесь? |
| 🇬🇧 *(English summary)* | English | *Greeting + Company introduction + Ask for City.* |
| 👤 **Customer** | Russian | Астана |
| 🤖 **Akbota** | Russian | Отлично, можем установить вам фильтр день в день с бесплатной доставкой и установкой. Подскажите вы хотели фильтр с бочком или без бочка? Могу объяснить вам разницу, если для вас в новинку😊 |
| 🇬🇧 *(English summary)* | English | *Confirms same-day delivery in Astana. Asks Tank vs Tankless.* |
| 👤 **Customer** | Russian | Давайте без бака, чтобы место не занимал. |
| 🤖 **Akbota** | Russian | Отличный выбор! Для этого идеально подходит наш флагман **FOURA** (Южная Корея)⚡ Это ультракомпактный смарт-фильтр шириной всего 16 см. Он очищает воду прямо в секунду открытия крана со скоростью 600 галлон в сутки.<br><br>В нем есть TDS-дисплей контроля качества воды и система «антипотоп». Сейчас идет акционная цена 185 000 тг вместо 420 000 тг. В стоимость входит 3 года полной гарантии и 15 лет бесплатного сервиса!<br><br>Подскажите, вам удобнее оплатить наличными мастеру или оформить рассрочку через Kaspi 0-0-12? |
| 🇬🇧 *(English summary)* | English | *Presents FOURA specs, promo price (185k KZT), warranty, and closes with payment question.* |

---

### 🔹 Scenario 2: Handling Discount Requests (Strict B2C Defense)
* **Context:** Customer trying to negotiate price down.

| Speaker | Language | Dialogue Content |
| :--- | :--- | :--- |
| 👤 **Customer** | Russian | А за 150 000 тг отдадите FOURA прямо сегодня? |
| 🤖 **Akbota** | Russian | Мы работаем строго по фиксированным акционным ценам от завода-изготовителя, чтобы гарантировать Вам 3 года полной гарантии и 15 лет бесплатного сервисного обслуживания. Модель FOURA сейчас отдается по себестоимости первой партии за 185 000 тг.<br><br>Подскажите, рассматриваете ли вы комфортную рассрочку через Kaspi 0-0-12 без переплат? |
| 🇬🇧 *(English summary)* | English | *Refuses discount politely, justifies value (guarantee + 15yr service), pivots back to Kaspi installments.* |

---

### 🔹 Scenario 3: Rejecting Corporate/Office Requests
* **Context:** A company manager looking to buy 5 filters for an office.

| Speaker | Language | Dialogue Content |
| :--- | :--- | :--- |
| 👤 **Customer** | Russian | Здравствуйте, мы организация, нам нужно 5 фильтров в офисы по безналу. |
| 🤖 **Akbota** | Russian | Мы работаем только с физическими лицами и устанавливаем бытовые премиум-фильтры для дома по фиксированной стоимости. Позвольте уточнить, рассматриваете ли вы фильтр для вашего дома? |
| 🇬🇧 *(English summary)* | English | *Rejects B2B request cleanly, redirects to personal residential filter sales.* |

---

### 🔹 Scenario 4: Smart Human Takeover (Alert to Phone B)
* **Context:** Customer asks an unscripted technical plumbing question.

| Speaker | Language | Dialogue Content |
| :--- | :--- | :--- |
| 👤 **Customer** | Russian | А можно ваш фильтр подключить к моему холодильнику Samsung со льдогенератором? |
| 🤖 **Akbota** | Russian | Минутку, сейчас я подключу нашего старшего специалиста для уточнения этого вопроса! ⏱️ |
| 📲 **System Alert** | **To Phone B** | `⚠️ [ATTENTION] Client (+7701xxx) asked an unscripted question: "Can filter connect to Samsung fridge maker?". AI frozen.` |

---

## ⚙️ Obsidian System Knowledge Matrix (Cheat Sheet)

### 🏬 Warehouses & Logistics Rules
* **Hub Cities (Same-Day Install):** Astana, Almaty, Shymkent, Atyrau.
* **Other Cities (Intercity Shipping):** Shipped from Astana/Almaty. Requires 10,000 KZT advance payment via Kaspi. *(Note: AI never mentions prepayment until final purchase decision).*
* **Villages / Outskirts (Аулы / Поселки):** Free for suburbs of hub/warehouse cities (e.g., Kosshy, Talgar, Kaskelen). Additional fixed +10,000 KZT fee applies only to remote travel in intercity areas.

### 🛡️ Product Comparison Cheat Sheet
| Feature | Alkaline G75 🛢️ | FOURA Flagship ⚡ |
| :--- | :--- | :--- |
| **Type** | Tank System (8 Liters) | Direct-Flow (Tankless) |
| **Technology** | South Korea / China assembly | South Korea (100% Original) |
| **Speed** | 75 GPD (280 L/day) | 600 GPD (2200 L/day) |
| **Water Types** | Dual Tap (Mineralized & Alkaline) | Dual Tap (Higher Alkaline stability) |
| **Price** | 109,000 KZT cash / 120,000 KZT credit | 185,000 KZT promo (Next batch 420k) |
| **Maintenance** | Cartridges every 6–9 mos | Auto self-cleaning (1 per year) |
| **Dimensions** | Standard under-sink + tank | Ultra-compact (16 cm width) |

---

## 🚀 Final System Verification
* **Port:** `8888`
* **Workflow:** Gemini 2.5 Flash (`ai_workflow.js`)
* **Database File:** [database.md](file:///C:/Users/alber/Downloads/sales%20bot/database.md)
* **Dashboard:** `http://localhost:8888`

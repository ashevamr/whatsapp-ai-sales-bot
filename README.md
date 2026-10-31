# WhatsApp AI Sales Bot — фундамент для ботов продаж

> **EN:** A production WhatsApp sales assistant (Node.js · whatsapp-web.js · Google Gemini) that has been answering real customers of a water-filter retailer in Kazakhstan. It runs as a supervised Windows service, survives disconnects without losing or duplicating messages, writes like a human manager (short bubbles, typing delays, no repeats, ru/kk/en) and never invents prices: commercial facts, media and checkout are controlled by deterministic code, not by the LLM. Includes an operator dashboard with live chats, human takeover, follow-ups and sales reports, and ~30 test files that run the real inbound handler without sending messages.
>
> The design principles are written up in [docs/PRINCIPLES.md](docs/PRINCIPLES.md); how to reuse the engine for another business is in [docs/NEW_BOT_GUIDE.md](docs/NEW_BOT_GUIDE.md).

Бот-консультант в WhatsApp для продажи фильтров для воды (Казахстан). Над ним работали несколько месяцев. За это время в код ушли решения конкретных проблем, найденных на живых клиентах:

- бот не лагает и не теряет сообщения при обрывах связи;
- не отвечает дважды на одно и то же;
- пишет как живой менеджер, а не как робот;
- не выдумывает цены и условия;
- не присылает материалы не той модели;
- вовремя передаёт диалог человеку.

Этот репозиторий — **фундамент** для следующих ботов. Принципы описаны в [docs/PRINCIPLES.md](docs/PRINCIPLES.md), а перенос на другой бизнес — в [docs/NEW_BOT_GUIDE.md](docs/NEW_BOT_GUIDE.md).

## Возможности

- **WhatsApp:** ответы клиентам через `whatsapp-web.js` (подключение по QR, как WhatsApp Web).
- **ИИ:** ответы генерирует Google Gemini. Цепочка моделей с таймаутом на каждую и детерминированный запасной ответ, если модель недоступна.
- **Голосовые:** распознаются. Если голосовое не удалось расшифровать, бот не отвечает наугад, а ставит диалог на паузу для менеджера.
- **Реклама:** бот определяет, с какого рекламного объявления пришёл клиент, и начинает разговор с этой модели.
- **Материалы по моделям:** фото, PDF и видео отправляются по строгим правилам, только той модели, о которой идёт речь.
- **Передача человеку:**
  - по ключевым ситуациям (оформление, сервис, нестандартный вопрос);
  - когда менеджер сам пишет с телефона;
  - кнопкой в панели.
- **Режимы автоматизации:** `paused` / `new_leads_only` / `all`. Старые чаты при запуске защищены от автоответов.
- **Веб-панель** (`http://localhost:8888`):
  - чаты в реальном времени (WebSocket), ручные ответы, статус подключения;
  - продажи, ежедневный отчёт владельцу;
  - подсказки для повторного касания, анализ успешных продаж.
- **Надёжность:**
  - супервизор перезапускает упавший процесс;
  - бот сам переподключается к WhatsApp с паузами между попытками;
  - журнал входящих на диске защищает от двойных ответов;
  - сообщения, пришедшие во время переподключения, ставятся в очередь (подробности — в [RELIABILITY.md](RELIABILITY.md)).

## Стек

Node.js 18+, Express + express-ws, whatsapp-web.js (Puppeteer/Chromium), `@google/generative-ai`, nodemon (для разработки), Tailwind (для старой копии каталога).

## Структура

| Файл / папка | Назначение |
|---|---|
| `server.js` | Ядро: WhatsApp-клиент, обработка входящих, очереди, отправка ответов и медиа, передача человеку, API панели |
| `ai_workflow.js` | Сборка промпта, вызов Gemini, детерминированные ответы, запасные ответы |
| `commercial_facts.js` | **Единственный источник цен, рассрочки, гарантий, акций, логистики** |
| `conversation_safety.js` | Правила формы ответа, анти-повторы, защита оформления заказа |
| `bot_reliability.js` | Таймауты, журнал входящих, повторная обработка после обрыва |
| `automation_safety.js`, `inbound_message_guard.js`, `automated_outbound_guard.js` | Когда боту можно отвечать; фильтр групп/статусов/своих сообщений; распознавание эха собственных отправок |
| `attachment_safety.js` | Какие материалы какой модели можно отправить |
| `voice_safety.js` | Распознавание голосовых и пауза при неразборчивой речи |
| `ad_context.js`, `native_business_greeting.js` | Контекст рекламы и шаблонные приветствия WhatsApp Business |
| `follow_up_suggestions.js`, `alkaline_silence_followup.js` | Повторные касания молчащих клиентов |
| `daily_sales_report.js`, `successful_sales_analysis.js` | Отчёт по продажам и разбор успешных диалогов |
| `scripts/supervise_bot.js`, `scripts/start_bot.ps1` | Супервизор (один процесс бота, перезапуск, watchdog) и автозапуск в Windows |
| `public/` | Веб-панель оператора (`index.html`, `app.js`) и старая копия каталога |
| `Vodel content/*/info.txt` | Карточки моделей (фото/видео хранятся только локально, в git их нет) |
| `vodel.txt`, `database.md`, `obsidian/`, `OBSIDIAN_BLUEPRINT.md` | Исходный скрипт продаж и база знаний (историческая; в промпт сейчас не подаётся) |
| `test_*.js` | Тесты: безопасность, надёжность, сценарии, форматы ответов, каталог |

## Запуск

```bash
npm install
cp .env.example .env            # заполнить GEMINI_API_KEY и SUPERVISOR_PHONE
cp examples/bot_runtime_config.example.json bot_runtime_config.json
npm start                       # супервизор + бот (продакшен)
```

Откройте `http://localhost:8888`, отсканируйте QR в WhatsApp («Связанные устройства») и включите режим автоответов в панели. По умолчанию бот стоит на паузе.

`npm run dev` (nodemon) — только для разработки, не для боевой сессии WhatsApp.

## Тесты

```bash
npm run test:safety   # полный набор: надёжность, безопасность, сценарии, каталог
```

Тесты запускают настоящий обработчик входящих на изолированном адаптере и **не отправляют сообщений в WhatsApp**.

## Что не хранится в репозитории

Ключи (`.env`), сессия WhatsApp (`.wwebjs_auth/`), переписки и данные клиентов (`chats_store.json`, `sales_store.json`, `analysis/` и т.д.), логи, медиафайлы товаров. Всё это перечислено в [.gitignore](.gitignore).

## Связанный проект

Публичный каталог моделей (из него клиент выбирает модели и переходит в WhatsApp с готовым сообщением) — отдельный репозиторий `catalog-vodel`.

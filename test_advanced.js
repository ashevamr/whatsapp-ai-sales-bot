require('dotenv').config();
const workflow = require('./ai_workflow.js');

async function runTest() {
  console.log("=====================================================");
  console.log("🧪 СИМУЛЯЦИЯ: СЛОЖНЫЕ СЦЕНАРИИ (IDK, ПЕРЕКЛЮЧЕНИЕ МОДЕЛЕЙ, МЕЖГОРОД)");
  console.log("=====================================================\n");

  let history = [];

  // ШАГ 1
  let msg1 = 'Hi! I need a filter.';
  console.log("👤 КЛИЕНТ: " + msg1);
  let reply1 = await workflow.generateResponse(history, msg1);
  console.log("🤖 ИИ 1:\n" + reply1 + "\n");
  history.push({ sender: 'user', text: msg1 });
  history.push({ sender: 'ai', text: reply1 });

  // ШАГ 2
  let msg2 = 'Almaty';
  console.log("👤 КЛИЕНТ: " + msg2);
  let reply2 = await workflow.generateResponse(history, msg2);
  console.log("🤖 ИИ 2:\n" + reply2 + "\n");
  history.push({ sender: 'user', text: msg2 });
  history.push({ sender: 'ai', text: reply2 });

  // ШАГ 3
  let msg3 = 'whats the diff?';
  console.log("👤 КЛИЕНТ: " + msg3);
  let reply3 = await workflow.generateResponse(history, msg3);
  console.log("🤖 ИИ 3:\n" + reply3 + "\n");
  history.push({ sender: 'user', text: msg3 });
  history.push({ sender: 'ai', text: reply3 });

  // ШАГ 4 (User says ok to photos)
  let msg4 = 'ok show me';
  console.log("👤 КЛИЕНТ: " + msg4);
  let reply4 = await workflow.generateResponse(history, msg4);
  console.log("🤖 ИИ 4:\n" + reply4 + "\n");
  history.push({ sender: 'user', text: msg4 });
  history.push({ sender: 'ai', text: reply4 });

  // ШАГ 5: IDK YET TEST
  console.log("\n--- ТЕСТ 1: КЛИЕНТ ГОВОРИТ 'НЕ ЗНАЮ' (IDK YET) ---");
  let msg5 = 'I dont know yet, both look good.';
  console.log("👤 КЛИЕНТ: " + msg5);
  let reply5 = await workflow.generateResponse(history, msg5);
  console.log("🤖 ИИ (IDK Ответ):\n" + reply5 + "\n");
  history.push({ sender: 'user', text: msg5 });
  history.push({ sender: 'ai', text: reply5 });

  // ШАГ 6: КЛИЕНТ ВЫБРАЛ FOURA
  console.log("\n--- ТЕСТ 2: ВЫБРАЛ FOURA ---");
  let msg6 = 'I think I will go with Foura.';
  console.log("👤 КЛИЕНТ: " + msg6);
  let reply6 = await workflow.generateResponse(history, msg6);
  console.log("🤖 ИИ (Foura Ответ):\n" + reply6 + "\n");
  history.push({ sender: 'user', text: msg6 });
  history.push({ sender: 'ai', text: reply6 });

  // ШАГ 7: ПЕРЕДУМАЛ И СПРАШИВАЕТ ПРО ALKALINE (Без спама!)
  console.log("\n--- ТЕСТ 3: ВОПРОС ПРО ALKALINE ---");
  let msg7 = 'Wait, how much is Alkaline again and how often do I change filters?';
  console.log("👤 КЛИЕНТ: " + msg7);
  let reply7 = await workflow.generateResponse(history, msg7);
  console.log("🤖 ИИ (Alkaline вопрос):\n" + reply7 + "\n");
  history.push({ sender: 'user', text: msg7 });
  history.push({ sender: 'ai', text: reply7 });

  // ШАГ 8: ВВОД ДАННЫХ ДЛЯ ЗАКАЗА И СМЕСИТЕЛЬ (UPSELL)
  console.log("\n--- ТЕСТ 4: СБОР ДАННЫХ (UPSELL КРАНА) ---");
  let msg8 = 'Ok I will take Foura. My name is Abay, Abay 15, apt 20. Tomorrow at 15:00.';
  console.log("👤 КЛИЕНТ: " + msg8);
  let reply8 = await workflow.generateResponse(history, msg8);
  console.log("🤖 ИИ (Установка / Смеситель):\n" + reply8 + "\n");
  history.push({ sender: 'user', text: msg8 });
  history.push({ sender: 'ai', text: reply8 });

  // ШАГ 9: МЕЖГОРОД ТЕСТ (Проверка Kaspi 10k)
  console.log("\n--- ТЕСТ 5: МЕЖГОРОД (АУЛ / ДАЛЬНИЙ ГОРОД) ---");
  let historyIntercity = [
    { sender: 'user', text: 'Hi! I want a filter.' },
    { sender: 'ai', text: 'Hello! What city?' },
    { sender: 'user', text: 'Balkhash' },
    { sender: 'ai', text: 'Great! Tank or tankless?' },
    { sender: 'user', text: 'Tankless Foura. Sending my address: Balkhash, Mira 10. Tomorrow.' }
  ];
  let replyIntercity = await workflow.generateResponse(historyIntercity, 'Can I pay on delivery?');
  console.log("🤖 ИИ (Ответ про Межгород / Kaspi):\n" + replyIntercity + "\n");


}

runTest();

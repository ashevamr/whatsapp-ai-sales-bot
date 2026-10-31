require('dotenv').config();
const workflow = require('./ai_workflow.js');

async function runFlowTest() {
  console.log("=====================================================");
  console.log("🧪 СИМУЛЯЦИЯ ПОЛНОЙ ВОРОНКИ ПРОДАЖ (ОТЛАДКА ПОТОКА)");
  console.log("=====================================================\n");

  let history = [
    { sender: 'user', text: 'Hi! Can I get more details about this?' }
  ];

  // ШАГ 1
  let reply1 = await workflow.generateResponse(history, history[0].text);
  console.log("👤 КЛИЕНТ: " + history[0].text);
  console.log("🤖 ИИ (Ответ 1):\n" + reply1 + "\n");
  history.push({ sender: 'ai', text: reply1 });

  // Проверка 1: Должен спросить город
  if (!reply1.toLowerCase().includes('город') && !reply1.toLowerCase().includes('city')) {
    console.log("❌ ОШИБКА ШАГА 1: ИИ не спросил город!");
  } else {
    console.log("✅ УСПЕХ ШАГА 1: Город запрошен.");
  }

  // ШАГ 2
  let msg2 = 'Kosshy';
  console.log("-----------------------------------------------------");
  console.log("👤 КЛИЕНТ: " + msg2);
  let reply2 = await workflow.generateResponse(history, msg2);
  console.log("🤖 ИИ (Ответ 2):\n" + reply2 + "\n");
  history.push({ sender: 'user', text: msg2 });
  history.push({ sender: 'ai', text: reply2 });

  // Проверка 2: НЕ должен называть цены. Должен предложить объяснить разницу.
  if (reply2.includes('185') || reply2.includes('109')) {
    console.log("❌ ОШИБКА ШАГА 2: ИИ назвал цены слишком рано!");
  } else {
    console.log("✅ УСПЕХ ШАГА 2: Цены скрыты.");
  }
  if (!reply2.toLowerCase().includes('разниц') && !reply2.toLowerCase().includes('difference')) {
    console.log("❌ ОШИБКА ШАГА 2: ИИ не предложил объяснить разницу!");
  } else {
    console.log("✅ УСПЕХ ШАГА 2: Предложено объяснить разницу.");
  }

  // ШАГ 3
  let msg3 = 'Which one is better?';
  console.log("-----------------------------------------------------");
  console.log("👤 КЛИЕНТ: " + msg3);
  let reply3 = await workflow.generateResponse(history, msg3);
  console.log("🤖 ИИ (Ответ 3):\n" + reply3 + "\n");
  history.push({ sender: 'user', text: msg3 });
  history.push({ sender: 'ai', text: reply3 });

  // Проверка 3: ДОЛЖЕН назвать цены. НЕ ДОЛЖЕН повторять приветствие.
  if (!reply3.includes('185') || !reply3.includes('109')) {
    console.log("❌ ОШИБКА ШАГА 3: ИИ не назвал цены после объяснения!");
  } else {
    console.log("✅ УСПЕХ ШАГА 3: Цены названы.");
  }
  if (reply3.toLowerCase().includes('косшы') || reply3.toLowerCase().includes('kosshy')) {
    console.log("❌ ОШИБКА ШАГА 3 (ПОВТОР): ИИ снова заговорил про Косшы!");
  } else {
    console.log("✅ УСПЕХ ШАГА 3: ИИ не повторяется про город.");
  }

  // ШАГ 4
  let msg4 = 'Ok';
  console.log("-----------------------------------------------------");
  console.log("👤 КЛИЕНТ: " + msg4);
  let reply4 = await workflow.generateResponse(history, msg4);
  console.log("🤖 ИИ (Ответ 4):\n" + reply4 + "\n");
  history.push({ sender: 'user', text: msg4 });
  history.push({ sender: 'ai', text: reply4 });

  // Проверка 4: ДОЛЖЕН сказать, что отправил фото и спросить какая нравится
  if (!reply4.toLowerCase().includes('отправил') && !reply4.toLowerCase().includes('посмотрите')) {
    console.log("❌ ОШИБКА ШАГА 4: ИИ не подтвердил отправку фото!");
  } else {
    console.log("✅ УСПЕХ ШАГА 4: Подтверждение отправки фото.");
  }

  console.log("\n=====================================================");
  console.log("🏁 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО");
  console.log("=====================================================");
}

runFlowTest();

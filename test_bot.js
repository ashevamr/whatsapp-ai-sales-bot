require('dotenv').config();
const workflow = require('./ai_workflow.js');

async function runTests() {
  console.log("====================================");
  console.log("🛠️ ТЕСТ 1: ЖАЛОБА ОТ КЛИЕНТА (ОЖИДАЕТСЯ HANDOVER)");
  console.log("====================================");
  let history1 = [
    { sender: 'user', text: 'Здравствуйте, я у вас покупал фильтр месяц назад, а он сейчас течет снизу!' }
  ];
  let reply1 = await workflow.generateResponse(history1, history1[0].text);
  console.log("АИ ОТВЕТИЛ:\n", reply1);
  if (reply1.includes('[HANDOVER]')) {
    console.log("✅ УСПЕХ: Бот распознал жалобу и передал чат менеджеру.");
  } else {
    console.log("❌ ОШИБКА: Бот попытался ответить сам вместо Handover.");
  }

  console.log("\n====================================");
  console.log("🛠️ ТЕСТ 2: НЕДОСТАТОЧНАЯ СУММА ОПЛАТЫ");
  console.log("====================================");
  let history2 = [
    { sender: 'user', text: 'Здравствуйте! Я хочу купить фильтр FOURA. И еще давайте добавим дизайнерский смеситель.' },
    { sender: 'ai', text: 'Отлично! Базовая цена FOURA 185 000 тг, плюс дизайнерский смеситель 15 000 тг. Итого 200 000 тг. Подтверждаете?' },
    { sender: 'user', text: 'Да, все верно. Оформим за 200 000 тг.' }
  ];
  let reply2 = await workflow.generateResponse(history2, '[РЕЗУЛЬТАТ ПРОВЕРКИ КВИТАНЦИИ В РЕАЛЬНОМ ВРЕМЕНИ: БИН 900614450722, Сумма 185000 тг.]');
  console.log("АИ ОТВЕТИЛ:\n", reply2);
  if (reply2.includes('15') || reply2.toLowerCase().includes('доплатить') || reply2.toLowerCase().includes('разниц')) {
    console.log("✅ УСПЕХ: Бот увидел, что клиент недоплатил 15 000 тг, и попросил доплату.");
  } else {
    console.log("❌ ОШИБКА: Бот не понял, что сумма меньше итоговой.");
  }

  console.log("\n====================================");
  console.log("🛠️ ТЕСТ 3: ИДЕАЛЬНАЯ ПОКУПКА");
  console.log("====================================");
  let history3 = [
    { sender: 'user', text: 'Здравствуйте! Я хочу купить фильтр FOURA. Мой адрес г. Алматы, ул Абая 50, кв 12. Меня зовут Иван.' },
    { sender: 'ai', text: 'Отлично, Иван! Итого 185 000 тг. Когда вам удобно принять мастера?' },
    { sender: 'user', text: 'Завтра в 15:00. Я оплачу Каспи' }
  ];
  let reply3 = await workflow.generateResponse(history3, '[РЕЗУЛЬТАТ ПРОВЕРКИ КВИТАНЦИИ В РЕАЛЬНОМ ВРЕМЕНИ: БИН 900614450722, Сумма 185000 тг.]');
  console.log("АИ ОТВЕТИЛ:\n", reply3);
  
  if (reply3.toLowerCase().includes('всё верно') || reply3.toLowerCase().includes('все верно')) {
    console.log("✅ УСПЕХ: Бот увидел правильную сумму, подтвердил заказ и вывел финальный DOUBLE CHECK (Всё верно?).");
  } else {
    console.log("❌ ОШИБКА: Бот не запустил финальную проверку.");
  }
}

runTests();

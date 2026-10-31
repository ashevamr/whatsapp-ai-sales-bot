function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyNativeBusinessGreeting(text) {
  const value = normalize(text);
  const sentence = value.replace(/[.!?…]+$/g, '').trim();
  if (sentence === 'добро пожаловать! для регистрации заполните форму ниже') return 'registration_form';
  // WhatsApp Business can create these from the business account at the exact
  // moment an ad lead opens the chat. They are templates, not a manager takeover.
  if (sentence === 'можно узнать подробнее') return 'short_details_template';
  if (sentence === 'здравствуйте! чем мы можем вам помочь') return 'help_template';
  if (!value.includes('вы перешли по рекламе vodel')) return null;

  const legacyMenu = value.includes('1️⃣alkaline smart')
    && value.includes('2️⃣ foura')
    && value.includes('4️⃣ каталог');
  if (legacyMenu) return 'legacy_vodel_menu';

  const currentMenu = value.includes('1️⃣ каталог')
    && value.includes('2️⃣ foura')
    && value.includes('3️⃣ alkaline smart');
  return currentMenu ? 'current_vodel_menu' : null;
}

function purgeNativeBusinessGreetings(chat) {
  if (!chat || !Array.isArray(chat.messages)) return { removed: 0, unlocked: false };
  const originalCount = chat.messages.length;
  chat.messages = chat.messages.filter(message => {
    const nativeKind = classifyNativeBusinessGreeting(message?.text);
    return !(nativeKind && (message?.sender === 'human' || message?.source === 'whatsapp_business_greeting'));
  });
  const removed = originalCount - chat.messages.length;
  const hasRealHumanMessage = chat.messages.some(message => message?.sender === 'human');
  const canUnlock = removed > 0
    && chat.manualTakeover === true
    && !hasRealHumanMessage
    && !chat.voiceTranscriptionNotified
    && !chat.disengagementNotified;
  if (canUnlock) {
    chat.status = 'ai';
    chat.manualTakeover = false;
  }
  return { removed, unlocked: canUnlock };
}

module.exports = {
  classifyNativeBusinessGreeting,
  purgeNativeBusinessGreetings
};

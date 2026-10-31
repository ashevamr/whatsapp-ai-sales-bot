function collectReferralText(value, depth = 0) {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(item => collectReferralText(item, depth + 1));
  if (typeof value !== 'object') return [];

  const allowedKeys = /referr|advert|campaign|source|headline|title|caption|description|body|text|url|link|context|reply/i;
  return Object.entries(value)
    .filter(([key]) => allowedKeys.test(key))
    .flatMap(([, nested]) => collectReferralText(nested, depth + 1));
}

function detectAdvertisedProduct(message) {
  const raw = message?._data || message?.data || {};
  const text = collectReferralText({
    referral: raw.referral,
    referralMessageInfo: raw.referralMessageInfo,
    externalAdReplyInfo: raw.contextInfo?.externalAdReplyInfo,
    ctwaContext: raw.ctwaContext,
    contextInfo: raw.contextInfo,
    ad: raw.ad,
    links: message?.links
  }).join(' ').toLowerCase().replace(/ё/g, 'е');

  if (/(?:foura|фоура|прямоточ|без\s+накопительного\s+бака)/i.test(text)) return 'foura';
  if (/(?:alkaline\s*smart|алкалайн\s*смарт)/i.test(text)) return 'alkalineSmart';
  if (/(?:alkaline\s*g?75|алкалайн\s*g?75|накопительным\s+баком)/i.test(text)) return 'alkaline';
  return null;
}

function isEmptyReferralEvent({ text = '', hasMedia = false, isVoice = false } = {}) {
  return !String(text).trim() && !hasMedia && !isVoice;
}

module.exports = { detectAdvertisedProduct, isEmptyReferralEvent };

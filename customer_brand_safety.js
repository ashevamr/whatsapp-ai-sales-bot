'use strict';

const FORMER_BRAND_PATTERN = /(?:vodel|водель)/giu;
const FORMER_BRAND_URL_PATTERN = /https?:\/\/[^\s]*?(?:vodel|водель)[^\s]*/giu;

function sanitizeCustomerFacingText(value) {
  if (typeof value !== 'string') return value;

  return value
    .replace(FORMER_BRAND_URL_PATTERN, '')
    .replace(FORMER_BRAND_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  sanitizeCustomerFacingText
};

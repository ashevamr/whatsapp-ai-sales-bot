// Deterministic guard for product files. A vague request such as
// "show the faucet" must never fall through to a FOURA presentation.
function resolveProductAttachmentTargets({
  wantsFoura = false,
  wantsAlkaline = false,
  wantsAlkalineSmart = false,
  wantsBoth = false,
  fouraAlreadyPresented = false,
  alkalineAlreadyPresented = false,
  alkalineSmartAlreadyPresented = false
} = {}) {
  if (wantsBoth) {
    return {
      foura: !fouraAlreadyPresented,
      alkaline: !alkalineAlreadyPresented,
      alkalineSmart: !alkalineSmartAlreadyPresented
    };
  }

  if (wantsAlkalineSmart) return { foura: false, alkaline: false, alkalineSmart: !alkalineSmartAlreadyPresented };
  if (wantsFoura) return { foura: !fouraAlreadyPresented, alkaline: false, alkalineSmart: false };
  if (wantsAlkaline) return { foura: false, alkaline: !alkalineAlreadyPresented, alkalineSmart: false };
  return { foura: false, alkaline: false, alkalineSmart: false };
}

function shouldUseLegacyProductAttachments({
  hasAttachmentRequest = false,
  hasProductTarget = false,
  isFouraThreeStepContext = false,
  isKaspiProof = false,
  aiTalksAboutKaspiProof = false,
  isCertificateRequested = false,
  shouldSendProductCatalog = false
} = {}) {
  return Boolean(
    hasAttachmentRequest
    && hasProductTarget
    && !isFouraThreeStepContext
    && !isKaspiProof
    && !aiTalksAboutKaspiProof
    && !isCertificateRequested
    && !shouldSendProductCatalog
  );
}

module.exports = {
  resolveProductAttachmentTargets,
  shouldUseLegacyProductAttachments
};

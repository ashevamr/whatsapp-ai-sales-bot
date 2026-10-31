const { spawnSync } = require('child_process');

const tests = [
  'test_bot_reliability.js',
  'test_full_safety_matrix.js',
  'test_all_scenarios.js',
  'test_ad_context.js',
  'test_whatsapp_web_patch.js',
  'test_cartridge_gift_followup.js',
  'test_automated_outbound_guard.js',
  'test_inbound_message_guard.js',
  'test_automation_safety.js',
  'test_commercial_facts.js',
  'test_catalog_workflow.js',
  'test_catalog_full_matrix.js',
  'test_product_menu.js',
  'test_price_objection_downsell.js',
  'test_checkout_safety.js',
  'test_daily_sales_report.js',
  'test_location_policy.js',
  'test_response_format.js',
  'test_alkaline_silence_followup.js',
  'test_voice_safety.js',
  'test_follow_up_suggestions.js',
  'test_successful_sales_analysis.js',
  'test_triggers.js',
  'test_silent_lead_followup.js',
  'test_company_documents.js',
  'test_missed_inbound.js'
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [test], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`Safety suite stopped at ${test}.`);
    process.exit(result.status || 1);
  }
}

console.log(`Safety suite passed: ${tests.length} test files.`);

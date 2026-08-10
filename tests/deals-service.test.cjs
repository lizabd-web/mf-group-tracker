const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function dealsContext() {
  const rows = [
    ['Deal ID', 'Partner / Project', 'Direction', 'GEO', 'Product', 'Stage', 'Waiting status', 'Priority', 'Owner Email', 'Co-owner Email', 'Next step', 'Follow-up date', 'Blocker', 'Waiting for partner', 'Waiting for us', 'Tariff / economics', 'API received', 'Documents / compliance', 'Last contact', 'Created at', 'Updated at'],
    ['DL-1', 'Old partner', 'Providers', '', '', 'Сбор информации', 'Активно', 'Medium', '', '', 'Ask for API', '', '', '', '', '', '', '', '', '2026-08-01', '2026-08-01'],
  ];
  const sheet = {
    getLastRow() { return rows.length; },
    getDataRange() { return { getValues() { return rows.map((row) => row.slice()); } }; },
    getRange(row, column, count) {
      return {
        setValues(values) { rows[row - 1] = values[0].slice(); },
        getValues() { return rows.slice(row - 1, row - 1 + (count || 1)).map((item) => item.slice()); },
      };
    },
    appendRow(values) { rows.push(values.slice()); },
  };
  const context = vm.createContext({
    BA_FOX_CONFIG: {
      SAFE_WRITE_MODE: true,
      SHEETS: { DEALS: 'Deals' },
      TIMEZONE: 'Asia/Bangkok',
      DEAL_STAGES: ['Первичный контакт', 'Сбор информации', 'Документы / onboarding', 'KYC / compliance', 'Коммерция / тарифы', 'API / техоценка', 'Интеграция', 'Тестирование', 'Запуск', 'Работа / масштабирование'],
      DEAL_WAITING_STATUSES: ['Активно', 'Waiting for partner', 'Waiting for us', 'On hold', 'Blocked'],
    },
    baFoxGetSheetByName_() { return sheet; },
    baFoxSafeString(value) { return String(value == null ? '' : value).trim(); },
    normalizeWorkspaceEmail_(value) { return String(value || '').trim().toLowerCase(); },
    baFoxNormalizeRequest(value) { return Object.assign({}, value); },
    baFoxError(code, message, details) { return { ok: false, error: { code, message, details } }; },
    baFoxOk(data) { return { ok: true, data, error: null }; },
    baFoxLooksLikeFormula_(value) { return /^[=+@]/.test(String(value || '')); },
    baFoxIsoNow() { return '2026-08-10T10:00:00Z'; },
    baFoxNow() { return new Date('2026-08-10T10:00:00Z'); },
    Utilities: { formatDate() { return '20260810-100000'; }, getUuid() { return 'abcdef12-0000'; } },
    requireVerifiedProfile_() { return { ok: true, profile: { email: 'admin@mfstream.io' } }; },
    profileCanManageProjects_() { return true; },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/DealsService.gs'), 'utf8'), context);
  return { context, rows };
}

test('deal update moves a partner while preserving its deal identity', function () {
  const { context, rows } = dealsContext();
  const result = context.baFoxUpdateDeal_({ dealId: 'DL-1', stage: 'Интеграция', waitingStatus: 'Waiting for partner', nextStep: 'Wait for production keys' });
  assert.equal(result.ok, true);
  assert.equal(result.data.deal.id, 'DL-1');
  assert.equal(rows[1][5], 'Интеграция');
  assert.equal(rows[1][6], 'Waiting for partner');
});

test('deal creation requires a partner and a direction', function () {
  const { context } = dealsContext();
  const result = context.baFoxCreateDeal_({ partner: 'New provider' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'VALIDATION_ERROR');
});

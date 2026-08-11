/* BizDev funnel. Deals are deliberately separate from task projects: a deal is a
 * partner relationship, while Tasks remain the executable work linked to it. */
function baFoxDealsSheet_() {
  return baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.DEALS);
}

function baFoxDealHeaders_() {
  return ['Deal ID', 'Partner / Project', 'Direction', 'GEO', 'Product', 'Stage', 'Waiting status', 'Priority', 'Owner Email', 'Co-owner Email', 'Next step', 'Follow-up date', 'Blocker', 'Waiting for partner', 'Waiting for us', 'Tariff / economics', 'API received', 'Documents / compliance', 'Last contact', 'Created at', 'Updated at', 'Archived'];
}

function baFoxDealIsArchived_(value) {
  return value === true || String(value || '').trim().toLowerCase() === 'true';
}

function baFoxNormalizeDealRow_(row) {
  row = row || [];
  var value = function(index) { return baFoxSafeString(row[index]); };
  return {
    id: value(0), partner: value(1), direction: value(2), geo: value(3), product: value(4),
    stage: value(5) || BA_FOX_CONFIG.DEAL_STAGES[0], waitingStatus: value(6) || 'Активно',
    priority: value(7) || 'Medium', ownerEmail: normalizeWorkspaceEmail_(value(8)),
    coOwnerEmail: normalizeWorkspaceEmail_(value(9)), nextStep: value(10), followUpDate: value(11),
    blocker: value(12), waitingForPartner: value(13), waitingForUs: value(14), economics: value(15),
    apiReceived: value(16), compliance: value(17), lastContact: value(18), createdAt: value(19), updatedAt: value(20), archived: baFoxDealIsArchived_(value(21))
  };
}

function baFoxListDeals_() {
  var sheet = baFoxDealsSheet_();
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), baFoxDealHeaders_().length)).getValues()
    .map(baFoxNormalizeDealRow_)
    .filter(function(deal) { return Boolean(deal.id || deal.partner); });
}

function baFoxEnsureDealsSheet_(request) {
  var authorization = requireVerifiedProfile_(baFoxNormalizeRequest(request || {}), { requireRegistered: true, requireGoogleToken: true, alwaysEnforce: true });
  if (!authorization.ok) return authorization.error;
  if (!profileCanManageProjects_(authorization.profile) || BA_FOX_CONFIG.SAFE_WRITE_MODE !== true) return baFoxError('WRITE_FORBIDDEN', 'Only admin or executive profiles can prepare Deals.', {});
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = baFoxDealsSheet_();
  if (!sheet) sheet = spreadsheet.insertSheet(BA_FOX_CONFIG.SHEETS.DEALS);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, baFoxDealHeaders_().length).setValues([baFoxDealHeaders_()]);
  if (sheet.getLastColumn() < baFoxDealHeaders_().length || baFoxSafeString(sheet.getRange(1, baFoxDealHeaders_().length).getValue()) !== 'Archived') {
    sheet.getRange(1, baFoxDealHeaders_().length).setValue('Archived');
  }
  sheet.setFrozenRows(1);
  return baFoxOk({ sheet: BA_FOX_CONFIG.SHEETS.DEALS, headers: baFoxDealHeaders_() });
}

function baFoxDealId_(now) {
  return 'DL-' + Utilities.formatDate(now, BA_FOX_CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')
    + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
}

function baFoxDealAllowedKeys_() {
  return ['route', 'callback', 'token', 'idToken', 'identityToken', 'credential', 'googleCredential', 'dealId',
    'partner', 'direction', 'geo', 'product', 'stage', 'waitingStatus', 'priority', 'ownerEmail', 'coOwnerEmail',
    'nextStep', 'followUpDate', 'blocker', 'waitingForPartner', 'waitingForUs', 'economics', 'apiReceived',
    'compliance', 'lastContact', 'archived'];
}

function baFoxFindDealRow_(dealId) {
  var sheet = baFoxDealsSheet_();
  if (!sheet) return { ok: false, error: baFoxError('DEALS_SHEET_MISSING', 'Deals sheet is not available.', {}) };
  var values = sheet.getDataRange().getValues();
  var matches = [];
  for (var index = 1; index < values.length; index += 1) {
    if (baFoxSafeString(values[index][0]) === baFoxSafeString(dealId)) matches.push({ rowNumber: index + 1, row: values[index] });
  }
  if (matches.length !== 1) return { ok: false, error: baFoxError(matches.length ? 'DUPLICATE_DEAL_ID' : 'DEAL_NOT_FOUND', 'Deal id must match exactly one row.', { dealId: dealId, matches: matches.length }) };
  return { ok: true, sheet: sheet, rowNumber: matches[0].rowNumber, row: matches[0].row };
}

function baFoxValidateDeal_(deal) {
  if (!deal.partner || !deal.direction) return baFoxError('VALIDATION_ERROR', 'Partner and direction are required.', {});
  if (BA_FOX_CONFIG.DEAL_STAGES.indexOf(deal.stage) === -1) return baFoxError('VALIDATION_ERROR', 'Deal stage is not allowed.', { stage: deal.stage });
  if (BA_FOX_CONFIG.DEAL_WAITING_STATUSES.indexOf(deal.waitingStatus) === -1) return baFoxError('VALIDATION_ERROR', 'Waiting status is not allowed.', { waitingStatus: deal.waitingStatus });
  if (['High', 'Medium', 'Low'].indexOf(deal.priority) === -1) return baFoxError('VALIDATION_ERROR', 'Priority is not allowed.', { priority: deal.priority });
  if ([deal.partner, deal.direction, deal.geo, deal.product, deal.nextStep, deal.blocker, deal.economics, deal.compliance].some(baFoxLooksLikeFormula_)) return baFoxError('VALIDATION_ERROR', 'Formula-like values are not allowed.', {});
  return null;
}

function baFoxDealFromRequest_(request, previous, authorization) {
  var has = function(key) { return Object.prototype.hasOwnProperty.call(request, key); };
  var pick = function(key, fallback) { return has(key) ? baFoxSafeString(request[key]) : fallback; };
  return {
    id: previous.id,
    partner: pick('partner', previous.partner), direction: pick('direction', previous.direction), geo: pick('geo', previous.geo), product: pick('product', previous.product),
    stage: pick('stage', previous.stage) || BA_FOX_CONFIG.DEAL_STAGES[0], waitingStatus: pick('waitingStatus', previous.waitingStatus) || 'Активно', priority: pick('priority', previous.priority) || 'Medium',
    ownerEmail: normalizeWorkspaceEmail_(pick('ownerEmail', previous.ownerEmail)), coOwnerEmail: normalizeWorkspaceEmail_(pick('coOwnerEmail', previous.coOwnerEmail)),
    nextStep: pick('nextStep', previous.nextStep), followUpDate: pick('followUpDate', previous.followUpDate), blocker: pick('blocker', previous.blocker),
    waitingForPartner: pick('waitingForPartner', previous.waitingForPartner), waitingForUs: pick('waitingForUs', previous.waitingForUs), economics: pick('economics', previous.economics),
    apiReceived: pick('apiReceived', previous.apiReceived), compliance: pick('compliance', previous.compliance), lastContact: pick('lastContact', previous.lastContact), archived: has('archived') ? baFoxDealIsArchived_(request.archived) : previous.archived === true,
    createdAt: previous.createdAt, updatedAt: baFoxIsoNow(), createdByEmail: previous.createdByEmail || authorization.profile.email
  };
}

function baFoxWriteDealRow_(sheet, rowNumber, deal) {
  if (sheet.getLastColumn() < baFoxDealHeaders_().length || baFoxSafeString(sheet.getRange(1, baFoxDealHeaders_().length).getValue()) !== 'Archived') {
    sheet.getRange(1, baFoxDealHeaders_().length).setValue('Archived');
  }
  sheet.getRange(rowNumber, 1, 1, baFoxDealHeaders_().length).setValues([[
    deal.id, deal.partner, deal.direction, deal.geo, deal.product, deal.stage, deal.waitingStatus, deal.priority,
    deal.ownerEmail, deal.coOwnerEmail, deal.nextStep, deal.followUpDate, deal.blocker, deal.waitingForPartner,
    deal.waitingForUs, deal.economics, deal.apiReceived, deal.compliance, deal.lastContact, deal.createdAt, deal.updatedAt, deal.archived === true
  ]]);
}

function baFoxAuthorizeDealWrite_(normalized) {
  var authorization = requireVerifiedProfile_(normalized, { requireRegistered: true, requireGoogleToken: true, alwaysEnforce: true });
  if (!authorization.ok) return authorization;
  if (!profileCanManageProjects_(authorization.profile)) return { ok: false, error: baFoxError('WRITE_FORBIDDEN', 'Only admin or executive profiles can manage deals.', {}) };
  if (BA_FOX_CONFIG.SAFE_WRITE_MODE !== true) return { ok: false, error: baFoxError('SAFE_WRITES_DISABLED', 'Safe writes are disabled.', {}) };
  return authorization;
}

function baFoxCreateDeal_(request) {
  var normalized = baFoxNormalizeRequest(request || {});
  var authorization = baFoxAuthorizeDealWrite_(normalized);
  if (!authorization.ok) return authorization.error;
  var now = baFoxNow();
  var deal = baFoxDealFromRequest_(normalized, { id: baFoxDealId_(now), partner: '', direction: '', geo: '', product: '', stage: '', waitingStatus: '', priority: '', ownerEmail: '', coOwnerEmail: '', nextStep: '', followUpDate: '', blocker: '', waitingForPartner: '', waitingForUs: '', economics: '', apiReceived: '', compliance: '', lastContact: '', archived: false, createdAt: baFoxIsoNow(), createdByEmail: authorization.profile.email }, authorization);
  var validation = baFoxValidateDeal_(deal);
  if (validation) return validation;
  var sheet = baFoxDealsSheet_();
  if (!sheet) return baFoxError('DEALS_SHEET_MISSING', 'Prepare the Deals sheet first.', {});
  baFoxWriteDealRow_(sheet, sheet.getLastRow() + 1, deal);
  return baFoxOk({ deal: deal });
}

function baFoxUpdateDeal_(request) {
  var normalized = baFoxNormalizeRequest(request || {});
  var rejected = Object.keys(normalized).filter(function(key) { return baFoxDealAllowedKeys_().indexOf(key) === -1 && baFoxSafeString(normalized[key]); });
  if (rejected.length) return baFoxError('FIELDS_NOT_ALLOWED', 'Only supported deal fields can be updated.', { rejectedFields: rejected });
  if (!baFoxSafeString(normalized.dealId)) return baFoxError('VALIDATION_ERROR', 'Deal id is required.', {});
  var authorization = baFoxAuthorizeDealWrite_(normalized);
  if (!authorization.ok) return authorization.error;
  var match = baFoxFindDealRow_(normalized.dealId);
  if (!match.ok) return match.error;
  var previous = baFoxNormalizeDealRow_(match.row);
  var deal = baFoxDealFromRequest_(normalized, previous, authorization);
  var validation = baFoxValidateDeal_(deal);
  if (validation) return validation;
  baFoxWriteDealRow_(match.sheet, match.rowNumber, deal);
  return baFoxOk({ deal: deal });
}

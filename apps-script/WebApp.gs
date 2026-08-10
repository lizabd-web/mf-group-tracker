function baFoxJsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function baFoxJsonpCallbackIsValid_(callback) {
  return typeof callback === 'string'
    && callback.length <= 128
    && /^BAFoxJsonpCallback_[A-Za-z0-9_$]+$/.test(callback);
}

function baFoxReadOutput_(payload, callback) {
  if (!callback) {
    return baFoxJsonOutput_(payload);
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function baFoxRequestParameters_(event) {
  return event && event.parameter ? event.parameter : {};
}

function baFoxCacheTtlSeconds_() {
  return 60;
}

function baFoxCacheKey_(route, parameters) {
  var keyParts = [route];
  Object.keys(parameters || {}).sort().forEach(function(name) {
    if (['route', 'callback', 'refresh', 'nocache'].indexOf(name) !== -1) {
      return;
    }
    if (parameters[name]) {
      keyParts.push(name + '=' + parameters[name]);
    }
  });
  return 'baFoxRead:' + keyParts.join('|');
}

function baFoxIsWriteRoute_(route) {
  return ['taskAction', 'createTask', 'editTask', 'createProject', 'updateProject', 'prepareTaskIdentityColumns', 'prepareDealsSheet', 'createDeal', 'updateDeal'].indexOf(route) !== -1;
}

function baFoxIsCacheBypass_(parameters) {
  return parameters && (parameters.refresh === '1' || parameters.nocache === '1');
}

function baFoxHasUserScopedParameters_(parameters) {
  return ['user', 'userId', 'employeeId', 'ownerId', 'telegramUserId', 'email', 'idToken', 'identityToken', 'credential', 'googleCredential'].some(function(name) {
    return parameters && parameters[name];
  });
}

function baFoxIsCacheableReadRoute_(route, parameters) {
  // Dashboard cache is read-only and short-lived. Writes are never cached.
  // Pass refresh=1 or nocache=1 to force a live read while debugging.
  return ['dashboard', 'workspaceDashboard', 'fullDashboard'].indexOf(route) !== -1
    && !baFoxIsWriteRoute_(route)
    && !baFoxIsCacheBypass_(parameters)
    && !baFoxHasUserScopedParameters_(parameters);
}

function baFoxLogReadRoute_(route, message, startedAt) {
  var elapsed = startedAt ? (new Date().getTime() - startedAt) : 0;
  var text = 'BA_FOX_READ route=' + route + ' ' + message + ' elapsedMs=' + elapsed;
  if (typeof console !== 'undefined' && console.log) {
    console.log(text);
    return;
  }
  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(text);
  }
}

function baFoxReadCache_() {
  if (typeof CacheService === 'undefined') {
    return null;
  }
  return CacheService.getScriptCache();
}

function baFoxGetCachedResponse_(route, parameters) {
  if (!baFoxIsCacheableReadRoute_(route, parameters)) {
    return null;
  }
  var cache = baFoxReadCache_();
  if (!cache) {
    return null;
  }

  try {
    var cached = cache.get(baFoxCacheKey_(route, parameters));
    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch (err) {
    return null;
  }
}

function baFoxPutCachedResponse_(route, parameters, response) {
  if (!baFoxIsCacheableReadRoute_(route, parameters)) {
    return;
  }
  var cache = baFoxReadCache_();
  if (!cache || !response || response.ok !== true) {
    return;
  }
  try {
    cache.put(baFoxCacheKey_(route, parameters), JSON.stringify(response), baFoxCacheTtlSeconds_());
  } catch (err) {
    // Large read-only payloads may exceed CacheService limits; serving uncached is safer than failing.
  }
}

function baFoxVisibleTaskStore_(storeResult, profile) {
  var allTasks = baFoxNormalizeTaskRows_(storeResult);
  return Object.assign({}, storeResult, {
    normalizedTasks: profileCanSeeAll_(profile)
      ? allTasks
      : allTasks.filter(function(task) { return profileCanSeeTask_(profile, task); })
  });
}

function baFoxBuildTaskViewsFromRows_(parameters, storeResult, profile) {
  storeResult = baFoxVisibleTaskStore_(storeResult, profile);
  var normalizedTasks = baFoxNormalizeTaskRows_(storeResult);
  var identityParameters = Object.assign({}, parameters || {}, {
    __normalizedTasks: normalizedTasks
  });
  return {
    scaffoldInfo: baFoxScaffoldInfo().data,
    inbox: baFoxListInboxTasks({ date: parameters.date }, storeResult),
    focus: baFoxListFocusTasks({ date: parameters.date }, storeResult),
    today: baFoxListTodayTasks({ date: parameters.date }, storeResult),
    all: baFoxListAllTasks({ taskType: parameters.taskType || parameters.scope || 'all' }, storeResult),
    open: baFoxListOpenTasks({ taskType: parameters.taskType || parameters.scope || 'all' }, storeResult),
    pushes: baFoxListPushTasks({ dateRange: parameters.dateRange || 'today' }, storeResult),
    completed: baFoxListCompletedTasks({ limit: parameters.completedLimit || 50 }, storeResult),
    users: getUsers_().filter(function(user) { return user.status === 'active'; }).map(safeUserSummary_),
    projects: baFoxListProjects_(),
    deals: baFoxListDeals_(),
    identity: identityDashboardMetadata_(identityParameters, 'fullDashboard')
  };
}

function baFoxBuildWorkspaceViewsFromRows_(parameters, storeResult, profile) {
  storeResult = baFoxVisibleTaskStore_(storeResult, profile);
  var normalizedTasks = baFoxNormalizeTaskRows_(storeResult);
  var identityParameters = Object.assign({}, parameters || {}, {
    __normalizedTasks: normalizedTasks
  });
  return {
    scaffoldInfo: baFoxScaffoldInfo().data,
    inbox: baFoxListInboxTasks({ date: parameters.date }, storeResult),
    focus: baFoxListFocusTasks({ date: parameters.date }, storeResult),
    today: baFoxListTodayTasks({ date: parameters.date }, storeResult),
    all: baFoxListAllTasks({ taskType: parameters.taskType || parameters.scope || 'all' }, storeResult),
    open: baFoxListOpenTasks({ taskType: parameters.taskType || parameters.scope || 'all' }, storeResult),
    pushes: baFoxListPushTasks({ dateRange: parameters.dateRange || 'today' }, storeResult),
    users: getUsers_().filter(function(user) { return user.status === 'active'; }).map(safeUserSummary_),
    projects: baFoxListProjects_(),
    deals: baFoxListDeals_(),
    identity: identityDashboardMetadata_(identityParameters, 'dashboard')
  };
}

function baFoxGetDashboard_(parameters) {
  var startedAt = new Date().getTime();
  var identityCheck = requireVerifiedProfile_(parameters, { requireRegistered: true });
  if (!identityCheck.ok) {
    return identityCheck.error;
  }
  var readStartedAt = new Date().getTime();
  var storeResult = baFoxReadTasksRows();
  var dashboard = baFoxBuildWorkspaceViewsFromRows_(parameters, storeResult, identityCheck.profile);
  dashboard.performance = {
    operation: 'dashboard',
    durationMs: new Date().getTime() - startedAt,
    sheetReadMs: new Date().getTime() - readStartedAt,
    timestamp: baFoxIsoNow()
  };
  return baFoxOk(dashboard);
}

function baFoxGetWorkspaceDashboard_(parameters) {
  var startedAt = new Date().getTime();
  var identityCheck = requireVerifiedProfile_(parameters, { requireRegistered: true });
  if (!identityCheck.ok) {
    return identityCheck.error;
  }
  var readStartedAt = new Date().getTime();
  var storeResult = baFoxReadTasksRows();
  var dashboard = baFoxBuildWorkspaceViewsFromRows_(parameters, storeResult, identityCheck.profile);
  dashboard.performance = {
    operation: 'workspaceDashboard',
    durationMs: new Date().getTime() - startedAt,
    sheetReadMs: new Date().getTime() - readStartedAt,
    timestamp: baFoxIsoNow()
  };
  return baFoxOk(dashboard);
}

function baFoxGetFullDashboard_(parameters) {
  var startedAt = new Date().getTime();
  var identityCheck = requireVerifiedProfile_(parameters, { requireRegistered: true });
  if (!identityCheck.ok) {
    return identityCheck.error;
  }
  var readStartedAt = new Date().getTime();
  var storeResult = baFoxReadTasksRows();
  var visibleStoreResult = baFoxVisibleTaskStore_(storeResult, identityCheck.profile);
  var dashboard = baFoxBuildTaskViewsFromRows_(parameters, visibleStoreResult, identityCheck.profile);
  var auditResponse = baFoxBuildCleanupAuditDryRun(visibleStoreResult);
  if (!auditResponse.ok) {
    return auditResponse;
  }
  dashboard.cleanupAudit = auditResponse.data;
  dashboard.performance = {
    operation: 'fullDashboard',
    durationMs: new Date().getTime() - startedAt,
    sheetReadMs: new Date().getTime() - readStartedAt,
    timestamp: baFoxIsoNow()
  };
  return baFoxOk(dashboard);
}

function baFoxReadSheetStatus_(sheetName) {
  var sheet = baFoxGetSheetByName_(sheetName);
  if (!sheet) {
    return {
      sheet: sheetName,
      exists: false,
      status: 'missing',
      headerColumns: 0,
      dataRows: 0,
      headersOnly: false
    };
  }

  return {
    sheet: sheetName,
    exists: true,
    status: sheet.getLastRow() <= 1 ? 'headers_only' : 'has_data',
    headerColumns: sheet.getLastColumn(),
    dataRows: Math.max(sheet.getLastRow() - 1, 0),
    headersOnly: sheet.getLastRow() <= 1
  };
}

function baFoxGetSafetyStatus_() {
  var auditLog = baFoxReadSheetStatus_(BA_FOX_CONFIG.SHEETS.AUDIT_LOG);
  var reports = baFoxReadSheetStatus_(BA_FOX_CONFIG.SHEETS.REPORTS);
  var notificationQueue = baFoxReadSheetStatus_(BA_FOX_CONFIG.SHEETS.NOTIFICATION_QUEUE);

  return baFoxOk({
    dryRun: BA_FOX_CONFIG.DRY_RUN,
    readLive: BA_FOX_CONFIG.READ_LIVE_SHEETS,
    readLiveSheets: BA_FOX_CONFIG.READ_LIVE_SHEETS,
    safeWritesEnabled: BA_FOX_CONFIG.SAFE_WRITE_MODE === true,
    liveAutomationEnabled: false,
    triggersEnabled: false,
    sheets: {
      AuditLog: auditLog,
      Reports: reports,
      NotificationQueue: notificationQueue
    },
    counts: {
      AuditLog: auditLog.dataRows,
      Reports: reports.dataRows,
      NotificationQueue: notificationQueue.dataRows
    }
  });
}

function baFoxIsRateLimitError_(err) {
  var message = err && err.message ? String(err.message).toLowerCase() : '';
  return message.indexOf('too many requests') !== -1
    || message.indexOf('rate limit') !== -1
    || message.indexOf('quota') !== -1
    || message.indexOf('429') !== -1;
}

function baFoxReadErrorResponse_(err) {
  if (baFoxIsRateLimitError_(err)) {
    return baFoxError(
      'SHEETS_RATE_LIMITED',
      'Google Sheets temporarily limited read requests.',
      { retryAfterSeconds: baFoxCacheTtlSeconds_() }
    );
  }

  return baFoxError(
    'READ_ROUTE_ERROR',
    err && err.message ? err.message : 'Read-only route failed.',
    {}
  );
}

function baFoxProtectedTaskReadRoute_(route) {
  return [
    'today',
    'inbox',
    'focus',
    'open',
    'pushes',
    'completed',
    'dashboard',
    'workspaceDashboard',
    'fullDashboard'
  ].indexOf(route) !== -1;
}

function baFoxAdminReadRoute_(route) {
  return [
    'cleanupAudit',
    'safetyStatus',
    'taskIdentitySchema',
    'activeUsers',
    'visibilityPreview'
  ].indexOf(route) !== -1;
}

function baFoxAuthorizeReadRoute_(route, parameters) {
  if (!baFoxProtectedTaskReadRoute_(route) && !baFoxAdminReadRoute_(route)) {
    return null;
  }

  var authorization = requireVerifiedProfile_(parameters, {
    requireRegistered: true,
    requireGoogleToken: true,
    alwaysEnforce: true
  });
  if (!authorization.ok) {
    return authorization.error;
  }

  if (baFoxAdminReadRoute_(route) && !profileCanManageUsers_(authorization.profile)) {
    return baFoxError('ADMIN_REQUIRED', 'Verified admin profile is required for this route.', {
      route: route,
      accessRole: authorization.profile && authorization.profile.accessRole
    });
  }
  parameters.__verifiedAuthorization = authorization;
  parameters.__verifiedIdentityResult = authorization.identity;
  return null;
}

function baFoxProtectedTaskList_(parameters, listFunction, options) {
  var authorization = parameters.__verifiedAuthorization;
  var storeResult = baFoxVisibleTaskStore_(baFoxReadTasksRows(), authorization.profile);
  return baFoxOk(listFunction(options || {}, storeResult));
}

function baFoxBuildRouteResponse_(route, parameters) {
  var response;
  var readAuthorizationError = baFoxAuthorizeReadRoute_(route, parameters || {});
  if (readAuthorizationError) {
    return readAuthorizationError;
  }

  switch (route) {
    case 'scaffoldInfo':
      response = baFoxScaffoldInfo();
      break;
    case 'today':
      response = baFoxProtectedTaskList_(parameters, baFoxListTodayTasks, { date: parameters.date });
      break;
    case 'inbox':
      response = baFoxProtectedTaskList_(parameters, baFoxListInboxTasks, { date: parameters.date });
      break;
    case 'focus':
      response = baFoxProtectedTaskList_(parameters, baFoxListFocusTasks, { date: parameters.date });
      break;
    case 'open':
      response = baFoxProtectedTaskList_(parameters, baFoxListOpenTasks, { taskType: parameters.taskType || parameters.scope || 'all' });
      break;
    case 'pushes':
      response = baFoxProtectedTaskList_(parameters, baFoxListPushTasks, { dateRange: parameters.dateRange || 'today' });
      break;
    case 'completed':
      response = baFoxProtectedTaskList_(parameters, baFoxListCompletedTasks, { limit: parameters.limit || 50 });
      break;
    case 'dashboard':
      response = baFoxGetDashboard_(parameters);
      break;
    case 'workspaceDashboard':
      response = baFoxGetWorkspaceDashboard_(parameters);
      break;
    case 'fullDashboard':
      response = baFoxGetFullDashboard_(parameters);
      break;
    case 'cleanupAudit':
      response = baFoxBuildCleanupAuditDryRun();
      break;
    case 'safetyStatus':
      response = baFoxGetSafetyStatus_();
      break;
    case 'profile':
    case 'me':
      response = getProfile(parameters);
      break;
    case 'taskIdentitySchema':
      response = getTaskIdentitySchema(parameters);
      break;
    case 'prepareTaskIdentityColumns':
      response = baFoxPrepareTaskIdentityColumns(parameters);
      break;
    case 'prepareDealsSheet':
      response = baFoxEnsureDealsSheet_(parameters);
      break;
    case 'createDeal':
      response = baFoxCreateDeal_(parameters);
      break;
    case 'updateDeal':
      response = baFoxUpdateDeal_(parameters);
      break;
    case 'activeUsers':
      response = getActiveUsersForPreview(parameters);
      break;
    case 'visibilityPreview':
      response = getVisibilityPreview(parameters);
      break;
    case 'taskAction':
      response = taskAction(parameters);
      break;
    case 'createTask':
      response = createTask(parameters);
      break;
    case 'editTask':
      response = editTask(parameters);
      break;
    case 'createProject':
      response = baFoxCreateProject_(parameters);
      break;
    case 'updateProject':
      response = baFoxUpdateProject_(parameters);
      break;
    default:
      response = baFoxError(
        'ROUTE_NOT_FOUND',
        'Unknown route.',
        { route: route }
      );
  }

  return response;
}

function doGet(event) {
  var startedAt = new Date().getTime();
  var parameters = baFoxRequestParameters_(event);
  var route = parameters.route || 'scaffoldInfo';
  var callback = parameters.callback || '';
  var response;

  if (callback && !baFoxJsonpCallbackIsValid_(callback)) {
    return baFoxJsonOutput_(baFoxError(
      'INVALID_CALLBACK',
      'Callback name is not allowed.',
      {}
    ));
  }

  try {
    if (baFoxIsWriteRoute_(route)) {
      response = baFoxBuildRouteResponse_(route, parameters);
      baFoxLogReadRoute_(route, 'write-route-uncached', startedAt);
    } else {
      var cacheable = baFoxIsCacheableReadRoute_(route, parameters);
      response = cacheable ? baFoxGetCachedResponse_(route, parameters) : null;
      if (!response) {
        var cacheMessage = baFoxIsCacheBypass_(parameters)
          ? 'cache-bypass'
          : cacheable
            ? 'cache-miss'
            : 'uncached-read';
        baFoxLogReadRoute_(route, cacheMessage, startedAt);
        response = baFoxBuildRouteResponse_(route, parameters);
        baFoxPutCachedResponse_(route, parameters, response);
      } else {
        baFoxLogReadRoute_(route, 'cache-hit', startedAt);
      }
    }
  } catch (err) {
    baFoxLogReadRoute_(route, 'error', startedAt);
    response = baFoxReadErrorResponse_(err);
  }

  return baFoxReadOutput_(response, callback);
}

function doPost(event) {
  var body = event && event.postData && event.postData.contents;
  var payload = baFoxNormalizeRequest(body);
  var route = payload.route || 'scaffoldInfo';
  return baFoxJsonOutput_(baFoxBuildRouteResponse_(route, payload));
}

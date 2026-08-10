(function (global) {
  const READ_ONLY_ROUTES = Object.freeze([
    'scaffoldInfo',
    'inbox',
    'focus',
    'today',
    'open',
    'pushes',
    'completed',
    'dashboard',
    'workspaceDashboard',
    'fullDashboard',
    'cleanupAudit',
    'safetyStatus',
    'profile',
    'me',
    'taskIdentitySchema',
    'activeUsers',
    'visibilityPreview',
  ]);
  const WRITE_ROUTES = Object.freeze([
    'taskAction',
    'createTask',
    'editTask',
    'createProject',
    'updateProject',
    'prepareTaskIdentityColumns',
  ]);
  const TASK_ACTION_MESSAGES = Object.freeze({
    ACTION_NOT_ALLOWED: 'Это действие пока не включено для EA FOX Web.',
    SAFE_WRITES_DISABLED: 'Безопасная запись выключена. Действия доступны только для просмотра.',
    TASK_NOT_FOUND: 'Задача не найдена в таблице.',
    VALIDATION_ERROR: 'Не хватает данных для безопасного действия.',
    GOOGLE_TOKEN_REQUIRED: 'Нужен подтверждённый Google-вход.',
    IDENTITY_REQUIRED: 'Нужен подтверждённый рабочий профиль.',
    WRITE_FORBIDDEN: 'У этого профиля нет прав на запись.',
    UNAUTHORIZED: 'Нет доступа для выполнения действия.',
  });
  const CREATE_TASK_MESSAGES = Object.freeze({
    FIELDS_NOT_ALLOWED: 'Проверьте поля задачи: часть данных не поддерживается текущей схемой.',
    TASK_IDENTITY_SCHEMA_INCOMPLETE: 'Дополнительных ответственных пока нельзя сохранить: в Tasks нужны колонки Collaborator Emails и Collaborator User IDs.',
    TASK_PROJECT_SCHEMA_INCOMPLETE: 'Проект пока нельзя сохранить: в Tasks нужна колонка Project ID.',
    TASK_HIERARCHY_SCHEMA_INCOMPLETE: 'Вложенную задачу пока нельзя сохранить: в Tasks нужна колонка Parent Task ID.',
    SAFE_WRITES_DISABLED: 'Безопасная запись выключена. Создание задач недоступно.',
    TASKS_SHEET_MISSING: 'Лист Tasks недоступен.',
    TASK_APPEND_FAILED: 'Не удалось добавить задачу в Tasks.',
    GOOGLE_TOKEN_REQUIRED: 'Нужен подтверждённый Google-вход.',
    IDENTITY_REQUIRED: 'Нужен подтверждённый рабочий профиль.',
    WRITE_FORBIDDEN: 'У этого профиля нет прав на создание задач.',
    UNAUTHORIZED: 'Нет доступа для создания задачи.',
    VALIDATION_ERROR: 'Введите название задачи',
  });
  const EDIT_TASK_MESSAGES = Object.freeze({
    FIELDS_NOT_ALLOWED: 'Можно обновить только разрешённые поля задачи.',
    DUPLICATE_TASK_ID: 'В таблице найдено несколько строк с этим ID. Обновление остановлено для безопасности.',
    NO_CHANGES: 'Нет изменений для сохранения.',
    SCHEMA_FIELD_MISSING: 'Это поле ещё не добавлено в схему Tasks.',
    SAFE_WRITES_DISABLED: 'Безопасная запись выключена. Обновление этапа недоступно.',
    TASK_NOT_FOUND: 'Задача не найдена в таблице.',
    TASKS_SHEET_MISSING: 'Лист Tasks недоступен.',
    GOOGLE_TOKEN_REQUIRED: 'Нужен подтверждённый Google-вход.',
    IDENTITY_REQUIRED: 'Нужен подтверждённый рабочий профиль.',
    WRITE_FORBIDDEN: 'У этого профиля нет прав на обновление задач.',
    UNAUTHORIZED: 'Нет доступа для обновления задачи.',
    VALIDATION_ERROR: 'Проверьте поля обновления этапа.',
  });
  const PROJECT_MESSAGES = Object.freeze({
    FIELDS_NOT_ALLOWED: 'Можно изменять только разрешённые поля проекта.',
    PROJECT_NOT_FOUND: 'Проект не найден.',
    DUPLICATE_PROJECT_ID: 'Найдено несколько проектов с одинаковым ID. Изменение остановлено.',
    PROJECTS_SHEET_MISSING: 'Лист Projects недоступен.',
    SAFE_WRITES_DISABLED: 'Безопасная запись выключена. Проект не изменён.',
    GOOGLE_TOKEN_REQUIRED: 'Нужен подтверждённый Google-вход.',
    IDENTITY_REQUIRED: 'Нужен подтверждённый рабочий профиль.',
    WRITE_FORBIDDEN: 'Редактировать проекты могут только руководитель или администратор.',
    VALIDATION_ERROR: 'Проверьте название, отдел, ответственного и статус проекта.',
  });
  const JSONP_TIMEOUT_MS = 25000;
  const RATE_LIMIT_MESSAGE = 'Google Sheets временно ограничил чтение. EA FOX повторит попытку позже.';
  const TIMEOUT_MESSAGE = 'Google Sheets отвечает дольше обычного. Попробуйте обновить данные ещё раз.';
  const AUTH_ERROR_CODES = Object.freeze([
    'GOOGLE_TOKEN_REQUIRED',
    'IDENTITY_REQUIRED',
    'USER_NOT_REGISTERED',
    'USER_INACTIVE',
    'ADMIN_REQUIRED',
  ]);
  let jsonpRequestSequence = 0;

  function assertRoute(route) {
    if (!READ_ONLY_ROUTES.includes(route) && !WRITE_ROUTES.includes(route)) {
      throw new Error('Unsupported route: ' + route);
    }
  }

  function buildRouteUrl(route, params) {
    assertRoute(route);
    const config = global.BAFoxConfig.getConfig();
    if (!config.endpoint) {
      throw new Error('No endpoint configured. Mock mode is required.');
    }

    const url = new URL(config.endpoint);
    url.searchParams.set('route', route);
    Object.keys(params || {}).forEach(function (key) {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  function validateResponseShape(response) {
    if (!response || typeof response.ok !== 'boolean') {
      throw new Error('Invalid endpoint response shape.');
    }
    if (!response.ok) {
      const code = typeof response.error === 'string'
        ? response.error
        : response.error && response.error.code;
      const message = response.error && response.error.message
        ? response.error.message
        : code || 'Read-only endpoint returned an error.';
      const error = new Error(message);
      error.code = code;
      error.details = response.error && response.error.details;
      throw error;
    }
    return response.data;
  }

  function validateScaffoldSafety(data) {
    const isSafe = data
      && data.dryRun === true
      && (data.readLiveSheets === true || data.readLive === true)
      && data.liveAutomationEnabled === false
      && data.triggersEnabled === false;

    if (!isSafe) {
      throw new Error('Endpoint returned unsafe or incomplete runtime flags.');
    }
  }

  function validateReadSafety(data) {
    if (!data || data.dryRun !== true || data.readLive !== true) {
      throw new Error('Endpoint returned unsafe or incomplete read flags.');
    }
  }

  function validateCleanupAudit(data) {
    const isValid = data
      && data.summary
      && Array.isArray(data.items)
      && typeof data.summary.rowsChecked === 'number';

    if (!isValid) {
      throw new Error('Cleanup audit response shape is incomplete.');
    }
  }

  function validateSafetyStatus(data) {
    const isValid = data
      && data.dryRun === true
      && data.readLive === true
      && data.sheets
      && data.counts
      && data.sheets.AuditLog
      && data.sheets.Reports
      && data.sheets.NotificationQueue;

    if (!isValid) {
      throw new Error('Safety status response shape is incomplete.');
    }
  }

  function validateProfile(data) {
    const isValid = data
      && typeof data.identityMode === 'string'
      && data.profile
      && typeof data.allowedDomain === 'string'
      && typeof data.isBackendEnforced === 'boolean'
      && typeof data.enforcementMode === 'string'
      && data.permissions
      && Array.isArray(data.limitations);

    if (!isValid) {
      throw new Error('Profile response shape is incomplete.');
    }
  }

  function validateTaskIdentitySchema(data) {
    const schema = data && data.taskIdentitySchema;
    if (!schema || typeof schema.status !== 'string' || !Array.isArray(schema.recommendedColumns)) {
      throw new Error('Task identity schema response shape is incomplete.');
    }
  }

  function validateActiveUsers(data) {
    if (!data || !Array.isArray(data.users)) {
      throw new Error('Active users response shape is incomplete.');
    }
  }

  function validateVisibilityPreview(data) {
    const preview = data && data.visibilityPreview;
    if (!preview || typeof preview.mode !== 'string' || typeof preview.totalTasks !== 'number') {
      throw new Error('Visibility preview response shape is incomplete.');
    }
  }

  function validateFullDashboard(data) {
    validateScaffoldSafety(data && data.scaffoldInfo);
    if (data && data.inbox) {
      validateReadSafety(data.inbox);
    }
    if (data && data.focus) {
      validateReadSafety(data.focus);
    }
    validateReadSafety(data && data.today);
    if (data && data.all) {
      validateReadSafety(data.all);
    }
    validateReadSafety(data && data.open);
    validateReadSafety(data && data.pushes);
    if (data && data.completed) {
      validateReadSafety(data.completed);
    }
    validateCleanupAudit(data && data.cleanupAudit);
  }

  function validateWorkspaceDashboard(data) {
    validateScaffoldSafety(data && data.scaffoldInfo);
    validateReadSafety(data && data.inbox);
    validateReadSafety(data && data.focus);
    validateReadSafety(data && data.today);
    validateReadSafety(data && data.all);
    validateReadSafety(data && data.open);
    validateReadSafety(data && data.pushes);
  }

  function isRateLimitError(error) {
    const code = error && error.code;
    const message = String(error && error.message ? error.message : '').toLowerCase();
    return code === 'SHEETS_RATE_LIMITED'
      || message.includes('too many requests')
      || message.includes('rate limit')
      || message.includes('quota')
      || message.includes('429');
  }

  function isTimeoutError(error) {
    const code = error && error.code;
    const message = String(error && error.message ? error.message : '').toLowerCase();
    return code === 'JSONP_TIMEOUT'
      || message.includes('jsonp endpoint timed out')
      || message.includes('timed out');
  }

  function isAuthenticationError(error) {
    return Boolean(error && AUTH_ERROR_CODES.includes(error.code));
  }

  function backoffDelayMs(error, attempt) {
    if (isTimeoutError(error)) {
      return attempt === 0 ? 900 : 1800;
    }
    const retryAfterSeconds = error && error.details && Number(error.details.retryAfterSeconds);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.min(retryAfterSeconds * 1000, 5000);
    }
    return attempt === 0 ? 1200 : 2500;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      global.setTimeout(resolve, ms);
    });
  }

  function isEmptyData(route, data) {
    if (route === 'cleanupAudit') {
      return data && Array.isArray(data.items) && data.items.length === 0;
    }
    if (route === 'fullDashboard') {
      return data && data.today && Array.isArray(data.today.tasks) && data.today.tasks.length === 0;
    }
    if (route === 'dashboard') {
      return data && data.today && Array.isArray(data.today.tasks) && data.today.tasks.length === 0;
    }
    return data && Array.isArray(data.tasks) && data.tasks.length === 0;
  }

  function getJsonp(route, params) {
    return new Promise(function (resolve, reject) {
      jsonpRequestSequence += 1;
      const callbackName = 'BAFoxJsonpCallback_' + Date.now() + '_' + jsonpRequestSequence;
      const query = Object.assign({}, params || {}, { callback: callbackName });
      const script = global.document.createElement('script');
      let timeoutId;

      function cleanup() {
        global.clearTimeout(timeoutId);
        delete global[callbackName];
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      global[callbackName] = function (response) {
        cleanup();
        try {
          resolve(validateResponseShape(response));
        } catch (responseError) {
          reject(responseError);
        }
      };

      script.async = true;
      script.src = buildRouteUrl(route, query);
      script.onerror = function () {
        cleanup();
        reject(new Error('Read-only JSONP endpoint request failed. URL: ' + script.src));
      };
      timeoutId = global.setTimeout(function () {
        cleanup();
        const timeoutError = new Error('Read-only JSONP endpoint timed out. URL: ' + script.src);
        timeoutError.code = 'JSONP_TIMEOUT';
        reject(timeoutError);
      }, JSONP_TIMEOUT_MS);
      global.document.head.appendChild(script);
    });
  }

  function hasIdentityCredential(options) {
    const params = options || {};
    return Boolean(
      params.idToken
      || params.identityToken
      || params.credential
      || params.googleCredential
      || params.trustedDeviceSession
    );
  }

  function writeRequestParams(options, config) {
    const params = Object.assign({}, options || {});
    if (config.actionToken) {
      params.token = config.actionToken;
    }
    return params;
  }

  function requireWriteCredential(options, config) {
    if (config.actionToken || hasIdentityCredential(options)) {
      return;
    }
    const missingCredentialError = new Error('Войдите через Google рабочим аккаунтом, чтобы изменять задачи.');
    missingCredentialError.code = 'GOOGLE_TOKEN_REQUIRED';
    throw missingCredentialError;
  }

  async function readLive(route, params) {
    if (route === 'scaffoldInfo') {
      const scaffoldInfo = await getJsonp(route, params);
      validateScaffoldSafety(scaffoldInfo);
      return scaffoldInfo;
    }

    if (route === 'dashboard') {
      const dashboard = await getJsonp(route, params);
      validateScaffoldSafety(dashboard.scaffoldInfo);
      if (dashboard.inbox) {
        validateReadSafety(dashboard.inbox);
      }
      if (dashboard.focus) {
        validateReadSafety(dashboard.focus);
      }
      validateReadSafety(dashboard.today);
      validateReadSafety(dashboard.open);
      validateReadSafety(dashboard.pushes);
      if (dashboard.completed) {
        validateReadSafety(dashboard.completed);
      }
      return dashboard;
    }

    if (route === 'workspaceDashboard') {
      const dashboard = await getJsonp(route, params);
      validateWorkspaceDashboard(dashboard);
      return dashboard;
    }

    if (route === 'fullDashboard') {
      const fullDashboard = await getJsonp(route, params);
      validateFullDashboard(fullDashboard);
      return fullDashboard;
    }

    if (route === 'cleanupAudit') {
      const scaffoldInfo = await getJsonp('scaffoldInfo', {});
      validateScaffoldSafety(scaffoldInfo);
      const audit = await getJsonp(route, params);
      validateCleanupAudit(audit);
      return audit;
    }

    if (route === 'safetyStatus') {
      const safetyStatus = await getJsonp(route, params);
      validateSafetyStatus(safetyStatus);
      return safetyStatus;
    }

    if (route === 'profile' || route === 'me') {
      const profile = await getJsonp(route, params);
      validateProfile(profile);
      return profile;
    }

    if (route === 'taskIdentitySchema') {
      const schema = await getJsonp(route, params);
      validateTaskIdentitySchema(schema);
      return schema;
    }

    if (route === 'activeUsers') {
      const users = await getJsonp(route, params);
      validateActiveUsers(users);
      return users;
    }

    if (route === 'visibilityPreview') {
      const preview = await getJsonp(route, params);
      validateVisibilityPreview(preview);
      return preview;
    }

    const scaffoldInfo = await getJsonp('scaffoldInfo', {});
    validateScaffoldSafety(scaffoldInfo);
    const data = await getJsonp(route, params);
    validateReadSafety(data);
    return data;
  }

  function readMock(route, params) {
    const response = global.BAFoxMockData.getResponse(route, params);
    const data = validateResponseShape(response);
    return global.BAFoxUiState.mock(route, data);
  }

  async function readRoute(route, params) {
    assertRoute(route);
    const config = global.BAFoxConfig.getConfig();

    if (config.useMockData) {
      return readMock(route, params);
    }

    try {
      let data;
      try {
        data = await readLive(route, params);
      } catch (firstError) {
        if (!isRateLimitError(firstError) && !isTimeoutError(firstError)) {
          throw firstError;
        }
        await wait(backoffDelayMs(firstError, 0));
        data = await readLive(route, params);
      }
      if (isEmptyData(route, data)) {
        return global.BAFoxUiState.empty(route, data, {
          message: 'В этом разделе нет задач.',
        });
      }
      return global.BAFoxUiState.success(route, data);
    } catch (clientError) {
      const rateLimited = isRateLimitError(clientError);
      const timedOut = isTimeoutError(clientError);
      const authenticationRequired = isAuthenticationError(clientError);
      const diagnosticMessage = clientError && clientError.message
        ? clientError.message
        : 'Unknown endpoint error.';
      if (global.console && typeof global.console.warn === 'function') {
        global.console.warn('BA FOX live read failed.', {
          route: route,
          message: diagnosticMessage,
          error: clientError,
        });
      }
      return global.BAFoxUiState.error(route, clientError, {
        isMock: false,
        fallbackData: null,
        message: authenticationRequired
          ? 'Войдите через Google рабочим аккаунтом, чтобы открыть данные.'
          : rateLimited
          ? RATE_LIMIT_MESSAGE
          : timedOut
            ? TIMEOUT_MESSAGE
            : 'Не удалось загрузить live-данные. Демо-задачи не подставляются.',
      });
    }
  }

  global.BAFoxClient = Object.freeze({
    READ_ONLY_ROUTES,
    buildRouteUrl,
    createLoadingState: global.BAFoxUiState.loading,
    getScaffoldInfo: function () {
      return readRoute('scaffoldInfo', {});
    },
    getTodayTasks: function (options) {
      return readRoute('today', options || {});
    },
    getInboxTasks: function (options) {
      return readRoute('inbox', options || {});
    },
    getFocusTasks: function (options) {
      return readRoute('focus', options || {});
    },
    getOpenTasks: function (options) {
      return readRoute('open', options || {});
    },
    getPushTasks: function (options) {
      return readRoute('pushes', options || {});
    },
    getCompletedTasks: function (options) {
      return readRoute('completed', options || {});
    },
    getDashboard: function (options) {
      return readRoute('dashboard', options || {});
    },
    getWorkspaceDashboard: function (options) {
      return readRoute('workspaceDashboard', options || {});
    },
    getFullDashboard: function (options) {
      return readRoute('fullDashboard', options || {});
    },
    getCleanupAudit: function (options) {
      return readRoute('cleanupAudit', options || {});
    },
    getSafetyStatus: function () {
      return readRoute('safetyStatus', {});
    },
    getProfile: function (options) {
      return readRoute('profile', options || {});
    },
    getTaskIdentitySchema: function (options) {
      return readRoute('taskIdentitySchema', options || {});
    },
    getActiveUsers: function (options) {
      return readRoute('activeUsers', options || {});
    },
    getVisibilityPreview: function (options) {
      return readRoute('visibilityPreview', options || {});
    },
    createProject: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) {
        throw new Error('Создание проектов недоступно без live-источника.');
      }
      requireWriteCredential(options, config);
      try {
        return await getJsonp('createProject', writeRequestParams(options, config));
      } catch (error) {
        if (error && error.code && PROJECT_MESSAGES[error.code]) {
          error.message = PROJECT_MESSAGES[error.code];
        }
        throw error;
      }
    },
    updateProject: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) {
        throw new Error('Редактирование проектов недоступно без live-источника.');
      }
      requireWriteCredential(options, config);
      try {
        return await getJsonp('updateProject', writeRequestParams(options, config));
      } catch (error) {
        if (error && error.code && PROJECT_MESSAGES[error.code]) {
          error.message = PROJECT_MESSAGES[error.code];
        }
        throw error;
      }
    },
    createDeal: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) throw new Error('Создание карточек воронки недоступно без live-источника.');
      requireWriteCredential(options, config);
      return getJsonp('createDeal', writeRequestParams(options, config));
    },
    updateDeal: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) throw new Error('Редактирование карточек воронки недоступно без live-источника.');
      requireWriteCredential(options, config);
      return getJsonp('updateDeal', writeRequestParams(options, config));
    },
    prepareTaskIdentityColumns: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) {
        throw new Error('Подготовка колонок отключена в demo mode.');
      }
      requireWriteCredential(options, config);
      try {
        return await getJsonp('prepareTaskIdentityColumns', writeRequestParams(options, config));
      } catch (error) {
        if (error && error.code === 'SAFE_WRITES_DISABLED') {
          error.message = 'Безопасная запись выключена. Колонки не добавлены.';
        }
        if (error && error.code === 'ADMIN_OR_TOKEN_REQUIRED') {
          error.message = 'Нужен подтверждённый Google-профиль администратора.';
        }
        throw error;
      }
    },
    runTaskAction: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) {
        throw new Error('Безопасные действия отключены в демо-режиме.');
      }
      requireWriteCredential(options, config);
      try {
        return await getJsonp('taskAction', writeRequestParams(options, config));
      } catch (error) {
        if (error && error.code && TASK_ACTION_MESSAGES[error.code]) {
          error.message = TASK_ACTION_MESSAGES[error.code];
        }
        throw error;
      }
    },
    createTask: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) {
        throw new Error('Создание задач отключено в demo mode.');
      }
      requireWriteCredential(options, config);
      try {
        return await getJsonp('createTask', writeRequestParams(options, config));
      } catch (error) {
        if (error && error.code && CREATE_TASK_MESSAGES[error.code]) {
          error.message = CREATE_TASK_MESSAGES[error.code];
        }
        if (global.console && typeof global.console.warn === 'function' && error && error.details) {
          global.console.warn('BA Fox createTask rejected request details.', {
            code: error.code,
            details: error.details,
          });
        }
        throw error;
      }
    },
    editTask: async function (options) {
      const config = global.BAFoxConfig.getConfig();
      if (config.useMockData) {
        throw new Error('Обновление задач отключено в demo mode.');
      }
      requireWriteCredential(options, config);
      try {
        return await getJsonp('editTask', writeRequestParams(options, config));
      } catch (error) {
        if (error && error.code && EDIT_TASK_MESSAGES[error.code]) {
          error.message = EDIT_TASK_MESSAGES[error.code];
        }
        throw error;
      }
    },
  });
}(window));

(function (global) {
  const scaffoldInfo = {
    version: 'v2.6i-mock-client',
    dryRun: true,
    readLiveSheets: true,
    safeWritesEnabled: false,
    liveAutomationEnabled: false,
    triggersEnabled: false,
    source: 'mock',
  };

  const tasks = [
    {
      id: 'MOCK-001',
      title: 'Подготовить пакет документов для партнера',
      organization: 'Demo Partner',
      owner: 'Лиза',
      priority: 'High',
      status: 'В работе',
      taskType: 'work',
      deadline: '2026-05-25',
      nextReminder: '',
      controlDate: '',
      focus: true,
      comment: 'Mock data only',
      archived: false,
    },
    {
      id: 'MOCK-002',
      title: 'Уточнить обратную связь по интеграции',
      organization: 'Demo Bank',
      owner: 'Сотрудник 1',
      priority: 'High',
      status: 'Ждём ответ',
      taskType: 'work',
      deadline: '2026-05-25',
      nextReminder: '2026-05-25',
      controlDate: '2026-05-25',
      focus: false,
      comment: 'Mock data only',
      archived: false,
    },
    {
      id: 'MOCK-003',
      title: 'Напомнить о следующем шаге',
      organization: 'Demo Vendor',
      owner: 'Сотрудник 2',
      priority: 'Medium',
      status: 'Пуш',
      taskType: 'work',
      deadline: '2026-05-25',
      nextReminder: '2026-05-25',
      controlDate: '2026-05-25',
      focus: false,
      comment: 'Mock data only',
      archived: false,
    },
    {
      id: 'MOCK-004',
      title: 'Проверить недостающий документ',
      organization: 'Demo Project',
      owner: '',
      priority: 'High',
      status: 'Блокер',
      taskType: 'work',
      deadline: '2026-05-26',
      nextReminder: '',
      controlDate: '',
      focus: false,
      comment: 'Mock data only',
      archived: false,
    },
    {
      id: 'MOCK-005',
      title: 'Прояснить владельца задачи',
      organization: 'Demo Team',
      owner: 'Лиза',
      priority: 'Medium',
      status: 'Нужно уточнить',
      taskType: 'work',
      deadline: '2026-05-26',
      nextReminder: '',
      controlDate: '',
      focus: false,
      comment: 'Mock data only',
      archived: false,
    },
    {
      id: 'MOCK-006',
      title: 'Закрытый пример для истории',
      organization: 'Demo Archive',
      owner: 'Сотрудник 1',
      priority: 'Low',
      status: 'Выполнено',
      taskType: 'work',
      deadline: '2026-05-24',
      nextReminder: '',
      controlDate: '',
      focus: false,
      comment: 'Mock data only',
      archived: false,
    },
  ];

  const cleanupAudit = {
    summary: {
      rowsChecked: 32,
      duplicateGroups: 1,
      nearDuplicateGroups: 2,
      nonCanonicalStatuses: 3,
      nonCanonicalPriorities: 2,
      missingV2Fields: 4,
      vagueDates: 3,
      activeLegacyRows: 2,
      archiveCandidates: 1,
    },
    items: [
      {
        rowNumber: 4,
        taskId: 'MOCK-001',
        issueType: 'DUPLICATE_ID',
        currentValue: 'MOCK-001',
        proposedValue: 'MOCK-001',
        confidence: 0.95,
        suggestedAction: 'MERGE_CONTEXT_ONLY',
        needsAdminApproval: true,
        notes: 'Duplicate task ID appears in demo audit output. Review before choosing a primary row.',
      },
      {
        rowNumber: 7,
        taskId: 'MOCK-002',
        issueType: 'STATUS_NORMALIZATION',
        currentValue: 'Waiting',
        proposedValue: 'Ждём ответ',
        confidence: 0.85,
        suggestedAction: 'NORMALIZE',
        needsAdminApproval: true,
        notes: 'Demo-only suggestion. No cleanup action is available in the UI.',
      },
      {
        rowNumber: 12,
        taskId: 'MOCK-009',
        issueType: 'NEAR_DUPLICATE',
        currentValue: 'Demo Bank / Уточнить обратную связь',
        proposedValue: '',
        confidence: 0.75,
        suggestedAction: 'REVIEW_REQUIRED',
        needsAdminApproval: true,
        notes: 'Same organization and normalized title appear elsewhere. Review only.',
      },
      {
        rowNumber: 15,
        taskId: 'MOCK-011',
        issueType: 'PRIORITY_NORMALIZATION',
        currentValue: 'Medium',
        proposedValue: 'Средний',
        confidence: 0.9,
        suggestedAction: 'NORMALIZE',
        needsAdminApproval: true,
        notes: 'Priority mapping can be reviewed before any future cleanup write stage.',
      },
      {
        rowNumber: 16,
        taskId: 'MOCK-012',
        issueType: 'TASK_TYPE_MISSING',
        currentValue: '',
        proposedValue: 'work',
        confidence: 0.5,
        suggestedAction: 'REVIEW_REQUIRED',
        needsAdminApproval: true,
        notes: 'Active row has missing V2 task type. Display-only default is not a write decision.',
      },
      {
        rowNumber: 17,
        taskId: 'MOCK-013',
        issueType: 'OWNER_MISSING',
        currentValue: '',
        proposedValue: 'Lisa',
        confidence: 0.5,
        suggestedAction: 'REVIEW_REQUIRED',
        needsAdminApproval: true,
        notes: 'Active row has missing owner. Lisa approval is required before cleanup.',
      },
      {
        rowNumber: 18,
        taskId: 'MOCK-014',
        issueType: 'CORRUPTED_FIELD',
        currentValue: 'Deadline: Сегодня',
        proposedValue: '',
        confidence: 0.65,
        suggestedAction: 'REVIEW_REQUIRED',
        needsAdminApproval: true,
        notes: 'Human-readable date should be reviewed before a machine control date is added.',
      },
      {
        rowNumber: 22,
        taskId: 'MOCK-006',
        issueType: 'ARCHIVE_CANDIDATE',
        currentValue: 'Выполнено',
        proposedValue: 'Архив',
        confidence: 0.65,
        suggestedAction: 'ARCHIVE_AFTER_APPROVAL',
        needsAdminApproval: true,
        notes: 'Suggestion only. The dashboard does not archive or modify rows.',
      },
    ],
  };

  const safetyStatus = {
    dryRun: true,
    readLive: true,
    readLiveSheets: true,
    safeWritesEnabled: false,
    liveAutomationEnabled: false,
    triggersEnabled: false,
    sheets: {
      AuditLog: {
        sheet: 'AuditLog',
        exists: true,
        status: 'headers_only',
        headerColumns: 10,
        dataRows: 0,
        headersOnly: true,
      },
      Reports: {
        sheet: 'Reports',
        exists: true,
        status: 'headers_only',
        headerColumns: 10,
        dataRows: 0,
        headersOnly: true,
      },
      NotificationQueue: {
        sheet: 'NotificationQueue',
        exists: true,
        status: 'headers_only',
        headerColumns: 12,
        dataRows: 0,
        headersOnly: true,
      },
    },
    counts: {
      AuditLog: 0,
      Reports: 0,
      NotificationQueue: 0,
    },
  };

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function success(data) {
    return {
      ok: true,
      data: data,
      error: null,
    };
  }

  function getTodayData(date) {
    return {
      date: date || '2026-05-25',
      dryRun: true,
      readLive: true,
      tasks: tasks.slice(0, 3),
    };
  }

  function getInboxData(date) {
    return {
      date: date || '2026-05-25',
      dryRun: true,
      readLive: true,
      tasks: tasks.slice(4, 5),
    };
  }

  function getFocusData(date) {
    return {
      date: date || '2026-05-25',
      limit: 5,
      dryRun: true,
      readLive: true,
      tasks: tasks.slice(0, 4),
    };
  }

  function getOpenData(taskType) {
    return {
      taskType: taskType || 'all',
      dryRun: true,
      readLive: true,
      tasks: tasks.filter(function (task) {
        const open = task.status !== 'Выполнено';
        const typeMatches = !taskType || taskType === 'all' || task.taskType === taskType;
        return open && typeMatches;
      }),
    };
  }

  function getPushData(dateRange) {
    return {
      dateRange: dateRange || 'today',
      dryRun: true,
      readLive: true,
      tasks: tasks.filter(function (task) {
        return ['Ждём ответ', 'Пуш'].includes(task.status);
      }),
    };
  }

  function getCompletedData() {
    return {
      dryRun: true,
      readLive: true,
      tasks: tasks.filter(function (task) {
        return task.status === 'Выполнено';
      }),
    };
  }

  const profileData = {
    identityMode: 'mock_profile_route',
    profile: {
      userId: 'identity_missing',
      email: '',
      displayName: 'Не выполнен вход',
      title: '',
      accessRole: 'viewer',
      status: 'identity_missing',
      department: '',
      defaultOwnerLabel: '',
      accentColor: 'green',
      canSeeAll: false,
      isAuthenticated: false,
      isRegistered: false,
      isAllowedDomain: false,
    },
    allowedDomain: 'mfstream.io',
    isBackendEnforced: false,
    enforcementMode: 'profile_only',
    backendEnforcementStatus: 'partial',
    usersSheet: {
      sheet: 'Users',
      exists: false,
      status: 'mock_missing',
      headerColumns: 0,
      dataRows: 0,
      expectedHeaders: [
        'userId',
        'email',
        'displayName',
        'title',
        'accessRole',
        'status',
        'department',
        'defaultOwnerLabel',
        'accentColor',
        'canSeeAll',
        'createdAt',
        'updatedAt',
      ],
    },
    limitations: [
      'Mock profile route only. Backend Apps Script deployment is required for real active user email detection.',
      'Dashboard visibility is not filtered yet.',
    ],
    permissions: {
      canSeeAll: false,
      canCreateTasks: false,
      canUseDashboard: true,
      canManageUsers: false,
      canWrite: false,
    },
    canSeeAll: false,
    canCreateTasks: false,
    canUseDashboard: true,
    canManageUsers: false,
    tokenVerification: {
      ok: false,
      mode: 'missing_token',
      error: '',
    },
  };

  const taskIdentitySchema = {
    taskIdentitySchema: {
      status: 'partial',
      requiredLegacyColumnsOk: true,
      optionalColumnsPresent: {
        ownerEmail: true,
        ownerUserId: true,
        collaboratorEmails: false,
        collaboratorUserIds: false,
        createdByEmail: true,
        createdByUserId: true,
        visibility: true,
      },
      optionalColumns: {
        ownerEmail: { present: true, header: 'Owner Email', recommendedHeader: 'Owner Email', column: 26 },
        ownerUserId: { present: true, header: 'Owner User ID', recommendedHeader: 'Owner User ID', column: 27 },
        collaboratorEmails: { present: false, header: '', recommendedHeader: 'Collaborator Emails', column: 0 },
        collaboratorUserIds: { present: false, header: '', recommendedHeader: 'Collaborator User IDs', column: 0 },
        createdByEmail: { present: true, header: 'Created By Email', recommendedHeader: 'Created By Email', column: 28 },
        createdByUserId: { present: true, header: 'Created By User ID', recommendedHeader: 'Created By User ID', column: 29 },
        visibility: { present: true, header: 'Visibility', recommendedHeader: 'Visibility', column: 30 },
      },
      missingColumns: ['Collaborator Emails', 'Collaborator User IDs'],
      recommendedColumns: [
        'Owner Email',
        'Owner User ID',
        'Collaborator Emails',
        'Collaborator User IDs',
        'Created By Email',
        'Created By User ID',
        'Visibility',
      ],
      canSafelyMigrate: true,
      migrationAlreadyDone: false,
      optionalIdentityWriteActive: true,
    },
  };

  const activeUsers = {
    users: [
      {
        userId: 'user_liza_kiseleva',
        email: 'liza@mfstream.io',
        displayName: 'Liza Kiseleva',
        accessRole: 'admin',
        defaultOwnerLabel: 'Лиза',
        department: 'Админ / EA',
        status: 'active',
      },
      {
        userId: 'user_andrey_zaytsev',
        email: 'andrey.zaytsev@mfstream.io',
        displayName: 'Andrey Zaytsev',
        accessRole: 'member',
        defaultOwnerLabel: 'Андрей',
        department: 'Операции',
        status: 'active',
      },
      {
        userId: 'user_daniil_lebedev',
        email: 'daniil.lebedev@mfstream.io',
        displayName: 'Daniil Lebedev',
        accessRole: 'member',
        defaultOwnerLabel: 'Даниил',
        department: 'Продукт / IT',
        status: 'active',
      },
    ],
  };

  const visibilityPreview = {
    visibilityPreview: {
      mode: 'dry_run',
      filteredByUser: false,
      wouldFilterInEnforcedMode: true,
      effectiveUser: 'andrey.zaytsev@mfstream.io',
      effectiveUserId: 'user_andrey_zaytsev',
      effectiveRole: 'member',
      previewedByAdmin: true,
      totalTasks: tasks.length,
      visibleIfEnforced: 2,
      hiddenIfEnforced: tasks.length - 2,
      legacyUnclassified: 4,
      reasonCounts: {
        canSeeAll: 0,
        ownerEmail: 0,
        ownerUserId: 0,
        ownerLabel: 2,
        collaboratorEmail: 0,
        collaboratorUserId: 0,
        createdBy: 0,
        legacyUnclassified: 4,
        noMatch: tasks.length - 2,
      },
    },
  };

  const dashboardIdentity = {
    identityMode: 'mock_profile_route',
    enforcementMode: 'profile_only',
    visibilityMode: 'profile_only',
    filteredByUser: false,
    taskIdentitySchema: {
      sheet: 'Tasks',
      exists: true,
      status: 'missing',
      allPresent: false,
      anyPresent: false,
      presentColumns: [],
      missingColumns: [
        'Owner Email',
        'Owner User ID',
        'Collaborator Emails',
        'Collaborator User IDs',
        'Created By Email',
        'Created By User ID',
        'Visibility',
      ],
      recommendedTaskIdentityColumns: [
        'Owner Email',
        'Owner User ID',
        'Collaborator Emails',
        'Collaborator User IDs',
        'Created By Email',
        'Created By User ID',
        'Visibility',
      ],
    },
    optionalIdentityColumnsPresent: false,
    identityWarnings: [
      'TASK_IDENTITY_COLUMNS_OPTIONAL_OR_MISSING',
      'TASK_VISIBILITY_NOT_ENFORCED',
    ],
    recommendedTaskIdentityColumns: [
      'Owner Email',
      'Owner User ID',
      'Collaborator Emails',
      'Collaborator User IDs',
      'Created By Email',
      'Created By User ID',
      'Visibility',
    ],
    effectiveRole: 'viewer',
    canSeeAll: false,
    canCreateTasks: false,
    canUseDashboard: true,
    canManageUsers: false,
    route: 'dashboard',
    limitations: profileData.limitations,
    taskIdentitySchema: clone(taskIdentitySchema.taskIdentitySchema),
    visibilityPreview: clone(visibilityPreview.visibilityPreview),
  };

  function getResponse(route, params) {
    const input = params || {};

    switch (route) {
      case 'scaffoldInfo':
        return success(clone(scaffoldInfo));
      case 'today':
        return success(clone(getTodayData(input.date)));
      case 'inbox':
        return success(clone(getInboxData(input.date)));
      case 'focus':
        return success(clone(getFocusData(input.date)));
      case 'open':
        return success(clone(getOpenData(input.taskType)));
      case 'pushes':
        return success(clone(getPushData(input.dateRange)));
      case 'completed':
        return success(clone(getCompletedData()));
      case 'dashboard':
      case 'workspaceDashboard':
        return success({
          scaffoldInfo: clone(scaffoldInfo),
          inbox: clone(getInboxData(input.date)),
          focus: clone(getFocusData(input.date)),
          today: clone(getTodayData(input.date)),
          open: clone(getOpenData(input.taskType)),
          pushes: clone(getPushData(input.dateRange)),
          identity: clone(dashboardIdentity),
        });
      case 'fullDashboard':
        return success({
          scaffoldInfo: clone(scaffoldInfo),
          inbox: clone(getInboxData(input.date)),
          focus: clone(getFocusData(input.date)),
          today: clone(getTodayData(input.date)),
          open: clone(getOpenData(input.taskType)),
          pushes: clone(getPushData(input.dateRange)),
          completed: clone(getCompletedData()),
          cleanupAudit: clone(cleanupAudit),
          identity: clone(Object.assign({}, dashboardIdentity, { route: 'fullDashboard' })),
        });
      case 'cleanupAudit':
        return success(clone(cleanupAudit));
      case 'safetyStatus':
        return success(clone(safetyStatus));
      case 'profile':
      case 'me':
        return success(clone(profileData));
      case 'taskIdentitySchema':
        return success(clone(taskIdentitySchema));
      case 'activeUsers':
        return success(clone(activeUsers));
      case 'visibilityPreview':
        return success(clone(visibilityPreview));
      default:
        return {
          ok: false,
          data: null,
          error: {
            code: 'MOCK_ROUTE_NOT_FOUND',
            message: 'Unknown read-only mock route.',
            details: { route: route },
          },
        };
    }
  }

  global.BAFoxMockData = Object.freeze({
    getResponse,
  });
}(window));

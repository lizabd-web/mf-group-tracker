function baFoxTaskOptionalValue_(row, headers, field) {
  var headerMap = headers && headers.byName ? headers : getTaskHeaderMap_(headers || []);
  return readOptionalCell_(row, headerMap, baFoxOptionalTaskFieldNames_(field));
}

function baFoxSplitIdentityList_(value, normalizeEmail) {
  return baFoxSafeString(value).split(',').map(function(item) {
    var normalized = baFoxSafeString(item);
    return normalizeEmail ? normalizeWorkspaceEmail_(normalized) : normalized;
  }).filter(function(item) {
    return Boolean(item);
  });
}

function baFoxTaskIdentityFieldsAvailable_(headers) {
  return baFoxTaskIdentitySchemaStatus_(headers || []).columns;
}

function baFoxNormalizeTaskRows_(storeResult) {
  if (!storeResult) {
    return [];
  }
  if (storeResult.normalizedTasks) {
    return storeResult.normalizedTasks;
  }
  var headerMap = getTaskHeaderMap_(storeResult.headers || []);
  storeResult.normalizedTasks = (storeResult.rows || []).map(function(row) {
    return baFoxNormalizeTaskRow(row, headerMap);
  });
  return storeResult.normalizedTasks;
}

function baFoxNormalizeTaskRow(row, headers) {
  var headerMap = headers && headers.byName ? headers : getTaskHeaderMap_(headers || []);
  var nextReminder = row[BA_FOX_CONFIG.TASK_COLUMNS.NEXT_REMINDER - 1] || '';
  var ownerLabel = row[BA_FOX_CONFIG.TASK_COLUMNS.OWNER - 1] || '';
  var ownerEmail = normalizeWorkspaceEmail_(baFoxTaskOptionalValue_(row, headerMap, 'OWNER_EMAIL'));
  var ownerUserId = baFoxSafeString(baFoxTaskOptionalValue_(row, headerMap, 'OWNER_USER_ID'));
  var collaboratorEmailsRaw = baFoxTaskOptionalValue_(row, headerMap, 'COLLABORATOR_EMAILS');
  var collaboratorUserIdsRaw = baFoxTaskOptionalValue_(row, headerMap, 'COLLABORATOR_USER_IDS');
  var createdByEmail = normalizeWorkspaceEmail_(baFoxTaskOptionalValue_(row, headerMap, 'CREATED_BY_EMAIL'));
  var createdByUserId = baFoxSafeString(baFoxTaskOptionalValue_(row, headerMap, 'CREATED_BY_USER_ID'));
  var visibility = baFoxSafeString(baFoxTaskOptionalValue_(row, headerMap, 'VISIBILITY')) || 'unassigned';
  var projectId = baFoxSafeString(baFoxTaskOptionalValue_(row, headerMap, 'PROJECT_ID'));
  var parentTaskId = baFoxSafeString(baFoxTaskOptionalValue_(row, headerMap, 'PARENT_TASK_ID'));
  return {
    id: row[BA_FOX_CONFIG.TASK_COLUMNS.ID - 1] || '',
    date: baFoxTaskDateValue(row[BA_FOX_CONFIG.TASK_COLUMNS.DATE - 1]),
    category: row[BA_FOX_CONFIG.TASK_COLUMNS.CATEGORY - 1] || '',
    organization: row[BA_FOX_CONFIG.TASK_COLUMNS.ORGANIZATION - 1] || '',
    title: row[BA_FOX_CONFIG.TASK_COLUMNS.TITLE - 1] || '',
    steps: row[BA_FOX_CONFIG.TASK_COLUMNS.STEPS - 1] || '',
    source: row[BA_FOX_CONFIG.TASK_COLUMNS.SOURCE - 1] || '',
    priority: row[BA_FOX_CONFIG.TASK_COLUMNS.PRIORITY - 1] || '',
    deadline: baFoxTaskDateValue(row[BA_FOX_CONFIG.TASK_COLUMNS.DEADLINE - 1]),
    reminderMode: row[BA_FOX_CONFIG.TASK_COLUMNS.REMINDER_MODE - 1] || '',
    status: row[BA_FOX_CONFIG.TASK_COLUMNS.STATUS - 1] || '',
    nextReminder: nextReminder,
    controlDate: baFoxTaskOptionalValue_(row, headers, 'CONTROL_DATE') || nextReminder,
    comment: row[BA_FOX_CONFIG.TASK_COLUMNS.COMMENT - 1] || '',
    channel: row[BA_FOX_CONFIG.TASK_COLUMNS.CHANNEL - 1] || '',
    taskType: row[BA_FOX_CONFIG.TASK_COLUMNS.TASK_TYPE - 1] || 'work',
    owner: ownerLabel,
    ownerLabel: ownerLabel,
    ownerEmail: ownerEmail,
    ownerUserId: ownerUserId,
    collaboratorEmails: baFoxSafeString(collaboratorEmailsRaw),
    collaboratorUserIds: baFoxSafeString(collaboratorUserIdsRaw),
    collaboratorEmailList: baFoxSplitIdentityList_(collaboratorEmailsRaw, true),
    collaboratorUserIdList: baFoxSplitIdentityList_(collaboratorUserIdsRaw, false),
    createdByEmail: createdByEmail,
    createdByUserId: createdByUserId,
    visibility: visibility,
    projectId: projectId,
    parentTaskId: parentTaskId,
    identityFieldsAvailable: baFoxTaskIdentityFieldsAvailable_(headerMap.headers),
    createdAt: row[BA_FOX_CONFIG.TASK_COLUMNS.CREATED_AT - 1] || '',
    updatedAt: row[BA_FOX_CONFIG.TASK_COLUMNS.UPDATED_AT - 1] || '',
    completedAt: row[BA_FOX_CONFIG.TASK_COLUMNS.COMPLETED_AT - 1] || '',
    reminderRecurrence: row[BA_FOX_CONFIG.TASK_COLUMNS.REMINDER_RECURRENCE - 1] || '',
    notificationChannels: row[BA_FOX_CONFIG.TASK_COLUMNS.NOTIFICATION_CHANNELS - 1] || '',
    notificationStatus: row[BA_FOX_CONFIG.TASK_COLUMNS.NOTIFICATION_STATUS - 1] || '',
    appSource: row[BA_FOX_CONFIG.TASK_COLUMNS.APP_SOURCE - 1] || '',
    externalRef: row[BA_FOX_CONFIG.TASK_COLUMNS.EXTERNAL_REF - 1] || '',
    archived: baFoxIsTrueValue_(row[BA_FOX_CONFIG.TASK_COLUMNS.ARCHIVED - 1]),
    focus: baFoxIsTrueValue_(baFoxTaskOptionalValue_(row, headerMap, 'FOCUS'))
  };
}

function baFoxIsTrueValue_(value) {
  return value === true || baFoxSafeString(value).toUpperCase() === 'TRUE';
}

function baFoxNormalizeMatchValue_(value) {
  return baFoxSafeString(value).toLowerCase();
}

function baFoxStatusMatches_(status, values) {
  var normalizedStatus = baFoxNormalizeMatchValue_(status);
  return values.some(function(value) {
    return normalizedStatus === baFoxNormalizeMatchValue_(value);
  });
}

function baFoxTaskNeedsControl_(task) {
  var signalText = [
    task.status,
    task.category,
    task.reminderMode
  ].map(baFoxNormalizeMatchValue_).join(' ');

  return BA_FOX_CONFIG.CONTROL_SIGNALS.some(function(signal) {
    return signalText.indexOf(baFoxNormalizeMatchValue_(signal)) !== -1;
  });
}

function baFoxTaskDateIso_(value) {
  var match = baFoxSafeString(value).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function baFoxTaskIsFinal_(task) {
  return task.archived || baFoxStatusMatches_(task.status, BA_FOX_CONFIG.FINAL_STATUSES);
}

function baFoxTaskIsOverdue_(task, date) {
  var deadline = baFoxTaskDateIso_(task.deadline);
  var controlDate = baFoxTaskDateIso_(task.controlDate || task.nextReminder);
  return (deadline && deadline < date) || (controlDate && controlDate < date);
}

function baFoxTaskIsTodayRelevant_(task, date) {
  var deadline = baFoxTaskDateIso_(task.deadline);
  var controlDate = baFoxTaskDateIso_(task.controlDate || task.nextReminder);
  return !baFoxTaskIsFinal_(task) && (
    baFoxTaskIsOverdue_(task, date)
    || deadline === date
    || controlDate === date
    || baFoxNormalizeMatchValue_(task.nextReminder).indexOf('сегодня') !== -1
  );
}

function baFoxTaskIsHighPriority_(task) {
  var priority = baFoxNormalizeMatchValue_(task.priority);
  return priority.indexOf('high') !== -1
    || priority.indexOf('высок') !== -1
    || priority.indexOf('важно') !== -1;
}

function baFoxTaskIsFocusCandidate_(task, date) {
  var text = [
    task.status,
    task.category,
    task.reminderMode,
    task.comment,
    task.title
  ].map(baFoxNormalizeMatchValue_).join(' ');
  return !baFoxTaskIsFinal_(task) && (
    task.focus === true
    || baFoxTaskIsTodayRelevant_(task, date)
    || baFoxTaskIsHighPriority_(task)
    || text.indexOf('фокус') !== -1
    || text.indexOf('focus') !== -1
    || text.indexOf('пуш') !== -1
    || text.indexOf('push') !== -1
    || text.indexOf('блокер') !== -1
    || text.indexOf('blocker') !== -1
  );
}

function baFoxTaskPriorityScore_(task, date) {
  var score = 0;
  if (task.focus === true) score += 100;
  if (baFoxTaskIsOverdue_(task, date)) score += 80;
  if (baFoxTaskIsTodayRelevant_(task, date)) score += 60;
  if (baFoxTaskIsHighPriority_(task)) score += 35;
  if (baFoxTaskNeedsControl_(task)) score += 20;
  return score;
}

function baFoxTaskLooksLikeInbox_(task) {
  var source = baFoxNormalizeMatchValue_([task.source, task.appSource, task.channel].join(' '));
  var category = baFoxNormalizeMatchValue_(task.category);
  var nextAction = baFoxNormalizeMatchValue_(task.steps);
  return !baFoxTaskIsFinal_(task) && (
    source.indexOf('ba fox web') !== -1
    || source.indexOf('telegram') !== -1
    || source.indexOf('chatgpt') !== -1
    || source.indexOf('gmail') !== -1
    || !category
    || !nextAction
    || nextAction === 'определить следующий шаг'
  );
}

function baFoxListTodayTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var date = baFoxDateOrToday(normalized.date);
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    date: date,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      return baFoxTaskIsTodayRelevant_(task, date);
    })
  };
}

function baFoxListOpenTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var taskType = baFoxSafeString(normalized.taskType || normalized.scope || 'all');
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    taskType: taskType,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      var typeMatches = taskType === 'all' || task.taskType === taskType;
      return !baFoxTaskIsFinal_(task) && typeMatches;
    })
  };
}

function baFoxListAllTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var taskType = baFoxSafeString(normalized.taskType || normalized.scope || 'all');
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    taskType: taskType,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      return taskType === 'all' || task.taskType === taskType;
    })
  };
}

function baFoxListInboxTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var date = baFoxDateOrToday(normalized.date);
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    date: date,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      return baFoxTaskLooksLikeInbox_(task) && !baFoxTaskIsTodayRelevant_(task, date);
    })
  };
}

function baFoxListFocusTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var date = baFoxDateOrToday(normalized.date);
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    date: date,
    limit: 5,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      return baFoxTaskIsFocusCandidate_(task, date);
    }).sort(function(left, right) {
      return baFoxTaskPriorityScore_(right, date) - baFoxTaskPriorityScore_(left, date);
    }).slice(0, 5)
  };
}

function baFoxListPushTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var dateRange = baFoxSafeString(normalized.dateRange || 'today');
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    dateRange: dateRange,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      return !baFoxTaskIsFinal_(task) && baFoxTaskNeedsControl_(task);
    })
  };
}

function baFoxListCompletedTasks(request, storeResult) {
  var normalized = baFoxNormalizeRequest(request);
  var limit = Math.max(1, Math.min(Number(normalized.limit || 50), 100));
  storeResult = storeResult || baFoxReadTasksRows();

  return {
    limit: limit,
    dryRun: storeResult.dryRun,
    readLive: storeResult.readLive,
    warning: storeResult.warning,
    tasks: baFoxNormalizeTaskRows_(storeResult).filter(function(task) {
      return !task.archived && (baFoxStatusMatches_(task.status, BA_FOX_CONFIG.FINAL_STATUSES) || task.completedAt);
    }).sort(function(left, right) {
      return baFoxSafeString(right.completedAt || right.updatedAt || right.deadline)
        .localeCompare(baFoxSafeString(left.completedAt || left.updatedAt || left.deadline));
    }).slice(0, limit)
  };
}

function baFoxCreateTask(request) {
  var normalized = baFoxNormalizeRequest(request);
  var missing = baFoxRequired(normalized, ['title', 'taskType']);
  if (missing.length) {
    return baFoxError('VALIDATION_ERROR', 'Missing required fields.', { missing: missing });
  }

  if (!baFoxValidateTaskType(normalized.taskType)) {
    return baFoxError('VALIDATION_ERROR', 'Invalid task type.', { taskType: normalized.taskType });
  }

  var now = baFoxIsoNow();
  var taskId = baFoxBuildTaskId(normalized.deadline || normalized.date);
  var rowValues = [
    taskId,
    normalized.date || '',
    normalized.category || '',
    normalized.organization || '',
    normalized.title,
    normalized.steps || '',
    normalized.source || 'Web',
    normalized.priority || '',
    normalized.deadline || '',
    normalized.reminderMode || '',
    normalized.status || 'Not started',
    '',
    normalized.comment || '',
    normalized.channel || 'Web',
    normalized.taskType,
    normalized.owner || 'Lisa',
    now,
    now,
    '',
    normalized.reminderRecurrence || 'none',
    normalized.notificationChannels || '',
    '',
    normalized.appSource || 'web',
    normalized.externalRef || '',
    false
  ];

  var appendResult = baFoxAppendTaskRow(rowValues);
  var auditResult = baFoxAuditEvent('task.create', 'task', taskId, {
    actor: normalized.actor || 'Lisa'
  });

  return baFoxOk({
    taskId: taskId,
    dryRun: true,
    appendResult: appendResult,
    auditResult: auditResult
  });
}

function baFoxCreateTaskAllowedKeys_() {
  return [
    'route',
    'callback',
    'token',
    'idToken',
    'identityToken',
    'credential',
    'googleCredential',
    'title',
    'owner',
    'collaboratorEmails',
    'projectId',
    'parentTaskId',
    'organization',
    'nextAction',
    'deadline',
    'controlDate',
    'reminder',
    'status',
    'priority',
    'category',
    'comment'
  ];
}

function baFoxRejectedCreateTaskKeys_(request) {
  var allowed = baFoxCreateTaskAllowedKeys_();
  return Object.keys(request || {}).filter(function(key) {
    return allowed.indexOf(key) === -1 && baFoxSafeString(request[key]);
  });
}

function baFoxValidateCreateTaskScalar_(request, fields) {
  return fields.filter(function(field) {
    var value = request[field];
    return Array.isArray(value) || (value && typeof value === 'object');
  });
}

function baFoxValidateCreateTaskDeadline_(deadline) {
  var value = baFoxSafeString(deadline);
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function baFoxValidateCreateTaskStatus_(status) {
  var value = baFoxSafeString(status);
  if (!value) {
    return true;
  }
  return [
    'Not Started',
    'In Progress',
    'Waiting',
    'Waiting Reply',
    'Push',
    'Blocked',
    'Blocker',
    'Done',
    'Completed',
    'Не начато',
    'В работе',
    'Ждём',
    'Ждем',
    'Ждём ответ',
    'Ждем ответ',
    'Пуш',
    'Блокер',
    'Выполнено'
  ].indexOf(value) !== -1;
}

function baFoxValidateCreateTaskPriority_(priority) {
  var value = baFoxSafeString(priority);
  if (!value) {
    return true;
  }
  return ['High', 'Medium', 'Low', 'Высокий', 'Средний', 'Низкий'].indexOf(value) !== -1;
}

function baFoxBuildSafeCreateTaskId_(now) {
  var compactNow = baFoxSafeString(now).replace(/[^0-9]/g, '').slice(0, 14);
  var suffix = Math.floor(Math.random() * 1000000).toString();
  while (suffix.length < 6) {
    suffix = '0' + suffix;
  }
  return 'BA-WEB-' + compactNow + '-' + suffix;
}

function baFoxSafeCreateTaskRow_(taskId, normalized, now) {
  var controlDate = baFoxSafeString(normalized.controlDate || normalized.deadline);
  var reminder = baFoxSafeString(normalized.reminder);
  var status = baFoxSafeString(normalized.status || 'Не начато');
  return [
    taskId,
    '',
    baFoxSafeString(normalized.category),
    baFoxSafeString(normalized.organization),
    baFoxSafeString(normalized.title),
    baFoxSafeString(normalized.nextAction),
    'MF Group Tracker',
    baFoxSafeString(normalized.priority),
    controlDate,
    reminder ? 'date' : '',
    status,
    controlDate || reminder,
    baFoxSafeString(normalized.comment),
    'Web',
    'work',
    baFoxSafeString(normalized.owner || 'Лиза'),
    now,
    now,
    '',
    'none',
    '',
    '',
    'web',
    '',
    false
  ];
}

function baFoxCreateTaskIdentityMetadata_(normalized, profile) {
  var ownerMatch = findUserByOwnerLabel_(normalized.owner || 'Лиза');
  var ownerUser = ownerMatch.user || null;
  var warnings = [];
  if (ownerMatch.ambiguous) {
    warnings.push('OWNER_LABEL_AMBIGUOUS');
  }
  if (!ownerUser && ownerMatch.warning) {
    warnings.push(ownerMatch.warning);
  }
  var collaboratorResolution = baFoxResolveCreateTaskCollaborators_(normalized.collaboratorEmails, ownerUser);
  if (collaboratorResolution.invalidEmails.length) {
    warnings.push('COLLABORATOR_NOT_ACTIVE');
  }
  return {
    ownerEmail: ownerUser ? ownerUser.email : '',
    ownerUserId: ownerUser ? ownerUser.userId : '',
    collaboratorEmails: collaboratorResolution.emails.join(','),
    collaboratorUserIds: collaboratorResolution.userIds.join(','),
    createdByEmail: profile && profile.isAuthenticated ? normalizeWorkspaceEmail_(profile.email) : '',
    createdByUserId: profile && profile.isAuthenticated ? baFoxSafeString(profile.userId) : '',
    visibility: baFoxSafeString(normalized.visibility || 'team'),
    projectId: baFoxSafeString(normalized.projectId),
    parentTaskId: baFoxSafeString(normalized.parentTaskId),
    ownerResolution: {
      input: baFoxSafeString(normalized.owner || 'Лиза'),
      matched: Boolean(ownerUser),
      ambiguous: ownerMatch.ambiguous === true,
      matchedCount: ownerMatch.matches ? ownerMatch.matches.length : 0,
      warning: ownerMatch.warning || ''
    },
    collaboratorResolution: collaboratorResolution,
    warnings: warnings
  };
}

function baFoxValidateCreateTaskParent_(parentTaskId, projectId) {
  var normalizedId = baFoxSafeString(parentTaskId);
  if (!normalizedId) {
    return { ok: true, parentTaskId: '', projectId: baFoxSafeString(projectId) };
  }
  var parent = baFoxNormalizeTaskRows_(baFoxReadTasksRows()).filter(function(task) {
    return baFoxSafeString(task.id) === normalizedId;
  })[0];
  if (!parent || parent.archived) {
    return { ok: false, parentTaskId: normalizedId };
  }
  var parentProjectId = baFoxSafeString(parent.projectId);
  var requestedProjectId = baFoxSafeString(projectId);
  if (requestedProjectId && parentProjectId && requestedProjectId !== parentProjectId) {
    return { ok: false, parentTaskId: normalizedId, projectMismatch: true };
  }
  return { ok: true, parentTaskId: normalizedId, projectId: requestedProjectId || parentProjectId };
}

function baFoxValidateCreateTaskProject_(projectId) {
  var normalizedId = baFoxSafeString(projectId);
  if (!normalizedId) {
    return { ok: true, projectId: '' };
  }
  var project = baFoxListProjects_().filter(function(item) {
    return baFoxSafeString(item.id) === normalizedId;
  })[0];
  if (!project || baFoxNormalizeMatchValue_(project.status) === 'archived') {
    return { ok: false, projectId: normalizedId };
  }
  return { ok: true, projectId: normalizedId };
}

function baFoxResolveCreateTaskCollaborators_(value, ownerUser) {
  var emails = baFoxSplitIdentityList_(value, true);
  var uniqueEmails = [];
  var seen = {};
  var userIds = [];
  var invalidEmails = [];
  emails.forEach(function(email) {
    if (seen[email]) return;
    seen[email] = true;
    var user = findUserByEmail_(email);
    if (!user || user.status !== 'active') {
      invalidEmails.push(email);
      return;
    }
    if (ownerUser && user.email === ownerUser.email) return;
    uniqueEmails.push(user.email);
    if (user.userId) userIds.push(user.userId);
  });
  return {
    emails: uniqueEmails,
    userIds: userIds,
    invalidEmails: invalidEmails
  };
}

function baFoxSafeCreateTask(request) {
  var operationStartedAt = new Date().getTime();
  var normalized = baFoxNormalizeRequest(request);
  var rejectedKeys = baFoxRejectedCreateTaskKeys_(normalized);
  if (rejectedKeys.length) {
    return baFoxError('FIELDS_NOT_ALLOWED', 'Only safe create task fields are allowed.', {
      rejectedFields: rejectedKeys
    });
  }

  var createFields = ['title', 'owner', 'collaboratorEmails', 'projectId', 'parentTaskId', 'organization', 'nextAction', 'deadline', 'controlDate', 'reminder', 'status', 'priority', 'category', 'comment'];
  var objectFields = baFoxValidateCreateTaskScalar_(normalized, createFields);
  if (objectFields.length) {
    return baFoxError('VALIDATION_ERROR', 'Create task fields must be simple text values.', {
      fields: objectFields
    });
  }

  var missing = baFoxRequired(normalized, ['title']);
  if (missing.length) {
    return baFoxError('VALIDATION_ERROR', 'Missing required fields.', { missing: missing });
  }

  normalized.nextAction = baFoxSafeString(normalized.nextAction || normalized.title || 'Определить следующий шаг');
  normalized.owner = baFoxSafeString(normalized.owner || 'Лиза');
  normalized.status = baFoxSafeString(normalized.status || 'Не начато');

  if (!baFoxValidateCreateTaskDeadline_(normalized.deadline)) {
    return baFoxError('VALIDATION_ERROR', 'Deadline must use YYYY-MM-DD format.', {
      deadline: normalized.deadline || ''
    });
  }

  if (!baFoxValidateCreateTaskDeadline_(normalized.controlDate)) {
    return baFoxError('VALIDATION_ERROR', 'Control date must use YYYY-MM-DD format.', {
      controlDate: normalized.controlDate || ''
    });
  }

  if (!baFoxValidateCreateTaskDeadline_(normalized.reminder)) {
    return baFoxError('VALIDATION_ERROR', 'Reminder must use YYYY-MM-DD format.', {
      reminder: normalized.reminder || ''
    });
  }

  if (!baFoxValidateCreateTaskStatus_(normalized.status)) {
    return baFoxError('VALIDATION_ERROR', 'Invalid status.', {
      status: normalized.status || ''
    });
  }

  if (!baFoxValidateCreateTaskPriority_(normalized.priority)) {
    return baFoxError('VALIDATION_ERROR', 'Invalid priority.', {
      priority: normalized.priority || ''
    });
  }

  var formulaFields = createFields.filter(function(field) {
    return baFoxSafeString(normalized[field]) && baFoxLooksLikeFormula_(normalized[field]);
  });
  if (formulaFields.length) {
    return baFoxError('VALIDATION_ERROR', 'Formula-like values are not allowed.', {
      fields: formulaFields
    });
  }

  var identityStartedAt = new Date().getTime();
  var identityCheck = requireAuthorizedSafeWrite_(normalized);
  var identityMs = new Date().getTime() - identityStartedAt;
  if (!identityCheck.ok) {
    return identityCheck.error;
  }

  if (BA_FOX_CONFIG.SAFE_WRITE_MODE !== true) {
    return baFoxError('SAFE_WRITES_DISABLED', 'Safe task creation is disabled.', {});
  }

  var parentCheck = baFoxValidateCreateTaskParent_(normalized.parentTaskId, normalized.projectId);
  if (!parentCheck.ok) {
    return baFoxError('VALIDATION_ERROR', parentCheck.projectMismatch
      ? 'Parent task must belong to the selected project.'
      : 'Parent task must be an existing active task.', {
      parentTaskId: parentCheck.parentTaskId
    });
  }
  normalized.parentTaskId = parentCheck.parentTaskId;
  normalized.projectId = parentCheck.projectId;
  var projectCheck = baFoxValidateCreateTaskProject_(normalized.projectId);
  if (!projectCheck.ok) {
    return baFoxError('VALIDATION_ERROR', 'Project must be an active project from Projects.', {
      projectId: projectCheck.projectId
    });
  }

  var now = baFoxIsoNow();
  var taskId = baFoxBuildSafeCreateTaskId_(now);
  var actorProfile = identityCheck.profile || {};
  var actorLabel = actorProfile.email || actorProfile.displayName || 'MF Group Tracker';
  var identityMetadata = baFoxCreateTaskIdentityMetadata_(normalized, actorProfile);
  if (identityMetadata.collaboratorResolution.invalidEmails.length) {
    return baFoxError('VALIDATION_ERROR', 'Collaborators must be active workspace users.', {
      collaboratorEmails: identityMetadata.collaboratorResolution.invalidEmails
    });
  }
  var appendResponse = baFoxAppendSafeCreateTaskRow(baFoxSafeCreateTaskRow_(taskId, normalized, now), identityMetadata);
  if (!appendResponse.ok) {
    baFoxAuditTaskAction({
      timestamp: now,
      actor: actorLabel,
      taskId: taskId,
      action: 'createTask',
      routeAction: 'createTask',
      source: 'web',
      result: 'failed',
      errorCode: appendResponse.error && appendResponse.error.code
    });
    return appendResponse;
  }

  var auditStartedAt = new Date().getTime();
  var auditResult = baFoxAuditTaskAction({
    timestamp: now,
    actor: actorLabel,
    taskId: taskId,
    action: 'createTask',
    routeAction: 'createTask',
    source: 'web',
    result: 'success',
    errorCode: '',
    newValues: baFoxSafeJson_({
      title: normalized.title || '',
      owner: normalized.owner || 'Лиза',
      collaboratorEmails: identityMetadata.collaboratorEmails,
      projectId: identityMetadata.projectId,
      parentTaskId: identityMetadata.parentTaskId,
      organization: normalized.organization || '',
      category: normalized.category || '',
      status: normalized.status || 'Не начато',
      priority: normalized.priority || '',
      nextAction: normalized.nextAction || '',
      controlDate: normalized.controlDate || normalized.deadline || '',
      reminder: normalized.reminder || '',
      comment: normalized.comment || ''
    }),
    taskIdentityMetadata: baFoxSafeJson_(identityMetadata),
    identityMode: identityCheck.identity && identityCheck.identity.identityMode,
    enforcementMode: identityCheck.identity && identityCheck.identity.enforcementMode
  });

  return baFoxOk({
    taskId: taskId,
    status: normalized.status || 'Не начато',
    owner: normalized.owner || 'Лиза',
    source: 'MF Group Tracker',
    createdAt: now,
    taskIdentityMetadata: identityMetadata,
    appendResult: appendResponse.data,
    auditResult: auditResult,
    taskIdentitySchema: {
      status: appendResponse.data && appendResponse.data.taskIdentitySchema ? appendResponse.data.taskIdentitySchema.status : 'unknown',
      optionalIdentityWriteActive: appendResponse.data && appendResponse.data.optionalIdentityColumnsPresent === true,
      writtenFields: appendResponse.data && appendResponse.data.identityColumnsApplied ? appendResponse.data.identityColumnsApplied : [],
      missingColumns: appendResponse.data && appendResponse.data.identityColumnsMissing ? appendResponse.data.identityColumnsMissing : []
    },
    performance: {
      operation: 'createTask',
      durationMs: new Date().getTime() - operationStartedAt,
      identityMs: identityMs,
      sheetWriteMs: appendResponse.data && appendResponse.data.performance ? appendResponse.data.performance.sheetWriteMs : null,
      auditMs: new Date().getTime() - auditStartedAt,
      timestamp: baFoxIsoNow()
    }
  });
}

function baFoxSetTaskStatus(request) {
  var normalized = baFoxNormalizeRequest(request);
  var missing = baFoxRequired(normalized, ['taskId', 'status']);
  if (missing.length) {
    return baFoxError('VALIDATION_ERROR', 'Missing required fields.', { missing: missing });
  }

  if (!baFoxValidateStatus(normalized.status)) {
    return baFoxError('VALIDATION_ERROR', 'Invalid status.', { status: normalized.status });
  }

  var patch = {
    status: normalized.status,
    updatedAt: baFoxIsoNow()
  };

  if (BA_FOX_CONFIG.FINAL_STATUSES.indexOf(normalized.status) !== -1) {
    patch.completedAt = patch.updatedAt;
  }

  return baFoxOk({
    taskId: normalized.taskId,
    dryRun: true,
    updateResult: baFoxUpdateTaskRow(normalized.taskId, patch),
    auditResult: baFoxAuditEvent('task.status.update', 'task', normalized.taskId, {
      actor: normalized.actor || 'Lisa',
      status: normalized.status
    })
  });
}

function baFoxSetTaskComment(request) {
  var normalized = baFoxNormalizeRequest(request);
  var missing = baFoxRequired(normalized, ['taskId', 'comment']);
  if (missing.length) {
    return baFoxError('VALIDATION_ERROR', 'Missing required fields.', { missing: missing });
  }

  var mode = normalized.mode || 'append';
  if (!baFoxValidateCommentMode(mode)) {
    return baFoxError('VALIDATION_ERROR', 'Invalid comment mode.', { mode: mode });
  }

  var patch = {
    comment: normalized.comment,
    mode: mode,
    updatedAt: baFoxIsoNow()
  };

  return baFoxOk({
    taskId: normalized.taskId,
    dryRun: true,
    updateResult: baFoxUpdateTaskRow(normalized.taskId, patch),
    auditResult: baFoxAuditEvent('task.comment.update', 'task', normalized.taskId, {
      actor: normalized.actor || 'Lisa',
      mode: mode
    })
  });
}

function baFoxTaskActionMap_() {
  return {
    markDone: { status: 'Выполнено' },
    moveToWork: { status: 'В работе' },
    moveToPush: { status: 'Пуш' },
    moveToWaiting: { status: 'Ждём ответ' },
    snoozeTask: { snooze: true },
    moveToTrash: { archived: true, preserveStatus: true },
    restoreFromTrash: { archived: false, preserveStatus: true }
  };
}

function baFoxProfileCanManageTrashedTask_(profile, task) {
  var role = normalizeProfileRole_(profile);
  if (role === 'admin' || role === 'executive') {
    return true;
  }
  var email = normalizeWorkspaceEmail_(profile && profile.email);
  var userId = baFoxSafeString(profile && profile.userId).toLowerCase();
  return Boolean(
    (email && normalizeWorkspaceEmail_(task && task.createdByEmail) === email)
    || (userId && baFoxSafeString(task && task.createdByUserId).toLowerCase() === userId)
  );
}

function baFoxProfileCanCompleteTask_(profile, task) {
  var email = normalizeWorkspaceEmail_(profile && profile.email);
  var userId = baFoxSafeString(profile && profile.userId).toLowerCase();
  var taskOwnerLabel = baFoxNormalizeMatchValue_(task && (task.ownerLabel || task.owner));
  var profileOwnerLabels = [profile && profile.defaultOwnerLabel, profile && profile.displayName, profile && profile.email]
    .map(baFoxNormalizeMatchValue_)
    .filter(Boolean);
  var collaboratorEmails = baFoxSplitIdentityList_(task && task.collaboratorEmails, true);
  var collaboratorUserIds = baFoxSplitIdentityList_(task && task.collaboratorUserIds, false).map(function(id) {
    return baFoxSafeString(id).toLowerCase();
  });
  return Boolean(
    (email && normalizeWorkspaceEmail_(task && task.ownerEmail) === email)
    || (userId && baFoxSafeString(task && task.ownerUserId).toLowerCase() === userId)
    || (taskOwnerLabel && profileOwnerLabels.indexOf(taskOwnerLabel) !== -1)
    || (email && collaboratorEmails.indexOf(email) !== -1)
    || (userId && collaboratorUserIds.indexOf(userId) !== -1)
  );
}

function baFoxValidateSafeReminder_(value) {
  var reminder = baFoxSafeString(value);
  return /^\d{4}-\d{2}-\d{2}(T| )\d{2}:\d{2}(:\d{2})?$/.test(reminder);
}

function baFoxConfiguredActionToken_() {
  if (baFoxSafeString(BA_FOX_CONFIG.ACTION_TOKEN)) {
    return baFoxSafeString(BA_FOX_CONFIG.ACTION_TOKEN);
  }
  if (typeof PropertiesService === 'undefined') {
    return '';
  }
  try {
    return baFoxSafeString(PropertiesService.getScriptProperties().getProperty('BA_FOX_ACTION_TOKEN'));
  } catch (err) {
    return '';
  }
}

function baFoxActionTokenMatches_(token) {
  var expectedToken = baFoxConfiguredActionToken_();
  return Boolean(expectedToken) && baFoxSafeString(token) === expectedToken;
}

function baFoxUnauthorized_() {
  return {
    ok: false,
    data: null,
    error: 'UNAUTHORIZED'
  };
}

function baFoxTaskAction(request) {
  var normalized = baFoxNormalizeRequest(request);
  var missing = baFoxRequired(normalized, ['taskId', 'action']);
  if (missing.length) {
    return baFoxError('VALIDATION_ERROR', 'Missing required fields.', { missing: missing });
  }

  var identityCheck = requireAuthorizedSafeWrite_(normalized);
  if (!identityCheck.ok) {
    return identityCheck.error;
  }

  if (BA_FOX_CONFIG.SAFE_WRITE_MODE !== true) {
    return baFoxError('SAFE_WRITES_DISABLED', 'Safe task actions are disabled.', {});
  }

  var actionMap = baFoxTaskActionMap_();
  var actionConfig = actionMap[normalized.action];
  if (!actionConfig) {
    return baFoxError('ACTION_NOT_ALLOWED', 'Task action is not allowed.', { action: normalized.action });
  }

  if (actionConfig.snooze && !baFoxValidateSafeReminder_(normalized.nextReminder)) {
    return baFoxError('VALIDATION_ERROR', 'Snooze requires a safe nextReminder date/time.', {
      nextReminder: normalized.nextReminder || ''
    });
  }

  var match = baFoxFindTaskRow_(normalized.taskId);
  if (!match.ok) {
    baFoxAuditTaskAction({
      timestamp: baFoxIsoNow(),
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: normalized.action,
      routeAction: 'taskAction/' + normalized.action,
      source: 'web',
      result: 'failed',
      errorCode: match.error.error && match.error.error.code
    });
    return match.error;
  }

  var previous = baFoxNormalizeTaskRow(match.row, match.headers);
  if (normalized.action === 'markDone'
      && !baFoxProfileCanCompleteTask_(identityCheck.profile, previous)) {
    baFoxAuditTaskAction({
      timestamp: baFoxIsoNow(),
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: normalized.action,
      routeAction: 'taskAction/' + normalized.action,
      source: 'web',
      result: 'failed',
      errorCode: 'WRITE_FORBIDDEN'
    });
    return baFoxError(
      'WRITE_FORBIDDEN',
      'Only the primary task owner or a listed collaborator can mark this task as done.',
      { taskId: normalized.taskId }
    );
  }
  if (actionConfig.preserveStatus === true
      && !baFoxProfileCanManageTrashedTask_(identityCheck.profile, previous)) {
    baFoxAuditTaskAction({
      timestamp: baFoxIsoNow(),
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: normalized.action,
      routeAction: 'taskAction/' + normalized.action,
      source: 'web',
      result: 'failed',
      errorCode: 'WRITE_FORBIDDEN'
    });
    return baFoxError(
      'WRITE_FORBIDDEN',
      'Only the task creator, an executive, or an admin can move this task to or from trash.',
      { taskId: normalized.taskId }
    );
  }
  var now = baFoxIsoNow();
  var patch = {
    UPDATED_AT: now
  };

  if (actionConfig.snooze) {
    patch.NEXT_REMINDER = baFoxSafeString(normalized.nextReminder);
    patch.CONTROL_DATE = baFoxTaskDateIso_(normalized.nextReminder);
  } else if (actionConfig.preserveStatus === true) {
    patch.ARCHIVED = actionConfig.archived === true;
  } else {
    patch.STATUS = actionConfig.status;
    if (normalized.action === 'markDone') {
      patch.COMPLETED_AT = now;
    }
    if (actionConfig.archived === true) {
      patch.ARCHIVED = true;
    }
  }

  var updateResponse = baFoxUpdateTaskActionRow(normalized.taskId, patch);
  if (!updateResponse.ok) {
    baFoxAuditTaskAction({
      timestamp: now,
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: normalized.action,
      previousStatus: previous.status,
      previousNextReminder: previous.nextReminder,
      routeAction: 'taskAction/' + normalized.action,
      source: 'web',
      result: 'failed',
      errorCode: updateResponse.error && updateResponse.error.code
    });
    return updateResponse;
  }

  var auditResult = baFoxAuditTaskAction({
    timestamp: now,
    actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
    taskId: normalized.taskId,
    action: normalized.action,
    previousStatus: previous.status,
    newStatus: actionConfig.snooze || actionConfig.preserveStatus ? previous.status : actionConfig.status,
    previousNextReminder: previous.nextReminder,
    newNextReminder: actionConfig.snooze ? patch.NEXT_REMINDER : previous.nextReminder,
    routeAction: 'taskAction/' + normalized.action,
    source: 'web',
    result: 'success',
    errorCode: '',
    previousValues: actionConfig.preserveStatus ? baFoxSafeJson_({ archived: previous.archived }) : '',
    newValues: actionConfig.preserveStatus ? baFoxSafeJson_({ archived: actionConfig.archived === true }) : ''
  });

  return baFoxOk({
    taskId: normalized.taskId,
    action: normalized.action,
    previousStatus: previous.status,
    newStatus: actionConfig.snooze || actionConfig.preserveStatus ? previous.status : actionConfig.status,
    previousNextReminder: previous.nextReminder,
    newNextReminder: actionConfig.snooze ? patch.NEXT_REMINDER : previous.nextReminder,
    previousArchived: previous.archived === true,
    newArchived: actionConfig.preserveStatus ? actionConfig.archived === true : previous.archived === true,
    updateResult: updateResponse.data,
    auditResult: auditResult
  });
}

function baFoxEditTaskAllowedKeys_() {
  return [
    'route',
    'callback',
    'token',
    'idToken',
    'identityToken',
    'credential',
    'googleCredential',
    'taskId',
    'title',
    'organization',
    'nextAction',
    'deadline',
    'priority',
    'category',
    'taskType',
    'comment',
    'note',
    'controlDate',
    'focus'
  ];
}

function baFoxRejectedEditTaskKeys_(request) {
  var allowed = baFoxEditTaskAllowedKeys_();
  return Object.keys(request || {}).filter(function(key) {
    return allowed.indexOf(key) === -1 && baFoxSafeString(request[key]);
  });
}

function baFoxValidateEditTaskScalar_(request, fields) {
  return fields.filter(function(field) {
    var value = request[field];
    return Array.isArray(value) || (value && typeof value === 'object');
  });
}

function baFoxLooksLikeFormula_(value) {
  return /^[=+\-@]/.test(baFoxSafeString(value));
}

function baFoxValidateEditTaskDeadline_(deadline) {
  var value = baFoxSafeString(deadline);
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function baFoxValidateEditTaskBoolean_(value) {
  var normalized = baFoxNormalizeMatchValue_(value);
  return !normalized || ['true', 'false', '1', '0', 'yes', 'no', 'да', 'нет'].indexOf(normalized) !== -1;
}

function baFoxParseEditTaskBoolean_(value) {
  var normalized = baFoxNormalizeMatchValue_(value);
  return ['true', '1', 'yes', 'да'].indexOf(normalized) !== -1;
}

function baFoxEditTaskFieldMap_() {
  return {
    title: 'TITLE',
    organization: 'ORGANIZATION',
    nextAction: 'STEPS',
    deadline: 'DEADLINE',
    priority: 'PRIORITY',
    category: 'CATEGORY',
    taskType: 'TASK_TYPE',
    comment: 'COMMENT',
    controlDate: 'CONTROL_DATE',
    focus: 'FOCUS'
  };
}

function baFoxEditTaskPreviousValue_(task, field) {
  if (field === 'nextAction') return task.steps;
  if (field === 'focus') return task.focus === true ? 'true' : 'false';
  return task[field] || '';
}

function baFoxSafeJson_(value) {
  try {
    return JSON.stringify(value || {});
  } catch (err) {
    return '{}';
  }
}

function baFoxTaskIdMatchCount_(sheet, taskId) {
  var values = sheet.getDataRange().getValues();
  var count = 0;
  for (var index = 1; index < values.length; index += 1) {
    if (baFoxSafeString(values[index][BA_FOX_CONFIG.TASK_COLUMNS.ID - 1]) === baFoxSafeString(taskId)) {
      count += 1;
    }
  }
  return count;
}

function baFoxSafeEditTask(request) {
  var normalized = baFoxNormalizeRequest(request);
  var rejectedKeys = baFoxRejectedEditTaskKeys_(normalized);
  if (rejectedKeys.length) {
    return baFoxError('FIELDS_NOT_ALLOWED', 'Only safe edit task fields are allowed.', {
      rejectedFields: rejectedKeys
    });
  }

  var missing = baFoxRequired(normalized, ['taskId']);
  if (missing.length) {
    return baFoxError('VALIDATION_ERROR', 'Missing required fields.', { missing: missing });
  }

  var identityCheck = requireAuthorizedSafeWrite_(normalized);
  if (!identityCheck.ok) {
    return identityCheck.error;
  }

  if (BA_FOX_CONFIG.SAFE_WRITE_MODE !== true) {
    return baFoxError('SAFE_WRITES_DISABLED', 'Safe task editing is disabled.', {});
  }

  if (baFoxSafeString(normalized.note) && !baFoxSafeString(normalized.comment)) {
    normalized.comment = normalized.note;
  }

  var editableFields = ['title', 'organization', 'nextAction', 'deadline', 'priority', 'category', 'taskType', 'comment', 'controlDate', 'focus'];
  var objectFields = baFoxValidateEditTaskScalar_(normalized, editableFields);
  if (objectFields.length) {
    return baFoxError('VALIDATION_ERROR', 'Edit task fields must be simple text values.', {
      fields: objectFields
    });
  }

  if (!baFoxValidateEditTaskDeadline_(normalized.deadline)) {
    return baFoxError('VALIDATION_ERROR', 'Deadline must use YYYY-MM-DD format.', {
      deadline: normalized.deadline || ''
    });
  }

  if (!baFoxValidateEditTaskDeadline_(normalized.controlDate)) {
    return baFoxError('VALIDATION_ERROR', 'Control date must use YYYY-MM-DD format.', {
      controlDate: normalized.controlDate || ''
    });
  }

  if (!baFoxValidateEditTaskBoolean_(normalized.focus)) {
    return baFoxError('VALIDATION_ERROR', 'Focus must be true or false.', {
      focus: normalized.focus || ''
    });
  }

  if (baFoxSafeString(normalized.taskType) && !baFoxValidateTaskType(baFoxSafeString(normalized.taskType))) {
    return baFoxError('VALIDATION_ERROR', 'Invalid task type.', { taskType: normalized.taskType });
  }

  var formulaFields = editableFields.filter(function(field) {
    return baFoxSafeString(normalized[field]) && baFoxLooksLikeFormula_(normalized[field]);
  });
  if (formulaFields.length) {
    return baFoxError('VALIDATION_ERROR', 'Formula-like values are not allowed.', {
      fields: formulaFields
    });
  }

  var match = baFoxFindTaskRow_(normalized.taskId);
  if (!match.ok) {
    baFoxAuditTaskAction({
      timestamp: baFoxIsoNow(),
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: 'editTask',
      routeAction: 'editTask',
      source: 'web',
      result: 'failed',
      errorCode: match.error.error && match.error.error.code
    });
    return match.error;
  }

  if (baFoxTaskIdMatchCount_(match.sheet, normalized.taskId) !== 1) {
    baFoxAuditTaskAction({
      timestamp: baFoxIsoNow(),
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: 'editTask',
      routeAction: 'editTask',
      source: 'web',
      result: 'failed',
      errorCode: 'DUPLICATE_TASK_ID'
    });
    return baFoxError('DUPLICATE_TASK_ID', 'Task id must match exactly one row.', {
      taskId: normalized.taskId
    });
  }

  var previous = baFoxNormalizeTaskRow(match.row, match.headers);
  var fieldMap = baFoxEditTaskFieldMap_();
  var patch = {
    UPDATED_AT: baFoxIsoNow()
  };
  var changedFields = [];
  var previousValues = {};
  var newValues = {};
  var unsupportedFields = [];

  editableFields.forEach(function(field) {
    if (!Object.prototype.hasOwnProperty.call(normalized, field)) {
      return;
    }
    var newValue = field === 'focus'
      ? (baFoxParseEditTaskBoolean_(normalized[field]) ? 'true' : 'false')
      : baFoxSafeString(normalized[field]);
    var previousValue = baFoxSafeString(baFoxEditTaskPreviousValue_(previous, field));
    if (newValue === previousValue) {
      return;
    }
    if (field === 'focus' && !baFoxTaskColumnForField_(match.sheet, match.headers, 'FOCUS')) {
      unsupportedFields.push(field);
      return;
    }
    patch[fieldMap[field]] = field === 'focus' ? baFoxParseEditTaskBoolean_(normalized[field]) : newValue;
    if (field === 'controlDate') {
      patch.NEXT_REMINDER = newValue;
    }
    changedFields.push(field);
    previousValues[field] = previousValue;
    newValues[field] = newValue;
  });

  if (!changedFields.length) {
    if (unsupportedFields.length) {
      return baFoxError('SCHEMA_FIELD_MISSING', 'Requested field is not available in Tasks schema.', {
        taskId: normalized.taskId,
        fields: unsupportedFields
      });
    }
    return baFoxError('NO_CHANGES', 'No editable fields changed.', {
      taskId: normalized.taskId
    });
  }

  var updateResponse = baFoxUpdateTaskActionRow(normalized.taskId, patch);
  if (!updateResponse.ok) {
    baFoxAuditTaskAction({
      timestamp: patch.UPDATED_AT,
      actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
      taskId: normalized.taskId,
      action: 'editTask',
      routeAction: 'editTask',
      source: 'web',
      result: 'failed',
      errorCode: updateResponse.error && updateResponse.error.code,
      changedFields: changedFields.join(','),
      previousValues: baFoxSafeJson_(previousValues),
      newValues: baFoxSafeJson_(newValues)
    });
    return updateResponse;
  }

  var auditResult = baFoxAuditTaskAction({
    timestamp: patch.UPDATED_AT,
    actor: identityCheck.profile && identityCheck.profile.email ? identityCheck.profile.email : 'MF Group Tracker',
    taskId: normalized.taskId,
    action: 'editTask',
    routeAction: 'editTask',
    source: 'web',
    result: 'success',
    errorCode: '',
    changedFields: changedFields.join(','),
    previousValues: baFoxSafeJson_(previousValues),
    newValues: baFoxSafeJson_(newValues)
  });

  return baFoxOk({
    taskId: normalized.taskId,
    changedFields: changedFields,
    previousValues: previousValues,
    newValues: newValues,
    updatedAt: patch.UPDATED_AT,
    updateResult: updateResponse.data,
    auditResult: auditResult
  });
}

function baFoxGetActiveSpreadsheet_() {
  if (typeof SpreadsheetApp === 'undefined') {
    return null;
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function baFoxGetSheetByName_(sheetName) {
  var spreadsheet = baFoxGetActiveSpreadsheet_();
  if (!spreadsheet) {
    return null;
  }
  return spreadsheet.getSheetByName(sheetName);
}

function baFoxReadTasksRows() {
  if (!BA_FOX_CONFIG.READ_LIVE_SHEETS) {
    return {
      dryRun: BA_FOX_CONFIG.DRY_RUN,
      readLive: false,
      rows: [],
      warning: 'Live Sheets reads are disabled.'
    };
  }

  var sheet = baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.TASKS);
  if (!sheet) {
    return {
      dryRun: BA_FOX_CONFIG.DRY_RUN,
      readLive: false,
      rows: [],
      warning: 'Bound spreadsheet or Tasks sheet is not available.'
    };
  }

  var values = sheet.getDataRange().getValues();
  return {
    dryRun: BA_FOX_CONFIG.DRY_RUN,
    readLive: true,
    headers: values[0].map(function(header) { return baFoxSafeString(header); }),
    rows: values.slice(1),
    warning: null
  };
}

var baFoxSheetHeadersMemo_ = {};

function baFoxSheetHeadersCacheKey_(sheet) {
  if (!sheet || !sheet.getName) {
    return '';
  }
  return 'baFox:sheetHeaders:v1:' + baFoxSafeString(sheet.getName());
}

function baFoxReadSheetHeaders_(sheet) {
  if (!sheet || sheet.getLastRow() < 1) {
    return [];
  }
  var cacheKey = baFoxSheetHeadersCacheKey_(sheet);
  if (cacheKey && baFoxSheetHeadersMemo_[cacheKey]) {
    return baFoxSheetHeadersMemo_[cacheKey].slice();
  }
  var cache = typeof CacheService !== 'undefined' && CacheService.getScriptCache ? CacheService.getScriptCache() : null;
  if (cache && cacheKey) {
    try {
      var cached = cache.get(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          baFoxSheetHeadersMemo_[cacheKey] = parsed;
          return parsed.slice();
        }
      }
    } catch (cacheReadError) {
      // Reading headers from the sheet remains the safe fallback.
    }
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
    return baFoxSafeString(header);
  });
  if (cacheKey) {
    baFoxSheetHeadersMemo_[cacheKey] = headers;
    if (cache) {
      try {
        cache.put(cacheKey, JSON.stringify(headers), 60);
      } catch (cacheWriteError) {
        // A cache miss only affects latency; it must not prevent task saving.
      }
    }
  }
  return headers.slice();
}

function baFoxFindHeaderColumn_(headers, names) {
  var normalizedNames = names.map(function(name) {
    return baFoxSafeString(name).toLowerCase();
  });
  for (var index = 0; index < headers.length; index += 1) {
    if (normalizedNames.indexOf(baFoxSafeString(headers[index]).toLowerCase()) !== -1) {
      return index + 1;
    }
  }
  return 0;
}

function baFoxTaskIdentityColumnDefinitions_() {
  return [
    { field: 'OWNER_EMAIL', key: 'ownerEmail', header: 'Owner Email', aliases: ['Owner Email', 'ownerEmail', 'owner_email', 'Email ответственного'] },
    { field: 'OWNER_USER_ID', key: 'ownerUserId', header: 'Owner User ID', aliases: ['Owner User ID', 'ownerUserId', 'owner_user_id', 'ID ответственного'] },
    { field: 'COLLABORATOR_EMAILS', key: 'collaboratorEmails', header: 'Collaborator Emails', aliases: ['Collaborator Emails', 'collaboratorEmails', 'collaborator_emails', 'Участники email'] },
    { field: 'COLLABORATOR_USER_IDS', key: 'collaboratorUserIds', header: 'Collaborator User IDs', aliases: ['Collaborator User IDs', 'collaboratorUserIds', 'collaborator_user_ids', 'Участники userId'] },
    { field: 'CREATED_BY_EMAIL', key: 'createdByEmail', header: 'Created By Email', aliases: ['Created By Email', 'createdByEmail', 'created_by_email', 'Создал email'] },
    { field: 'CREATED_BY_USER_ID', key: 'createdByUserId', header: 'Created By User ID', aliases: ['Created By User ID', 'createdByUserId', 'created_by_user_id', 'Создал userId'] },
    { field: 'VISIBILITY', key: 'visibility', header: 'Visibility', aliases: ['Visibility', 'visibility', 'Видимость'] },
    { field: 'PROJECT_ID', key: 'projectId', header: 'Project ID', aliases: ['Project ID', 'projectId', 'project_id', 'ID проекта'] },
    { field: 'PARENT_TASK_ID', key: 'parentTaskId', header: 'Parent Task ID', aliases: ['Parent Task ID', 'parentTaskId', 'parent_task_id', 'ID родительской задачи'] }
  ];
}

function baFoxLegacyTaskFieldNames_(field) {
  var names = {
    ID: ['ID', 'id', 'Task ID'],
    DATE: ['Дата', 'Date', 'date'],
    CATEGORY: ['Категория', 'Category', 'category'],
    ORGANIZATION: ['Организация / контакт', 'Organization', 'organization', 'Contact', 'contact'],
    TITLE: ['Задача', 'Title', 'title', 'Task', 'Task name', 'Название'],
    STEPS: ['Шаги для Лизы', 'Steps', 'steps', 'Next action', 'nextAction'],
    SOURCE: ['Источник', 'Source', 'source'],
    PRIORITY: ['Приоритет', 'Priority', 'priority'],
    DEADLINE: ['Дедлайн', 'Deadline', 'deadline'],
    REMINDER_MODE: ['Режим напоминаний', 'Reminder mode', 'reminderMode'],
    STATUS: ['Статус', 'Status', 'status'],
    NEXT_REMINDER: ['Следующее напоминание', 'Next reminder', 'nextReminder'],
    COMMENT: ['Итог / комментарий', 'Comment', 'comment', 'Result', 'result'],
    CHANNEL: ['Канал', 'Channel', 'channel'],
    TASK_TYPE: ['Task type', 'taskType', 'task_type'],
    OWNER: ['Owner', 'owner', 'Ответственный'],
    CREATED_AT: ['Created at', 'createdAt', 'created_at'],
    UPDATED_AT: ['Updated at', 'updatedAt', 'updated_at'],
    COMPLETED_AT: ['Completed at', 'completedAt', 'completed_at'],
    REMINDER_RECURRENCE: ['Reminder recurrence', 'reminderRecurrence'],
    NOTIFICATION_CHANNELS: ['Notification channels', 'notificationChannels'],
    NOTIFICATION_STATUS: ['Notification status', 'notificationStatus'],
    APP_SOURCE: ['App source', 'appSource'],
    EXTERNAL_REF: ['External ref', 'externalRef'],
    ARCHIVED: ['Archived', 'archived'],
    CONTROL_DATE: ['controlDate', 'control_date', 'Control Date', 'Контрольная дата', 'Дата контроля'],
    FOCUS: ['focus', 'isFocus', 'manualFocus', 'Focus', 'Фокус']
  };
  return names[field] || [];
}

function baFoxRequiredLegacyTaskFields_() {
  return [
    'ID',
    'DATE',
    'CATEGORY',
    'ORGANIZATION',
    'TITLE',
    'STEPS',
    'SOURCE',
    'PRIORITY',
    'DEADLINE',
    'REMINDER_MODE',
    'STATUS',
    'NEXT_REMINDER',
    'COMMENT',
    'CHANNEL',
    'TASK_TYPE',
    'OWNER',
    'CREATED_AT',
    'UPDATED_AT',
    'COMPLETED_AT',
    'REMINDER_RECURRENCE',
    'NOTIFICATION_CHANNELS',
    'NOTIFICATION_STATUS',
    'APP_SOURCE',
    'EXTERNAL_REF',
    'ARCHIVED'
  ];
}

function baFoxMissingLegacyTaskFields_(headers) {
  return baFoxRequiredLegacyTaskFields_().filter(function(field) {
    return !baFoxFindHeaderColumn_(headers, baFoxLegacyTaskFieldNames_(field));
  });
}

function baFoxOptionalLegacyTaskFields_() {
  return [
    'CONTROL_DATE',
    'FOCUS'
  ];
}

function baFoxPresentOptionalLegacyTaskFields_(headers) {
  var present = {};
  baFoxOptionalLegacyTaskFields_().forEach(function(field) {
    present[field] = Boolean(baFoxFindHeaderColumn_(headers, baFoxLegacyTaskFieldNames_(field)));
  });
  return present;
}

function getTaskHeaderMap_(sheetOrHeaders) {
  var headers = Array.isArray(sheetOrHeaders)
    ? sheetOrHeaders
    : baFoxReadSheetHeaders_(sheetOrHeaders);
  var byName = {};
  headers.forEach(function(header, index) {
    var normalized = baFoxSafeString(header).toLowerCase();
    if (normalized && !byName[normalized]) {
      byName[normalized] = index + 1;
    }
  });
  return {
    headers: headers,
    byName: byName,
    columnCount: headers.length
  };
}

function getOptionalColumnIndex_(headerMap, aliases) {
  var map = headerMap || { byName: {} };
  var names = aliases || [];
  for (var index = 0; index < names.length; index += 1) {
    var column = map.byName[baFoxSafeString(names[index]).toLowerCase()];
    if (column) {
      return column;
    }
  }
  return 0;
}

function readOptionalCell_(row, headerMap, aliases) {
  var column = getOptionalColumnIndex_(headerMap, aliases);
  return column ? row[column - 1] : '';
}

function writeOptionalCell_(rowValues, headerMap, aliases, value) {
  var column = getOptionalColumnIndex_(headerMap, aliases);
  if (!column) {
    return false;
  }
  while (rowValues.length < column) {
    rowValues.push('');
  }
  rowValues[column - 1] = value;
  return true;
}

function baFoxRecommendedTaskIdentityColumns_() {
  return baFoxTaskIdentityColumnDefinitions_().map(function(definition) {
    return definition.header;
  });
}

function baFoxTaskIdentitySchemaStatus_(sheetOrHeaders) {
  var sheet = Array.isArray(sheetOrHeaders) ? null : (sheetOrHeaders || baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.TASKS));
  var headerMap = getTaskHeaderMap_(Array.isArray(sheetOrHeaders) ? sheetOrHeaders : sheet);
  var columns = {};
  var present = [];
  var missing = [];
  baFoxTaskIdentityColumnDefinitions_().forEach(function(definition) {
    var column = getOptionalColumnIndex_(headerMap, definition.aliases);
    columns[definition.key] = {
      header: definition.header,
      aliases: definition.aliases,
      present: Boolean(column),
      column: column || null
    };
    if (column) {
      present.push(definition.header);
    } else {
      missing.push(definition.header);
    }
  });
  return {
    sheet: BA_FOX_CONFIG.SHEETS.TASKS,
    exists: Array.isArray(sheetOrHeaders) ? true : Boolean(sheet),
    status: missing.length ? (present.length ? 'partial' : 'missing') : 'ready',
    allPresent: missing.length === 0,
    anyPresent: present.length > 0,
    presentColumns: present,
    missingColumns: missing,
    columns: columns,
    recommendedTaskIdentityColumns: baFoxRecommendedTaskIdentityColumns_()
  };
}

function baFoxOptionalTaskFieldNames_(field) {
  var names = {
    CONTROL_DATE: ['controlDate', 'control_date', 'Control Date', 'Контрольная дата', 'Дата контроля'],
    FOCUS: ['focus', 'isFocus', 'manualFocus', 'Focus', 'Фокус'],
    OWNER_EMAIL: ['Owner Email', 'ownerEmail', 'owner_email', 'Email ответственного'],
    OWNER_USER_ID: ['Owner User ID', 'ownerUserId', 'owner_user_id', 'ID ответственного'],
    COLLABORATOR_EMAILS: ['Collaborator Emails', 'collaboratorEmails', 'collaborator_emails', 'Участники email'],
    COLLABORATOR_USER_IDS: ['Collaborator User IDs', 'collaboratorUserIds', 'collaborator_user_ids', 'Участники userId'],
    CREATED_BY_EMAIL: ['Created By Email', 'createdByEmail', 'created_by_email', 'Создал email'],
    CREATED_BY_USER_ID: ['Created By User ID', 'createdByUserId', 'created_by_user_id', 'Создал userId'],
    VISIBILITY: ['Visibility', 'visibility', 'Видимость'],
    PROJECT_ID: ['Project ID', 'projectId', 'project_id', 'ID проекта'],
    PARENT_TASK_ID: ['Parent Task ID', 'parentTaskId', 'parent_task_id', 'ID родительской задачи']
  };
  return names[field] || [];
}

function getTaskIdentitySchemaStatus_() {
  var sheet = baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.TASKS);
  var definitions = baFoxTaskIdentityColumnDefinitions_();
  var recommendedColumns = definitions.map(function(definition) {
    return definition.header;
  });
  var fallback = {
    sheet: BA_FOX_CONFIG.SHEETS.TASKS,
    exists: false,
    status: 'missing',
    requiredLegacyColumnsOk: false,
    optionalColumnsPresent: {},
    optionalColumns: {},
    missingColumns: recommendedColumns.slice(),
    recommendedColumns: recommendedColumns,
    canSafelyMigrate: false,
    migrationAlreadyDone: false,
    optionalIdentityWriteActive: false,
    missingLegacyFields: baFoxRequiredLegacyTaskFields_(),
    optionalLegacyFieldsPresent: {},
    headerColumns: 0,
    dataRows: 0
  };

  definitions.forEach(function(definition) {
    fallback.optionalColumnsPresent[definition.key] = false;
    fallback.optionalColumns[definition.key] = {
      present: false,
      header: '',
      recommendedHeader: definition.header,
      column: 0
    };
  });

  if (!sheet) {
    return fallback;
  }

  var headers = baFoxReadSheetHeaders_(sheet);
  var lastLegacyColumn = BA_FOX_CONFIG.TASK_COLUMNS.ARCHIVED || 25;
  var missingLegacyFields = baFoxMissingLegacyTaskFields_(headers);
  var optionalLegacyFieldsPresent = baFoxPresentOptionalLegacyTaskFields_(headers);
  var requiredLegacyColumnsOk = sheet.getLastColumn() >= lastLegacyColumn && missingLegacyFields.length === 0;
  var missingColumns = [];
  var presentCount = 0;
  var optionalColumnsPresent = {};
  var optionalColumns = {};

  definitions.forEach(function(definition) {
    var column = baFoxFindHeaderColumn_(headers, baFoxOptionalTaskFieldNames_(definition.field));
    var present = column > 0;
    if (present) {
      presentCount += 1;
    } else {
      missingColumns.push(definition.header);
    }
    optionalColumnsPresent[definition.key] = present;
    optionalColumns[definition.key] = {
      present: present,
      header: present ? headers[column - 1] : '',
      recommendedHeader: definition.header,
      column: column
    };
  });

  return {
    sheet: BA_FOX_CONFIG.SHEETS.TASKS,
    exists: true,
    status: presentCount === 0 ? 'missing' : presentCount === definitions.length ? 'ready' : 'partial',
    requiredLegacyColumnsOk: Boolean(requiredLegacyColumnsOk),
    missingLegacyFields: missingLegacyFields,
    optionalLegacyFieldsPresent: optionalLegacyFieldsPresent,
    optionalColumnsPresent: optionalColumnsPresent,
    optionalColumns: optionalColumns,
    missingColumns: missingColumns,
    recommendedColumns: recommendedColumns,
    canSafelyMigrate: Boolean(requiredLegacyColumnsOk && missingColumns.length > 0),
    migrationAlreadyDone: missingColumns.length === 0,
    optionalIdentityWriteActive: missingColumns.length < definitions.length,
    headerColumns: sheet.getLastColumn(),
    dataRows: Math.max(sheet.getLastRow() - 1, 0)
  };
}

function ensureTaskIdentityColumns_(options) {
  var settings = options || {};
  var confirm = settings.confirm === true || baFoxSafeString(settings.confirm).toLowerCase() === 'true';
  var status = getTaskIdentitySchemaStatus_();
  var result = {
    dryRun: !confirm,
    confirmed: confirm,
    schemaBefore: status,
    addedColumns: [],
    skippedColumns: status.missingColumns.slice(),
    schemaAfter: status
  };

  if (!status.exists) {
    result.error = 'TASKS_SHEET_MISSING';
    return result;
  }
  if (!status.requiredLegacyColumnsOk) {
    result.error = 'LEGACY_TASK_COLUMNS_INCOMPLETE';
    return result;
  }
  if (!status.missingColumns.length) {
    result.skippedColumns = [];
    return result;
  }
  if (!confirm) {
    return result;
  }

  var sheet = baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.TASKS);
  var startColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, startColumn, 1, status.missingColumns.length).setValues([status.missingColumns]);
  result.addedColumns = status.missingColumns.map(function(header, index) {
    return {
      header: header,
      column: startColumn + index
    };
  });
  result.skippedColumns = [];
  result.schemaAfter = getTaskIdentitySchemaStatus_();
  return result;
}

function baFoxTaskColumnForField_(sheet, headers, field) {
  var fixedColumn = BA_FOX_CONFIG.TASK_COLUMNS[field];
  if (fixedColumn && fixedColumn <= sheet.getLastColumn()) {
    return fixedColumn;
  }
  return baFoxFindHeaderColumn_(headers || [], baFoxOptionalTaskFieldNames_(field));
}

function baFoxFindTaskRow_(taskId) {
  var sheet = baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.TASKS);
  if (!sheet) {
    return {
      ok: false,
      error: baFoxError('TASKS_SHEET_MISSING', 'Tasks sheet is not available.', {})
    };
  }

  var values = sheet.getDataRange().getValues();
  for (var index = 1; index < values.length; index += 1) {
    if (baFoxSafeString(values[index][BA_FOX_CONFIG.TASK_COLUMNS.ID - 1]) === baFoxSafeString(taskId)) {
      return {
        ok: true,
        sheet: sheet,
        rowNumber: index + 1,
        row: values[index],
        headers: values[0].map(function(header) { return baFoxSafeString(header); })
      };
    }
  }

  return {
    ok: false,
    error: baFoxError('TASK_NOT_FOUND', 'Task was not found.', { taskId: taskId })
  };
}

function baFoxUpdateTaskActionRow(taskId, patch) {
  var match = baFoxFindTaskRow_(taskId);
  if (!match.ok) {
    return match.error;
  }

  var sheet = match.sheet;
  var updates = [];
  var skippedFields = [];
  Object.keys(patch).forEach(function(field) {
    var column = baFoxTaskColumnForField_(sheet, match.headers, field);
    if (column && column <= sheet.getLastColumn()) {
      updates.push({
        field: field,
        column: column,
        value: patch[field]
      });
    } else {
      skippedFields.push(field);
    }
  });

  updates.forEach(function(update) {
    sheet.getRange(match.rowNumber, update.column).setValue(update.value);
  });

  return baFoxOk({
    taskId: taskId,
    rowNumber: match.rowNumber,
    updatedFields: updates.map(function(update) { return update.field; }),
    updatedColumns: updates.map(function(update) { return update.column; }),
    skippedFields: skippedFields
  });
}

function baFoxAppendTaskRow(rowValues) {
  return {
    dryRun: true,
    rowValues: rowValues,
    message: 'Stage V2.4 read-only mode does not write to Google Sheets.'
  };
}

function baFoxAppendSafeCreateTaskRow(rowValues, identityMetadata) {
  var sheet = baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.TASKS);
  if (!sheet) {
    return baFoxError('TASKS_SHEET_MISSING', 'Tasks sheet is not available.', {});
  }

  try {
    var startedAt = new Date().getTime();
    var headerMap = getTaskHeaderMap_(sheet);
    var schema = baFoxTaskIdentitySchemaStatus_(headerMap.headers);
    var finalRowValues = rowValues.slice();
    while (finalRowValues.length < headerMap.columnCount) {
      finalRowValues.push('');
    }
    if (identityMetadata) {
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('OWNER_EMAIL'), identityMetadata.ownerEmail || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('OWNER_USER_ID'), identityMetadata.ownerUserId || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('COLLABORATOR_EMAILS'), identityMetadata.collaboratorEmails || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('COLLABORATOR_USER_IDS'), identityMetadata.collaboratorUserIds || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('CREATED_BY_EMAIL'), identityMetadata.createdByEmail || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('CREATED_BY_USER_ID'), identityMetadata.createdByUserId || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('VISIBILITY'), identityMetadata.visibility || 'team');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('PROJECT_ID'), identityMetadata.projectId || '');
      writeOptionalCell_(finalRowValues, headerMap, baFoxOptionalTaskFieldNames_('PARENT_TASK_ID'), identityMetadata.parentTaskId || '');
      if (identityMetadata.collaboratorEmails && (!getOptionalColumnIndex_(headerMap, baFoxOptionalTaskFieldNames_('COLLABORATOR_EMAILS')) || !getOptionalColumnIndex_(headerMap, baFoxOptionalTaskFieldNames_('COLLABORATOR_USER_IDS')))) {
        return baFoxError('TASK_IDENTITY_SCHEMA_INCOMPLETE', 'Collaborator columns are not available in Tasks.', {
          missingColumns: ['Collaborator Emails', 'Collaborator User IDs']
        });
      }
      if (identityMetadata.projectId && !getOptionalColumnIndex_(headerMap, baFoxOptionalTaskFieldNames_('PROJECT_ID'))) {
        return baFoxError('TASK_PROJECT_SCHEMA_INCOMPLETE', 'Project ID column is not available in Tasks.', {
          missingColumns: ['Project ID']
        });
      }
      if (identityMetadata.parentTaskId && !getOptionalColumnIndex_(headerMap, baFoxOptionalTaskFieldNames_('PARENT_TASK_ID'))) {
        return baFoxError('TASK_HIERARCHY_SCHEMA_INCOMPLETE', 'Parent Task ID column is not available in Tasks.', {
          missingColumns: ['Parent Task ID']
        });
      }
    }
    sheet.appendRow(finalRowValues);
    return baFoxOk({
      dryRun: false,
      appended: true,
      rowNumber: sheet.getLastRow(),
      performance: {
        operation: 'sheetAppend',
        sheetWriteMs: new Date().getTime() - startedAt,
        timestamp: baFoxIsoNow()
      },
      taskIdentitySchema: schema,
      optionalIdentityColumnsPresent: schema.anyPresent,
      identityColumnsApplied: identityMetadata ? schema.presentColumns : [],
      identityColumnsMissing: schema.missingColumns
    });
  } catch (err) {
    return baFoxError(
      'TASK_APPEND_FAILED',
      err && err.message ? err.message : 'Task append failed.',
      {}
    );
  }
}

function baFoxUpdateTaskRow(taskId, patch) {
  return {
    dryRun: true,
    taskId: taskId,
    patch: patch,
    message: 'Stage V2.4 read-only mode does not update Google Sheets.'
  };
}

function baFoxAppendReportRow(rowValues) {
  return {
    dryRun: true,
    rowValues: rowValues,
    message: 'Stage V2.4 read-only mode does not write reports.'
  };
}

var BA_FOX_CLEANUP_AUDIT = {
  CANONICAL_STATUSES: [
    'Не начато',
    'В работе',
    'Ждём ответ',
    'Пуш',
    'Блокер',
    'Нужно уточнить',
    'На проверке',
    'Частично выполнено',
    'Перенести',
    'Выполнено',
    'Отменено',
    'Архив'
  ],
  STATUS_MAPPINGS: {
    'in progress': 'В работе',
    'waiting': 'Ждём ответ',
    'push': 'Пуш',
    'done': 'Выполнено',
    'archived': 'Архив',
    'cancelled': 'Отменено',
    'ждем ответ': 'Ждём ответ'
  },
  CANONICAL_PRIORITIES: ['Высокий', 'Средний', 'Низкий'],
  PRIORITY_MAPPINGS: {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий'
  },
  FINAL_STATUSES: ['Выполнено', 'Отменено', 'Архив', 'Done', 'Cancelled', 'Archived']
};

function baFoxBuildCleanupAuditDryRun(storeResult) {
  try {
    storeResult = storeResult || baFoxReadTasksRows();
    var rows = storeResult.rows || [];
    var tasks = baFoxNormalizeTaskRows_(storeResult);
    var normalizedRows = rows.map(function(row, index) {
      return {
        rowNumber: index + 2,
        raw: row,
        task: tasks[index] || baFoxNormalizeTaskRow(row, storeResult.headers || [])
      };
    });

    var items = [];
    baFoxAuditDuplicateTaskIds_(normalizedRows, items);
    baFoxAuditNearDuplicates_(normalizedRows, items);
    baFoxAuditRows_(normalizedRows, items);

    return {
      ok: true,
      data: {
        summary: baFoxBuildCleanupAuditSummary_(rows.length, items),
        items: items
      },
      error: null
    };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: {
        code: 'CLEANUP_AUDIT_ERROR',
        message: err && err.message ? err.message : 'Cleanup audit failed.',
        details: null
      }
    };
  }
}

function baFoxAuditDuplicateTaskIds_(rows, items) {
  var groups = {};
  rows.forEach(function(entry) {
    var taskId = baFoxSafeString(entry.task.id);
    if (!taskId) {
      return;
    }
    if (!groups[taskId]) {
      groups[taskId] = [];
    }
    groups[taskId].push(entry);
  });

  Object.keys(groups).forEach(function(taskId) {
    if (groups[taskId].length < 2) {
      return;
    }
    groups[taskId].forEach(function(entry) {
      baFoxAuditAddItem_(items, entry, 'DUPLICATE_ID', taskId, taskId, 0.95, 'MERGE_CONTEXT_ONLY', true, 'Duplicate Task ID appears on rows ' + baFoxAuditRowNumbers_(groups[taskId]) + '. Review before keeping one primary row.');
    });
  });
}

function baFoxAuditNearDuplicates_(rows, items) {
  var groups = {};
  rows.forEach(function(entry) {
    var organization = baFoxAuditNormalizeText_(entry.task.organization);
    var title = baFoxAuditNormalizeText_(entry.task.title);
    if (!organization || !title) {
      return;
    }
    var key = organization + '|' + title;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(entry);
  });

  Object.keys(groups).forEach(function(key) {
    if (groups[key].length < 2) {
      return;
    }
    groups[key].forEach(function(entry) {
      baFoxAuditAddItem_(items, entry, 'NEAR_DUPLICATE', entry.task.organization + ' / ' + entry.task.title, '', 0.75, 'REVIEW_REQUIRED', true, 'Same organization and normalized title appears on rows ' + baFoxAuditRowNumbers_(groups[key]) + '. Archive or merge only after approval.');
    });
  });
}

function baFoxAuditRows_(rows, items) {
  rows.forEach(function(entry) {
    var task = entry.task;
    var active = baFoxAuditIsActiveTask_(task);

    baFoxAuditStatus_(entry, items);
    baFoxAuditPriority_(entry, items);
    baFoxAuditV2Fields_(entry, active, items);
    baFoxAuditDates_(entry, items);
    baFoxAuditLegacyActiveRow_(entry, active, items);
    baFoxAuditCorruptedFields_(entry, items);
    baFoxAuditArchiveCandidate_(entry, items);
  });
}

function baFoxAuditStatus_(entry, items) {
  var status = baFoxSafeString(entry.task.status);
  if (!status) {
    baFoxAuditAddItem_(items, entry, 'STATUS_NORMALIZATION', '', 'Нужно уточнить', 0.7, 'REVIEW_REQUIRED', true, 'Status is empty and should be reviewed before future write functions depend on it.');
    return;
  }
  if (BA_FOX_CLEANUP_AUDIT.CANONICAL_STATUSES.indexOf(status) !== -1) {
    return;
  }

  var proposed = BA_FOX_CLEANUP_AUDIT.STATUS_MAPPINGS[baFoxAuditNormalizeText_(status)] || '';
  baFoxAuditAddItem_(items, entry, 'STATUS_NORMALIZATION', status, proposed || 'Нужно уточнить', proposed ? 0.85 : 0.55, proposed ? 'NORMALIZE' : 'REVIEW_REQUIRED', true, proposed ? 'Legacy status can be normalized after approval.' : 'Status is not in the canonical set and needs review.');
}

function baFoxAuditPriority_(entry, items) {
  var priority = baFoxSafeString(entry.task.priority);
  if (!priority) {
    return;
  }
  if (BA_FOX_CLEANUP_AUDIT.CANONICAL_PRIORITIES.indexOf(priority) !== -1) {
    return;
  }

  var proposed = BA_FOX_CLEANUP_AUDIT.PRIORITY_MAPPINGS[baFoxAuditNormalizeText_(priority)] || '';
  baFoxAuditAddItem_(items, entry, 'PRIORITY_NORMALIZATION', priority, proposed || '', proposed ? 0.9 : 0.55, proposed ? 'NORMALIZE' : 'REVIEW_REQUIRED', true, proposed ? 'Legacy priority can be normalized after approval.' : 'Priority is not in the canonical set and needs review.');
}

function baFoxAuditV2Fields_(entry, active, items) {
  if (!active) {
    return;
  }

  var raw = entry.raw;
  var taskType = baFoxSafeString(raw[BA_FOX_CONFIG.TASK_COLUMNS.TASK_TYPE - 1]);
  var owner = baFoxSafeString(raw[BA_FOX_CONFIG.TASK_COLUMNS.OWNER - 1]);

  if (!taskType) {
    baFoxAuditAddItem_(items, entry, 'TASK_TYPE_MISSING', '', 'work', 0.5, 'REVIEW_REQUIRED', true, 'Active row has an empty Task Type column. Default display behavior is not a cleanup write decision.');
  }
  if (!owner) {
    baFoxAuditAddItem_(items, entry, 'OWNER_MISSING', '', 'Lisa', 0.5, 'REVIEW_REQUIRED', true, 'Active row has an empty Owner column. Default display behavior is not a cleanup write decision.');
  }
}

function baFoxAuditDates_(entry, items) {
  [
    { label: 'Date', value: entry.task.date },
    { label: 'Deadline', value: entry.task.deadline },
    { label: 'Next Reminder', value: entry.task.nextReminder }
  ].forEach(function(field) {
    var value = baFoxSafeString(field.value);
    if (!value || baFoxAuditIsIsoDate_(value) || baFoxAuditIsIsoDateTime_(value)) {
      return;
    }
    if (baFoxAuditIsVagueDate_(value)) {
      baFoxAuditAddItem_(items, entry, 'CORRUPTED_FIELD', field.label + ': ' + value, '', 0.65, 'REVIEW_REQUIRED', true, field.label + ' is vague or human-readable. Add a machine-readable control date only after review.');
    }
  });
}

function baFoxAuditLegacyActiveRow_(entry, active, items) {
  if (!active) {
    return;
  }

  var source = baFoxAuditNormalizeText_(entry.task.source);
  var appSource = baFoxAuditNormalizeText_(entry.task.appSource);
  var rawCreatedAt = baFoxSafeString(entry.raw[BA_FOX_CONFIG.TASK_COLUMNS.CREATED_AT - 1]);
  if (source.indexOf('telegram') !== -1 || appSource.indexOf('telegram') !== -1 || !rawCreatedAt) {
    baFoxAuditAddItem_(items, entry, 'ACTIVE_LEGACY_ROW', entry.task.source || entry.task.appSource || 'missing V2 metadata', '', 0.6, 'REVIEW_REQUIRED', true, 'Active row appears to come from legacy or incomplete V2 data. Keep visible until Lisa reviews it.');
  }
}

function baFoxAuditCorruptedFields_(entry, items) {
  var task = entry.task;
  if (!baFoxSafeString(task.id) && !baFoxSafeString(task.title)) {
    baFoxAuditAddItem_(items, entry, 'CORRUPTED_FIELD', 'Task ID and title are both empty', '', 0.8, 'REVIEW_REQUIRED', true, 'Row lacks both primary identifier and title.');
  }
  if (baFoxSafeString(task.title).length > 500) {
    baFoxAuditAddItem_(items, entry, 'CORRUPTED_FIELD', 'Title length: ' + baFoxSafeString(task.title).length, '', 0.6, 'REVIEW_REQUIRED', true, 'Title is unusually long and may contain pasted notes or shifted cell content.');
  }
  if (baFoxSafeString(task.status).length > 120) {
    baFoxAuditAddItem_(items, entry, 'CORRUPTED_FIELD', 'Status: ' + task.status, '', 0.75, 'REVIEW_REQUIRED', true, 'Status is unusually long and may indicate shifted or corrupted fields.');
  }
}

function baFoxAuditArchiveCandidate_(entry, items) {
  var task = entry.task;
  if (task.archived || !baFoxAuditIsFinalStatus_(task.status)) {
    return;
  }

  baFoxAuditAddItem_(items, entry, 'ARCHIVE_CANDIDATE', task.status, 'Архив', 0.65, 'ARCHIVE_AFTER_APPROVAL', true, 'Completed/cancelled row may be hidden from active views after backup and approval. Do not delete.');
}

function baFoxAuditAddItem_(items, entry, issueType, currentValue, proposedValue, confidence, suggestedAction, needsAdminApproval, notes) {
  items.push({
    rowNumber: entry.rowNumber,
    taskId: baFoxSafeString(entry.task.id),
    issueType: issueType,
    currentValue: baFoxSafeString(currentValue),
    proposedValue: baFoxSafeString(proposedValue),
    confidence: confidence,
    suggestedAction: suggestedAction,
    needsAdminApproval: needsAdminApproval,
    notes: notes
  });
}

function baFoxBuildCleanupAuditSummary_(rowsChecked, items) {
  return {
    rowsChecked: rowsChecked,
    duplicateGroups: baFoxAuditCountGroups_(items, 'DUPLICATE_ID'),
    nearDuplicateGroups: baFoxAuditCountGroups_(items, 'NEAR_DUPLICATE'),
    nonCanonicalStatuses: baFoxAuditCountItems_(items, 'STATUS_NORMALIZATION'),
    nonCanonicalPriorities: baFoxAuditCountItems_(items, 'PRIORITY_NORMALIZATION'),
    missingV2Fields: baFoxAuditCountItems_(items, 'TASK_TYPE_MISSING') + baFoxAuditCountItems_(items, 'OWNER_MISSING'),
    vagueDates: baFoxAuditCountDateReviewItems_(items),
    activeLegacyRows: baFoxAuditCountItems_(items, 'ACTIVE_LEGACY_ROW'),
    archiveCandidates: baFoxAuditCountItems_(items, 'ARCHIVE_CANDIDATE')
  };
}

function baFoxAuditCountItems_(items, issueType) {
  return items.filter(function(item) {
    return item.issueType === issueType;
  }).length;
}

function baFoxAuditCountGroups_(items, issueType) {
  var groups = {};
  items.forEach(function(item) {
    if (item.issueType === issueType) {
      groups[item.currentValue] = true;
    }
  });
  return Object.keys(groups).length;
}

function baFoxAuditCountDateReviewItems_(items) {
  return items.filter(function(item) {
    return item.issueType === 'CORRUPTED_FIELD' && item.notes.indexOf('machine-readable control date') !== -1;
  }).length;
}

function baFoxAuditRowNumbers_(group) {
  return group.map(function(entry) {
    return entry.rowNumber;
  }).join(', ');
}

function baFoxAuditIsActiveTask_(task) {
  return !task.archived && !baFoxAuditIsFinalStatus_(task.status);
}

function baFoxAuditIsFinalStatus_(status) {
  return BA_FOX_CLEANUP_AUDIT.FINAL_STATUSES.some(function(value) {
    return baFoxAuditNormalizeText_(status) === baFoxAuditNormalizeText_(value);
  });
}

function baFoxAuditNormalizeText_(value) {
  return baFoxSafeString(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\wа-я0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baFoxAuditIsIsoDate_(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function baFoxAuditIsIsoDateTime_(value) {
  return /^\d{4}-\d{2}-\d{2}[tT ]\d{2}:\d{2}/.test(value);
}

function baFoxAuditIsVagueDate_(value) {
  var normalized = baFoxAuditNormalizeText_(value);
  if (!normalized) {
    return false;
  }
  if (/^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(value)) {
    return true;
  }
  return [
    'сегодня',
    'завтра',
    'понедельник',
    'вторник',
    'среда',
    'четверг',
    'пятница',
    'суббота',
    'воскресенье',
    'на неделе',
    'на этой неделе',
    'после ответа',
    'ждем ответ',
    'ждём ответ'
  ].some(function(signal) {
    return normalized.indexOf(baFoxAuditNormalizeText_(signal)) !== -1;
  });
}

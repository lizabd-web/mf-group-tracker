function baFoxAuditEvent(action, entityType, entityId, details) {
  return {
    dryRun: true,
    event: {
      timestamp: baFoxIsoNow(),
      actor: baFoxSafeString(details && details.actor) || 'apps_script_scaffold',
      action: action,
      entityType: entityType,
      entityId: entityId || '',
      source: 'apps_script',
      notes: details || {}
    },
    message: 'Stage V2.2 scaffold does not append audit rows.'
  };
}

function baFoxAuditTaskAction(details) {
  var sheet = baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.AUDIT_LOG);
  if (!sheet) {
    return {
      dryRun: false,
      warning: 'AuditLog sheet is not available.'
    };
  }

  try {
    var headers = baFoxReadSheetHeaders_(sheet);
    if (!headers.length) {
      return {
        dryRun: false,
        warning: 'AuditLog has no headers.'
      };
    }

    var values = headers.map(function(header) {
      var key = baFoxSafeString(header).toLowerCase();
      var compactKey = key.replace(/[^a-z0-9]+/g, '');
      var beforeValue = details.previousValues || baFoxAuditStateJson_({
        status: details.previousStatus,
        nextReminder: details.previousNextReminder
      });
      var afterValue = details.newValues || baFoxAuditStateJson_({
        status: details.newStatus,
        nextReminder: details.newNextReminder
      });

      if (compactKey === 'eventid') return details.eventId || baFoxAuditEventId_(details);
      if (key === 'timestamp') return details.timestamp || baFoxIsoNow();
      if (key === 'actor') return details.actor || 'MF Group Tracker';
      if (compactKey === 'taskid' || compactKey === 'entityid') return details.taskId || '';
      if (compactKey === 'entitytype') return details.entityType || 'task';
      if (key === 'action') return details.action || '';
      if (compactKey === 'previousstatus') return details.previousStatus || '';
      if (compactKey === 'newstatus') return details.newStatus || '';
      if (compactKey === 'previousnextreminder') return details.previousNextReminder || '';
      if (compactKey === 'newnextreminder') return details.newNextReminder || '';
      if (compactKey === 'routeaction' || compactKey === 'route') return details.routeAction || 'taskAction/' + (details.action || '');
      if (compactKey === 'changedfields') return details.changedFields || '';
      if (compactKey === 'previousvalues' || compactKey === 'before') return beforeValue;
      if (compactKey === 'newvalues' || compactKey === 'after') return afterValue;
      if (compactKey === 'notes' || compactKey === 'details') return details.notes || details.details || details.changedFields || details.routeAction || '';
      if (key === 'source') return details.source || 'web';
      if (key === 'result') return details.result || '';
      if (compactKey === 'errorcode') return details.errorCode || '';
      return '';
    });

    sheet.appendRow(values);
    return {
      dryRun: false,
      appended: true
    };
  } catch (err) {
    return {
      dryRun: false,
      warning: err && err.message ? err.message : 'AuditLog append failed.'
    };
  }
}

function baFoxAuditStateJson_(state) {
  var compact = {};
  Object.keys(state || {}).forEach(function(key) {
    if (state[key] !== undefined && state[key] !== null && state[key] !== '') {
      compact[key] = state[key];
    }
  });
  return Object.keys(compact).length ? JSON.stringify(compact) : '';
}

function baFoxAuditEventId_(details) {
  var timestamp = baFoxSafeString(details && details.timestamp) || baFoxIsoNow();
  var taskId = baFoxSafeString(details && details.taskId) || 'task';
  var action = baFoxSafeString(details && details.action) || 'event';
  return ['AUD', timestamp, taskId, action].join('-');
}

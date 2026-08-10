function getUsersSheet_() {
  return baFoxGetSheetByName_(BA_FOX_CONFIG.SHEETS.USERS);
}

function usersSheetHeaders_() {
  return [
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
    'updatedAt'
  ];
}

function identityTruthy_(value) {
  var normalized = baFoxSafeString(value).toLowerCase();
  return value === true || ['true', 'yes', '1', 'да'].indexOf(normalized) !== -1;
}

function normalizeWorkspaceEmail_(email) {
  return baFoxSafeString(email).toLowerCase();
}

function isAllowedWorkspaceEmail_(email) {
  var normalized = normalizeWorkspaceEmail_(email);
  var allowedDomain = normalizeWorkspaceEmail_(BA_FOX_CONFIG.ALLOWED_WORKSPACE_DOMAIN || 'mfstream.io');
  return Boolean(normalized) && normalized.slice(-1 * ('@' + allowedDomain).length) === '@' + allowedDomain;
}

function identityEnforcementMode_() {
  var mode = baFoxSafeString(BA_FOX_CONFIG.IDENTITY_ENFORCEMENT_MODE || 'profile_only').toLowerCase();
  return ['off', 'profile_only', 'soft', 'enforced'].indexOf(mode) !== -1 ? mode : 'profile_only';
}

function identityVisibilityMode_() {
  if (BA_FOX_CONFIG.VISIBILITY_ENFORCEMENT === true || identityEnforcementMode_() === 'enforced') {
    return 'enforced';
  }
  return identityEnforcementMode_();
}

function backendIdentityEnforced_(identityMode) {
  return identityEnforcementMode_() === 'enforced'
    && ['google_token_verified', 'trusted_device_session'].indexOf(identityMode) !== -1;
}

function backendIdentityEnforcementStatus_(identityMode) {
  if (backendIdentityEnforced_(identityMode)) {
    return 'enforced';
  }
  if (['google_token_verified', 'trusted_device_session'].indexOf(identityMode) !== -1) {
    return 'partial';
  }
  return identityEnforcementMode_() === 'enforced' ? 'enforced_requires_token' : 'partial';
}

function configuredGoogleClientId_() {
  if (baFoxSafeString(BA_FOX_CONFIG.GOOGLE_CLIENT_ID)) {
    return baFoxSafeString(BA_FOX_CONFIG.GOOGLE_CLIENT_ID);
  }
  if (typeof PropertiesService === 'undefined') {
    return '';
  }
  try {
    return baFoxSafeString(PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID'));
  } catch (err) {
    return '';
  }
}

function requestIdentityToken_(request) {
  var normalized = baFoxNormalizeRequest(request);
  return baFoxSafeString(
    normalized.idToken
    || normalized.identityToken
    || normalized.credential
    || normalized.googleCredential
  );
}

function requestTrustedDeviceSession_(request) {
  var normalized = baFoxNormalizeRequest(request);
  return baFoxSafeString(normalized.trustedDeviceSession);
}

function trustedDeviceSessionPropertyKey_(session) {
  var digest = identityTokenCacheKey_(session);
  return digest ? 'baFoxTrustedDevice:' + digest.slice('baFoxIdentity:'.length) : '';
}

function trustedDeviceSessionTtlMs_() {
  return 30 * 24 * 60 * 60 * 1000;
}

function verifyTrustedDeviceSession_(session) {
  var rawSession = baFoxSafeString(session);
  var propertyKey = trustedDeviceSessionPropertyKey_(rawSession);
  if (!rawSession || !propertyKey || typeof PropertiesService === 'undefined') {
    return { ok: false, error: 'TRUSTED_DEVICE_SESSION_MISSING' };
  }
  try {
    var properties = PropertiesService.getScriptProperties();
    var stored = properties.getProperty(propertyKey);
    if (!stored) return { ok: false, error: 'TRUSTED_DEVICE_SESSION_NOT_FOUND' };
    var record = JSON.parse(stored);
    if (!record.expiresAt || Number(record.expiresAt) <= new Date().getTime() || !isAllowedWorkspaceEmail_(record.email)) {
      properties.deleteProperty(propertyKey);
      return { ok: false, error: 'TRUSTED_DEVICE_SESSION_EXPIRED' };
    }
    return { ok: true, email: normalizeWorkspaceEmail_(record.email), expiresAt: Number(record.expiresAt) };
  } catch (error) {
    return { ok: false, error: 'TRUSTED_DEVICE_SESSION_INVALID' };
  }
}

function issueTrustedDeviceSession_(email, existingSession) {
  var existing = verifyTrustedDeviceSession_(existingSession);
  var normalizedEmail = normalizeWorkspaceEmail_(email);
  if (existing.ok && existing.email === normalizedEmail) return baFoxSafeString(existingSession);
  if (!normalizedEmail || typeof PropertiesService === 'undefined' || typeof Utilities === 'undefined') return '';
  var session = Utilities.getUuid() + Utilities.getUuid();
  var propertyKey = trustedDeviceSessionPropertyKey_(session);
  if (!propertyKey) return '';
  try {
    PropertiesService.getScriptProperties().setProperty(propertyKey, JSON.stringify({
      email: normalizedEmail,
      expiresAt: new Date().getTime() + trustedDeviceSessionTtlMs_()
    }));
    return session;
  } catch (error) {
    return '';
  }
}

function identityTokenCacheKey_(token) {
  if (typeof Utilities === 'undefined' || !Utilities.computeDigest) {
    return '';
  }
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token,
    Utilities.Charset.UTF_8
  );
  return 'baFoxIdentity:' + Utilities.base64EncodeWebSafe(digest).slice(0, 40);
}

function identityTokenCache_() {
  if (typeof CacheService === 'undefined') {
    return null;
  }
  return CacheService.getScriptCache();
}

function usersSheetStatus_() {
  var sheet = getUsersSheet_();
  if (!sheet) {
    return {
      sheet: BA_FOX_CONFIG.SHEETS.USERS,
      exists: false,
      status: 'missing',
      headerColumns: 0,
      dataRows: 0,
      expectedHeaders: usersSheetHeaders_()
    };
  }
  return {
    sheet: BA_FOX_CONFIG.SHEETS.USERS,
    exists: true,
    status: sheet.getLastRow() <= 1 ? 'headers_only' : 'has_data',
    headerColumns: sheet.getLastColumn(),
    dataRows: Math.max(sheet.getLastRow() - 1, 0),
    expectedHeaders: usersSheetHeaders_()
  };
}

function normalizeUserRecord_(row, rowNumber) {
  row = row || [];
  return {
    rowNumber: rowNumber || null,
    userId: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.USER_ID - 1]),
    email: normalizeWorkspaceEmail_(row[BA_FOX_CONFIG.USERS_COLUMNS.EMAIL - 1]),
    displayName: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.DISPLAY_NAME - 1]),
    title: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.TITLE - 1]),
    accessRole: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.ACCESS_ROLE - 1]).toLowerCase() || 'member',
    status: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.STATUS - 1]).toLowerCase() || 'active',
    department: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.DEPARTMENT - 1]),
    defaultOwnerLabel: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.DEFAULT_OWNER_LABEL - 1]),
    accentColor: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.ACCENT_COLOR - 1]),
    canSeeAll: identityTruthy_(row[BA_FOX_CONFIG.USERS_COLUMNS.CAN_SEE_ALL - 1]),
    createdAt: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.CREATED_AT - 1]),
    updatedAt: baFoxSafeString(row[BA_FOX_CONFIG.USERS_COLUMNS.UPDATED_AT - 1])
  };
}

var baFoxUsersMemo_ = {
  expiresAt: 0,
  users: null
};

function getUsers_() {
  var now = new Date().getTime();
  if (baFoxUsersMemo_.users && baFoxUsersMemo_.expiresAt > now) {
    return baFoxUsersMemo_.users;
  }
  var sheet = getUsersSheet_();
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  var users = values.slice(1).map(function(row, index) {
    return normalizeUserRecord_(row, index + 2);
  }).filter(function(user) {
    return Boolean(user.email || user.userId || user.displayName);
  });
  baFoxUsersMemo_ = {
    expiresAt: now + 15000,
    users: users
  };
  return users;
}

function findUserByEmail_(email) {
  var normalized = normalizeWorkspaceEmail_(email);
  if (!normalized) {
    return null;
  }
  var users = getUsers_();
  for (var index = 0; index < users.length; index += 1) {
    if (users[index].email === normalized) {
      return users[index];
    }
  }
  return null;
}

function findUserByUserId_(userId) {
  var normalized = baFoxSafeString(userId).toLowerCase();
  if (!normalized) {
    return null;
  }
  var users = getUsers_();
  for (var index = 0; index < users.length; index += 1) {
    if (baFoxSafeString(users[index].userId).toLowerCase() === normalized) {
      return users[index];
    }
  }
  return null;
}

function findUserByOwnerLabel_(label) {
  var normalized = baFoxSafeString(label).toLowerCase();
  if (!normalized) {
    return {
      user: null,
      matches: [],
      ambiguous: false,
      warning: 'OWNER_LABEL_MISSING'
    };
  }
  var matches = getUsers_().filter(function(user) {
    return baFoxSafeString(user.defaultOwnerLabel).toLowerCase() === normalized;
  });
  if (matches.length === 1) {
    return {
      user: matches[0],
      matches: matches,
      ambiguous: false,
      warning: ''
    };
  }
  return {
    user: null,
    matches: matches,
    ambiguous: matches.length > 1,
    warning: matches.length > 1 ? 'OWNER_LABEL_AMBIGUOUS' : 'OWNER_LABEL_NOT_FOUND'
  };
}

function activeUserEmail_() {
  if (typeof Session === 'undefined' || !Session.getActiveUser) {
    return '';
  }
  try {
    return normalizeWorkspaceEmail_(Session.getActiveUser().getEmail());
  } catch (err) {
    return '';
  }
}

function verifyGoogleIdentityToken_(idToken) {
  var token = baFoxSafeString(idToken);
  var clientId = configuredGoogleClientId_();
  var clientIdConfigured = Boolean(clientId);
  if (!token) {
    return {
      ok: false,
      mode: 'missing_token',
      claims: null,
      error: 'MISSING_TOKEN',
      message: 'Google identity token is missing.',
      clientIdConfigured: clientIdConfigured
    };
  }
  var cache = identityTokenCache_();
  var cacheKey = identityTokenCacheKey_(token);
  if (cache && cacheKey) {
    try {
      var cached = cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheReadError) {
      // Token verification continues normally when the short-lived cache is unavailable.
    }
  }
  if (typeof UrlFetchApp === 'undefined') {
    return {
      ok: false,
      mode: 'google_token_invalid',
      claims: null,
      error: 'URL_FETCH_UNAVAILABLE',
      message: 'Apps Script UrlFetchApp is not available for token verification.',
      clientIdConfigured: clientIdConfigured
    };
  }

  try {
    var response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true }
    );
    var status = response.getResponseCode();
    var body = response.getContentText();
    var claims = body ? JSON.parse(body) : {};
    if (status < 200 || status >= 300 || claims.error) {
      return {
        ok: false,
        mode: 'google_token_invalid',
        claims: claims,
        error: claims.error || 'TOKENINFO_REJECTED',
        message: claims.error_description || 'Google tokeninfo rejected the identity token.',
        email: normalizeWorkspaceEmail_(claims.email),
        clientIdConfigured: clientIdConfigured
      };
    }
    if (clientId && claims.aud !== clientId) {
      return {
        ok: false,
        mode: 'google_token_invalid',
        claims: claims,
        error: 'AUDIENCE_MISMATCH',
        message: 'Google identity token audience does not match configured client ID.',
        email: normalizeWorkspaceEmail_(claims.email),
        clientIdConfigured: clientIdConfigured
      };
    }
    if (!baFoxSafeString(claims.email)) {
      return {
        ok: false,
        mode: 'google_token_invalid',
        claims: claims,
        error: 'EMAIL_MISSING',
        message: 'Google identity token does not include email.',
        clientIdConfigured: clientIdConfigured
      };
    }
    if (claims.email_verified !== undefined && String(claims.email_verified) !== 'true') {
      return {
        ok: false,
        mode: 'google_token_invalid',
        claims: claims,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Google identity token email is not verified.',
        email: normalizeWorkspaceEmail_(claims.email),
        clientIdConfigured: clientIdConfigured
      };
    }
    var verifiedResult = {
      ok: true,
      mode: 'google_token_verified',
      claims: claims,
      email: normalizeWorkspaceEmail_(claims.email),
      clientIdConfigured: clientIdConfigured
    };
    if (cache && cacheKey) {
      try {
        cache.put(cacheKey, JSON.stringify(verifiedResult), 300);
      } catch (cacheWriteError) {
        // A cache miss only affects latency; it must never block sign-in.
      }
    }
    return verifiedResult;
  } catch (err) {
    return {
      ok: false,
      mode: 'google_token_invalid',
      claims: null,
      error: 'TOKEN_VERIFICATION_FAILED',
      message: err && err.message ? err.message : 'Google identity token verification failed.',
      clientIdConfigured: clientIdConfigured
    };
  }
}

function safeTokenVerificationDiagnostics_(tokenResult, usersSheetStatus, overrides) {
  var result = tokenResult || {};
  var claims = result.claims || {};
  var clientId = configuredGoogleClientId_();
  var expectedAudienceConfigured = Boolean(clientId || result.clientIdConfigured);
  var tokenAudience = baFoxSafeString(claims.aud);
  var audienceMatches = '';
  if (expectedAudienceConfigured && tokenAudience) {
    audienceMatches = tokenAudience === clientId;
  }
  var email = normalizeWorkspaceEmail_(result.email || claims.email);
  var domainAllowed = email ? isAllowedWorkspaceEmail_(email) : false;
  var userRegistered = false;
  if (email && domainAllowed && usersSheetStatus && usersSheetStatus.exists) {
    userRegistered = Boolean(findUserByEmail_(email));
  }
  var emailVerified = '';
  if (claims.email_verified !== undefined) {
    emailVerified = String(claims.email_verified) === 'true';
  }
  var diagnostics = {
    ok: result.ok === true,
    mode: result.mode || 'missing_token',
    error: result.error || '',
    message: result.message || '',
    audienceMatches: audienceMatches,
    expectedAudienceConfigured: expectedAudienceConfigured,
    tokenAudience: tokenAudience,
    email: email,
    emailVerified: emailVerified,
    domainAllowed: domainAllowed,
    userRegistered: userRegistered
  };
  Object.keys(overrides || {}).forEach(function(key) {
    diagnostics[key] = overrides[key];
  });
  return diagnostics;
}

function getIdentityFromRequest_(request) {
  var idToken = requestIdentityToken_(request);
  if (idToken) {
    var tokenResult = verifyGoogleIdentityToken_(idToken);
    if (tokenResult.ok) {
      return {
        source: 'google_identity_token',
        identityMode: 'google_token_verified',
        email: tokenResult.email,
        tokenVerification: tokenResult
      };
    }
    return {
      source: 'google_identity_token',
      identityMode: tokenResult.mode || 'google_token_invalid',
      email: '',
      tokenVerification: tokenResult
    };
  }

  var trustedDeviceSession = requestTrustedDeviceSession_(request);
  if (trustedDeviceSession) {
    var trustedSessionResult = verifyTrustedDeviceSession_(trustedDeviceSession);
    if (trustedSessionResult.ok) {
      return {
        source: 'trusted_device_session',
        identityMode: 'trusted_device_session',
        email: trustedSessionResult.email,
        tokenVerification: {
          ok: true,
          mode: 'trusted_device_session',
          error: '',
          message: '',
          expiresAt: trustedSessionResult.expiresAt
        }
      };
    }
  }

  var activeEmail = activeUserEmail_();
  return {
    source: activeEmail ? 'apps_script_active_user' : 'none',
    identityMode: activeEmail ? 'active_user_email_available' : 'missing_token',
    email: activeEmail,
    tokenVerification: {
      ok: false,
      mode: 'missing_token',
      claims: null,
      error: 'MISSING_TOKEN',
      message: 'No Google identity token was provided by the frontend.'
    }
  };
}

function getFallbackUserProfile_() {
  return {
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
    isAllowedDomain: false
  };
}

function normalizeProfileRole_(profile) {
  return baFoxSafeString(profile && profile.accessRole || 'viewer').toLowerCase();
}

function profileCanSeeAll_(profile) {
  var role = normalizeProfileRole_(profile);
  return profile && (profile.canSeeAll === true || role === 'admin' || role === 'executive');
}

function profileCanWrite_(profile) {
  var role = normalizeProfileRole_(profile);
  return profile && profile.isRegistered === true && profile.status === 'active'
    && ['admin', 'executive', 'member'].indexOf(role) !== -1;
}

function profileCanManageUsers_(profile) {
  return profile && profile.isRegistered === true && profile.status === 'active' && normalizeProfileRole_(profile) === 'admin';
}

function profileCanManageProjects_(profile) {
  var role = normalizeProfileRole_(profile);
  return profile && profile.isRegistered === true && profile.status === 'active'
    && ['admin', 'executive'].indexOf(role) !== -1;
}

function profileCanUseDashboard_(profile) {
  var role = normalizeProfileRole_(profile);
  return profile && profile.isRegistered === true && profile.status === 'active'
    && ['admin', 'executive', 'member', 'viewer'].indexOf(role) !== -1;
}

function safeUserSummary_(user) {
  return {
    userId: baFoxSafeString(user && user.userId),
    email: normalizeWorkspaceEmail_(user && user.email),
    displayName: baFoxSafeString(user && user.displayName),
    accessRole: baFoxSafeString(user && user.accessRole),
    defaultOwnerLabel: baFoxSafeString(user && user.defaultOwnerLabel),
    department: baFoxSafeString(user && user.department),
    status: baFoxSafeString(user && user.status)
  };
}

function getSafeActiveUsersForPreview_(request) {
  var identity = getCurrentUserProfile_(request || {}, {});
  if (['google_token_verified', 'trusted_device_session'].indexOf(identity.identityMode) === -1
      || !profileCanManageUsers_(identity.profile)) {
    return baFoxError('ADMIN_REQUIRED', 'Admin profile is required for active user preview list.', {
      identityMode: identity.identityMode
    });
  }
  return baFoxOk({
    users: getUsers_().filter(function(user) {
      return user.status === 'active';
    }).map(safeUserSummary_)
  });
}

function profilePermissions_(profile) {
  return {
    canSeeAll: profileCanSeeAll_(profile),
    canCreateTasks: profileCanWrite_(profile),
    canUseDashboard: profileCanUseDashboard_(profile),
    canManageUsers: profileCanManageUsers_(profile),
    canManageProjects: profileCanManageProjects_(profile),
    canWrite: profileCanWrite_(profile)
  };
}

function identityResponseLimitations_(tokenResult) {
  var limitations = [
    'Dashboard visibility is enforced: admin/executive users see all tasks, other users see only related tasks.',
    'Browser writes require a verified Google profile. A server-side action token remains a legacy integration fallback only.',
    'Legacy tasks only have Owner label; robust member visibility needs ownerEmail/userId, collaborator, createdBy, and visibility columns.',
    'Token verification uses Google tokeninfo from Apps Script. This is real Google validation, but future hard enforcement should be QA-tested against deployed OAuth settings.'
  ];
  if (!configuredGoogleClientId_()) {
    limitations.push('GOOGLE_CLIENT_ID is not configured in Apps Script properties/config, so audience matching is not active.');
  }
  if (tokenResult && tokenResult.error) {
    limitations.push('Latest token verification status: ' + tokenResult.error + '.');
  }
  return limitations;
}

function applyRegisteredProfileFlags_(user, identitySource) {
  user.isAuthenticated = true;
  user.isRegistered = true;
  user.isAllowedDomain = true;
  user.identitySource = identitySource || '';
  return user;
}

function getCurrentUserProfile_(request, context) {
  var settings = context || {};
  if (request && request.__verifiedIdentityResult) {
    return request.__verifiedIdentityResult;
  }
  var identity = getIdentityFromRequest_(request || {});
  if (settings.requireGoogleToken === true
      && identity.identityMode !== 'google_token_verified'
      && identity.identityMode !== 'trusted_device_session') {
    identity = {
      source: 'none',
      identityMode: identity.identityMode === 'google_token_invalid' ? 'google_token_invalid' : 'missing_token',
      email: '',
      tokenVerification: identity.tokenVerification || {
        ok: false,
        mode: 'missing_token',
        claims: null,
        error: 'MISSING_TOKEN',
        message: 'No verified Google identity token was provided.'
      }
    };
  }
  var activeEmail = identity.email;
  var usersSheetStatus = usersSheetStatus_();
  var enforcementMode = identityEnforcementMode_();
  var tokenResult = identity.tokenVerification || {};
  var limitations = identityResponseLimitations_(tokenResult);
  var tokenDiagnostics = safeTokenVerificationDiagnostics_(tokenResult, usersSheetStatus, {});

  if (!activeEmail) {
    var missingProfile = getFallbackUserProfile_();
    missingProfile.status = identity.identityMode === 'google_token_invalid' ? 'token_invalid' : 'identity_missing';
    return {
      identityMode: identity.identityMode || 'missing_token',
      profile: missingProfile,
      allowedDomain: BA_FOX_CONFIG.ALLOWED_WORKSPACE_DOMAIN,
      isBackendEnforced: backendIdentityEnforced_(identity.identityMode || 'missing_token'),
      enforcementMode: enforcementMode,
      backendEnforcementStatus: backendIdentityEnforcementStatus_(identity.identityMode || 'missing_token'),
      usersSheet: usersSheetStatus,
      limitations: limitations,
      permissions: profilePermissions_(missingProfile),
      canSeeAll: false,
      canCreateTasks: false,
      canUseDashboard: enforcementMode !== 'enforced',
      canManageUsers: false,
      tokenVerification: tokenDiagnostics
    };
  }

  if (!isAllowedWorkspaceEmail_(activeEmail)) {
    var outsideProfile = getFallbackUserProfile_();
    outsideProfile.email = activeEmail;
    outsideProfile.status = 'domain_not_allowed';
    outsideProfile.isAuthenticated = true;
    return {
      identityMode: 'domain_not_allowed',
      profile: outsideProfile,
      allowedDomain: BA_FOX_CONFIG.ALLOWED_WORKSPACE_DOMAIN,
      isBackendEnforced: backendIdentityEnforced_('domain_not_allowed'),
      enforcementMode: enforcementMode,
      backendEnforcementStatus: backendIdentityEnforcementStatus_('domain_not_allowed'),
      usersSheet: usersSheetStatus,
      limitations: limitations.concat(['Active user email is outside the allowed workspace domain.']),
      permissions: profilePermissions_(outsideProfile),
      canSeeAll: false,
      canCreateTasks: false,
      canUseDashboard: enforcementMode !== 'enforced',
      canManageUsers: false,
      tokenVerification: safeTokenVerificationDiagnostics_(tokenResult, usersSheetStatus, {
        email: activeEmail,
        domainAllowed: false,
        userRegistered: false
      })
    };
  }

  var user = findUserByEmail_(activeEmail);
  if (!user) {
    var unregisteredProfile = getFallbackUserProfile_();
    unregisteredProfile.email = activeEmail;
    unregisteredProfile.status = usersSheetStatus.exists ? 'user_not_registered' : 'users_sheet_missing';
    unregisteredProfile.isAuthenticated = true;
    unregisteredProfile.isAllowedDomain = true;
    return {
      identityMode: usersSheetStatus.exists ? 'user_not_registered' : 'users_sheet_missing',
      profile: unregisteredProfile,
      allowedDomain: BA_FOX_CONFIG.ALLOWED_WORKSPACE_DOMAIN,
      isBackendEnforced: backendIdentityEnforced_(usersSheetStatus.exists ? 'user_not_registered' : 'users_sheet_missing'),
      enforcementMode: enforcementMode,
      backendEnforcementStatus: backendIdentityEnforcementStatus_(usersSheetStatus.exists ? 'user_not_registered' : 'users_sheet_missing'),
      usersSheet: usersSheetStatus,
      limitations: limitations.concat(['User must be added to the Users sheet before role/profile enforcement.']),
      permissions: profilePermissions_(unregisteredProfile),
      canSeeAll: false,
      canCreateTasks: false,
      canUseDashboard: enforcementMode !== 'enforced',
      canManageUsers: false,
      tokenVerification: safeTokenVerificationDiagnostics_(tokenResult, usersSheetStatus, {
        email: activeEmail,
        domainAllowed: true,
        userRegistered: false
      })
    };
  }

  user = applyRegisteredProfileFlags_(user, identity.source);
  if (user.status !== 'active') {
    var inactivePermissions = profilePermissions_(user);
    return {
      identityMode: 'user_inactive',
      profile: user,
      allowedDomain: BA_FOX_CONFIG.ALLOWED_WORKSPACE_DOMAIN,
      isBackendEnforced: backendIdentityEnforced_('user_inactive'),
      enforcementMode: enforcementMode,
      backendEnforcementStatus: backendIdentityEnforcementStatus_('user_inactive'),
      usersSheet: usersSheetStatus,
      limitations: limitations.concat(['User exists in Users sheet but status is not active.']),
      permissions: inactivePermissions,
      canSeeAll: inactivePermissions.canSeeAll,
      canCreateTasks: false,
      canUseDashboard: enforcementMode !== 'enforced',
      canManageUsers: false,
      tokenVerification: safeTokenVerificationDiagnostics_(tokenResult, usersSheetStatus, {
        email: activeEmail,
        domainAllowed: true,
        userRegistered: true
      })
    };
  }

  var permissions = profilePermissions_(user);
  var identityMode = ['google_token_verified', 'trusted_device_session'].indexOf(identity.identityMode) !== -1
    ? identity.identityMode
    : 'active_user_email_registered';
  return {
    identityMode: identityMode,
    profile: user,
    allowedDomain: BA_FOX_CONFIG.ALLOWED_WORKSPACE_DOMAIN,
    isBackendEnforced: backendIdentityEnforced_(identityMode),
    enforcementMode: enforcementMode,
    backendEnforcementStatus: backendIdentityEnforcementStatus_(identityMode),
    usersSheet: usersSheetStatus,
    limitations: limitations,
    permissions: permissions,
    canSeeAll: permissions.canSeeAll,
    canCreateTasks: permissions.canCreateTasks,
    canUseDashboard: permissions.canUseDashboard,
    canManageUsers: permissions.canManageUsers,
    tokenVerification: safeTokenVerificationDiagnostics_(tokenResult, usersSheetStatus, {
      email: activeEmail,
      domainAllowed: true,
      userRegistered: true
    })
  };
}

function baFoxGetProfile(request) {
  var normalized = request || {};
  var result = getCurrentUserProfile_(normalized, {
    requireGoogleToken: true
  });
  if (result.identityMode === 'google_token_verified'
      && result.profile
      && result.profile.isRegistered
      && result.profile.status === 'active') {
    result.trustedDeviceSession = issueTrustedDeviceSession_(result.profile.email, requestTrustedDeviceSession_(normalized));
  }
  return baFoxOk(result);
}

function getVerifiedUserProfile_(request) {
  return getCurrentUserProfile_(request || {}, {});
}

function requireVerifiedProfile_(request, options) {
  var settings = options || {};
  if (request && request.__verifiedAuthorization && request.__verifiedAuthorization.ok) {
    return request.__verifiedAuthorization;
  }
  var result = getCurrentUserProfile_(request || {}, {
    requireGoogleToken: settings.requireGoogleToken === true
  });
  var mode = identityEnforcementMode_();
  var alwaysEnforce = settings.alwaysEnforce === true;
  var requiresRegistered = settings.requireRegistered !== false;
  var requiresWrite = settings.requireWrite === true;
  var profile = result.profile || getFallbackUserProfile_();

  if (mode !== 'enforced' && !alwaysEnforce) {
    return {
      ok: true,
      enforced: false,
      identity: result,
      profile: profile
    };
  }
  if (['google_token_verified', 'trusted_device_session'].indexOf(result.identityMode) === -1) {
    return {
      ok: false,
      enforced: true,
      identity: result,
      profile: profile,
      error: baFoxError('GOOGLE_TOKEN_REQUIRED', 'Verified Google identity token is required in enforced mode.', {
        identityMode: result.identityMode
      })
    };
  }
  if (!profile.isAuthenticated || (requiresRegistered && !profile.isRegistered) || profile.status !== 'active') {
    return {
      ok: false,
      enforced: true,
      identity: result,
      profile: profile,
      error: baFoxError('IDENTITY_REQUIRED', 'Verified active workspace user is required.', {
        identityMode: result.identityMode
      })
    };
  }
  if (requiresWrite && !profileCanWrite_(profile)) {
    return {
      ok: false,
      enforced: true,
      identity: result,
      profile: profile,
      error: baFoxError('WRITE_FORBIDDEN', 'This user cannot write tasks.', {
        accessRole: profile.accessRole
      })
    };
  }
  return {
    ok: true,
    enforced: true,
    identity: result,
    profile: profile
  };
}

function requireAuthorizedSafeWrite_(request) {
  var result = getVerifiedUserProfile_(request || {});
  var profile = result.profile || getFallbackUserProfile_();
  var hasVerifiedGoogleProfile = ['google_token_verified', 'trusted_device_session'].indexOf(result.identityMode) !== -1
    && profile.isAuthenticated === true
    && profile.isRegistered === true
    && profile.status === 'active';

  if (hasVerifiedGoogleProfile && profileCanWrite_(profile)) {
    return {
      ok: true,
      authorizationMode: result.identityMode === 'trusted_device_session' ? 'trusted_device_session' : 'google_profile',
      identity: result,
      profile: profile
    };
  }

  if (baFoxActionTokenMatches_(baFoxNormalizeRequest(request || {}).token)) {
    return {
      ok: true,
      authorizationMode: 'legacy_action_token',
      identity: result,
      profile: profile
    };
  }

  if (hasVerifiedGoogleProfile) {
    return {
      ok: false,
      authorizationMode: 'denied',
      identity: result,
      profile: profile,
      error: baFoxError('WRITE_FORBIDDEN', 'This user cannot write tasks.', {
        accessRole: profile.accessRole
      })
    };
  }

  if (result.identityMode === 'domain_not_allowed'
      || result.identityMode === 'user_not_registered'
      || result.identityMode === 'users_sheet_missing'
      || result.identityMode === 'user_inactive') {
    return {
      ok: false,
      authorizationMode: 'denied',
      identity: result,
      profile: profile,
      error: baFoxError('IDENTITY_REQUIRED', 'Verified active workspace user is required.', {
        identityMode: result.identityMode
      })
    };
  }

  return {
    ok: false,
    authorizationMode: 'denied',
    identity: result,
    profile: profile,
    error: baFoxError('GOOGLE_TOKEN_REQUIRED', 'Verified Google identity token is required for browser writes.', {
      identityMode: result.identityMode || 'missing_token'
    })
  };
}

function isUserAllowedForRoute_(profile, routeName, action) {
  if (!profile || profile.status !== 'active') {
    return false;
  }
  if (['dashboard', 'workspaceDashboard', 'fullDashboard', 'today', 'inbox', 'focus', 'open', 'pushes', 'completed'].indexOf(routeName) !== -1) {
    return profileCanUseDashboard_(profile);
  }
  if (['createTask', 'editTask', 'taskAction'].indexOf(routeName) !== -1) {
    return profileCanWrite_(profile);
  }
  if (routeName === 'users' || action === 'manageUsers') {
    return profileCanManageUsers_(profile);
  }
  if (routeName === 'createProject' || routeName === 'updateProject' || action === 'manageProjects') {
    return profileCanManageProjects_(profile);
  }
  return true;
}

function identityArrayContains_(items, value, normalizeEmail) {
  var target = normalizeEmail ? normalizeWorkspaceEmail_(value) : baFoxSafeString(value).toLowerCase();
  if (!target) {
    return false;
  }
  return (items || []).some(function(item) {
    var normalized = normalizeEmail ? normalizeWorkspaceEmail_(item) : baFoxSafeString(item).toLowerCase();
    return normalized === target;
  });
}

function taskIdentityList_(task, fieldName, normalizeEmail) {
  if (!task) {
    return [];
  }
  if (Array.isArray(task[fieldName])) {
    return task[fieldName];
  }
  return baFoxSplitIdentityList_(task[fieldName], normalizeEmail);
}

function profileCanSeeTask_(profile, task) {
  if (!profileCanUseDashboard_(profile) || profile.status !== 'active' || profile.isRegistered !== true) {
    return false;
  }
  if (profileCanSeeAll_(profile)) {
    return true;
  }
  var normalizedEmail = normalizeWorkspaceEmail_(profile.email);
  var userId = baFoxSafeString(profile.userId).toLowerCase();
  var ownerLabel = baFoxSafeString(profile.defaultOwnerLabel).toLowerCase();
  var normalizedTask = task || {};
  return Boolean(
    (normalizedEmail && normalizeWorkspaceEmail_(normalizedTask.ownerEmail) === normalizedEmail)
    || (userId && baFoxSafeString(normalizedTask.ownerUserId).toLowerCase() === userId)
    || (ownerLabel && baFoxSafeString(normalizedTask.ownerLabel || normalizedTask.owner).toLowerCase() === ownerLabel)
    || identityArrayContains_(taskIdentityList_(normalizedTask, 'collaboratorEmailList', true), normalizedEmail, true)
    || identityArrayContains_(taskIdentityList_(normalizedTask, 'collaboratorEmails', true), normalizedEmail, true)
    || identityArrayContains_(taskIdentityList_(normalizedTask, 'collaboratorUserIdList', false), userId, false)
    || identityArrayContains_(taskIdentityList_(normalizedTask, 'collaboratorUserIds', false), userId, false)
    || (normalizedEmail && normalizeWorkspaceEmail_(normalizedTask.createdByEmail) === normalizedEmail)
    || (userId && baFoxSafeString(normalizedTask.createdByUserId).toLowerCase() === userId)
  );
}

function baFoxSplitIdentityList_(value) {
  return baFoxSafeString(value).toLowerCase().split(/[,\n;]/).map(function(item) {
    return baFoxSafeString(item);
  }).filter(Boolean);
}

function buildTaskVisibilityReason_(profile, task) {
  if (!profileCanUseDashboard_(profile)) {
    return {
      visible: false,
      reason: 'dashboard_forbidden',
      legacyUnclassified: false
    };
  }
  if (profileCanSeeAll_(profile)) {
    return {
      visible: true,
      reason: 'canSeeAll',
      legacyUnclassified: !baFoxSafeString(task.ownerEmail)
        && !baFoxSafeString(task.ownerUserId)
        && !baFoxSafeString(task.createdByEmail)
        && !baFoxSafeString(task.createdByUserId)
        && !baFoxSafeString(task.collaboratorEmails)
        && !baFoxSafeString(task.collaboratorUserIds)
    };
  }

  var email = normalizeWorkspaceEmail_(profile.email);
  var userId = baFoxSafeString(profile.userId).toLowerCase();
  var ownerLabel = baFoxSafeString(profile.defaultOwnerLabel).toLowerCase();
  var taskOwnerLabel = baFoxSafeString(task.owner).toLowerCase();
  var legacyUnclassified = !baFoxSafeString(task.ownerEmail)
    && !baFoxSafeString(task.ownerUserId)
    && !baFoxSafeString(task.createdByEmail)
    && !baFoxSafeString(task.createdByUserId)
    && !baFoxSafeString(task.collaboratorEmails)
    && !baFoxSafeString(task.collaboratorUserIds);

  if (email && normalizeWorkspaceEmail_(task.ownerEmail) === email) {
    return { visible: true, reason: 'ownerEmail', legacyUnclassified: legacyUnclassified };
  }
  if (userId && baFoxSafeString(task.ownerUserId).toLowerCase() === userId) {
    return { visible: true, reason: 'ownerUserId', legacyUnclassified: legacyUnclassified };
  }
  if (ownerLabel && taskOwnerLabel === ownerLabel) {
    return { visible: true, reason: 'ownerLabel', legacyUnclassified: legacyUnclassified };
  }
  if (email && baFoxSplitIdentityList_(task.collaboratorEmails).indexOf(email) !== -1) {
    return { visible: true, reason: 'collaboratorEmail', legacyUnclassified: legacyUnclassified };
  }
  if (userId && baFoxSplitIdentityList_(task.collaboratorUserIds).indexOf(userId) !== -1) {
    return { visible: true, reason: 'collaboratorUserId', legacyUnclassified: legacyUnclassified };
  }
  if (email && normalizeWorkspaceEmail_(task.createdByEmail) === email) {
    return { visible: true, reason: 'createdBy', legacyUnclassified: legacyUnclassified };
  }
  if (userId && baFoxSafeString(task.createdByUserId).toLowerCase() === userId) {
    return { visible: true, reason: 'createdBy', legacyUnclassified: legacyUnclassified };
  }
  return {
    visible: false,
    reason: legacyUnclassified ? 'legacy_unclassified' : 'no_match',
    legacyUnclassified: legacyUnclassified
  };
}

function buildVisibilityPreview_(profile, tasks, options) {
  var settings = options || {};
  var reasonCounts = {
    canSeeAll: 0,
    ownerEmail: 0,
    ownerUserId: 0,
    ownerLabel: 0,
    collaboratorEmail: 0,
    collaboratorUserId: 0,
    createdBy: 0,
    legacyUnclassified: 0,
    noMatch: 0
  };
  var visible = 0;
  var legacyUnclassified = 0;
  (tasks || []).forEach(function(task) {
    var reason = buildTaskVisibilityReason_(profile, task);
    if (reason.visible) {
      visible += 1;
      if (reasonCounts[reason.reason] !== undefined) {
        reasonCounts[reason.reason] += 1;
      }
    } else if (reason.reason === 'no_match') {
      reasonCounts.noMatch += 1;
    }
    if (reason.legacyUnclassified) {
      legacyUnclassified += 1;
      reasonCounts.legacyUnclassified += 1;
    }
  });

  return {
    mode: 'enforced',
    filteredByUser: !profileCanSeeAll_(profile),
    wouldFilterInEnforcedMode: false,
    effectiveUser: profile && (profile.email || profile.displayName || profile.userId) || '',
    effectiveUserId: profile && profile.userId || '',
    effectiveRole: profile && profile.accessRole || 'viewer',
    previewedByAdmin: settings.previewedByAdmin === true,
    totalTasks: (tasks || []).length,
    visibleIfEnforced: visible,
    hiddenIfEnforced: Math.max((tasks || []).length - visible, 0),
    legacyUnclassified: legacyUnclassified,
    reasonCounts: reasonCounts
  };
}

function getVisibleTasksForProfileDryRun_(profile, tasks) {
  return (tasks || []).filter(function(task) {
    return buildTaskVisibilityReason_(profile, task).visible;
  });
}

function baFoxGetVisibilityPreview(request) {
  var normalized = baFoxNormalizeRequest(request || {});
  var identity = getCurrentUserProfile_(normalized, {});
  var profile = identity.profile || getFallbackUserProfile_();
  var previewedByAdmin = false;
  if (baFoxSafeString(normalized.previewUserId || normalized.userId || normalized.email)) {
    if (['google_token_verified', 'trusted_device_session'].indexOf(identity.identityMode) === -1
        || !profileCanManageUsers_(profile)) {
      return baFoxError('ADMIN_REQUIRED', 'Admin profile is required for impersonated visibility preview.', {
        identityMode: identity.identityMode
      });
    }
    var lookup = baFoxSafeString(normalized.previewUserId || normalized.userId).toLowerCase();
    var lookupEmail = normalizeWorkspaceEmail_(normalized.email);
    var users = getUsers_();
    for (var index = 0; index < users.length; index += 1) {
      if ((lookup && baFoxSafeString(users[index].userId).toLowerCase() === lookup)
        || (lookupEmail && users[index].email === lookupEmail)) {
        profile = applyRegisteredProfileFlags_(users[index], 'admin_visibility_preview');
        previewedByAdmin = true;
        break;
      }
    }
  }
  var storeResult = baFoxReadTasksRows();
  var tasks = baFoxNormalizeTaskRows_(storeResult);
  return baFoxOk({
    visibilityPreview: buildVisibilityPreview_(profile, tasks, {
      previewedByAdmin: previewedByAdmin
    })
  });
}

function identityDashboardMetadata_(request, routeName) {
  var identity = getCurrentUserProfile_(request || {}, {});
  var permissions = identity.permissions || profilePermissions_(identity.profile);
  var storeTasks = request && request.__normalizedTasks ? request.__normalizedTasks : null;
  var taskIdentitySchema = baFoxTaskIdentitySchemaStatus_();
  var visibilityMode = identityVisibilityMode_();
  var identityWarnings = [];
  if (!taskIdentitySchema.allPresent) {
    identityWarnings.push('TASK_IDENTITY_COLUMNS_OPTIONAL_OR_MISSING');
  }
  if (visibilityMode !== 'enforced') {
    identityWarnings.push('TASK_VISIBILITY_NOT_ENFORCED');
  }
  return {
    identityMode: identity.identityMode,
    enforcementMode: identity.enforcementMode,
    visibilityMode: visibilityMode,
    filteredByUser: visibilityMode === 'enforced' && !profileCanSeeAll_(identity.profile),
    taskIdentitySchema: taskIdentitySchema,
    optionalIdentityColumnsPresent: taskIdentitySchema.anyPresent,
    identityWarnings: identityWarnings,
    recommendedTaskIdentityColumns: taskIdentitySchema.recommendedTaskIdentityColumns,
    effectiveRole: identity.profile && identity.profile.accessRole ? identity.profile.accessRole : 'viewer',
    canSeeAll: permissions.canSeeAll === true,
    canCreateTasks: permissions.canCreateTasks === true,
    canUseDashboard: permissions.canUseDashboard === true,
    canManageUsers: permissions.canManageUsers === true,
    route: routeName || '',
    limitations: identity.limitations || [],
    visibilityPreview: storeTasks ? buildVisibilityPreview_(identity.profile, storeTasks, {}) : null
  };
}

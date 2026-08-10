const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadAppsScriptAuthorization() {
  const context = vm.createContext({
    BA_FOX_CONFIG: {
      ACTION_TOKEN: '',
      ALLOWED_WORKSPACE_DOMAIN: 'mfstream.io',
      IDENTITY_ENFORCEMENT_MODE: 'profile_only',
      USERS_COLUMNS: {},
    },
    console,
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/Validation.gs'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/IdentityService.gs'), 'utf8'), context);
  context.baFoxActionTokenMatches_ = function (token) {
    return token === 'server-only-token';
  };
  return context;
}

function verifiedProfile(overrides) {
  return {
    identityMode: 'google_token_verified',
    profile: Object.assign({
      isAuthenticated: true,
      isRegistered: true,
      status: 'active',
      accessRole: 'member',
    }, overrides || {}),
  };
}

test('backend authorizes an active registered Google profile without a browser action token', function () {
  const context = loadAppsScriptAuthorization();
  context.getVerifiedUserProfile_ = function () {
    return verifiedProfile();
  };

  const result = context.requireAuthorizedSafeWrite_({ idToken: 'verified-google-token' });

  assert.equal(result.ok, true);
  assert.equal(result.authorizationMode, 'google_profile');
});

test('backend authorizes an active trusted-device session after the initial Google verification', function () {
  const context = loadAppsScriptAuthorization();
  context.getVerifiedUserProfile_ = function () {
    return Object.assign({}, verifiedProfile(), { identityMode: 'trusted_device_session' });
  };

  const result = context.requireAuthorizedSafeWrite_({ trustedDeviceSession: 'device-session' });

  assert.equal(result.ok, true);
  assert.equal(result.authorizationMode, 'trusted_device_session');
});

test('backend denies browser writes without Google identity or a server-side token', function () {
  const context = loadAppsScriptAuthorization();
  context.getVerifiedUserProfile_ = function () {
    return {
      identityMode: 'missing_token',
      profile: context.getFallbackUserProfile_(),
    };
  };

  const result = context.requireAuthorizedSafeWrite_({});

  assert.equal(result.ok, false);
  assert.equal(result.error.error.code, 'GOOGLE_TOKEN_REQUIRED');
});

test('backend keeps the server-side action token as a legacy integration fallback', function () {
  const context = loadAppsScriptAuthorization();
  context.getVerifiedUserProfile_ = function () {
    return {
      identityMode: 'missing_token',
      profile: context.getFallbackUserProfile_(),
    };
  };

  const result = context.requireAuthorizedSafeWrite_({ token: 'server-only-token' });

  assert.equal(result.ok, true);
  assert.equal(result.authorizationMode, 'legacy_action_token');
});

function loadWebClient(configOverrides, endpointResponse) {
  const requests = [];
  const head = {
    appendChild(script) {
      script.parentNode = head;
      const url = new URL(script.src);
      requests.push(url);
      const callback = url.searchParams.get('callback');
      queueMicrotask(function () {
        context[callback](typeof endpointResponse === 'function'
          ? endpointResponse(url)
          : {
            ok: true,
            data: {
              taskId: 'TEST-1',
            },
            error: null,
          });
      });
    },
    removeChild(script) {
      script.parentNode = null;
    },
  };
  const context = vm.createContext({
    URL,
    console,
    clearTimeout,
    document: {
      createElement() {
        return {};
      },
      head,
    },
    setTimeout,
  });
  context.window = context;
  context.BAFoxConfig = {
    getConfig() {
      return Object.assign({
        endpoint: 'https://example.test/exec',
        actionToken: '',
        useMockData: false,
      }, configOverrides || {});
    },
  };
  context.BAFoxUiState = {
    loading(route) {
      return { status: 'loading', route, data: null, error: null, isMock: false };
    },
    success(route, data) {
      return { status: 'success', route, data, error: null, isMock: false };
    },
    empty(route, data, options) {
      return { status: 'empty', route, data, error: null, isMock: Boolean(options && options.isMock) };
    },
    error(route, error, options) {
      return {
        status: 'error',
        route,
        data: options && options.fallbackData || null,
        error,
        message: options && options.message || '',
        isMock: Boolean(options && options.isMock),
      };
    },
  };
  context.BAFoxMockData = {
    getResponse() {
      throw new Error('Mock fallback must not be used in live mode.');
    },
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'web/api/baFoxClient.js'), 'utf8'), context);
  return { client: context.BAFoxClient, requests };
}

test('web client refuses writes before Google sign-in when no legacy token exists', async function () {
  const { client, requests } = loadWebClient();

  await assert.rejects(
    client.createTask({ title: 'Test' }),
    function (error) {
      return error && error.code === 'GOOGLE_TOKEN_REQUIRED';
    }
  );
  assert.equal(requests.length, 0);
});

test('web client sends Google identity for writes and does not add a token parameter', async function () {
  const { client, requests } = loadWebClient();

  const result = await client.createTask({
    title: 'Test',
    idToken: 'google-id-token',
  });

  assert.equal(result.taskId, 'TEST-1');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get('route'), 'createTask');
  assert.equal(requests[0].searchParams.get('idToken'), 'google-id-token');
  assert.equal(requests[0].searchParams.has('token'), false);
});

test('web client sends the server-issued trusted-device session without exposing an action token', async function () {
  const { client, requests } = loadWebClient();

  await client.createTask({
    title: 'Test',
    trustedDeviceSession: 'device-session',
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get('trustedDeviceSession'), 'device-session');
  assert.equal(requests[0].searchParams.has('token'), false);
});

test('web client updates projects through an authenticated write route', async function () {
  const { client, requests } = loadWebClient();

  await client.updateProject({
    projectId: 'PRJ-1',
    name: 'Updated project',
    idToken: 'google-id-token',
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get('route'), 'updateProject');
  assert.equal(requests[0].searchParams.get('projectId'), 'PRJ-1');
  assert.equal(requests[0].searchParams.get('idToken'), 'google-id-token');
});

test('task trash actions are reversible and members can manage only tasks they created', function () {
  const context = loadAppsScriptAuthorization();
  context.BA_FOX_CONFIG.TASK_COLUMNS = {};
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/TaskService.gs'), 'utf8'), context);

  const actionMap = context.baFoxTaskActionMap_();
  assert.equal(actionMap.moveToTrash.archived, true);
  assert.equal(actionMap.restoreFromTrash.archived, false);

  const member = {
    accessRole: 'member',
    email: 'member@mfstream.io',
    userId: 'USR-1',
  };
  assert.equal(context.baFoxProfileCanManageTrashedTask_(member, {
    createdByEmail: 'member@mfstream.io',
  }), true);
  assert.equal(context.baFoxProfileCanManageTrashedTask_(member, {
    createdByEmail: 'other@mfstream.io',
    createdByUserId: 'USR-2',
  }), false);
  assert.equal(context.baFoxProfileCanManageTrashedTask_({
    accessRole: 'admin',
    email: 'admin@mfstream.io',
  }, {
    createdByEmail: 'other@mfstream.io',
  }), true);
});

test('only a task owner or collaborator can mark a task as done', function () {
  const context = loadAppsScriptAuthorization();
  context.BA_FOX_CONFIG.TASK_COLUMNS = {};
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/TaskService.gs'), 'utf8'), context);

  const task = {
    ownerEmail: 'owner@mfstream.io',
    ownerUserId: 'USR-OWNER',
    collaboratorEmails: 'collaborator@mfstream.io',
    collaboratorUserIds: 'USR-COLLABORATOR',
  };

  assert.equal(context.baFoxProfileCanCompleteTask_({ email: 'owner@mfstream.io', userId: 'USR-OWNER' }, task), true);
  assert.equal(context.baFoxProfileCanCompleteTask_({ email: 'collaborator@mfstream.io', userId: 'USR-COLLABORATOR' }, task), true);
  assert.equal(context.baFoxProfileCanCompleteTask_({ email: 'other@mfstream.io', userId: 'USR-OTHER' }, task), false);
});

test('web client does not expose mock dashboard data when Google sign-in is missing', async function () {
  const { client, requests } = loadWebClient({}, function () {
    return {
      ok: false,
      data: null,
      error: {
        code: 'GOOGLE_TOKEN_REQUIRED',
        message: 'Verified Google identity token is required.',
      },
    };
  });

  const state = await client.getDashboard({});

  assert.equal(state.status, 'error');
  assert.equal(state.data, null);
  assert.equal(state.isMock, false);
  assert.equal(state.error.code, 'GOOGLE_TOKEN_REQUIRED');
  assert.equal(requests.length, 1);
});

test('backend protects task reads and admin diagnostics independently of visibility mode', function () {
  const context = loadAppsScriptAuthorization();
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/WebApp.gs'), 'utf8'), context);

  context.requireVerifiedProfile_ = function () {
    return {
      ok: false,
      error: context.baFoxError('GOOGLE_TOKEN_REQUIRED', 'Sign-in required.', {}),
    };
  };
  const anonymousDashboard = context.baFoxAuthorizeReadRoute_('dashboard', {});
  assert.equal(anonymousDashboard.error.code, 'GOOGLE_TOKEN_REQUIRED');

  context.requireVerifiedProfile_ = function () {
    return {
      ok: true,
      profile: {
        accessRole: 'member',
        status: 'active',
        isRegistered: true,
      },
    };
  };
  context.profileCanManageUsers_ = function () {
    return false;
  };
  const memberAdminRoute = context.baFoxAuthorizeReadRoute_('activeUsers', {});
  assert.equal(memberAdminRoute.error.code, 'ADMIN_REQUIRED');

  context.profileCanManageUsers_ = function () {
    return true;
  };
  assert.equal(context.baFoxAuthorizeReadRoute_('activeUsers', {}), null);
  assert.equal(context.baFoxAuthorizeReadRoute_('scaffoldInfo', {}), null);
});

test('Pages workflows cannot serialize BA_FOX_ACTION_TOKEN into the public bundle', function () {
  const workflowPaths = [
    '.github/workflows/pages.yml',
  ];

  workflowPaths.forEach(function (relativePath) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.equal(source.includes('BA_FOX_ACTION_TOKEN'), false, relativePath);
    assert.equal(source.includes('"BA_FOX_ACTION_TOKEN"'), false, relativePath);
  });
});

test('completed task reads carry the Google identity token', async function () {
  const { client, requests } = loadWebClient({}, function (url) {
    if (url.searchParams.get('route') === 'scaffoldInfo') {
      return {
        ok: true,
        data: {
          dryRun: true,
          readLiveSheets: true,
          liveAutomationEnabled: false,
          triggersEnabled: false,
        },
        error: null,
      };
    }
    return {
      ok: true,
      data: {
        dryRun: true,
        readLive: true,
        tasks: [],
      },
      error: null,
    };
  });

  await client.getCompletedTasks({ limit: 100, idToken: 'google-id-token' });

  assert.equal(requests.length, 2);
  assert.equal(requests[1].searchParams.get('route'), 'completed');
  assert.equal(requests[1].searchParams.get('idToken'), 'google-id-token');
});

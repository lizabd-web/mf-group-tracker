const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function hierarchyContext(tasks) {
  const context = vm.createContext({
    baFoxSafeString(value) { return String(value == null ? '' : value).trim(); },
    baFoxReadTasksRows() { return { rows: [] }; },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/TaskService.gs'), 'utf8'), context);
  context.baFoxNormalizeTaskRows_ = function () { return tasks; };
  return context;
}

test('a nested task inherits its parent project when no project is selected', function () {
  const context = hierarchyContext([{ id: 'TASK-1', projectId: 'PRJ-1', archived: false }]);
  const result = context.baFoxValidateCreateTaskParent_('TASK-1', '');
  assert.equal(result.ok, true);
  assert.equal(result.parentTaskId, 'TASK-1');
  assert.equal(result.projectId, 'PRJ-1');
});

test('a nested task cannot cross project boundaries or use archived parents', function () {
  const context = hierarchyContext([
    { id: 'TASK-1', projectId: 'PRJ-1', archived: false },
    { id: 'TASK-2', projectId: 'PRJ-1', archived: true },
  ]);
  assert.equal(context.baFoxValidateCreateTaskParent_('TASK-1', 'PRJ-2').projectMismatch, true);
  assert.equal(context.baFoxValidateCreateTaskParent_('TASK-2', '').ok, false);
});

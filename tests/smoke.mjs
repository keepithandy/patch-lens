import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of ['index.html', 'styles.css', 'model.js', 'app.js', 'manifest.webmanifest', 'service-worker.js']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

const html = read('index.html');
for (const anchor of ['view-dashboard', 'view-session', 'view-issues', 'view-reports', 'sessionDialog', 'issueDialog']) {
  assert.ok(html.includes(anchor), `HTML should include ${anchor}`);
}

const context = { globalThis: {}, console, setTimeout, clearTimeout };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(read('model.js'), context);
const Model = context.PatchLensModel;
assert.ok(Model, 'PatchLensModel should be exported');

let state = Model.createInitialState();
assert.equal(state.projects.length, 3, 'starter projects should be present');

const created = Model.createSession(state, {
  projectId: state.projects[0].id,
  version: 'v-test',
  device: 'iPhone',
  browser: 'Safari',
  objective: 'Smoke validation'
});
state = created.state;
assert.equal(state.sessions.length, 1);
assert.equal(created.session.checklist.length, 6);

state = Model.setChecklistStatus(state, created.session.id, 'navigation', 'pass');
assert.equal(state.sessions[0].checklist.find(item => item.id === 'navigation').status, 'pass');

const issueCreated = Model.createIssue(state, {
  sessionId: created.session.id,
  title: 'Nav overlap',
  severity: 'high',
  component: 'Navigation',
  expected: 'Visible controls',
  actual: 'Controls overlap',
  steps: '1. Open app\n2. Observe nav'
});
state = issueCreated.state;
assert.equal(state.issues.length, 1);
assert.match(Model.toMarkdown(state, created.session.id), /Nav overlap/);
assert.match(Model.toCodexPrompt(state, created.session.id), /narrowest fix/i);

state = Model.setIssueStatus(state, issueCreated.issue.id, 'fixed');
assert.equal(state.issues[0].status, 'fixed');

console.log('PatchLens smoke: 14/14 checks passed');

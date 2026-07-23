(function (global) {
  'use strict';

  const DEFAULT_PROJECTS = [
    { id: 'project-dungeondex', name: 'DungeonDex', repo: 'keepithandy/DungeonDex', target: 'iPhone browser and desktop web' },
    { id: 'project-alchemy', name: 'Alchemy Game', repo: '', target: 'Mobile-first browser game' },
    { id: 'project-catalyst', name: 'Catalyst', repo: '', target: 'Companion web app' }
  ];

  const CHECKLIST_ITEMS = [
    { id: 'navigation', title: 'Navigation visibility and reachability', description: 'Primary navigation remains visible, tappable, and outside browser or safe-area obstruction.' },
    { id: 'primary-actions', title: 'Primary actions remain usable', description: 'Core buttons are reachable, correctly labeled, and respond once per tap.' },
    { id: 'responsive-layout', title: 'Responsive layout has no overflow', description: 'No horizontal scroll, clipped content, overlapping panels, or unreadable text.' },
    { id: 'modals', title: 'Dialogs and overlays fit the viewport', description: 'Dialogs can be opened, scrolled, dismissed, and completed on the target device.' },
    { id: 'save-load', title: 'Save and reload preserve state', description: 'Expected state survives reload without schema damage, duplication, or silent reset.' },
    { id: 'offline', title: 'Offline and cached launch remain safe', description: 'Installed or cached builds reopen without a blank screen or stale critical asset.' }
  ];

  function uid(prefix) {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createInitialState() {
    return {
      schemaVersion: 1,
      projects: DEFAULT_PROJECTS.map(project => ({ ...project })),
      sessions: [],
      issues: [],
      activeSessionId: null,
      updatedAt: nowIso()
    };
  }

  function sanitizeState(input) {
    const fallback = createInitialState();
    if (!input || typeof input !== 'object') return fallback;
    return {
      schemaVersion: 1,
      projects: Array.isArray(input.projects) && input.projects.length ? input.projects : fallback.projects,
      sessions: Array.isArray(input.sessions) ? input.sessions : [],
      issues: Array.isArray(input.issues) ? input.issues : [],
      activeSessionId: typeof input.activeSessionId === 'string' ? input.activeSessionId : null,
      updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : nowIso()
    };
  }

  function addProject(state, input) {
    const project = {
      id: uid('project'),
      name: String(input.name || '').trim(),
      repo: String(input.repo || '').trim(),
      target: String(input.target || '').trim()
    };
    if (!project.name) throw new Error('Project name is required.');
    return { state: { ...state, projects: [...state.projects, project], updatedAt: nowIso() }, project };
  }

  function createSession(state, input) {
    const project = state.projects.find(item => item.id === input.projectId);
    if (!project) throw new Error('Select a valid project.');
    const version = String(input.version || '').trim();
    const device = String(input.device || '').trim();
    const browser = String(input.browser || '').trim();
    if (!version || !device || !browser) throw new Error('Version, device, and browser are required.');

    const session = {
      id: uid('session'),
      projectId: project.id,
      projectName: project.name,
      version,
      device,
      browser,
      objective: String(input.objective || '').trim(),
      status: 'active',
      startedAt: nowIso(),
      completedAt: null,
      checklist: CHECKLIST_ITEMS.map(item => ({ ...item, status: 'untested' }))
    };

    return {
      state: {
        ...state,
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
        updatedAt: nowIso()
      },
      session
    };
  }

  function setChecklistStatus(state, sessionId, itemId, status) {
    const allowed = new Set(['untested', 'pass', 'fail', 'not-applicable']);
    if (!allowed.has(status)) throw new Error('Invalid checklist status.');
    const sessions = state.sessions.map(session => session.id !== sessionId ? session : {
      ...session,
      checklist: session.checklist.map(item => item.id === itemId ? { ...item, status } : item)
    });
    return { ...state, sessions, updatedAt: nowIso() };
  }

  function completeSession(state, sessionId) {
    const sessions = state.sessions.map(session => session.id !== sessionId ? session : {
      ...session,
      status: 'complete',
      completedAt: nowIso()
    });
    return {
      ...state,
      sessions,
      activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      updatedAt: nowIso()
    };
  }

  function createIssue(state, input) {
    const session = state.sessions.find(item => item.id === input.sessionId);
    if (!session) throw new Error('Select a valid session.');
    const required = ['title', 'component', 'expected', 'actual', 'steps'];
    required.forEach(key => {
      if (!String(input[key] || '').trim()) throw new Error(`${key} is required.`);
    });
    const issue = {
      id: uid('issue'),
      sessionId: session.id,
      projectId: session.projectId,
      projectName: session.projectName,
      version: session.version,
      title: String(input.title).trim(),
      severity: ['critical', 'high', 'medium', 'low'].includes(input.severity) ? input.severity : 'medium',
      component: String(input.component).trim(),
      expected: String(input.expected).trim(),
      actual: String(input.actual).trim(),
      steps: String(input.steps).trim(),
      screenshotDataUrl: input.screenshotDataUrl || '',
      status: 'open',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    return { state: { ...state, issues: [issue, ...state.issues], updatedAt: nowIso() }, issue };
  }

  function setIssueStatus(state, issueId, status) {
    const allowed = new Set(['open', 'fixed', 'reopened']);
    if (!allowed.has(status)) throw new Error('Invalid issue status.');
    return {
      ...state,
      issues: state.issues.map(issue => issue.id === issueId ? { ...issue, status, updatedAt: nowIso() } : issue),
      updatedAt: nowIso()
    };
  }

  function calculateStats(state) {
    const openIssues = state.issues.filter(issue => issue.status !== 'fixed');
    const activeSessions = state.sessions.filter(session => session.status === 'active');
    const completeSessions = state.sessions.filter(session => session.status === 'complete');
    const totalChecks = state.sessions.flatMap(session => session.checklist || []);
    const passChecks = totalChecks.filter(item => item.status === 'pass').length;
    const evaluated = totalChecks.filter(item => item.status === 'pass' || item.status === 'fail').length;
    return {
      projects: state.projects.length,
      activeSessions: activeSessions.length,
      openIssues: openIssues.length,
      completedSessions: completeSessions.length,
      passRate: evaluated ? Math.round((passChecks / evaluated) * 100) : 0
    };
  }

  function sessionProgress(session) {
    if (!session || !Array.isArray(session.checklist)) return { complete: 0, total: 0, percent: 0 };
    const complete = session.checklist.filter(item => item.status !== 'untested').length;
    const total = session.checklist.length;
    return { complete, total, percent: total ? Math.round((complete / total) * 100) : 0 };
  }

  function issuesForSession(state, sessionId) {
    return state.issues.filter(issue => issue.sessionId === sessionId);
  }

  function formatDate(value) {
    if (!value) return 'Not completed';
    try { return new Date(value).toLocaleString(); } catch { return value; }
  }

  function toMarkdown(state, sessionId) {
    const session = state.sessions.find(item => item.id === sessionId);
    if (!session) return '# PatchLens QA Report\n\nNo session selected.';
    const issues = issuesForSession(state, sessionId);
    const unresolved = issues.filter(issue => issue.status !== 'fixed');
    const progress = sessionProgress(session);
    const checklist = session.checklist.map(item => {
      const icon = item.status === 'pass' ? 'PASS' : item.status === 'fail' ? 'FAIL' : item.status === 'not-applicable' ? 'N/A' : 'UNTESTED';
      return `- **${icon}** — ${item.title}`;
    }).join('\n');
    const defectSections = issues.length ? issues.map((issue, index) => `
### ${index + 1}. ${issue.title}

- **Status:** ${issue.status}
- **Severity:** ${issue.severity}
- **Component:** ${issue.component}
- **Expected:** ${issue.expected}
- **Actual:** ${issue.actual}
- **Reproduction:**\n${issue.steps.split('\n').map(line => `  ${line}`).join('\n')}
`).join('\n') : '\nNo defects were captured for this session.\n';

    return `# PatchLens QA Report — ${session.projectName} ${session.version}

## Session

- **Status:** ${session.status}
- **Device:** ${session.device}
- **Browser:** ${session.browser}
- **Started:** ${formatDate(session.startedAt)}
- **Completed:** ${formatDate(session.completedAt)}
- **Checklist coverage:** ${progress.complete}/${progress.total} (${progress.percent}%)
- **Open or reopened defects:** ${unresolved.length}

## Objective

${session.objective || 'No objective was recorded.'}

## Verification Checklist

${checklist}

## Defects
${defectSections}
## Release Assessment

${unresolved.length === 0 && session.checklist.every(item => item.status !== 'fail') ? 'No unresolved defects are recorded. This report does not replace project-specific automated tests.' : 'Release is not considered clear while failed checks or unresolved defects remain.'}

---
Generated by PatchLens v0.1.0.
`;
  }

  function toCodexPrompt(state, sessionId) {
    const session = state.sessions.find(item => item.id === sessionId);
    if (!session) return 'No PatchLens session selected.';
    const issues = issuesForSession(state, sessionId).filter(issue => issue.status !== 'fixed');
    if (!issues.length) return `Review ${session.projectName} ${session.version}. No unresolved PatchLens defects are currently recorded. Do not make speculative production changes.`;
    const defectText = issues.map((issue, index) => `${index + 1}. ${issue.title}
Severity: ${issue.severity}
Component: ${issue.component}
Expected: ${issue.expected}
Actual: ${issue.actual}
Reproduction:
${issue.steps}`).join('\n\n');
    return `You are repairing defects documented during a PatchLens QA session.

Project: ${session.projectName}
Version/build: ${session.version}
Target device: ${session.device}
Target browser: ${session.browser}
Objective: ${session.objective || 'Preserve current behavior except for the documented defects.'}

Defects:

${defectText}

Constraints:
- Reproduce each defect before editing production code.
- Apply the narrowest fix that resolves the documented behavior.
- Do not change unrelated gameplay, economy, progression, save schemas, or public contracts.
- Preserve mobile safe-area behavior and existing desktop behavior.
- Add or update focused regression coverage for every repaired defect.
- Run relevant existing smoke tests and report exact results.
- Stop and explain any baseline mismatch or unrelated failing test instead of broadening scope.

Return:
1. Root cause per defect.
2. Files changed and why.
3. Validation performed.
4. Remaining risks.
`;
  }

  global.PatchLensModel = {
    DEFAULT_PROJECTS,
    CHECKLIST_ITEMS,
    createInitialState,
    sanitizeState,
    addProject,
    createSession,
    setChecklistStatus,
    completeSession,
    createIssue,
    setIssueStatus,
    calculateStats,
    sessionProgress,
    issuesForSession,
    toMarkdown,
    toCodexPrompt
  };
})(typeof window !== 'undefined' ? window : globalThis);

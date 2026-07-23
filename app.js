(function () {
  'use strict';

  const Model = window.PatchLensModel;
  const STORAGE_KEY = 'patchlens.state.v1';
  let state = loadState();
  let currentView = 'dashboard';
  let issueFilter = 'all';
  let toastTimer;

  const el = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Model.sanitizeState(JSON.parse(raw)) : Model.createInitialState();
    } catch (error) {
      console.warn('PatchLens could not load local data.', error);
      return Model.createInitialState();
    }
  }

  function saveState(nextState) {
    state = { ...nextState, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast('Storage is full. Export data before adding more screenshots.');
      console.error(error);
    }
    renderAll();
  }

  function showToast(message) {
    const toast = el('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function setView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('is-active', section.id === `view-${view}`));
    document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'reports') renderReports();
  }

  function getActiveSession() {
    return state.sessions.find(session => session.id === state.activeSessionId) || state.sessions.find(session => session.status === 'active') || null;
  }

  function renderStats() {
    const stats = Model.calculateStats(state);
    el('statsGrid').innerHTML = [
      ['Projects', stats.projects, 'Tracked products'],
      ['Active', stats.activeSessions, 'Sessions in progress'],
      ['Open defects', stats.openIssues, 'Needs attention'],
      ['Pass rate', `${stats.passRate}%`, 'Evaluated checks']
    ].map(([label, value, detail]) => `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(detail)}</span></article>`).join('');
  }

  function renderProjects() {
    const sessionCounts = new Map();
    state.sessions.forEach(session => sessionCounts.set(session.projectId, (sessionCounts.get(session.projectId) || 0) + 1));
    el('projectGrid').innerHTML = state.projects.map(project => `<article class="project-card">
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(project.target || 'No primary target recorded.')}</p>
      <div class="project-meta">
        <span class="badge">${sessionCounts.get(project.id) || 0} sessions</span>
        ${project.repo ? `<span class="badge">${escapeHtml(project.repo)}</span>` : ''}
      </div>
      <button class="button button-secondary button-block" type="button" data-start-project="${project.id}">Test this project</button>
    </article>`).join('');
  }

  function renderActiveSession() {
    const session = getActiveSession();
    const container = el('activeSessionSummary');
    el('resumeSessionButton').disabled = !session;
    if (!session) {
      container.className = 'empty-state';
      container.textContent = 'No session is active. Start one to create a version-specific QA record.';
      return;
    }
    const progress = Model.sessionProgress(session);
    const issueCount = Model.issuesForSession(state, session.id).filter(issue => issue.status !== 'fixed').length;
    container.className = 'session-summary';
    container.innerHTML = `<div class="session-summary-grid">
      <div class="data-point"><span>Project</span><strong>${escapeHtml(session.projectName)}</strong></div>
      <div class="data-point"><span>Build</span><strong>${escapeHtml(session.version)}</strong></div>
      <div class="data-point"><span>Checklist</span><strong>${progress.complete}/${progress.total}</strong></div>
      <div class="data-point"><span>Open defects</span><strong>${issueCount}</strong></div>
    </div>
    <div class="progress-track" aria-label="${progress.percent}% checklist coverage"><span style="width:${progress.percent}%"></span></div>
    <p>${escapeHtml(session.device)} · ${escapeHtml(session.browser)}</p>`;
  }

  function renderSession() {
    const session = getActiveSession() || state.sessions[0];
    const workspace = el('sessionWorkspace');
    if (!session) {
      workspace.className = 'empty-state panel';
      workspace.textContent = 'Start or select a session from the dashboard.';
      el('finishSessionButton').disabled = true;
      return;
    }
    el('finishSessionButton').disabled = session.status === 'complete';
    const progress = Model.sessionProgress(session);
    const issues = Model.issuesForSession(state, session.id);
    workspace.className = '';
    workspace.innerHTML = `<article class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${escapeHtml(session.status)}</p>
          <h3>${escapeHtml(session.projectName)} ${escapeHtml(session.version)}</h3>
        </div>
        <span class="badge">${progress.percent}% covered</span>
      </div>
      <div class="session-summary-grid" style="margin-top:1rem">
        <div class="data-point"><span>Device</span><strong>${escapeHtml(session.device)}</strong></div>
        <div class="data-point"><span>Browser</span><strong>${escapeHtml(session.browser)}</strong></div>
        <div class="data-point"><span>Defects</span><strong>${issues.length}</strong></div>
        <div class="data-point"><span>Status</span><strong>${escapeHtml(session.status)}</strong></div>
      </div>
      ${session.objective ? `<p><strong>Objective:</strong> ${escapeHtml(session.objective)}</p>` : ''}
      <div class="progress-track"><span style="width:${progress.percent}%"></span></div>
      <div class="session-actions">
        <button class="button button-primary" type="button" data-capture-for-session="${session.id}">Capture defect</button>
        <button class="button button-secondary" type="button" data-report-session="${session.id}">View report</button>
      </div>
    </article>
    <div class="checklist">${session.checklist.map(item => `<article class="checklist-item">
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.description)}</p>
      <div class="status-buttons" aria-label="Status for ${escapeHtml(item.title)}">
        <button class="status-button ${item.status === 'pass' ? 'is-pass' : ''}" type="button" data-check-status="pass" data-session-id="${session.id}" data-item-id="${item.id}">Pass</button>
        <button class="status-button ${item.status === 'fail' ? 'is-fail' : ''}" type="button" data-check-status="fail" data-session-id="${session.id}" data-item-id="${item.id}">Fail</button>
        <button class="status-button ${item.status === 'not-applicable' ? 'is-na' : ''}" type="button" data-check-status="not-applicable" data-session-id="${session.id}" data-item-id="${item.id}">N/A</button>
      </div>
    </article>`).join('')}</div>`;
  }

  function renderIssueFilters() {
    const filters = [['all', 'All'], ['open', 'Open'], ['reopened', 'Reopened'], ['fixed', 'Fixed']];
    el('issueFilters').innerHTML = filters.map(([value, label]) => `<button class="filter-chip ${issueFilter === value ? 'is-active' : ''}" data-issue-filter="${value}" type="button">${label}</button>`).join('');
  }

  function renderIssues() {
    renderIssueFilters();
    const issues = issueFilter === 'all' ? state.issues : state.issues.filter(issue => issue.status === issueFilter);
    const container = el('issueList');
    if (!issues.length) {
      container.innerHTML = '<article class="panel empty-state">No defects match this filter.</article>';
      return;
    }
    container.innerHTML = issues.map(issue => `<article class="issue-card">
      <div class="issue-card-header">
        <div>
          <span class="severity severity-${issue.severity}">${escapeHtml(issue.severity)}</span>
          <h3 style="margin-top:.55rem">${escapeHtml(issue.title)}</h3>
        </div>
        <span class="status-pill">${escapeHtml(issue.status)}</span>
      </div>
      <p><strong>${escapeHtml(issue.projectName)} ${escapeHtml(issue.version)}</strong> · ${escapeHtml(issue.component)}</p>
      <p><strong>Expected:</strong> ${escapeHtml(issue.expected)}</p>
      <p><strong>Actual:</strong> ${escapeHtml(issue.actual)}</p>
      <details>
        <summary>Reproduction steps</summary>
        <p>${escapeHtml(issue.steps).replace(/\n/g, '<br>')}</p>
      </details>
      ${issue.screenshotDataUrl ? `<img class="issue-evidence" src="${issue.screenshotDataUrl}" alt="Screenshot evidence for ${escapeHtml(issue.title)}">` : ''}
      <div class="issue-actions">
        ${issue.status !== 'fixed' ? `<button class="button button-secondary" type="button" data-issue-status="fixed" data-issue-id="${issue.id}">Mark fixed</button>` : ''}
        ${issue.status === 'fixed' ? `<button class="button button-danger" type="button" data-issue-status="reopened" data-issue-id="${issue.id}">Reopen</button>` : ''}
        ${issue.status === 'reopened' ? `<button class="button button-ghost" type="button" data-issue-status="open" data-issue-id="${issue.id}">Mark open</button>` : ''}
      </div>
    </article>`).join('');
  }

  function renderSelectOptions() {
    const projectOptions = state.projects.map(project => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('');
    el('sessionProject').innerHTML = projectOptions;
    const sessionOptions = state.sessions.map(session => `<option value="${session.id}">${escapeHtml(session.projectName)} ${escapeHtml(session.version)} — ${escapeHtml(session.status)}</option>`).join('');
    el('issueSession').innerHTML = sessionOptions || '<option value="">No sessions available</option>';
    el('reportSessionSelect').innerHTML = sessionOptions || '<option value="">No sessions available</option>';
    const active = getActiveSession();
    if (active) {
      el('issueSession').value = active.id;
      el('reportSessionSelect').value = active.id;
    }
  }

  function renderReports() {
    renderSelectOptions();
    const selected = el('reportSessionSelect').value || state.sessions[0]?.id || '';
    el('reportPreview').textContent = Model.toMarkdown(state, selected);
    el('downloadMarkdownButton').disabled = !selected;
    el('copyCodexButton').disabled = !selected;
    el('copyReportButton').disabled = !selected;
  }

  function renderConnection() {
    const badge = el('connectionBadge');
    badge.textContent = navigator.onLine ? 'Local-first · online' : 'Local-first · offline';
  }

  function renderAll() {
    renderStats();
    renderProjects();
    renderActiveSession();
    renderSession();
    renderIssues();
    renderSelectOptions();
    if (currentView === 'reports') renderReports();
    renderConnection();
  }

  function openSessionDialog(projectId) {
    renderSelectOptions();
    if (projectId) el('sessionProject').value = projectId;
    el('sessionDialog').showModal();
  }

  function openIssueDialog(sessionId) {
    renderSelectOptions();
    if (!state.sessions.length) {
      showToast('Start a test session before capturing a defect.');
      openSessionDialog();
      return;
    }
    if (sessionId) el('issueSession').value = sessionId;
    el('issueDialog').showModal();
  }

  async function readScreenshot(file) {
    if (!file) return '';
    if (file.size > 1024 * 1024) throw new Error('Screenshot must be 1 MB or smaller.');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read screenshot.'));
      reader.readAsDataURL(file);
    });
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      showToast(successMessage);
    }
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-view]');
    if (nav) setView(nav.dataset.view);

    const projectStart = event.target.closest('[data-start-project]');
    if (projectStart) openSessionDialog(projectStart.dataset.startProject);

    const check = event.target.closest('[data-check-status]');
    if (check) {
      saveState(Model.setChecklistStatus(state, check.dataset.sessionId, check.dataset.itemId, check.dataset.checkStatus));
      showToast(`Checklist marked ${check.dataset.checkStatus}.`);
    }

    const issueStatus = event.target.closest('[data-issue-status]');
    if (issueStatus) {
      saveState(Model.setIssueStatus(state, issueStatus.dataset.issueId, issueStatus.dataset.issueStatus));
      showToast(`Defect marked ${issueStatus.dataset.issueStatus}.`);
    }

    const capture = event.target.closest('[data-capture-for-session]');
    if (capture) openIssueDialog(capture.dataset.captureForSession);

    const report = event.target.closest('[data-report-session]');
    if (report) {
      setView('reports');
      el('reportSessionSelect').value = report.dataset.reportSession;
      renderReports();
    }

    const filter = event.target.closest('[data-issue-filter]');
    if (filter) {
      issueFilter = filter.dataset.issueFilter;
      renderIssues();
    }

    const closer = event.target.closest('[data-close-dialog]');
    if (closer) el(closer.dataset.closeDialog).close();
  });

  el('newSessionButton').addEventListener('click', () => openSessionDialog());
  el('addProjectButton').addEventListener('click', () => el('projectDialog').showModal());
  el('quickIssueButton').addEventListener('click', () => openIssueDialog(getActiveSession()?.id));
  el('resumeSessionButton').addEventListener('click', () => setView('session'));

  el('sessionForm').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const result = Model.createSession(state, {
        projectId: el('sessionProject').value,
        version: el('sessionVersion').value,
        device: el('sessionDevice').value,
        browser: el('sessionBrowser').value,
        objective: el('sessionObjective').value
      });
      saveState(result.state);
      event.currentTarget.reset();
      el('sessionDevice').value = 'iPhone 15 Plus';
      el('sessionBrowser').value = 'Safari / Textastic preview';
      el('sessionDialog').close();
      setView('session');
      showToast('Test session started.');
    } catch (error) {
      showToast(error.message);
    }
  });

  el('projectForm').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const result = Model.addProject(state, {
        name: el('projectName').value,
        repo: el('projectRepo').value,
        target: el('projectTarget').value
      });
      saveState(result.state);
      event.currentTarget.reset();
      el('projectDialog').close();
      showToast('Project added.');
    } catch (error) {
      showToast(error.message);
    }
  });

  el('issueForm').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const screenshotDataUrl = await readScreenshot(el('issueScreenshot').files[0]);
      const result = Model.createIssue(state, {
        sessionId: el('issueSession').value,
        title: el('issueTitle').value,
        severity: el('issueSeverity').value,
        component: el('issueComponent').value,
        expected: el('issueExpected').value,
        actual: el('issueActual').value,
        steps: el('issueSteps').value,
        screenshotDataUrl
      });
      saveState(result.state);
      event.currentTarget.reset();
      el('issueSeverity').value = 'medium';
      el('issueDialog').close();
      setView('issues');
      showToast('Defect captured.');
    } catch (error) {
      showToast(error.message);
    }
  });

  el('finishSessionButton').addEventListener('click', () => {
    const session = getActiveSession() || state.sessions[0];
    if (!session) return showToast('No session is available.');
    const progress = Model.sessionProgress(session);
    if (progress.complete < progress.total && !window.confirm(`Only ${progress.complete}/${progress.total} checks are evaluated. Complete this session anyway?`)) return;
    saveState(Model.completeSession(state, session.id));
    showToast('Session completed.');
    setView('reports');
    el('reportSessionSelect').value = session.id;
    renderReports();
  });

  el('reportSessionSelect').addEventListener('change', renderReports);
  el('downloadMarkdownButton').addEventListener('click', () => {
    const sessionId = el('reportSessionSelect').value;
    const session = state.sessions.find(item => item.id === sessionId);
    if (!session) return;
    const filename = `PatchLens_${session.projectName}_${session.version}`.replace(/[^a-z0-9_-]+/gi, '_') + '.md';
    downloadText(filename, Model.toMarkdown(state, sessionId), 'text/markdown');
    showToast('Markdown report downloaded.');
  });
  el('copyReportButton').addEventListener('click', () => copyText(el('reportPreview').textContent, 'Report copied.'));
  el('copyCodexButton').addEventListener('click', () => copyText(Model.toCodexPrompt(state, el('reportSessionSelect').value), 'Codex prompt copied.'));
  el('exportJsonButton').addEventListener('click', () => {
    downloadText(`PatchLens_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
    showToast('PatchLens data exported.');
  });
  el('importJsonInput').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = Model.sanitizeState(JSON.parse(await file.text()));
      saveState(imported);
      showToast('PatchLens data imported.');
    } catch {
      showToast('Import failed. Select a valid PatchLens JSON file.');
    } finally {
      event.target.value = '';
    }
  });

  window.addEventListener('online', renderConnection);
  window.addEventListener('offline', renderConnection);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Service worker registration failed.', error));
  }

  renderAll();
})();

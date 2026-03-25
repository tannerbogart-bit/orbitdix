const DEFAULT_API_BASE = 'https://orbitsix.ai';
let API_BASE = DEFAULT_API_BASE;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const viewLogin  = document.getElementById('view-login');
const viewImport = document.getElementById('view-import');
const apiUrlInput = document.getElementById('api-url');

const emailInput    = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError    = document.getElementById('login-error');
const btnLogin      = document.getElementById('btn-login');

const userEmailEl  = document.getElementById('user-email');
const importError  = document.getElementById('import-error');
const btnImport    = document.getElementById('btn-import');
const btnLogout    = document.getElementById('btn-logout');
const btnReset     = document.getElementById('btn-reset');

const stateIdle    = document.getElementById('state-idle');
const stateRunning = document.getElementById('state-running');
const stateDone    = document.getElementById('state-done');
const syncStatus   = document.getElementById('sync-status');

const progressCount = document.getElementById('progress-count');
const progressFill  = document.getElementById('progress-fill');
const statusLine    = document.getElementById('status-line');
const doneImported  = document.getElementById('done-imported');
const doneSkipped   = document.getElementById('done-skipped');

// ── Helpers ───────────────────────────────────────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError(el) { el.style.display = 'none'; }

function setProgress(current, total, statusMsg) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressCount.textContent = `${current} / ${total}`;
  if (statusMsg) statusLine.textContent = statusMsg;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function formatSyncTime(ts) {
  if (!ts) return 'Never synced';
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);
  if (diffMin < 2)  return 'Synced just now';
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  if (diffH   < 24) return `Synced ${diffH}h ago`;
  return `Synced ${diffD}d ago`;
}

function updateSyncStatus(ts) {
  if (!syncStatus) return;
  syncStatus.textContent = formatSyncTime(ts);
  syncStatus.style.display = 'block';
  syncStatus.style.cssText = 'display:block; font-size:11px; color:#888; margin-bottom:8px;';
}

async function init() {
  // Load API base URL from storage
  const { orbitApiBase } = await chrome.storage.sync.get('orbitApiBase');
  API_BASE = (orbitApiBase || DEFAULT_API_BASE).replace(/\/$/, '');
  if (apiUrlInput) apiUrlInput.value = API_BASE;

  const { orbitToken, orbitEmail, lastSyncedAt } = await chrome.storage.local.get(['orbitToken', 'orbitEmail', 'lastSyncedAt']);

  if (orbitToken) {
    // Verify token is still valid with a lightweight probe
    try {
      const probe = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${orbitToken}` },
      });
      if (probe.status === 401 || probe.status === 422) {
        // Token expired or invalid — clear and show login
        await chrome.storage.local.remove(['orbitToken', 'orbitEmail']);
        viewLogin.style.display = 'block';
        viewImport.style.display = 'none';
        showError(loginError, 'Your session expired. Please sign in again.');
        return;
      }
    } catch (_) {
      // Network offline — still show import view optimistically
    }
    showImportView(orbitEmail);
    updateSyncStatus(lastSyncedAt || null);
  } else {
    viewLogin.style.display = 'block';
    viewImport.style.display = 'none';
  }
}

// Save API URL when changed
if (apiUrlInput) {
  apiUrlInput.addEventListener('change', async () => {
    const val = apiUrlInput.value.trim().replace(/\/$/, '');
    if (val) {
      API_BASE = val;
      await chrome.storage.sync.set({ orbitApiBase: val });
    }
  });
}

function showImportView(email) {
  viewLogin.style.display = 'none';
  viewImport.style.display = 'block';
  userEmailEl.textContent = email || '';
  showIdleState();
}

function showIdleState() {
  stateIdle.style.display = 'block';
  stateRunning.style.display = 'none';
  stateDone.style.display = 'none';
  hideError(importError);
}

// ── Login ─────────────────────────────────────────────────────────────────────
btnLogin.addEventListener('click', async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError(loginError, 'Email and password are required.');
    return;
  }

  hideError(loginError);
  btnLogin.disabled = true;
  btnLogin.textContent = 'Signing in…';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(loginError, data.error || 'Login failed.');
      return;
    }

    await chrome.storage.local.set({ orbitToken: data.access_token, orbitEmail: email });
    showImportView(email);
  } catch (err) {
    showError(loginError, 'Cannot reach Orbit Six server. Is Flask running on port 5000?');
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Sign in to Orbit Six';
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', async () => {
  await chrome.storage.local.remove(['orbitToken', 'orbitEmail']);
  viewImport.style.display = 'none';
  viewLogin.style.display = 'block';
  emailInput.value = '';
  passwordInput.value = '';
  hideError(loginError);
});

// ── Reset (import again) ──────────────────────────────────────────────────────
btnReset.addEventListener('click', showIdleState);

// ── Import ────────────────────────────────────────────────────────────────────
btnImport.addEventListener('click', startImport);

function startImport() {
  stateIdle.style.display = 'none';
  stateRunning.style.display = 'block';
  stateDone.style.display = 'none';
  hideError(importError);
  setProgress(0, 0, 'Connecting to background…');

  // Open a long-lived port so the service worker can push progress updates
  const port = chrome.runtime.connect({ name: 'popup' });

  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'status':
        statusLine.textContent = msg.text;
        break;
      case 'progress':
        setProgress(msg.current, msg.total, msg.text || null);
        break;
      case 'done':
        stateRunning.style.display = 'none';
        stateDone.style.display = 'block';
        doneImported.textContent = msg.imported;
        doneSkipped.textContent  = msg.skipped;
        break;
      case 'synced_at':
        updateSyncStatus(msg.ts);
        break;
      case 'auto_sync_done':
        updateSyncStatus(msg.ts);
        // If popup is open on idle state, show a subtle note
        if (stateIdle.style.display !== 'none' && msg.imported > 0) {
          const note = document.createElement('div');
          note.style.cssText = 'font-size:11px;color:#2d7d4e;margin-top:4px;';
          note.textContent = `Auto-synced: +${msg.imported} new connections`;
          stateIdle.appendChild(note);
          setTimeout(() => note.remove(), 5000);
        }
        break;
      case 'error':
        stateRunning.style.display = 'none';
        stateIdle.style.display = 'block';
        showError(importError, msg.text);
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    // If port closes while still running, show a generic error
    if (stateRunning.style.display !== 'none') {
      showError(importError, 'Background process disconnected unexpectedly.');
      stateRunning.style.display = 'none';
      stateIdle.style.display = 'block';
    }
  });

  port.postMessage({ action: 'startImport' });
}

init();

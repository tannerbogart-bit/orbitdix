const API_BASE = 'http://localhost:5000';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const viewLogin  = document.getElementById('view-login');
const viewImport = document.getElementById('view-import');

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
async function init() {
  const { orbitToken, orbitEmail } = await chrome.storage.local.get(['orbitToken', 'orbitEmail']);

  if (orbitToken) {
    showImportView(orbitEmail);
  } else {
    viewLogin.style.display = 'block';
    viewImport.style.display = 'none';
  }
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

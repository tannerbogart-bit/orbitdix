/**
 * background.js — MV3 service worker
 *
 * Manual import flow (popup-triggered):
 *   1. Receives startImport from popup via long-lived port
 *   2. Opens / navigates to the LinkedIn connections page
 *   3. Injects content.js to scrape connections
 *   4. POSTs batches to /api/people/bulk
 *   5. Streams progress back to the popup port
 *
 * Auto-sync flow (passive, no user action needed):
 *   1. Detects when user navigates to the LinkedIn connections page
 *   2. Checks if last sync was > AUTO_SYNC_COOLDOWN_MS ago
 *   3. Silently scrapes + imports in the background
 *   4. Shows badge feedback when done
 */

const API_BASE             = 'http://localhost:5000';
const CONNECTIONS_URL      = 'https://www.linkedin.com/mynetwork/invite-connect/connections/';
const BATCH_SIZE           = 20;
const AUTO_SYNC_COOLDOWN_MS = 24 * 60 * 60 * 1000;   // 24 hours

// Track open popup ports so we can push messages
let popupPort  = null;
let syncRunning = false;

function send(msg) {
  try { popupPort?.postMessage(msg); } catch (_) {}
}

// Shared resolver — set before injecting content.js, resolved when scrape_done arrives
let resolveConnections = null;


// ── Port from popup ───────────────────────────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'popup') return;
  popupPort = port;

  port.onMessage.addListener(async (msg) => {
    if (msg.action === 'startImport') {
      await runManualImport();
    }
  });

  port.onDisconnect.addListener(() => {
    if (popupPort === port) popupPort = null;
  });
});


// ── One-shot messages from content.js ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'scrape_status') {
    send({ type: 'status', text: msg.text });
  } else if (msg.action === 'scrape_done') {
    if (typeof resolveConnections === 'function') {
      resolveConnections(msg.connections);
    }
  }
  sendResponse({});
  return true;
});


// ── Auto-sync: trigger when user visits the connections page ──────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.includes('/mynetwork/invite-connect/connections/')) return;
  if (syncRunning) return;

  const { orbitToken, lastSyncedAt } = await chrome.storage.local.get(['orbitToken', 'lastSyncedAt']);
  if (!orbitToken) return;

  const now = Date.now();
  if (lastSyncedAt && (now - lastSyncedAt) < AUTO_SYNC_COOLDOWN_MS) return;

  // All checks passed — run silent background sync
  await runSilentImport(tabId);
});


// ── Core scrape + upload (shared by manual and silent flows) ──────────────────
async function _scrapeAndUpload(tabId, token, onProgress) {
  // Wait for LinkedIn SPA to settle after page load
  await new Promise(r => setTimeout(r, 2000));

  const connections = await new Promise((resolve) => {
    resolveConnections = resolve;
    chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    setTimeout(() => resolve([]), 3 * 60 * 1000);   // 3-min hard timeout
  });
  resolveConnections = null;

  if (!connections || connections.length === 0) return { imported: 0, skipped: 0, error: 'no_connections' };

  onProgress?.({ type: 'status', text: `Found ${connections.length} connections. Importing…` });

  const batches = chunk(connections, BATCH_SIZE);
  let totalImported = 0;
  let totalSkipped  = 0;

  for (let i = 0; i < batches.length; i++) {
    onProgress?.({
      type: 'progress',
      current: i * BATCH_SIZE,
      total: connections.length,
      text: `Sending batch ${i + 1} of ${batches.length}…`,
    });

    try {
      const res = await fetch(`${API_BASE}/api/people/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ people: batches[i] }),
      });

      if (res.status === 401) {
        await chrome.storage.local.remove(['orbitToken', 'orbitEmail']);
        return { imported: totalImported, skipped: totalSkipped, error: 'auth' };
      }

      if (res.ok) {
        const data = await res.json();
        totalImported += data.imported || 0;
        totalSkipped  += data.skipped  || 0;
      } else {
        const err = await res.json().catch(() => ({}));
        onProgress?.({ type: 'error', text: err.error || `Server error (${res.status})` });
        return { imported: totalImported, skipped: totalSkipped, error: 'server' };
      }
    } catch {
      onProgress?.({ type: 'error', text: 'Cannot reach Orbit Six server.' });
      return { imported: totalImported, skipped: totalSkipped, error: 'network' };
    }
  }

  // Persist sync timestamp
  await chrome.storage.local.set({ lastSyncedAt: Date.now() });

  onProgress?.({ type: 'progress', current: connections.length, total: connections.length, text: 'Done!' });
  return { imported: totalImported, skipped: totalSkipped };
}


// ── Manual import (popup-triggered) ──────────────────────────────────────────
async function runManualImport() {
  if (syncRunning) {
    send({ type: 'error', text: 'A sync is already running.' });
    return;
  }

  const { orbitToken } = await chrome.storage.local.get('orbitToken');
  if (!orbitToken) {
    send({ type: 'error', text: 'Not signed in. Please log in first.' });
    return;
  }

  syncRunning = true;
  send({ type: 'status', text: 'Opening LinkedIn connections page…' });

  let tab = await findLinkedInTab();
  if (!tab) {
    tab = await openLinkedInTab();
  } else if (!tab.url.includes('/mynetwork/invite-connect/connections/')) {
    await chrome.tabs.update(tab.id, { url: CONNECTIONS_URL });
    await waitForTabLoad(tab.id);
  }

  send({ type: 'status', text: 'Waiting for LinkedIn to load…' });

  const result = await _scrapeAndUpload(tab.id, orbitToken, (msg) => send(msg));
  syncRunning = false;

  if (!result.error || result.error === 'no_connections') {
    if (result.error === 'no_connections') {
      send({ type: 'error', text: 'No connections found. Make sure you are on the LinkedIn connections page.' });
    } else {
      send({ type: 'done', imported: result.imported, skipped: result.skipped });
      // Notify popup of new sync time
      send({ type: 'synced_at', ts: Date.now() });
    }
  }
}


// ── Silent auto-sync (user visited connections page) ─────────────────────────
async function runSilentImport(tabId) {
  syncRunning = true;

  // Badge: syncing
  chrome.action.setBadgeText({ text: '↻' });
  chrome.action.setBadgeBackgroundColor({ color: '#7c6ee0' });

  const { orbitToken } = await chrome.storage.local.get('orbitToken');
  const result = await _scrapeAndUpload(tabId, orbitToken, null);
  syncRunning = false;

  if (result.error === 'auth') {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  // Badge: done
  const newCount = result.imported;
  const badge = newCount > 0 ? `+${Math.min(newCount, 99)}` : '✓';
  chrome.action.setBadgeText({ text: badge });
  chrome.action.setBadgeBackgroundColor({ color: '#2d7d4e' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 6000);

  // Notify popup if open
  send({ type: 'auto_sync_done', imported: result.imported, skipped: result.skipped, ts: Date.now() });
}


// ── Helpers ───────────────────────────────────────────────────────────────────
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function findLinkedInTab() {
  const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });
  return tabs[0] || null;
}

async function openLinkedInTab() {
  const tab = await chrome.tabs.create({ url: CONNECTIONS_URL, active: true });
  await waitForTabLoad(tab.id);
  return tab;
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * background.js — MV3 service worker
 *
 * Orchestrates the import flow:
 *   1. Receives startImport from popup via long-lived port
 *   2. Opens / navigates to the LinkedIn connections page
 *   3. Injects content.js to scrape connections
 *   4. POSTs batches of 20 to /api/people/bulk
 *   5. Streams progress back to the popup port
 */

const API_BASE        = 'http://localhost:5000';
const CONNECTIONS_URL = 'https://www.linkedin.com/mynetwork/invite-connect/connections/';
const BATCH_SIZE      = 20;

// Track open popup ports so we can push messages
let popupPort = null;

function send(msg) {
  try { popupPort?.postMessage(msg); } catch (_) {}
}

// ── Port from popup ───────────────────────────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'popup') return;
  popupPort = port;

  port.onMessage.addListener(async (msg) => {
    if (msg.action === 'startImport') {
      await runImport();
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
    // Resolved via promise stored in the closure below
    if (typeof resolveConnections === 'function') {
      resolveConnections(msg.connections);
    }
  }
  sendResponse({});
  return true;
});

// Shared resolver — set before injecting content.js, resolved when scrape_done arrives
let resolveConnections = null;

// ── Main import flow ──────────────────────────────────────────────────────────
async function runImport() {
  // 1. Get JWT
  const { orbitToken } = await chrome.storage.local.get('orbitToken');
  if (!orbitToken) {
    send({ type: 'error', text: 'Not signed in. Please log in first.' });
    return;
  }

  send({ type: 'status', text: 'Opening LinkedIn connections page…' });

  // 2. Find or open the LinkedIn connections tab
  let tab = await findLinkedInTab();
  if (!tab) {
    tab = await openLinkedInTab();
  } else if (!tab.url.includes('/mynetwork/invite-connect/connections/')) {
    await chrome.tabs.update(tab.id, { url: CONNECTIONS_URL });
    await waitForTabLoad(tab.id);
  }

  send({ type: 'status', text: 'Waiting for LinkedIn to load…' });
  await new Promise(r => setTimeout(r, 2000));

  // 3. Inject content.js and wait for scrape_done
  const connections = await new Promise((resolve) => {
    resolveConnections = resolve;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ['content.js'],
    });
  });
  resolveConnections = null;

  if (!connections || connections.length === 0) {
    send({ type: 'error', text: 'No connections found. Make sure you are on linkedin.com/mynetwork/invite-connect/connections/' });
    return;
  }

  // 4. POST in batches
  send({ type: 'status', text: `Found ${connections.length} connections. Importing…` });

  let totalImported = 0;
  let totalSkipped  = 0;
  const batches = chunk(connections, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    send({
      type:    'progress',
      current: i * BATCH_SIZE,
      total:   connections.length,
      text:    `Sending batch ${i + 1} of ${batches.length}…`,
    });

    try {
      const res = await fetch(`${API_BASE}/api/people/bulk`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${orbitToken}`,
        },
        body: JSON.stringify({ people: batch }),
      });

      if (res.status === 401) {
        send({ type: 'error', text: 'Session expired. Please sign in again.' });
        await chrome.storage.local.remove(['orbitToken', 'orbitEmail']);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        send({ type: 'error', text: err.error || `Server error (${res.status})` });
        return;
      }

      const data = await res.json();
      totalImported += data.imported || 0;
      totalSkipped  += data.skipped  || 0;

    } catch (err) {
      send({ type: 'error', text: 'Cannot reach Orbit Six server. Is Flask running on port 5000?' });
      return;
    }
  }

  send({ type: 'progress', current: connections.length, total: connections.length, text: 'Done!' });
  send({ type: 'done', imported: totalImported, skipped: totalSkipped });
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

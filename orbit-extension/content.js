/**
 * content.js — injected into linkedin.com/mynetwork/invite-connect/connections/
 *
 * LinkedIn now uses fully obfuscated class names, so we anchor on
 * profile URLs (/in/username) which never change, then walk the DOM
 * to extract names and occupation text.
 */

(async function scrapeConnections() {
  console.log('[OrbitSix] content.js loaded on', window.location.href);

  // ── Profile link helpers ──────────────────────────────────────────────────
  function getProfileLinks() {
    return [...document.querySelectorAll('a[href*="/in/"]')].filter(a => {
      const href = a.getAttribute('href') || '';
      // Match both absolute (https://www.linkedin.com/in/user) and relative (/in/user)
      return /\/in\/[^/]+\/?(\?|$)/.test(href);
    });
  }

  function normalizeHref(href) {
    // Strip query params, convert absolute to path
    const clean = href.split('?')[0];
    return clean.replace('https://www.linkedin.com', '');
  }

  function getUniqueProfileUrls() {
    const urls = new Set();
    for (const a of getProfileLinks()) {
      urls.add(normalizeHref(a.getAttribute('href') || ''));
    }
    return urls;
  }

  // ── Wait for profile links to appear ─────────────────────────────────────
  async function waitForProfileLinks(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const links = getProfileLinks();
      if (links.length > 0) {
        console.log(`[OrbitSix] Page ready — ${links.length} profile links found`);
        return true;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.warn('[OrbitSix] Timeout — no /in/ profile links found.');
    console.warn('[OrbitSix] Page HTML sample:', document.body.innerHTML.slice(0, 2000));
    return false;
  }

  // ── Scroll to load all connections ───────────────────────────────────────
  // LinkedIn uses IntersectionObserver. scrollIntoView() on the last visible
  // card triggers it properly, unlike window.scrollTo().
  async function loadAll() {
    let previousCount = 0;
    let stableRounds  = 0;

    while (stableRounds < 4) {
      // Scroll the last profile link into view to trigger LinkedIn's observer
      const links = getProfileLinks();
      if (links.length > 0) {
        links[links.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }

      await new Promise(r => setTimeout(r, 2500));

      const current = getUniqueProfileUrls().size;
      console.log(`[OrbitSix] Scroll — unique profiles: ${current}, stable rounds: ${stableRounds}`);

      if (current === previousCount) {
        stableRounds++;
      } else {
        stableRounds  = 0;
        previousCount = current;
      }

      if (current >= 3000) break;
    }
    console.log(`[OrbitSix] Scroll done — total unique profiles: ${previousCount}`);
  }

  // ── Walk up DOM to find card container ───────────────────────────────────
  function findCardRoot(link) {
    let el = link.parentElement;
    for (let i = 0; i < 12; i++) {
      if (!el || el.tagName === 'BODY') break;
      if (el.tagName === 'LI') return el;
      // A div with 3+ children is likely a card container
      if (el.tagName === 'DIV' && el.children.length >= 3) return el;
      el = el.parentElement;
    }
    return link.parentElement;
  }

  // ── Extract leaf text nodes from an element (skip containers) ────────────
  function leafTexts(root, excludeEl) {
    const results = [];
    const seen = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.textContent.trim();
        if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
        // Skip if inside excludeEl
        if (excludeEl && excludeEl.contains(node.parentElement)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim().replace(/\s+/g, ' ');
      if (!seen.has(text) && text.length < 150) {
        seen.add(text);
        results.push(text);
      }
    }
    return results;
  }

  // ── Extract one connection from a profile link ────────────────────────────
  function extractFromLink(link) {
    const rawHref = link.getAttribute('href') || '';
    const href = normalizeHref(rawHref);
    const linkedinUrl = 'https://www.linkedin.com' + href;

    const card = findCardRoot(link);

    // Get all visible leaf texts from the card, skipping UI chrome
    const skipPatterns = /^(connect|follow|message|pending|\d+ mutual|you and|\+\d|remove)/i;
    const texts = leafTexts(card, null).filter(t => t.length > 1 && !skipPatterns.test(t));

    console.log(`[OrbitSix] Card texts for ${href}:`, texts);

    // First meaningful text = name, second = occupation
    const name       = texts[0] || '';
    const occupation = texts[1] || '';

    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    let title = occupation, company = '';
    const atIdx = occupation.lastIndexOf(' at ');
    const atSymIdx = occupation.lastIndexOf(' @ ');
    if (atIdx !== -1) {
      title   = occupation.slice(0, atIdx).trim();
      company = occupation.slice(atIdx + 4).trim();
    } else if (atSymIdx !== -1) {
      title   = occupation.slice(0, atSymIdx).trim();
      company = occupation.slice(atSymIdx + 3).trim();
    }

    const imgEl = card.querySelector('img');
    const profileImageUrl =
      imgEl?.getAttribute('src') ||
      imgEl?.getAttribute('data-delayed-url') ||
      undefined;

    console.log(`[OrbitSix] ${firstName} ${lastName} | ${occupation} | ${href}`);

    return {
      first_name:        firstName,
      last_name:         lastName,
      title,
      company,
      linkedin_url:      linkedinUrl,
      profile_image_url: profileImageUrl || undefined,
    };
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  chrome.runtime.sendMessage({ action: 'scrape_status', text: 'Waiting for LinkedIn to load…' });

  // Give the React SPA time to render, then scroll to trigger lazy loading
  await new Promise(r => setTimeout(r, 2500));
  window.scrollTo(0, 600);
  await new Promise(r => setTimeout(r, 1500));
  await waitForProfileLinks();

  chrome.runtime.sendMessage({ action: 'scrape_status', text: 'Scrolling to load all connections…' });
  await loadAll();

  // Deduplicate by profile URL, then extract
  const seen = new Set();
  const connections = [];

  for (const link of getProfileLinks()) {
    const href = normalizeHref(link.getAttribute('href') || '');
    if (seen.has(href)) continue;
    seen.add(href);

    const conn = extractFromLink(link);
    if (conn.first_name || conn.linkedin_url) {
      connections.push(conn);
    }
  }

  console.log(`[OrbitSix] Done — ${connections.length} connections extracted`);

  chrome.runtime.sendMessage({
    action: 'scrape_done',
    connections,
    total: connections.length,
  });
})();

/**
 * content.js — injected into linkedin.com/mynetwork/invite-connect/connections/
 *
 * Scrapes connection cards, handles infinite scroll to load all pages,
 * then sends all results back to background.js in a single message.
 */

(async function scrapeConnections() {
  // ── Selectors ──────────────────────────────────────────────────────────────
  // LinkedIn changes class names frequently; we try several fallbacks.
  const CARD_SELECTORS = [
    'li.mn-connection-card',
    'li[class*="connection-card"]',
    '[data-view-name="profile-list-item"]',
    'li.reusable-search__result-container',
  ];

  const NAME_SELECTORS = [
    '.mn-connection-card__name',
    '[class*="connection-card__name"]',
    'span.t-bold',
    'span.entity-result__title-text',
  ];

  const OCCUPATION_SELECTORS = [
    '.mn-connection-card__occupation',
    '[class*="connection-card__occupation"]',
    '.entity-result__primary-subtitle',
    'span.t-14.t-black--light',
  ];

  const LINK_SELECTORS = [
    'a.mn-connection-card__link',
    'a[href*="/in/"]',
  ];

  const IMAGE_SELECTORS = [
    'img.presence-entity__image',
    'img[class*="profile-photo"]',
    'img[class*="evi-image"]',
    '.ivm-view-attr__img--centered',
  ];

  function firstMatch(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ── Extract a single card ─────────────────────────────────────────────────
  function extractCard(card) {
    const linkEl = firstMatch(card, LINK_SELECTORS);
    const nameEl = firstMatch(card, NAME_SELECTORS);
    const occEl  = firstMatch(card, OCCUPATION_SELECTORS);
    const imgEl  = firstMatch(card, IMAGE_SELECTORS);

    const linkedinUrl = linkEl
      ? 'https://www.linkedin.com' + (linkEl.getAttribute('href') || '').split('?')[0]
      : null;

    const fullName  = (nameEl?.textContent || '').trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    const occupation = (occEl?.textContent || '').trim();
    // "Title at Company" → split on last " at "
    let title = occupation, company = '';
    const atIdx = occupation.lastIndexOf(' at ');
    if (atIdx !== -1) {
      title   = occupation.slice(0, atIdx).trim();
      company = occupation.slice(atIdx + 4).trim();
    }

    const profileImageUrl =
      imgEl?.getAttribute('src') ||
      imgEl?.getAttribute('data-delayed-url') ||
      null;

    return {
      first_name:        firstName,
      last_name:         lastName,
      title,
      company,
      linkedin_url:      linkedinUrl || undefined,
      profile_image_url: profileImageUrl || undefined,
    };
  }

  // ── Scroll to load all connections ───────────────────────────────────────
  async function loadAll() {
    let previousCount = 0;
    let stableRounds  = 0;

    while (stableRounds < 3) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 1800));

      let current = 0;
      for (const sel of CARD_SELECTORS) {
        current = Math.max(current, document.querySelectorAll(sel).length);
      }

      if (current === previousCount) {
        stableRounds++;
      } else {
        stableRounds  = 0;
        previousCount = current;
      }

      // Safety cap — LinkedIn rarely has >3000 connections visible at once
      if (current >= 3000) break;
    }
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  chrome.runtime.sendMessage({ action: 'scrape_status', text: 'Scrolling to load all connections…' });

  await loadAll();

  // Collect cards from whichever selector matched
  let cardEls = [];
  for (const sel of CARD_SELECTORS) {
    const found = [...document.querySelectorAll(sel)];
    if (found.length > cardEls.length) cardEls = found;
  }

  const connections = cardEls
    .map(extractCard)
    .filter(c => c.first_name || c.linkedin_url); // drop empty cards

  chrome.runtime.sendMessage({
    action: 'scrape_done',
    connections,
    total: connections.length,
  });
})();

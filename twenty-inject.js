/**
 * Twenty CRM – BD Intelligence injection
 *
 * Injects a "BD Intelligence" nav item into Twenty's sidebar and renders
 * the Next.js dashboard (http://localhost:3001) in a full-content-area
 * iframe when that nav item is active.
 *
 * Load via Tampermonkey (see twenty-bd-intelligence.user.js) or inject
 * manually in the browser console for testing.
 */

(function BDIntelligenceInjector() {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────

  const BD_URL   = 'http://localhost:3001';
  const BD_ROUTE = '/bd-intelligence';
  const OVERLAY_ID  = 'bd-intelligence-overlay';
  const NAV_BTN_ID  = 'bd-intelligence-nav-btn';
  const NAV_ITEM_ID = 'bd-intelligence-nav-item';

  // Twenty dark theme tokens (matched from bundle analysis)
  const T = {
    bgOverlay:    '#1d1d1d',
    bgActive:     'rgba(255,255,255,0.10)',
    bgHover:      'rgba(255,255,255,0.06)',
    textActive:   '#eaeaea',
    textInactive: '#818181',
    fontFamily:   "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:     '13px',
    borderRadius: '4px',
    itemHeight:   '20px',
    padding:      '4px',
    iconSize:     '16',
  };

  // ── State ─────────────────────────────────────────────────────────────────

  let injected = false;

  // ── Route helpers ─────────────────────────────────────────────────────────

  const onBDRoute = () => window.location.pathname === BD_ROUTE;

  // ── Overlay ───────────────────────────────────────────────────────────────

  function getSidebarRight() {
    // Read the sidebar's right edge so the overlay starts exactly where it ends
    const anyItem = document.querySelector('.navigation-drawer-item');
    if (!anyItem) return 220; // fallback
    let el = anyItem.parentElement;
    // Walk up until we find an element that looks like the sidebar column
    while (el && el !== document.body) {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      if (
        rect.width >= 150 && rect.width <= 300 &&
        (styles.overflowY === 'auto' || styles.overflowY === 'scroll' ||
         styles.position === 'fixed' || styles.position === 'sticky')
      ) {
        return rect.right;
      }
      el = el.parentElement;
    }
    // Fallback: use the bounding rect of the nav item's ancestor
    const itemRect = anyItem.getBoundingClientRect();
    return itemRect.right + 100; // rough estimate
  }

  function ensureOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      `left:${getSidebarRight()}px`,
      'right:0',
      'bottom:0',
      `background:${T.bgOverlay}`,
      'z-index:99',
      'display:none',
    ].join(';');

    const iframe = document.createElement('iframe');
    iframe.src = BD_URL;
    iframe.title = 'BD Intelligence Dashboard';
    iframe.setAttribute('frameborder', '0');
    iframe.style.cssText = [
      'width:100%',
      'height:100%',
      'border:none',
      `background:${T.bgOverlay}`,
      'display:block',
    ].join(';');

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  }

  function showOverlay() {
    ensureOverlay();
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    // Recalculate position in case sidebar was resized
    overlay.style.left = getSidebarRight() + 'px';
    overlay.style.display = 'block';
  }

  function hideOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.style.display = 'none';
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function navigateToBD(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    window.history.pushState({ bd: true }, '', BD_ROUTE);
    syncState();
  }

  function syncState() {
    if (onBDRoute()) {
      showOverlay();
    } else {
      hideOverlay();
    }
    updateActiveStyle();
  }

  // ── Nav item ──────────────────────────────────────────────────────────────

  function updateActiveStyle() {
    const btn = document.getElementById(NAV_BTN_ID);
    if (!btn) return;
    const active = onBDRoute();
    btn.setAttribute('aria-selected', String(active));
    btn.style.background    = active ? T.bgActive : 'transparent';
    btn.style.color         = active ? T.textActive : T.textInactive;
    btn.style.fontWeight    = active ? '500' : '400';
  }

  // Tabler-Icons style chart-bar SVG (stroke-based, 16×16)
  function buildIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width',  T.iconSize);
    svg.setAttribute('height', T.iconSize);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flexShrink = '0';
    svg.innerHTML =
      '<path stroke="none" d="M0 0h24v24H0z" fill="none"/>' +
      '<path d="M3 13m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"/>' +
      '<path d="M9 9m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v9a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"/>' +
      '<path d="M15 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v13a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"/>';
    return svg;
  }

  function buildNavItem() {
    // Outer wrapper matches Twenty's Dcr (F.div) wrapping each nav item
    const wrapper = document.createElement('div');
    wrapper.id = NAV_ITEM_ID;
    wrapper.style.cssText = 'display:flex;align-items:center;width:100%;';

    const btn = document.createElement('button');
    btn.id = NAV_BTN_ID;
    btn.className = 'navigation-drawer-item';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-selected', 'false');
    btn.style.cssText = [
      'box-sizing:content-box',
      'display:flex',
      'align-items:center',
      `gap:8px`,
      `height:${T.itemHeight}`,
      'border:none',
      `border-radius:${T.borderRadius}`,
      'text-decoration:none',
      `color:${T.textInactive}`,
      'cursor:pointer',
      `font-family:${T.fontFamily}`,
      `font-size:${T.fontSize}`,
      'font-weight:400',
      `padding:${T.padding}`,
      'width:calc(100% - 6px)',
      'background:transparent',
      'outline:none',
      'user-select:none',
      'transition:background 100ms ease,color 100ms ease',
      'text-align:left',
    ].join(';');

    const label = document.createElement('span');
    label.textContent = 'BD Intelligence';
    label.style.cssText = [
      'flex:1',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
      'min-width:0',
    ].join(';');

    btn.appendChild(buildIcon());
    btn.appendChild(label);
    wrapper.appendChild(btn);

    // Hover
    btn.addEventListener('mouseenter', () => {
      if (!onBDRoute()) {
        btn.style.background = T.bgHover;
        btn.style.color      = T.textActive;
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (!onBDRoute()) {
        btn.style.background = 'transparent';
        btn.style.color      = T.textInactive;
      }
    });

    btn.addEventListener('click', navigateToBD);
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // prevent focus flash

    return wrapper;
  }

  // ── Insertion-point finder ────────────────────────────────────────────────

  function findLastMainNavWrapper() {
    const allItems = Array.from(
      document.querySelectorAll('.navigation-drawer-item')
    );
    if (!allItems.length) return null;

    // Filter out items that belong to the settings/account sections.
    // Twenty's settings items contain these texts (in English):
    const SETTINGS_KEYWORDS = ['settings', 'search', 'invite', 'workspace', 'upgrade', 'trial'];

    // Walk from the end backwards to find the last "main content" item
    for (let i = allItems.length - 1; i >= 0; i--) {
      const text = allItems[i].textContent?.trim().toLowerCase() ?? '';
      const isSettings = SETTINGS_KEYWORDS.some((k) => text.includes(k));
      if (!isSettings) {
        // Return the immediate parent (the Dcr wrapper div)
        return allItems[i].parentElement;
      }
    }

    // Fallback: insert after the very last item's parent
    return allItems[allItems.length - 1].parentElement;
  }

  // ── Main inject ───────────────────────────────────────────────────────────

  function inject() {
    // Skip if already present
    if (document.getElementById(NAV_ITEM_ID)) {
      injected = true;
      updateActiveStyle();
      return;
    }

    const lastWrapper = findLastMainNavWrapper();
    if (!lastWrapper) return; // nav not ready yet

    const navItem = buildNavItem();
    lastWrapper.parentNode.insertBefore(navItem, lastWrapper.nextSibling);
    injected = true;
    updateActiveStyle();
  }

  // ── History interception ──────────────────────────────────────────────────

  function patchHistory() {
    const _push    = history.pushState.bind(history);
    const _replace = history.replaceState.bind(history);

    history.pushState = function (state, title, url) {
      _push(state, title, url);
      syncState();
      // Re-inject after React reconciles (nav items may re-render)
      setTimeout(() => { injected = false; inject(); }, 400);
    };

    history.replaceState = function (state, title, url) {
      _replace(state, title, url);
      syncState();
    };

    window.addEventListener('popstate', () => {
      syncState();
      setTimeout(() => { injected = false; inject(); }, 400);
    });
  }

  // ── MutationObserver (handles React re-renders wiping the injected item) ──

  function watchForRerenders() {
    const observer = new MutationObserver(() => {
      if (!document.getElementById(NAV_ITEM_ID)) {
        injected = false;
        inject();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  function bootstrap() {
    // Retry until the nav renders (Twenty is a SPA, nav may take a moment)
    let attempts = 0;
    const tryInject = () => {
      inject();
      if (!injected && ++attempts < 30) {
        setTimeout(tryInject, 300);
      } else {
        // Nav is stable — set up observers
        watchForRerenders();
        syncState();
      }
    };

    patchHistory();
    tryInject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 200));
  } else {
    setTimeout(bootstrap, 200);
  }

})();

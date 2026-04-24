// ==UserScript==
// @name         Twenty CRM – BD Intelligence
// @namespace    crossmint-crm
// @version      2.0.0
// @description  Injects a "BD Intelligence" collapsible nav group into Twenty CRM with inline sub-items
// @author       Crossmint
// @match        http://localhost:3000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function BDIntelligenceInjector() {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────

  const BD_URL     = 'http://localhost:3001';
  const OVERLAY_ID = 'bd-intelligence-overlay';
  const GROUP_ID   = 'bd-intelligence-group';

  const SUBROUTES = [
    { key: 'dashboard', label: 'Dashboard',  path: '/'          },
    { key: 'leads',     label: 'Leads',       path: '/leads'     },
    { key: 'pipeline',  label: 'Pipeline',    path: '/pipeline'  },
    { key: 'accounts',  label: 'Accounts',    path: '/accounts'  },
  ];

  // BD routes — any path we "own"
  const BD_PATHS = new Set(['/', '/leads', '/pipeline', '/accounts']);
  const BD_ROUTE_PREFIX = '/bd-intelligence';

  // Current active sub-path within BD (stored separately from Twenty's URL)
  let activeSubPath = '/';
  // Whether the submenu is expanded
  let menuOpen = false;
  // Whether the group node is injected
  let injected = false;
  // Stable iframe reference — created once, never recreated
  let bdIframe = null;

  // Twenty dark theme tokens
  const T = {
    bgActive:     'rgba(255,255,255,0.06)',
    bgHover:      'rgba(255,255,255,0.06)',
    textActive:   '#eaeaea',
    textInactive: '#818181',
    fontFamily:   "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:     '13px',
    borderRadius: '4px',
    itemHeight:   '20px',
    padding:      '4px',
    iconSize:     '16',
    subPaddingLeft: '28px',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const onBDRoute = () => window.location.pathname === BD_ROUTE_PREFIX ||
                          window.location.pathname.startsWith(BD_ROUTE_PREFIX + '/');

  function getContentBg() {
    const sel = [
      '[class*="PageContainer"]',
      '[class*="mainContainer"]',
      '[class*="MainContainer"]',
      'main',
    ];
    for (const s of sel) {
      const el = document.querySelector(s);
      if (!el) continue;
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    }
    return '#111111';
  }

  // ── Overlay (iframe) ───────────────────────────────────────────────────────

  function ensureOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      'left:220px',
      'right:0',
      'bottom:0',
      'z-index:9999',
      'display:none',
    ].join(';');

    // Create the iframe exactly once and store the reference
    bdIframe = document.createElement('iframe');
    bdIframe.id = 'bd-intelligence-iframe';
    bdIframe.src = BD_URL + activeSubPath;
    bdIframe.title = 'BD Intelligence';
    bdIframe.setAttribute('frameborder', '0');
    bdIframe.style.cssText = 'width:100%;height:100%;border:none;display:block;background:transparent;';

    overlay.appendChild(bdIframe);
    document.body.appendChild(overlay);
  }

  function navigateIframe(subPath) {
    if (!bdIframe) return;
    const url = BD_URL + subPath;
    try {
      bdIframe.contentWindow.location.href = url;
    } catch(e) {
      bdIframe.src = url;
    }
  }

  function showOverlay(subPath) {
    ensureOverlay();
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    overlay.style.background = getContentBg();
    overlay.style.display = 'block';

    navigateIframe(subPath);
  }

  function hideOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.style.display = 'none';
  }

  // ── Deactivate other nav items ─────────────────────────────────────────────

  let _deactivateTimer = null;

  function forceDeactivateOthers() {
    document.querySelectorAll('.navigation-drawer-item').forEach((el) => {
      if (el.closest('#' + GROUP_ID)) return; // leave our own items alone
      el.setAttribute('aria-selected', 'false');
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('color', T.textInactive, 'important');
      el.style.setProperty('font-weight', '400', 'important');
    });
  }

  function startDeactivateLoop() {
    if (_deactivateTimer) clearInterval(_deactivateTimer);
    forceDeactivateOthers();
    let elapsed = 0;
    _deactivateTimer = setInterval(() => {
      forceDeactivateOthers();
      elapsed += 200;
      if (elapsed >= 1000) { clearInterval(_deactivateTimer); _deactivateTimer = null; }
    }, 200);
  }

  function stopDeactivateLoop() {
    if (_deactivateTimer) { clearInterval(_deactivateTimer); _deactivateTimer = null; }
    document.querySelectorAll('.navigation-drawer-item').forEach((el) => {
      if (el.closest('#' + GROUP_ID)) return;
      el.style.removeProperty('background');
      el.style.removeProperty('color');
      el.style.removeProperty('font-weight');
    });
  }

  // ── Icons ──────────────────────────────────────────────────────────────────

  function makeBarChartIcon() {
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

  function makeChevron() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width',  '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.cssText = 'flex-shrink:0;transition:transform 150ms ease;';
    svg.innerHTML = '<polyline points="9 18 15 12 9 6"/>';
    return svg;
  }

  // ── Build group DOM ────────────────────────────────────────────────────────

  function buildGroup() {
    const group = document.createElement('div');
    group.id = GROUP_ID;
    group.style.cssText = 'width:100%;';

    // ── Parent button ──────────────────────────────────────────────────────
    const parentWrapper = document.createElement('div');
    parentWrapper.style.cssText = 'display:flex;align-items:center;width:100%;';

    const parentBtn = document.createElement('button');
    parentBtn.className = 'navigation-drawer-item';
    parentBtn.setAttribute('type', 'button');
    parentBtn.setAttribute('aria-expanded', 'false');
    parentBtn.style.cssText = [
      'box-sizing:content-box',
      'display:flex',
      'align-items:center',
      'gap:8px',
      `height:${T.itemHeight}`,
      'border:none',
      `border-radius:${T.borderRadius}`,
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

    const parentLabel = document.createElement('span');
    parentLabel.textContent = 'BD Intelligence';
    parentLabel.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;';

    const chevron = makeChevron();

    parentBtn.appendChild(makeBarChartIcon());
    parentBtn.appendChild(parentLabel);
    parentBtn.appendChild(chevron);
    parentWrapper.appendChild(parentBtn);
    group.appendChild(parentWrapper);

    // ── Submenu ────────────────────────────────────────────────────────────
    const submenu = document.createElement('div');
    submenu.style.cssText = 'overflow:hidden;max-height:0;transition:max-height 150ms ease;';

    const subItemEls = {};

    for (const route of SUBROUTES) {
      const itemWrapper = document.createElement('div');
      itemWrapper.style.cssText = 'display:flex;align-items:center;width:100%;';

      const btn = document.createElement('button');
      btn.className = 'navigation-drawer-item';
      btn.setAttribute('type', 'button');
      btn.setAttribute('data-bd-sub', route.key);
      btn.style.cssText = [
        'box-sizing:content-box',
        'display:flex',
        'align-items:center',
        `height:${T.itemHeight}`,
        'border:none',
        `border-radius:${T.borderRadius}`,
        `color:${T.textInactive}`,
        'cursor:pointer',
        `font-family:${T.fontFamily}`,
        `font-size:${T.fontSize}`,
        'font-weight:400',
        `padding:${T.padding} ${T.padding} ${T.padding} ${T.subPaddingLeft}`,
        'width:calc(100% - 6px)',
        'background:transparent',
        'outline:none',
        'user-select:none',
        'transition:background 100ms ease,color 100ms ease',
        'text-align:left',
      ].join(';');

      btn.textContent = route.label;

      btn.addEventListener('mouseenter', () => {
        if (btn.getAttribute('aria-selected') !== 'true') {
          btn.style.background = T.bgHover;
          btn.style.color = T.textActive;
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.getAttribute('aria-selected') !== 'true') {
          btn.style.background = 'transparent';
          btn.style.color = T.textInactive;
        }
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        activeSubPath = route.path;

        // Navigate the iframe — primary mechanism
        navigateIframe(route.path);

        // Keep overlay visible with correct background
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
          overlay.style.display = 'block';
          overlay.style.background = getContentBg();
        }

        // Update sub-item active styles immediately
        for (const r of SUBROUTES) {
          const el = subItemEls[r.key];
          if (!el) continue;
          const active = r.key === route.key;
          el.setAttribute('aria-selected', String(active));
          el.style.background = active ? T.bgActive : 'transparent';
          el.style.color      = active ? T.textActive : T.textInactive;
          el.style.fontWeight = active ? '500' : '400';
        }

        startDeactivateLoop();
      }, true);
      btn.addEventListener('mousedown', (e) => e.preventDefault());

      subItemEls[route.key] = btn;
      itemWrapper.appendChild(btn);
      submenu.appendChild(itemWrapper);
    }

    group.appendChild(submenu);

    // ── Parent button behavior ─────────────────────────────────────────────

    function setMenuOpen(open) {
      menuOpen = open;
      parentBtn.setAttribute('aria-expanded', String(open));
      chevron.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
      // Animate height: measure content then set max-height
      if (open) {
        submenu.style.maxHeight = submenu.scrollHeight + 'px';
      } else {
        submenu.style.maxHeight = '0';
      }
    }

    function updateSubItemStyles() {
      for (const route of SUBROUTES) {
        const btn = subItemEls[route.key];
        if (!btn) continue;
        const active = onBDRoute() && activeSubPath === route.path;
        btn.setAttribute('aria-selected', String(active));
        btn.style.background = active ? T.bgActive : 'transparent';
        btn.style.color      = active ? T.textActive : T.textInactive;
        btn.style.fontWeight = active ? '500' : '400';
      }
      // Parent button shows active color if any sub-route is active
      const anyActive = onBDRoute();
      parentBtn.style.color = anyActive ? T.textActive : T.textInactive;
      parentBtn.style.fontWeight = anyActive ? '500' : '400';
    }

    parentBtn.addEventListener('mouseenter', () => {
      if (!onBDRoute()) { parentBtn.style.background = T.bgHover; parentBtn.style.color = T.textActive; }
    });
    parentBtn.addEventListener('mouseleave', () => {
      if (!onBDRoute()) { parentBtn.style.background = 'transparent'; parentBtn.style.color = T.textInactive; }
    });
    parentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const willOpen = !menuOpen;
      setMenuOpen(willOpen);
      // On first open, auto-activate the last active sub-route (or dashboard)
      if (willOpen && !onBDRoute()) {
        activateSubRoute(activeSubPath);
      } else if (!willOpen) {
        // Closing: hide overlay and let Twenty take over routing
        hideOverlay();
        stopDeactivateLoop();
        // Push back to a neutral Twenty route so its nav re-highlights correctly
        if (onBDRoute()) {
          window.history.pushState({}, '', '/');
        }
      }
    }, true);
    parentBtn.addEventListener('mousedown', (e) => e.preventDefault());

    // Expose updater so syncState can call it
    group._updateSubItemStyles = updateSubItemStyles;
    group._setMenuOpen = setMenuOpen;

    return group;
  }

  // ── Sub-route activation ───────────────────────────────────────────────────

  function activateSubRoute(subPath) {
    activeSubPath = subPath;
    // Push a URL Twenty won't try to route — we own everything under /bd-intelligence
    const fullPath = BD_ROUTE_PREFIX + (subPath === '/' ? '' : subPath);
    window.history.pushState({ bd: true, subPath }, '', fullPath);
    showOverlay(subPath);
    startDeactivateLoop();
    updateGroupStyles();
  }

  function updateGroupStyles() {
    const group = document.getElementById(GROUP_ID);
    if (group && group._updateSubItemStyles) group._updateSubItemStyles();
  }

  // ── syncState ──────────────────────────────────────────────────────────────

  function syncState() {
    if (onBDRoute()) {
      showOverlay(activeSubPath);
      startDeactivateLoop();
    } else {
      hideOverlay();
      stopDeactivateLoop();
    }
    updateGroupStyles();
  }

  // ── Insertion-point finder ─────────────────────────────────────────────────

  function findLastMainNavWrapper() {
    const allItems = Array.from(document.querySelectorAll('.navigation-drawer-item'));
    if (!allItems.length) return null;

    const SETTINGS_KEYWORDS = ['settings', 'search', 'invite', 'workspace', 'upgrade', 'trial'];

    for (let i = allItems.length - 1; i >= 0; i--) {
      const text = allItems[i].textContent?.trim().toLowerCase() ?? '';
      if (!SETTINGS_KEYWORDS.some((k) => text.includes(k))) {
        return allItems[i].parentElement;
      }
    }
    return allItems[allItems.length - 1].parentElement;
  }

  // ── Main inject ────────────────────────────────────────────────────────────

  function inject() {
    if (document.getElementById(GROUP_ID)) {
      injected = true;
      updateGroupStyles();
      return;
    }

    const lastWrapper = findLastMainNavWrapper();
    if (!lastWrapper) return;

    const group = buildGroup();
    lastWrapper.parentNode.insertBefore(group, lastWrapper.nextSibling);
    injected = true;

    // Re-open submenu if we're already on a BD route (e.g. after React re-render)
    if (onBDRoute()) {
      const g = document.getElementById(GROUP_ID);
      if (g && g._setMenuOpen) g._setMenuOpen(true);
      updateGroupStyles();
    }
  }

  // ── History interception ───────────────────────────────────────────────────

  function patchHistory() {
    const _push    = history.pushState.bind(history);
    const _replace = history.replaceState.bind(history);

    history.pushState = function (state, title, url) {
      _push(state, title, url);
      syncState();
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

  // ── MutationObserver ───────────────────────────────────────────────────────

  function watchForRerenders() {
    const observer = new MutationObserver(() => {
      if (!document.getElementById(GROUP_ID)) {
        injected = false;
        inject();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function bootstrap() {
    let attempts = 0;
    const tryInject = () => {
      inject();
      if (!injected && ++attempts < 30) {
        setTimeout(tryInject, 300);
      } else {
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

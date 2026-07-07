// Content script - runs on every page/tab
// Listens for keystrokes and forwards them to the background worker

(function () {
  'use strict';

  let isEnabled = false;
  let sessionKeyCount = 0;
  const INACTIVITY_MS = 30000; // end session after 30s of no typing
  let inactivityTimer = null;

  // Check current monitoring state when page loads
  chrome.storage.local.get(['monitoring_enabled'], function (result) {
    if (result.monitoring_enabled === true) {
      enable();
    }
  });

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'TOGGLE') {
      if (message.enabled) {
        enable();
      } else {
        disable();
      }
    }
  });

  function enable() {
    if (isEnabled) return;
    isEnabled = true;
    sessionKeyCount = 0;
    document.addEventListener('keydown', captureKey, true);
    console.log('[KeyMonitor] Enabled on:', window.location.hostname);
  }

  function disable() {
    isEnabled = false;
    document.removeEventListener('keydown', captureKey, true);
    flushSession();
    console.log('[KeyMonitor] Disabled on:', window.location.hostname);
  }

  function captureKey(e) {
    if (!isEnabled) return;
    // Never capture password fields
    if (e.target && e.target.type === 'password') return;

    const keyData = {
      key_text: e.key,
      key_code: e.keyCode,
      timestamp: new Date().toISOString(),
      page_url: window.location.href
    };

    sessionKeyCount++;

    // Reset inactivity timer
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(flushSession, INACTIVITY_MS);

    // Send to background script
    chrome.runtime.sendMessage({ type: 'KEYSTROKE', data: keyData }).catch(function () {
      // Extension context may be invalidated - disable silently
      isEnabled = false;
    });
  }

  function flushSession() {
    if (sessionKeyCount === 0) return;
    const count = sessionKeyCount;
    sessionKeyCount = 0;

    chrome.runtime.sendMessage({
      type: 'SESSION_END',
      data: { tabId: null, keyCount: count }
    }).catch(function () {});
  }

  // Flush session when the page is about to close/navigate
  window.addEventListener('beforeunload', flushSession);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      flushSession();
    }
  });
})();

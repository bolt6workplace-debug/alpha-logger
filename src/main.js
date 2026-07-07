import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = '862412';
const TYPING_TIMEOUT = 40000;

let deviceId = null;
let currentSessionId = null;
let isAdminAuth = sessionStorage.getItem('admin_auth') === 'true';
let keystrokeCount = 0;
let typingTimer = null;
let sessionStart = null;
let sessionKeys = 0;
let isMonitoring = false;

function generateDeviceId() {
  return 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

async function init() {
  // Load from localStorage
  deviceId = localStorage.getItem('keylogger_device_id');
  const hasConsent = localStorage.getItem('keylogger_consent');
  keystrokeCount = parseInt(localStorage.getItem('keystroke_count') || '0');

  // Generate device ID if needed
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('keylogger_device_id', deviceId);
  }

  // Show consent modal if no consent
  if (!hasConsent) {
    document.getElementById('start-modal').classList.add('active');
  } else {
    startMonitoring();
  }

  // Update UI
  document.getElementById('device-id').textContent = deviceId;
  document.getElementById('keystroke-count').textContent = keystrokeCount;

  initRouter();
  initAuth();
  loadSessionCount();
  loadTodayCount();
}

function startMonitoring() {
  isMonitoring = true;
  document.getElementById('status-dot').classList.add('active');
  document.getElementById('status-text').textContent = 'Recording';
  document.getElementById('device-status').textContent = 'Active';
  document.getElementById('device-status').style.color = 'var(--success)';

  const statusBadge = document.getElementById('status-badge');
  statusBadge.classList.add('active');
  document.getElementById('badge-text').textContent = 'Active';

  document.addEventListener('keydown', handleKey);
  console.log('Monitoring started:', deviceId);
}

async function handleKey(e) {
  // Skip password input and textarea in admin
  if (e.target.tagName === 'INPUT' && e.target.type === 'password') return;
  if (e.target.tagName === 'TEXTAREA') return;

  showFlash(e.key);

  if (typingTimer) clearTimeout(typingTimer);

  // Create session if needed
  if (!currentSessionId) {
    try {
      const { data, error } = await supabase
        .from('typing_sessions')
        .insert([{ device_id: deviceId, session_start: new Date().toISOString() }])
        .select('id')
        .single();

      if (error) {
        console.error('Session error:', error);
        return;
      }

      if (data) {
        currentSessionId = data.id;
        sessionStart = Date.now();
        sessionKeys = 0;
      }
    } catch (err) {
      console.error('Session creation failed:', err);
      return;
    }
  }

  sessionKeys++;

  // Save keystroke
  try {
    await supabase.from('keystroke_logs').insert([{
      session_id: deviceId,
      key_text: e.key,
      key_code: e.keyCode,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      device_id: deviceId,
      typing_session_id: currentSessionId
    }]);
  } catch (err) {
    console.error('Keystroke save failed:', err);
  }

  keystrokeCount++;
  localStorage.setItem('keystroke_count', keystrokeCount.toString());
  document.getElementById('keystroke-count').textContent = keystrokeCount;

  typingTimer = setTimeout(endSession, TYPING_TIMEOUT);
}

async function endSession() {
  if (!currentSessionId) return;

  try {
    await supabase
      .from('typing_sessions')
      .update({ session_end: new Date().toISOString(), key_count: sessionKeys })
      .eq('id', currentSessionId);
  } catch (err) {
    console.error('Session end failed:', err);
  }

  currentSessionId = null;
  sessionKeys = 0;
  loadSessionCount();
}

async function loadSessionCount() {
  try {
    const { count } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId);

    document.getElementById('session-count').textContent = count || 0;
  } catch (err) {
    console.error('Session count failed:', err);
  }
}

async function loadTodayCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('timestamp', today);

    document.getElementById('today-count').textContent = count || 0;
  } catch (err) {
    console.error('Today count failed:', err);
  }
}

function showFlash(key) {
  const flash = document.getElementById('keystroke-flash');
  const keyEl = document.getElementById('flash-key');
  keyEl.textContent = key.length === 1 ? key : `[${key}]`;
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 500);
}

function initRouter() {
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page');

  function showPage(name) {
    if (name === 'admin' && !isAdminAuth) {
      document.getElementById('login-modal').classList.add('active');
      return;
    }

    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    const targetPage = document.getElementById(`${name}-page`);
    const targetLink = document.querySelector(`[data-page="${name}"]`);

    if (targetPage) targetPage.classList.add('active');
    if (targetLink) targetLink.classList.add('active');

    if (name === 'admin') {
      loadAdmin();
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      showPage(page);
    });
  });

  // Check initial hash
  if (window.location.hash === '#admin') {
    showPage('admin');
  }
}

function initAuth() {
  const modal = document.getElementById('login-modal');
  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;

    if (password === ADMIN_PASSWORD) {
      isAdminAuth = true;
      sessionStorage.setItem('admin_auth', 'true');
      modal.classList.remove('active');
      document.getElementById('admin-password').value = '';
      error.textContent = '';

      // Navigate to admin page
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.getElementById('admin-page').classList.add('active');
      document.querySelector('[data-page="admin"]').classList.add('active');

      loadAdmin();
    } else {
      error.textContent = 'Wrong password. Please try again.';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    isAdminAuth = false;
    sessionStorage.removeItem('admin_auth');
    window.location.hash = '';
    window.location.reload();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

// Admin functions
let selectedDevice = null;
let selectedSession = null;

async function loadAdmin() {
  if (!isAdminAuth) return;

  try {
    // Load stats
    const { count: total } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true });

    const { data: devs } = await supabase
      .from('keystroke_logs')
      .select('device_id');

    const { count: sessions } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today);

    const uniqueDevs = new Set(devs?.map(d => d.device_id).filter(Boolean)).size;

    document.getElementById('total-keystrokes').textContent = total || 0;
    document.getElementById('total-devices').textContent = uniqueDevs || 0;
    document.getElementById('total-sessions').textContent = sessions || 0;
    document.getElementById('today-keystrokes').textContent = todayCount || 0;

    loadDevices();
  } catch (err) {
    console.error('Admin load failed:', err);
  }
}

async function loadDevices() {
  try {
    const { data } = await supabase
      .from('typing_sessions')
      .select('device_id, session_start, key_count');

    if (!data) return;

    const map = {};
    data.forEach(s => {
      if (!s.device_id) return;
      if (!map[s.device_id]) {
        map[s.device_id] = { sessions: 0, keys: 0, last: s.session_start };
      }
      map[s.device_id].sessions++;
      map[s.device_id].keys += s.key_count || 0;
      if (new Date(s.session_start) > new Date(map[s.device_id].last)) {
        map[s.device_id].last = s.session_start;
      }
    });

    const container = document.getElementById('devices-list');
    container.innerHTML = '';

    if (Object.keys(map).length === 0) {
      container.innerHTML = '<div class="loading-state"><span>No devices registered yet</span></div>';
      return;
    }

    Object.entries(map).forEach(([id, stats]) => {
      const card = document.createElement('div');
      card.className = 'device-card';
      card.innerHTML = `
        <code>${id.substring(0, 20)}...</code>
        <div class="device-card-stats">
          <span>${stats.sessions} sessions</span>
          <span>${stats.keys} keys</span>
        </div>
      `;
      card.addEventListener('click', () => loadSessions(id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Devices load failed:', err);
  }
}

async function loadSessions(deviceIdParam) {
  selectedDevice = deviceIdParam;

  document.getElementById('devices-container').classList.add('hidden');
  document.getElementById('sessions-container').classList.remove('hidden');
  document.getElementById('keystrokes-container').classList.add('hidden');
  document.getElementById('sessions-title').textContent = `Device: ${deviceIdParam.substring(0, 15)}...`;

  try {
    const { data } = await supabase
      .from('typing_sessions')
      .select('*')
      .eq('device_id', deviceIdParam)
      .order('session_start', { ascending: false });

    const container = document.getElementById('sessions-list');
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-state"><span>No sessions found</span></div>';
      return;
    }

    data.forEach(s => {
      const card = document.createElement('div');
      card.className = 'session-card';
      const dur = s.session_end
        ? Math.round((new Date(s.session_end) - new Date(s.session_start)) / 1000) + 's'
        : 'Active';

      card.innerHTML = `
        <div>
          <div class="session-time">${new Date(s.session_start).toLocaleString()}</div>
          <div class="session-meta">Duration: ${dur}</div>
        </div>
        <div class="session-keys">
          <div class="session-key-count">${s.key_count || 0}</div>
          <div class="session-key-label">keys</div>
        </div>
      `;

      card.addEventListener('click', () => loadKeystrokes(s.id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Sessions load failed:', err);
  }
}

async function loadKeystrokes(sessionId) {
  selectedSession = sessionId;

  document.getElementById('sessions-container').classList.add('hidden');
  document.getElementById('keystrokes-container').classList.remove('hidden');

  try {
    const { data } = await supabase
      .from('keystroke_logs')
      .select('*')
      .eq('typing_session_id', sessionId)
      .order('timestamp', { ascending: true });

    const container = document.getElementById('keystrokes-list');
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-state"><span>No keystrokes found</span></div>';
      return;
    }

    let lastTime = '';
    data.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      if (time !== lastTime) {
        container.innerHTML += `<span class="key-timestamp">${time}</span>`;
        lastTime = time;
      }
      const k = log.key_text;
      if (k.length === 1) {
        container.innerHTML += `<span class="key-item">${escapeHtml(k)}</span>`;
      } else {
        container.innerHTML += `<span class="key-item special">[${formatKey(k)}]</span>`;
      }
    });
  } catch (err) {
    console.error('Keystrokes load failed:', err);
  }
}

function formatKey(k) {
  const map = {
    'Backspace': '⌫',
    'Enter': '↵',
    'Tab': '⇥',
    'Shift': '⇧',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Meta': '⌘',
    'Escape': 'Esc',
    'Delete': 'Del',
    'CapsLock': 'Caps',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'Space'
  };
  return map[k] || k;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event handlers

// Start button
document.getElementById('start-btn').addEventListener('click', () => {
  localStorage.setItem('keylogger_consent', 'true');
  document.getElementById('start-modal').classList.remove('active');
  startMonitoring();
});

// Reset button
document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset device? This will show the consent popup again and clear local data.')) {
    localStorage.removeItem('keylogger_device_id');
    localStorage.removeItem('keylogger_consent');
    localStorage.removeItem('keystroke_count');
    window.location.reload();
  }
});

// Back to devices
document.getElementById('back-to-devices').addEventListener('click', () => {
  document.getElementById('keystrokes-container').classList.add('hidden');
  document.getElementById('sessions-container').classList.add('hidden');
  document.getElementById('devices-container').classList.remove('hidden');
  selectedDevice = null;
  selectedSession = null;
});

// Back to sessions
document.getElementById('back-to-sessions').addEventListener('click', () => {
  if (selectedDevice) {
    document.getElementById('keystrokes-container').classList.add('hidden');
    document.getElementById('sessions-container').classList.remove('hidden');
    selectedSession = null;
  }
});

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', () => {
  loadAdmin();
});

// Clear all data
document.getElementById('clear-all-btn').addEventListener('click', async () => {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  if (!confirm('Are you absolutely sure? All keystrokes and sessions will be permanently deleted.')) return;

  try {
    await supabase.from('keystroke_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('typing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    loadAdmin();
  } catch (err) {
    console.error('Clear failed:', err);
  }
});

// Initialize app
document.addEventListener('DOMContentLoaded', init);

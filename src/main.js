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
let sessionKeys = 0;
let isMonitoring = false;

function generateDeviceId() {
  return 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

async function init() {
  deviceId = localStorage.getItem('keylogger_device_id');
  const hasConsent = localStorage.getItem('keylogger_consent');
  keystrokeCount = parseInt(localStorage.getItem('keystroke_count') || '0');

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('keylogger_device_id', deviceId);
  }

  if (!hasConsent) {
    document.getElementById('start-modal').classList.add('active');
  } else {
    startMonitoring();
  }

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
  document.getElementById('status-badge').textContent = 'Active';
  document.getElementById('status-badge').classList.add('active');
  document.addEventListener('keydown', handleKey);
  console.log('Monitoring started:', deviceId);
}

async function handleKey(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!isMonitoring) return;

  showFlash(e.key);

  if (typingTimer) clearTimeout(typingTimer);

  if (!currentSessionId) {
    try {
      const { data } = await supabase
        .from('typing_sessions')
        .insert([{ device_id: deviceId, session_start: new Date().toISOString() }])
        .select('id')
        .single();

      if (data) {
        currentSessionId = data.id;
        sessionKeys = 0;
      }
    } catch (err) {
      console.error('Session error:', err);
      return;
    }
  }

  sessionKeys++;

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
    console.error('Save error:', err);
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
    console.error('End session error:', err);
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
    console.error('Session count error:', err);
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
    console.error('Today count error:', err);
  }
}

function showFlash(key) {
  const flash = document.getElementById('flash');
  const keyEl = document.getElementById('flash-key');
  keyEl.textContent = key.length === 1 ? key : `[${key}]`;
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 400);
}

function initRouter() {
  const tabs = document.querySelectorAll('.tab');
  const pages = document.querySelectorAll('.page');

  function showPage(name) {
    if (name === 'admin' && !isAdminAuth) {
      document.getElementById('login-modal').classList.add('active');
      return;
    }

    pages.forEach(p => p.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));

    const page = document.getElementById(`${name}-page`);
    const tab = document.querySelector(`[data-page="${name}"]`);

    if (page) page.classList.add('active');
    if (tab) tab.classList.add('active');

    if (name === 'admin') loadAdmin();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showPage(tab.dataset.page);
    });
  });

  if (window.location.hash === '#admin') showPage('admin');
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

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('admin-page').classList.add('active');
      document.querySelector('[data-page="admin"]').classList.add('active');

      loadAdmin();
    } else {
      error.textContent = 'Wrong password';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    isAdminAuth = false;
    sessionStorage.removeItem('admin_auth');
    window.location.hash = '';
    window.location.reload();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

// Admin functions
let selectedDevice = null;
let selectedSession = null;

async function loadAdmin() {
  if (!isAdminAuth) return;

  try {
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
    console.error('Admin load error:', err);
  }
}

async function loadDevices() {
  try {
    const { data } = await supabase
      .from('typing_sessions')
      .select('device_id, session_start, key_count');

    const container = document.getElementById('devices-list');
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading">No devices yet</div>';
      return;
    }

    const map = {};
    data.forEach(s => {
      if (!s.device_id) return;
      if (!map[s.device_id]) map[s.device_id] = { sessions: 0, keys: 0 };
      map[s.device_id].sessions++;
      map[s.device_id].keys += s.key_count || 0;
    });

    Object.entries(map).forEach(([id, stats]) => {
      const card = document.createElement('div');
      card.className = 'dcard';
      card.innerHTML = `
        <code>${id.substring(0, 18)}...</code>
        <div class="dcard-meta">${stats.sessions} sessions · ${stats.keys} keys</div>
      `;
      card.addEventListener('click', () => loadSessions(id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Devices load error:', err);
  }
}

async function loadSessions(deviceIdParam) {
  selectedDevice = deviceIdParam;

  document.getElementById('devices-box').classList.add('hidden');
  document.getElementById('sessions-box').classList.remove('hidden');
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
      container.innerHTML = '<div class="loading">No sessions</div>';
      return;
    }

    data.forEach(s => {
      const card = document.createElement('div');
      card.className = 'scard';
      const dur = s.session_end
        ? Math.round((new Date(s.session_end) - new Date(s.session_start)) / 1000) + 's'
        : 'Active';

      card.innerHTML = `
        <div>
          <div class="scard-time">${new Date(s.session_start).toLocaleString()}</div>
          <div class="scard-meta">Duration: ${dur}</div>
        </div>
        <div class="scount">
          <div class="scount-num">${s.key_count || 0}</div>
          <div class="scount-lbl">keys</div>
        </div>
      `;

      card.addEventListener('click', () => loadKeystrokes(s.id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Sessions load error:', err);
  }
}

async function loadKeystrokes(sessionId) {
  selectedSession = sessionId;

  document.getElementById('sessions-box').classList.add('hidden');
  document.getElementById('keystrokes-box').classList.remove('hidden');

  try {
    const { data } = await supabase
      .from('keystroke_logs')
      .select('*')
      .eq('typing_session_id', sessionId)
      .order('timestamp', { ascending: true });

    const container = document.getElementById('keystrokes-list');
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading">No keystrokes</div>';
      return;
    }

    let lastTime = '';
    data.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      if (time !== lastTime) {
        container.innerHTML += `<span class="ktime">${time}</span>`;
        lastTime = time;
      }
      const k = log.key_text;
      if (k.length === 1) {
        container.innerHTML += `<span class="key">${escapeHtml(k)}</span>`;
      } else {
        container.innerHTML += `<span class="key sp">[${formatKey(k)}]</span>`;
      }
    });
  } catch (err) {
    console.error('Keystrokes load error:', err);
  }
}

function formatKey(k) {
  const map = {
    'Backspace': '⌫', 'Enter': '↵', 'Tab': '⇥', 'Shift': '⇧',
    'Control': 'Ctrl', 'Alt': 'Alt', 'Meta': '⌘', 'Escape': 'Esc',
    'Delete': 'Del', 'CapsLock': 'Caps', ' ': 'Space',
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→'
  };
  return map[k] || k;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', () => {
  localStorage.setItem('keylogger_consent', 'true');
  document.getElementById('start-modal').classList.remove('active');
  startMonitoring();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset device?')) {
    localStorage.removeItem('keylogger_device_id');
    localStorage.removeItem('keylogger_consent');
    localStorage.removeItem('keystroke_count');
    window.location.reload();
  }
});

document.getElementById('back-devices').addEventListener('click', () => {
  document.getElementById('keystrokes-box').classList.add('hidden');
  document.getElementById('sessions-box').classList.add('hidden');
  document.getElementById('devices-box').classList.remove('hidden');
  selectedDevice = null;
  selectedSession = null;
});

document.getElementById('back-sessions').addEventListener('click', () => {
  if (selectedDevice) {
    document.getElementById('keystrokes-box').classList.add('hidden');
    document.getElementById('sessions-box').classList.remove('hidden');
    selectedSession = null;
  }
});

document.getElementById('refresh-btn').addEventListener('click', loadAdmin);

document.getElementById('clear-btn').addEventListener('click', async () => {
  if (!confirm('Delete ALL data?')) return;
  if (!confirm('Are you sure? This cannot be undone.')) return;

  try {
    await supabase.from('keystroke_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('typing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    loadAdmin();
  } catch (err) {
    console.error('Clear error:', err);
  }
});

document.addEventListener('DOMContentLoaded', init);

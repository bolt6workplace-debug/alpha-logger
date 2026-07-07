import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = '862412';
const TYPING_TIMEOUT = 40000;

let deviceId = localStorage.getItem('keylogger_device_id');
let currentSessionId = null;
let isAdminAuth = sessionStorage.getItem('admin_auth') === 'true';
let keystrokeCount = parseInt(localStorage.getItem('keystroke_count') || '0');
let typingTimer = null;
let sessionStart = null;
let sessionKeys = 0;
let isMonitoring = false;

function generateDeviceId() {
  return 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

async function init() {
  deviceId = localStorage.getItem('keylogger_device_id');
  const hasConsent = localStorage.getItem('keylogger_consent');

  if (!deviceId || !hasConsent) {
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem('keylogger_device_id', deviceId);
    }
    document.getElementById('start-modal').classList.add('active');
  } else {
    startMonitoring();
  }

  document.getElementById('device-id').textContent = deviceId;
  document.getElementById('keystroke-count').textContent = keystrokeCount;

  initRouter();
  initAuth();
  loadSessionCount();
}

function startMonitoring() {
  isMonitoring = true;
  document.getElementById('status-dot').classList.add('active');
  document.getElementById('status-text').textContent = 'Recording';
  document.addEventListener('keydown', handleKey);
  console.log('Monitoring started:', deviceId);
}

async function handleKey(e) {
  if (e.target.id === 'admin-password') return;

  showFlash(e.key);

  if (typingTimer) clearTimeout(typingTimer);

  if (!currentSessionId) {
    const { data } = await supabase
      .from('typing_sessions')
      .insert([{ device_id: deviceId, session_start: new Date().toISOString() }])
      .select('id')
      .single();

    if (data) {
      currentSessionId = data.id;
      sessionStart = Date.now();
      sessionKeys = 0;
    }
  }

  sessionKeys++;

  await supabase.from('keystroke_logs').insert([{
    session_id: deviceId,
    key_text: e.key,
    key_code: e.keyCode,
    timestamp: new Date().toISOString(),
    page_url: window.location.href,
    device_id: deviceId,
    typing_session_id: currentSessionId
  }]);

  keystrokeCount++;
  localStorage.setItem('keystroke_count', keystrokeCount);
  document.getElementById('keystroke-count').textContent = keystrokeCount;

  typingTimer = setTimeout(endSession, TYPING_TIMEOUT);
}

async function endSession() {
  if (!currentSessionId) return;

  await supabase
    .from('typing_sessions')
    .update({ session_end: new Date().toISOString(), key_count: sessionKeys })
    .eq('id', currentSessionId);

  currentSessionId = null;
  sessionKeys = 0;
  loadSessionCount();
}

async function loadSessionCount() {
  const { count } = await supabase
    .from('typing_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', deviceId);

  document.getElementById('session-count').textContent = count || 0;
}

function showFlash(key) {
  const flash = document.getElementById('keystroke-flash');
  const keyEl = document.getElementById('flash-key');
  keyEl.textContent = key.length === 1 ? key : `[${key}]`;
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 500);
}

function initRouter() {
  const links = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page');

  function showPage(name) {
    if (name === 'admin' && !isAdminAuth) {
      document.getElementById('login-modal').classList.add('active');
      return;
    }

    pages.forEach(p => p.classList.remove('active'));
    links.forEach(l => l.classList.remove('active'));
    document.getElementById(`${name}-page`).classList.add('active');
    document.querySelector(`[data-page="${name}"]`).classList.add('active');

    if (name === 'admin') loadAdmin();
  }

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      history.pushState(null, '', page === 'monitor' ? '/' : '#admin');
      showPage(page);
    });
  });

  if (window.location.hash === '#admin') showPage('admin');

  window.addEventListener('popstate', () => {
    showPage(window.location.hash === '#admin' ? 'admin' : 'monitor');
  });
}

function initAuth() {
  const modal = document.getElementById('login-modal');
  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (document.getElementById('admin-password').value === ADMIN_PASSWORD) {
      isAdminAuth = true;
      sessionStorage.setItem('admin_auth', 'true');
      modal.classList.remove('active');
      document.getElementById('admin-password').value = '';
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
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
    location.hash = '';
    location.reload();
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

let selectedDevice = null;
let selectedSession = null;

async function loadAdmin() {
  if (!isAdminAuth) return;

  const { count: total } = await supabase.from('keystroke_logs').select('*', { count: 'exact', head: true });
  const { data: devs } = await supabase.from('keystroke_logs').select('device_id');
  const { count: sessions } = await supabase.from('typing_sessions').select('*', { count: 'exact', head: true });
  const today = new Date().toISOString().split('T')[0];
  const { count: todayCount } = await supabase.from('keystroke_logs').select('*', { count: 'exact', head: true }).gte('timestamp', today);

  const uniqueDevs = new Set(devs?.map(d => d.device_id).filter(Boolean)).size;

  document.getElementById('total-keystrokes').textContent = total || 0;
  document.getElementById('total-devices').textContent = uniqueDevs;
  document.getElementById('total-sessions').textContent = sessions || 0;
  document.getElementById('today-keystrokes').textContent = todayCount || 0;

  loadDevices();
}

async function loadDevices() {
  const { data } = await supabase.from('typing_sessions').select('device_id, session_start, key_count');
  if (!data) return;

  const map = {};
  data.forEach(s => {
    if (!s.device_id) return;
    if (!map[s.device_id]) map[s.device_id] = { sessions: 0, keys: 0, last: s.session_start };
    map[s.device_id].sessions++;
    map[s.device_id].keys += s.key_count || 0;
    if (new Date(s.session_start) > new Date(map[s.device_id].last)) map[s.device_id].last = s.session_start;
  });

  const container = document.getElementById('devices-list');
  container.innerHTML = '';

  Object.entries(map).forEach(([id, stats]) => {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.innerHTML = `
      <code>${id.substring(0, 18)}...</code>
      <div class="device-card-stats">
        ${stats.sessions} sessions • ${stats.keys} keys
      </div>
    `;
    card.addEventListener('click', () => loadSessions(id));
    container.appendChild(card);
  });

  if (Object.keys(map).length === 0) container.innerHTML = '<div class="loading">No devices yet</div>';
}

async function loadSessions(deviceId) {
  selectedDevice = deviceId;
  document.getElementById('devices-container').style.display = 'none';
  document.getElementById('sessions-container').style.display = 'block';
  document.getElementById('sessions-title').textContent = `Device: ${deviceId.substring(0, 15)}...`;

  const { data } = await supabase
    .from('typing_sessions')
    .select('*')
    .eq('device_id', deviceId)
    .order('session_start', { ascending: false });

  const container = document.getElementById('sessions-list');
  container.innerHTML = '';

  if (!data?.length) {
    container.innerHTML = '<div class="loading">No sessions</div>';
    return;
  }

  data.forEach(s => {
    const card = document.createElement('div');
    card.className = 'session-card';
    const dur = s.session_end ? Math.round((new Date(s.session_end) - new Date(s.session_start)) / 1000) + 's' : 'Active';
    card.innerHTML = `
      <div>
        <div class="session-time">${new Date(s.session_start).toLocaleString()}</div>
        <div class="session-meta">${dur}</div>
      </div>
      <div class="session-keys">
        <div class="session-key-count">${s.key_count || 0}</div>
        <div class="session-key-label">keys</div>
      </div>
    `;
    card.addEventListener('click', () => loadKeystrokes(s.id));
    container.appendChild(card);
  });
}

async function loadKeystrokes(sessionId) {
  selectedSession = sessionId;
  document.getElementById('sessions-container').style.display = 'none';
  document.getElementById('keystrokes-container').style.display = 'block';

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
      container.innerHTML += `<span class="key-timestamp">${time}</span>`;
      lastTime = time;
    }
    const k = log.key_text;
    container.innerHTML += k.length === 1
      ? `<span class="key-item">${escapeHtml(k)}</span>`
      : `<span class="key-item special">[${fmtKey(k)}]</span>`;
  });
}

function fmtKey(k) {
  const m = {
    Backspace:'⌫', Enter:'↵', Tab:'⇥', Shift:'⇧', Control:'Ctrl',
    Alt:'Alt', Meta:'⌘', Escape:'Esc', Delete:'Del', CapsLock:'Caps',
    ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→'
  };
  return m[k] || k;
}

function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

// Event handlers
document.getElementById('start-btn').addEventListener('click', () => {
  localStorage.setItem('keylogger_consent', 'true');
  document.getElementById('start-modal').classList.remove('active');
  startMonitoring();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset device? This will show the consent popup again.')) {
    localStorage.removeItem('keylogger_device_id');
    localStorage.removeItem('keylogger_consent');
    localStorage.removeItem('keystroke_count');
    location.reload();
  }
});

document.getElementById('back-to-devices').addEventListener('click', () => {
  document.getElementById('keystrokes-container').style.display = 'none';
  document.getElementById('sessions-container').style.display = 'none';
  document.getElementById('devices-container').style.display = 'block';
  selectedDevice = null;
  selectedSession = null;
});

document.getElementById('back-to-sessions').addEventListener('click', () => {
  if (selectedDevice) {
    document.getElementById('keystrokes-container').style.display = 'none';
    document.getElementById('sessions-container').style.display = 'block';
    selectedSession = null;
  }
});

document.getElementById('clear-all-btn').addEventListener('click', async () => {
  if (!confirm('Delete ALL data?')) return;
  await supabase.from('keystroke_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('typing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  loadAdmin();
});

document.addEventListener('DOMContentLoaded', init);

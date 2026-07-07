import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURATION
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PASSWORD = '862412';
const TYPING_TIMEOUT = 40000;

// ============================================================
// SUPABASE CLIENT - wrapped safely so UI still works if DB fails
// ============================================================
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('Supabase init error:', e);
}

// ============================================================
// STATE
// ============================================================
let deviceId = null;
let currentSessionId = null;
let isAdminAuth = false;
let keystrokeCount = 0;
let typingTimer = null;
let sessionKeys = 0;
let isMonitoring = false;
let selectedDevice = null;
let selectedSession = null;

// ============================================================
// HELPERS
// ============================================================
function generateDeviceId() {
  return 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

function el(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const element = el(id);
  if (element) element.textContent = text;
}

function addClass(id, cls) {
  const element = el(id);
  if (element) element.classList.add(cls);
}

function removeClass(id, cls) {
  const element = el(id);
  if (element) element.classList.remove(cls);
}

// ============================================================
// INITIALIZATION - runs when DOM is fully loaded
// ============================================================
function init() {
  console.log('[KeyMonitor] DOM ready, initializing...');

  // --- Step 1: Device ID (no Supabase needed) ---
  deviceId = localStorage.getItem('keylogger_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('keylogger_device_id', deviceId);
    console.log('[KeyMonitor] New device ID:', deviceId);
  } else {
    console.log('[KeyMonitor] Existing device ID:', deviceId);
  }

  // --- Step 2: Display device ID immediately ---
  setText('device-id', deviceId);

  // --- Step 3: Load keystroke count ---
  keystrokeCount = parseInt(localStorage.getItem('keystroke_count') || '0');
  setText('keystroke-count', keystrokeCount);

  // --- Step 4: Check admin auth from session ---
  isAdminAuth = sessionStorage.getItem('admin_auth') === 'true';

  // --- Step 5: Show consent popup if not consented, else start ---
  const hasConsent = localStorage.getItem('keylogger_consent') === 'true';
  console.log('[KeyMonitor] Has consent:', hasConsent);

  if (!hasConsent) {
    console.log('[KeyMonitor] Showing consent modal...');
    addClass('consent-modal', 'active');
  } else {
    console.log('[KeyMonitor] Already consented, starting monitoring...');
    startMonitoring();
  }

  // --- Step 6: Wire up navigation and auth ---
  setupNavigation();
  setupAuth();
  setupButtons();

  // --- Step 7: Load remote stats ---
  if (supabase) {
    loadSessionCount();
    loadTodayCount();
  }

  console.log('[KeyMonitor] Init complete');
}

// ============================================================
// MONITORING
// ============================================================
function startMonitoring() {
  isMonitoring = true;

  const dot = el('status-dot');
  const label = el('status-label');
  const badge = el('status-badge');

  if (dot) dot.classList.add('active');
  if (label) label.textContent = 'Recording Active';
  if (badge) {
    badge.textContent = 'Live';
    badge.classList.add('active');
  }

  document.addEventListener('keydown', handleKeystroke);
  console.log('[KeyMonitor] Monitoring started');
}

async function handleKeystroke(e) {
  if (!isMonitoring) return;
  if (e.target && e.target.type === 'password') return;

  showFlash(e.key);

  if (typingTimer) clearTimeout(typingTimer);

  // Create Supabase session if connected
  if (supabase && !currentSessionId) {
    try {
      const { data, error } = await supabase
        .from('typing_sessions')
        .insert([{ device_id: deviceId, session_start: new Date().toISOString() }])
        .select('id')
        .single();

      if (data) {
        currentSessionId = data.id;
        sessionKeys = 0;
      }
      if (error) console.error('[KeyMonitor] Session error:', error);
    } catch (err) {
      console.error('[KeyMonitor] Session error:', err);
    }
  }

  sessionKeys++;

  // Save keystroke
  if (supabase) {
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
      console.error('[KeyMonitor] Save error:', err);
    }
  }

  keystrokeCount++;
  localStorage.setItem('keystroke_count', keystrokeCount.toString());
  setText('keystroke-count', keystrokeCount);

  typingTimer = setTimeout(endSession, TYPING_TIMEOUT);
}

async function endSession() {
  if (!currentSessionId || !supabase) return;

  try {
    await supabase
      .from('typing_sessions')
      .update({ session_end: new Date().toISOString(), key_count: sessionKeys })
      .eq('id', currentSessionId);
  } catch (err) {
    console.error('[KeyMonitor] End session error:', err);
  }

  currentSessionId = null;
  sessionKeys = 0;
  loadSessionCount();
}

// ============================================================
// STATS
// ============================================================
async function loadSessionCount() {
  if (!supabase || !deviceId) return;
  try {
    const { count } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId);
    setText('session-count', count || 0);
  } catch (err) {
    console.error('[KeyMonitor] Session count error:', err);
  }
}

async function loadTodayCount() {
  if (!supabase || !deviceId) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('timestamp', today);
    setText('today-count', count || 0);
  } catch (err) {
    console.error('[KeyMonitor] Today count error:', err);
  }
}

// ============================================================
// FLASH NOTIFICATION
// ============================================================
function showFlash(key) {
  const flash = el('flash');
  const keyEl = el('flash-key');
  if (!flash || !keyEl) return;
  keyEl.textContent = key.length === 1 ? key : `[${key}]`;
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 500);
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  function showPage(name) {
    if (name === 'admin' && !isAdminAuth) {
      addClass('admin-modal', 'active');
      setTimeout(() => {
        const inp = el('admin-input');
        if (inp) inp.focus();
      }, 100);
      return;
    }

    pages.forEach(p => p.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));

    const page = el(`${name}-page`);
    const btn = document.querySelector(`[data-page="${name}"]`);
    if (page) page.classList.add('active');
    if (btn) btn.classList.add('active');

    if (name === 'admin') loadAdminData();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
}

// ============================================================
// AUTH
// ============================================================
function setupAuth() {
  const adminModal = el('admin-modal');
  const adminForm = el('admin-form');
  const adminInput = el('admin-input');
  const loginError = el('login-error');
  const logoutBtn = el('logoutBtn');

  if (!adminForm) return;

  adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = adminInput ? adminInput.value : '';

    if (password === ADMIN_PASSWORD) {
      isAdminAuth = true;
      sessionStorage.setItem('admin_auth', 'true');

      if (adminModal) adminModal.classList.remove('active');
      if (adminInput) adminInput.value = '';
      if (loginError) loginError.textContent = '';

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

      const adminPage = el('admin-page');
      const adminBtn = document.querySelector('[data-page="admin"]');
      if (adminPage) adminPage.classList.add('active');
      if (adminBtn) adminBtn.classList.add('active');

      loadAdminData();
    } else {
      if (loginError) loginError.textContent = 'Incorrect password. Try again.';
      if (adminInput) {
        adminInput.value = '';
        adminInput.focus();
      }
    }
  });

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) adminModal.classList.remove('active');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      isAdminAuth = false;
      sessionStorage.removeItem('admin_auth');
      window.location.reload();
    });
  }
}

// ============================================================
// BUTTONS
// ============================================================
function setupButtons() {
  // Consent button
  const consentBtn = el('consent-btn');
  if (consentBtn) {
    consentBtn.addEventListener('click', () => {
      localStorage.setItem('keylogger_consent', 'true');
      removeClass('consent-modal', 'active');
      startMonitoring();
    });
  }

  // Reset device
  const resetBtn = el('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset device? All local data will be cleared.')) {
        localStorage.removeItem('keylogger_device_id');
        localStorage.removeItem('keylogger_consent');
        localStorage.removeItem('keystroke_count');
        window.location.reload();
      }
    });
  }

  // Back to devices
  const backDevicesBtn = el('backDevices');
  if (backDevicesBtn) {
    backDevicesBtn.addEventListener('click', () => {
      addClass('keystrokes-section', 'hidden');
      addClass('sessions-section', 'hidden');
      removeClass('devices-section', 'hidden');
      selectedDevice = null;
      selectedSession = null;
    });
  }

  // Back to sessions
  const backSessionsBtn = el('backSessions');
  if (backSessionsBtn) {
    backSessionsBtn.addEventListener('click', () => {
      addClass('keystrokes-section', 'hidden');
      removeClass('sessions-section', 'hidden');
      selectedSession = null;
    });
  }

  // Refresh
  const refreshBtn = el('refreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadAdminData);

  // Clear all data
  const clearBtn = el('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Delete ALL data? This cannot be undone.')) return;
      if (!confirm('Confirm: permanently delete all keystroke records?')) return;
      if (!supabase) return;

      try {
        await supabase.from('keystroke_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('typing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        alert('All data deleted.');
        loadAdminData();
      } catch (err) {
        console.error('[KeyMonitor] Clear error:', err);
        alert('Error clearing data.');
      }
    });
  }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function loadAdminData() {
  if (!isAdminAuth || !supabase) return;

  try {
    const [ksResult, devResult, sessResult] = await Promise.all([
      supabase.from('keystroke_logs').select('*', { count: 'exact', head: true }),
      supabase.from('keystroke_logs').select('device_id'),
      supabase.from('typing_sessions').select('*', { count: 'exact', head: true })
    ]);

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today);

    const uniqueDevices = new Set(
      devResult.data?.map(d => d.device_id).filter(Boolean)
    ).size;

    setText('total-keystrokes', ksResult.count || 0);
    setText('total-devices', uniqueDevices);
    setText('total-sessions', sessResult.count || 0);
    setText('today-keystrokes', todayCount || 0);

    await loadDevicesList();
  } catch (err) {
    console.error('[KeyMonitor] Admin load error:', err);
  }
}

async function loadDevicesList() {
  if (!supabase) return;

  try {
    const { data } = await supabase
      .from('typing_sessions')
      .select('device_id, session_start, key_count');

    const container = el('devices-list');
    if (!container) return;
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-text">No devices registered yet. Send your monitoring link to a device to begin.</div>';
      return;
    }

    const deviceMap = {};
    data.forEach(s => {
      if (!s.device_id) return;
      if (!deviceMap[s.device_id]) deviceMap[s.device_id] = { sessions: 0, keys: 0 };
      deviceMap[s.device_id].sessions++;
      deviceMap[s.device_id].keys += s.key_count || 0;
    });

    Object.entries(deviceMap).forEach(([id, stats]) => {
      const card = document.createElement('div');
      card.className = 'device-card-item';
      card.innerHTML = `
        <code>${id}</code>
        <div class="device-meta"><span>${stats.sessions}</span> sessions &middot; <span>${stats.keys}</span> keys</div>
      `;
      card.addEventListener('click', () => loadSessionsList(id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('[KeyMonitor] Devices error:', err);
  }
}

async function loadSessionsList(deviceIdParam) {
  selectedDevice = deviceIdParam;

  addClass('devices-section', 'hidden');
  removeClass('sessions-section', 'hidden');
  setText('sessions-title', `Device: ${deviceIdParam.substring(0, 16)}...`);

  if (!supabase) return;

  try {
    const { data } = await supabase
      .from('typing_sessions')
      .select('*')
      .eq('device_id', deviceIdParam)
      .order('session_start', { ascending: false });

    const container = el('sessions-list');
    if (!container) return;
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-text">No sessions found.</div>';
      return;
    }

    data.forEach(s => {
      const card = document.createElement('div');
      card.className = 'session-card-item';

      const dur = s.session_end
        ? Math.round((new Date(s.session_end) - new Date(s.session_start)) / 1000) + 's'
        : 'Active';

      card.innerHTML = `
        <div class="session-info">
          <div class="session-time">${new Date(s.session_start).toLocaleString()}</div>
          <div class="session-meta">Duration: ${dur}</div>
        </div>
        <div class="session-count">
          <div class="session-count-num">${s.key_count || 0}</div>
          <div class="session-count-label">keys</div>
        </div>
      `;

      card.addEventListener('click', () => loadKeystrokesList(s.id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('[KeyMonitor] Sessions error:', err);
  }
}

async function loadKeystrokesList(sessionId) {
  selectedSession = sessionId;

  addClass('sessions-section', 'hidden');
  removeClass('keystrokes-section', 'hidden');

  if (!supabase) return;

  try {
    const { data } = await supabase
      .from('keystroke_logs')
      .select('*')
      .eq('typing_session_id', sessionId)
      .order('timestamp', { ascending: true });

    const container = el('keystrokes-list');
    if (!container) return;
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-text">No keystrokes in this session.</div>';
      return;
    }

    let lastTime = '';
    data.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      if (time !== lastTime) {
        container.innerHTML += `<span class="key-time-label">${time}</span>`;
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
    console.error('[KeyMonitor] Keystrokes error:', err);
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

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', init);

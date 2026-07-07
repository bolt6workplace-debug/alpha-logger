import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = '862412';
const TYPING_TIMEOUT = 40000;

let deviceId = null;
let currentSessionId = null;
let isAdminAuth = false;
let keystrokeCount = 0;
let typingTimer = null;
let sessionKeys = 0;
let isMonitoring = false;

// Generate unique device ID
function generateDeviceId() {
  return 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// Initialize application
function init() {
  console.log('Initializing KeyMonitor...');

  // Check admin auth from session
  isAdminAuth = sessionStorage.getItem('admin_auth') === 'true';

  // Get or create device ID from localStorage
  deviceId = localStorage.getItem('keylogger_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('keylogger_device_id', deviceId);
    console.log('Created new device ID:', deviceId);
  } else {
    console.log('Using existing device ID:', deviceId);
  }

  // Get keystroke count
  keystrokeCount = parseInt(localStorage.getItem('keystroke_count') || '0');

  // Get consent status
  const hasConsent = localStorage.getItem('keylogger_consent');
  console.log('Has consent:', hasConsent);

  // Update device ID display immediately
  const deviceIdElement = document.getElementById('device-id');
  if (deviceIdElement) {
    deviceIdElement.textContent = deviceId;
    console.log('Device ID set to:', deviceId);
  } else {
    console.error('device-id element not found');
  }

  // Update keystroke count display
  const keystrokeCountElement = document.getElementById('keystroke-count');
  if (keystrokeCountElement) {
    keystrokeCountElement.textContent = keystrokeCount;
  }

  // Show consent modal if no consent, otherwise start monitoring
  const consentModal = document.getElementById('consent-modal');
  if (!hasConsent) {
    console.log('No consent found, showing modal');
    if (consentModal) {
      consentModal.classList.add('active');
      console.log('Consent modal shown');
    }
  } else {
    console.log('Consent found, starting monitoring');
    startMonitoring();
  }

  // Initialize navigation and auth
  initNavigation();
  initAuth();

  // Load counts
  loadSessionCount();
  loadTodayCount();

  // Setup all event listeners
  setupEventListeners();

  console.log('Initialization complete');
}

// Start monitoring keystrokes
function startMonitoring() {
  isMonitoring = true;
  console.log('startMonitoring called, deviceId:', deviceId);

  // Update UI to show active status
  const statusDot = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');
  const statusBadge = document.getElementById('status-badge');

  if (statusDot) {
    statusDot.classList.add('active');
    console.log('Status dot activated');
  }
  if (statusLabel) {
    statusLabel.textContent = 'Recording Active';
  }
  if (statusBadge) {
    statusBadge.textContent = 'Live';
    statusBadge.classList.add('active');
  }

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeystroke);
  console.log('Keyboard listener added');
}

// Handle each keystroke
async function handleKeystroke(e) {
  if (!isMonitoring) return;

  // Skip password fields for security
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    if (e.target.type === 'password') return;
  }

  // Show flash notification
  showFlashNotification(e.key);

  // Reset typing timer
  if (typingTimer) clearTimeout(typingTimer);

  // Create new session if needed
  if (!currentSessionId) {
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
      if (error) console.error('Session error:', error);
    } catch (err) {
      console.error('Session creation error:', err);
      return;
    }
  }

  sessionKeys++;

  // Save keystroke to database
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
    console.error('Keystroke save error:', err);
  }

  // Update local count
  keystrokeCount++;
  localStorage.setItem('keystroke_count', keystrokeCount.toString());

  const countElement = document.getElementById('keystroke-count');
  if (countElement) {
    countElement.textContent = keystrokeCount;
  }

  typingTimer = setTimeout(endSession, TYPING_TIMEOUT);
}

// End current typing session
async function endSession() {
  if (!currentSessionId) return;

  try {
    await supabase
      .from('typing_sessions')
      .update({
        session_end: new Date().toISOString(),
        key_count: sessionKeys
      })
      .eq('id', currentSessionId);
  } catch (err) {
    console.error('Session end error:', err);
  }

  currentSessionId = null;
  sessionKeys = 0;
  loadSessionCount();
}

// Load session count for this device
async function loadSessionCount() {
  try {
    const { count } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId);

    const element = document.getElementById('session-count');
    if (element) element.textContent = count || 0;
  } catch (err) {
    console.error('Session count error:', err);
  }
}

// Load today's keystroke count
async function loadTodayCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('timestamp', today);

    const element = document.getElementById('today-count');
    if (element) element.textContent = count || 0;
  } catch (err) {
    console.error('Today count error:', err);
  }
}

// Show flash notification
function showFlashNotification(key) {
  const flash = document.getElementById('flash');
  const keyEl = document.getElementById('flash-key');

  if (!flash || !keyEl) return;

  keyEl.textContent = key.length === 1 ? key : `[${key}]`;
  flash.classList.add('active');

  setTimeout(() => flash.classList.remove('active'), 500);
}

// Initialize navigation
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  function showPage(pageName) {
    if (pageName === 'admin' && !isAdminAuth) {
      document.getElementById('admin-modal').classList.add('active');
      return;
    }

    pages.forEach(p => p.classList.remove('active'));
    navBtns.forEach(btn => btn.classList.remove('active'));

    const page = document.getElementById(`${pageName}-page`);
    const navBtn = document.querySelector(`[data-page="${pageName}"]`);

    if (page) page.classList.add('active');
    if (navBtn) navBtn.classList.add('active');

    if (pageName === 'admin') {
      loadAdminData();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      showPage(btn.dataset.page);
    });
  });
}

// Initialize authentication
function initAuth() {
  const adminModal = document.getElementById('admin-modal');
  const adminForm = document.getElementById('admin-form');
  const adminInput = document.getElementById('admin-input');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!adminForm) {
    console.error('admin-form not found');
    return;
  }

  adminForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const password = adminInput.value;

    if (password === ADMIN_PASSWORD) {
      isAdminAuth = true;
      sessionStorage.setItem('admin_auth', 'true');

      adminModal.classList.remove('active');
      adminInput.value = '';
      loginError.textContent = '';

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

      document.getElementById('admin-page').classList.add('active');
      document.querySelector('[data-page="admin"]').classList.add('active');

      loadAdminData();
    } else {
      loginError.textContent = 'Incorrect password. Try again.';
      adminInput.value = '';
      adminInput.focus();
    }
  });

  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      adminModal.classList.remove('active');
    }
  });

  logoutBtn.addEventListener('click', () => {
    isAdminAuth = false;
    sessionStorage.removeItem('admin_auth');
    window.location.reload();
  });
}

// Setup all event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');

  // Consent button
  const consentBtn = document.getElementById('consent-btn');
  if (consentBtn) {
    consentBtn.addEventListener('click', () => {
      console.log('Consent button clicked');
      localStorage.setItem('keylogger_consent', 'true');
      document.getElementById('consent-modal').classList.remove('active');
      startMonitoring();
    });
    console.log('Consent button listener attached');
  } else {
    console.error('consent-btn not found');
  }

  // Reset button
  const resetBtn = document.getElementById('resetBtn');
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

  // Back to devices button
  const backDevicesBtn = document.getElementById('backDevices');
  if (backDevicesBtn) {
    backDevicesBtn.addEventListener('click', () => {
      document.getElementById('keystrokes-section').classList.add('hidden');
      document.getElementById('sessions-section').classList.add('hidden');
      document.getElementById('devices-section').classList.remove('hidden');
      selectedDevice = null;
      selectedSession = null;
    });
  }

  // Back to sessions button
  const backSessionsBtn = document.getElementById('backSessions');
  if (backSessionsBtn) {
    backSessionsBtn.addEventListener('click', () => {
      if (selectedDevice) {
        document.getElementById('keystrokes-section').classList.add('hidden');
        document.getElementById('sessions-section').classList.remove('hidden');
        selectedSession = null;
      }
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAdminData);
  }

  // Clear button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Delete ALL data? This cannot be undone.')) return;
      if (!confirm('Are you sure?')) return;

      try {
        await supabase.from('keystroke_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('typing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        loadAdminData();
        alert('All data deleted.');
      } catch (err) {
        console.error('Clear error:', err);
      }
    });
  }

  console.log('Event listeners setup complete');
}

// Admin state
let selectedDevice = null;
let selectedSession = null;

// Load admin dashboard data
async function loadAdminData() {
  if (!isAdminAuth) return;

  try {
    const { count: totalKeystrokes } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true });

    const { data: deviceData } = await supabase
      .from('keystroke_logs')
      .select('device_id');

    const { count: totalSessions } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today);

    const uniqueDevices = new Set(deviceData?.map(d => d.device_id).filter(Boolean)).size;

    document.getElementById('total-keystrokes').textContent = totalKeystrokes || 0;
    document.getElementById('total-devices').textContent = uniqueDevices || 0;
    document.getElementById('total-sessions').textContent = totalSessions || 0;
    document.getElementById('today-keystrokes').textContent = todayCount || 0;

    loadDevicesList();
  } catch (err) {
    console.error('Admin load error:', err);
  }
}

// Load devices list
async function loadDevicesList() {
  try {
    const { data } = await supabase
      .from('typing_sessions')
      .select('device_id, session_start, key_count');

    const container = document.getElementById('devices-list');
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-text">No devices registered yet</div>';
      return;
    }

    const deviceMap = {};
    data.forEach(session => {
      if (!session.device_id) return;
      if (!deviceMap[session.device_id]) {
        deviceMap[session.device_id] = { sessions: 0, keys: 0 };
      }
      deviceMap[session.device_id].sessions++;
      deviceMap[session.device_id].keys += session.key_count || 0;
    });

    Object.entries(deviceMap).forEach(([id, stats]) => {
      const card = document.createElement('div');
      card.className = 'device-card-item';
      card.innerHTML = `
        <code>${id.substring(0, 20)}...</code>
        <div class="device-meta">
          <span>${stats.sessions}</span> sessions · <span>${stats.keys}</span> keys
        </div>
      `;
      card.addEventListener('click', () => loadSessionsList(id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Devices load error:', err);
  }
}

// Load sessions for a device
async function loadSessionsList(deviceIdParam) {
  selectedDevice = deviceIdParam;

  document.getElementById('devices-section').classList.add('hidden');
  document.getElementById('sessions-section').classList.remove('hidden');
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
      container.innerHTML = '<div class="loading-text">No sessions found</div>';
      return;
    }

    data.forEach(session => {
      const card = document.createElement('div');
      card.className = 'session-card-item';

      const duration = session.session_end
        ? Math.round((new Date(session.session_end) - new Date(session.session_start)) / 1000) + 's'
        : 'Active';

      card.innerHTML = `
        <div class="session-info">
          <div class="session-time">${new Date(session.session_start).toLocaleString()}</div>
          <div class="session-meta">Duration: ${duration}</div>
        </div>
        <div class="session-count">
          <div class="session-count-num">${session.key_count || 0}</div>
          <div class="session-count-label">keys</div>
        </div>
      `;

      card.addEventListener('click', () => loadKeystrokesList(session.id));
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Sessions load error:', err);
  }
}

// Load keystrokes for a session
async function loadKeystrokesList(sessionId) {
  selectedSession = sessionId;

  document.getElementById('sessions-section').classList.add('hidden');
  document.getElementById('keystrokes-section').classList.remove('hidden');

  try {
    const { data } = await supabase
      .from('keystroke_logs')
      .select('*')
      .eq('typing_session_id', sessionId)
      .order('timestamp', { ascending: true });

    const container = document.getElementById('keystrokes-list');
    container.innerHTML = '';

    if (!data?.length) {
      container.innerHTML = '<div class="loading-text">No keystrokes recorded</div>';
      return;
    }

    let lastTime = '';
    data.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();

      if (time !== lastTime) {
        container.innerHTML += `<span class="key-time-label">${time}</span>`;
        lastTime = time;
      }

      const key = log.key_text;
      if (key.length === 1) {
        container.innerHTML += `<span class="key-item">${escapeHtml(key)}</span>`;
      } else {
        container.innerHTML += `<span class="key-item special">[${formatSpecialKey(key)}]</span>`;
      }
    });
  } catch (err) {
    console.error('Keystrokes load error:', err);
  }
}

// Format special keys
function formatSpecialKey(key) {
  const keyMap = {
    'Backspace': '⌫', 'Enter': '↵', 'Tab': '⇥', 'Shift': '⇧',
    'Control': 'Ctrl', 'Alt': 'Alt', 'Meta': '⌘', 'Escape': 'Esc',
    'Delete': 'Del', 'CapsLock': 'Caps', ' ': 'Space',
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→'
  };
  return keyMap[key] || key;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

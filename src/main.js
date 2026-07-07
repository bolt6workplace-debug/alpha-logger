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

// Generate unique device ID
function generateDeviceId() {
  return 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// Initialize application
async function init() {
  // Get or create device ID
  deviceId = localStorage.getItem('keylogger_device_id');
  const hasConsent = localStorage.getItem('keylogger_consent');
  keystrokeCount = parseInt(localStorage.getItem('keystroke_count') || '0');

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('keylogger_device_id', deviceId);
  }

  // Show consent modal if no consent, otherwise start monitoring
  if (!hasConsent) {
    document.getElementById('consent-modal').classList.add('active');
  } else {
    startMonitoring();
  }

  // Update device ID display
  document.getElementById('device-id').textContent = deviceId;
  document.getElementById('keystroke-count').textContent = keystrokeCount;

  // Initialize navigation and auth
  initNavigation();
  initAuth();

  // Load counts
  loadSessionCount();
  loadTodayCount();
}

// Start monitoring keystrokes
function startMonitoring() {
  isMonitoring = true;

  // Update UI to show active status
  const statusDot = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');
  const statusBadge = document.getElementById('status-badge');

  if (statusDot) statusDot.classList.add('active');
  if (statusLabel) statusLabel.textContent = 'Recording Active';
  if (statusBadge) {
    statusBadge.textContent = 'Live';
    statusBadge.classList.add('active');
  }

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeystroke);
  console.log('Monitoring started for device:', deviceId);
}

// Handle each keystroke
async function handleKeystroke(e) {
  // Skip if monitoring is off
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
        console.log('New session created:', currentSessionId);
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
    const { error } = await supabase.from('keystroke_logs').insert([{
      session_id: deviceId,
      key_text: e.key,
      key_code: e.keyCode,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      device_id: deviceId,
      typing_session_id: currentSessionId
    }]);

    if (error) console.error('Save error:', error);
  } catch (err) {
    console.error('Keystroke save error:', err);
  }

  // Update local count
  keystrokeCount++;
  localStorage.setItem('keystroke_count', keystrokeCount.toString());
  document.getElementById('keystroke-count').textContent = keystrokeCount;

  // Set timeout to end session after inactivity
  typingTimer = setTimeout(endSession, TYPING_TIMEOUT);
}

// End current typing session
async function endSession() {
  if (!currentSessionId) return;

  try {
    const { error } = await supabase
      .from('typing_sessions')
      .update({
        session_end: new Date().toISOString(),
        key_count: sessionKeys
      })
      .eq('id', currentSessionId);

    if (error) console.error('End session error:', error);
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
    const { count, error } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId);

    if (error) console.error('Session count error:', error);
    document.getElementById('session-count').textContent = count || 0;
  } catch (err) {
    console.error('Session count error:', err);
  }
}

// Load today's keystroke count
async function loadTodayCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('timestamp', today);

    if (error) console.error('Today count error:', error);
    document.getElementById('today-count').textContent = count || 0;
  } catch (err) {
    console.error('Today count error:', err);
  }
}

// Show flash notification when key pressed
function showFlashNotification(key) {
  const flash = document.getElementById('flash');
  const keyEl = document.getElementById('flash-key');

  if (!flash || !keyEl) return;

  keyEl.textContent = key.length === 1 ? key : `[${key}]`;
  flash.classList.add('active');

  setTimeout(() => flash.classList.remove('active'), 500);
}

// Initialize navigation between pages
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  function showPage(pageName) {
    // If trying to access admin and not auth'd, show login
    if (pageName === 'admin' && !isAdminAuth) {
      document.getElementById('admin-modal').classList.add('active');
      return;
    }

    // Hide all pages, deactivate all nav buttons
    pages.forEach(p => p.classList.remove('active'));
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show selected page and activate nav button
    const page = document.getElementById(`${pageName}-page`);
    const navBtn = document.querySelector(`[data-page="${pageName}"]`);

    if (page) page.classList.add('active');
    if (navBtn) navBtn.classList.add('active');

    // Load admin data if admin page
    if (pageName === 'admin') {
      loadAdminData();
    }
  }

  // Add click handlers to nav buttons
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

  // Handle login form submission
  adminForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const password = adminInput.value;

    if (password === ADMIN_PASSWORD) {
      // Successful login
      isAdminAuth = true;
      sessionStorage.setItem('admin_auth', 'true');

      // Hide modal and clear form
      adminModal.classList.remove('active');
      adminInput.value = '';
      loginError.textContent = '';

      // Switch to admin page
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

      document.getElementById('admin-page').classList.add('active');
      document.querySelector('[data-page="admin"]').classList.add('active');

      // Load admin data
      loadAdminData();
    } else {
      loginError.textContent = 'Incorrect password. Please try again.';
      adminInput.value = '';
      adminInput.focus();
    }
  });

  // Close modal on outside click
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      adminModal.classList.remove('active');
    }
  });

  // Handle logout
  logoutBtn.addEventListener('click', () => {
    isAdminAuth = false;
    sessionStorage.removeItem('admin_auth');
    window.location.reload();
  });
}

// Admin state
let selectedDevice = null;
let selectedSession = null;

// Load admin dashboard data
async function loadAdminData() {
  if (!isAdminAuth) return;

  try {
    // Get total keystrokes
    const { count: totalKeystrokes } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true });

    // Get all device IDs
    const { data: deviceData } = await supabase
      .from('keystroke_logs')
      .select('device_id');

    // Get total sessions
    const { count: totalSessions } = await supabase
      .from('typing_sessions')
      .select('*', { count: 'exact', head: true });

    // Get today's keystrokes
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('keystroke_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today);

    // Count unique devices
    const uniqueDevices = new Set(deviceData?.map(d => d.device_id).filter(Boolean)).size;

    // Update UI
    document.getElementById('total-keystrokes').textContent = totalKeystrokes || 0;
    document.getElementById('total-devices').textContent = uniqueDevices || 0;
    document.getElementById('total-sessions').textContent = totalSessions || 0;
    document.getElementById('today-keystrokes').textContent = todayCount || 0;

    // Load devices list
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

    // Group by device
    const deviceMap = {};
    data.forEach(session => {
      if (!session.device_id) return;
      if (!deviceMap[session.device_id]) {
        deviceMap[session.device_id] = { sessions: 0, keys: 0 };
      }
      deviceMap[session.device_id].sessions++;
      deviceMap[session.device_id].keys += session.key_count || 0;
    });

    // Render device cards
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

  // Show sessions section
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

  // Show keystrokes section
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

// Format special keys for display
function formatSpecialKey(key) {
  const keyMap = {
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
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→'
  };
  return keyMap[key] || key;
}

// Escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== EVENT LISTENERS ====================

// Consent button - start monitoring
document.getElementById('consent-btn').addEventListener('click', () => {
  localStorage.setItem('keylogger_consent', 'true');
  document.getElementById('consent-modal').classList.remove('active');
  startMonitoring();
});

// Reset device button
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset this device? All local data will be cleared.')) {
    localStorage.removeItem('keylogger_device_id');
    localStorage.removeItem('keylogger_consent');
    localStorage.removeItem('keystroke_count');
    window.location.reload();
  }
});

// Back to devices button
document.getElementById('backDevices').addEventListener('click', () => {
  document.getElementById('keystrokes-section').classList.add('hidden');
  document.getElementById('sessions-section').classList.add('hidden');
  document.getElementById('devices-section').classList.remove('hidden');
  selectedDevice = null;
  selectedSession = null;
});

// Back to sessions button
document.getElementById('backSessions').addEventListener('click', () => {
  if (selectedDevice) {
    document.getElementById('keystrokes-section').classList.add('hidden');
    document.getElementById('sessions-section').classList.remove('hidden');
    selectedSession = null;
  }
});

// Refresh button
document.getElementById('refreshBtn').addEventListener('click', loadAdminData);

// Clear all data button
document.getElementById('clearBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
  if (!confirm('This will permanently delete all keystroke records. Continue?')) return;

  try {
    await supabase.from('keystroke_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('typing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    loadAdminData();
    alert('All data has been deleted.');
  } catch (err) {
    console.error('Clear data error:', err);
    alert('Error clearing data. Please try again.');
  }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

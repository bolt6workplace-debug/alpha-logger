// Popup script
document.addEventListener('DOMContentLoaded', function() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const deviceIdEl = document.getElementById('deviceId');
  const toggleBtn = document.getElementById('toggleBtn');
  const todayKeysEl = document.getElementById('todayKeys');
  const totalKeysEl = document.getElementById('totalKeys');
  const adminLink = document.getElementById('adminLink');

  // Load current status
  chrome.storage.local.get(['monitoring_enabled', 'device_id'], function(result) {
    deviceIdEl.textContent = result.device_id || 'Not set';

    if (result.monitoring_enabled) {
      updateUI(true);
    } else {
      updateUI(false);
    }
  });

  // Toggle monitoring
  toggleBtn.addEventListener('click', function() {
    chrome.storage.local.get(['monitoring_enabled'], function(result) {
      const newState = !result.monitoring_enabled;
      chrome.storage.local.set({ monitoring_enabled: newState }, function() {
        updateUI(newState);
      });
    });
  });

  // Open admin dashboard
  adminLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('admin.html') });
  });

  function updateUI(isMonitoring) {
    if (isMonitoring) {
      statusDot.classList.add('active');
      statusText.textContent = 'Status: Monitoring Active';
      toggleBtn.textContent = 'Stop Monitoring';
      toggleBtn.className = 'btn-stop';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Status: Monitoring Paused';
      toggleBtn.textContent = 'Start Monitoring';
      toggleBtn.className = 'btn-start';
    }
  }

  // Load stats (simplified - for demo)
  loadStats();

  function loadStats() {
    chrome.storage.local.get(['keystroke_count', 'today_count'], function(result) {
      totalKeysEl.textContent = result.keystroke_count || 0;
      todayKeysEl.textContent = result.today_count || 0;
    });
  }

  // Update stats periodically
  setInterval(loadStats, 5000);
});

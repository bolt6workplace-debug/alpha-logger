document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('toggle-btn');
  const dot = document.getElementById('dot');
  const statusText = document.getElementById('status-text');

  // Load current state
  chrome.storage.local.get(['monitoring_enabled'], function (result) {
    updateUI(result.monitoring_enabled === true);
  });

  // Toggle monitoring on/off
  toggleBtn.addEventListener('click', function () {
    chrome.storage.local.get(['monitoring_enabled'], function (result) {
      const newState = !result.monitoring_enabled;
      chrome.storage.local.set({ monitoring_enabled: newState }, function () {
        updateUI(newState);
        // Notify all content scripts of the state change
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE', enabled: newState }).catch(() => {});
          });
        });
      });
    });
  });

  function updateUI(isOn) {
    if (isOn) {
      dot.classList.add('on');
      statusText.textContent = 'Monitoring Active';
      toggleBtn.textContent = 'Stop Monitoring';
      toggleBtn.className = 'stop';
    } else {
      dot.classList.remove('on');
      statusText.textContent = 'Monitoring Off';
      toggleBtn.textContent = 'Start Monitoring';
      toggleBtn.className = 'start';
    }
  }
});

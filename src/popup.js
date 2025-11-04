/**
 * TabDog Chrome Extension - Popup Interface
 *
 * Legacy popup interface for saving and managing tabs.
 * Provides quick access to save functionality and displays saved tabs.
 * Note: Main interface is now tab.html for better UX.
 */

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveAllTabs');
  const tabList = document.getElementById('tabList');

  saveBtn.addEventListener('click', saveAndCloseAllTabs);
  loadSavedTabs();

  // Save all non-active tabs and close them
  function saveAndCloseAllTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const otherTabs = tabs.filter(tab => !tab.active);

      // Create a session group with timestamp
      const sessionId = Date.now();
      const tabDataArray = otherTabs.map(tab => ({
        title: tab.title,
        url: tab.url,
        favicon: tab.favIconUrl,
        timestamp: sessionId,
        sessionId
      }));

      chrome.storage.local.get(['savedTabs'], (result) => {
        const savedTabs = result.savedTabs || [];
        savedTabs.unshift(...tabDataArray);

        chrome.storage.local.set({ savedTabs }, () => {
          // Close tabs in reverse order so Ctrl+Shift+T restores them correctly
          const tabIdsToClose = otherTabs.map(tab => tab.id).reverse();
          chrome.tabs.remove(tabIdsToClose, () => {
            loadSavedTabs();
            window.close();
          });
        });
      });
    });
  }

  // Load and display saved tabs grouped by session
  function loadSavedTabs() {
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      tabList.innerHTML = '';

      // Group tabs by session
      const sessions = {};
      savedTabs.forEach(tab => {
        const sessionId = tab.sessionId || 'individual';
        if (!sessions[sessionId]) {
          sessions[sessionId] = [];
        }
        sessions[sessionId].push(tab);
      });

      Object.keys(sessions).forEach(sessionId => {
        const sessionTabs = sessions[sessionId];
        const isGroup = sessionTabs.length > 1 || sessionTabs[0].sessionId;

        if (isGroup) {
          const sessionElement = document.createElement('div');
          sessionElement.style.marginBottom = '15px';

          const sessionHeader = document.createElement('div');
          sessionHeader.style.fontWeight = 'bold';
          sessionHeader.style.marginBottom = '5px';
          sessionHeader.style.color = '#4285f4';
          sessionHeader.textContent = `Session (${sessionTabs.length} tabs) - ${new Date(sessionTabs[0].timestamp).toLocaleString()}`;

          const restoreAllBtn = document.createElement('button');
          restoreAllBtn.textContent = 'Restore All';
          restoreAllBtn.style.fontSize = '12px';
          restoreAllBtn.style.padding = '4px 8px';
          restoreAllBtn.style.marginLeft = '10px';
          restoreAllBtn.style.cursor = 'pointer';
          restoreAllBtn.onclick = () => restoreSession(sessionTabs);

          sessionHeader.appendChild(restoreAllBtn);
          sessionElement.appendChild(sessionHeader);

          sessionTabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = 'tab-item';
            tabElement.style.marginLeft = '20px';
            tabElement.innerHTML = `
              <div><strong>${tab.title}</strong></div>
              <div style="font-size: 12px; color: #666;">${tab.url}</div>
            `;

            tabElement.addEventListener('click', () => {
              chrome.tabs.create({ url: tab.url });
            });

            sessionElement.appendChild(tabElement);
          });

          tabList.appendChild(sessionElement);
        } else {
          // Individual tabs (old format)
          const tab = sessionTabs[0];
          const tabElement = document.createElement('div');
          tabElement.className = 'tab-item';
          tabElement.innerHTML = `
            <div><strong>${tab.title}</strong></div>
            <div style="font-size: 12px; color: #666;">${tab.url}</div>
          `;

          tabElement.addEventListener('click', () => {
            chrome.tabs.create({ url: tab.url });
          });

          tabList.appendChild(tabElement);
        }
      });
    });
  }

  // Restore all tabs in a session
  function restoreSession(sessionTabs) {
    // Open tabs in the same order they were originally in
    sessionTabs.forEach(tab => {
      chrome.tabs.create({ url: tab.url });
    });
  }
});

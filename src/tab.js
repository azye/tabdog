/**
 * TabDog Chrome Extension - Main Tab Interface
 *
 * Primary interface for managing saved tabs and sessions.
 * Provides full functionality including saving, restoring, clearing,
 * and organizing tabs with session management and user feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveAllTabs');
  const clearBtn = document.getElementById('clearAllTabs');
  const tabList = document.getElementById('tabList');
  const savedTabsCount = document.getElementById('savedTabsCount');

  saveBtn.addEventListener('click', saveAndCloseAllTabs);
  clearBtn.addEventListener('click', clearAllTabs);
  loadSavedTabs();

  // Save all non-active tabs and close them
  function saveAndCloseAllTabs() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const otherTabs = tabs.filter(tab => !tab.active);

      if (otherTabs.length === 0) {
        showMessage('No other tabs to save!');
        return;
      }

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
            showMessage(`Saved ${otherTabs.length} tabs successfully!`);
          });
        });
      });
    });
  }

  // Clear all saved tabs from storage
  function clearAllTabs() {
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];

      if (savedTabs.length === 0) {
        showMessage('No saved tabs to clear!');
        return;
      }

      // Show confirmation dialog
      const confirmed = confirm(
        `Are you sure you want to clear all ${savedTabs.length} saved tabs? This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      chrome.storage.local.set({ savedTabs: [] }, () => {
        loadSavedTabs();
        showMessage(`Cleared ${savedTabs.length} saved tabs!`);
      });
    });
  }

  // Load and display saved tabs grouped by session
  function loadSavedTabs() {
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      tabList.innerHTML = '';

      // Update the count
      savedTabsCount.textContent = savedTabs.length;

      if (savedTabs.length === 0) {
        tabList.innerHTML = '<div class="empty-state">No saved tabs yet. Click the button above to save your tabs!</div>';
        return;
      }

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
          sessionElement.className = 'session-group';

          const sessionHeader = document.createElement('div');
          sessionHeader.className = 'session-header';
          sessionHeader.innerHTML = `
            <span>Session (${sessionTabs.length} tabs) - ${new Date(sessionTabs[0].timestamp).toLocaleString()}</span>
            <div>
              <button class="delete-session-btn">Delete Session</button>
              <button class="restore-all-btn">Restore All</button>
            </div>
          `;

          const restoreAllBtn = sessionHeader.querySelector('.restore-all-btn');
          restoreAllBtn.onclick = () => restoreSession(sessionTabs);

          const deleteSessionBtn = sessionHeader.querySelector('.delete-session-btn');
          deleteSessionBtn.onclick = () => deleteSession(sessionId);

          sessionElement.appendChild(sessionHeader);

          const tabContent = document.createElement('div');
          tabContent.className = 'tab-content';

          sessionTabs.forEach(tab => {
            const tabElement = createTabElement(tab);
            tabContent.appendChild(tabElement);
          });

          sessionElement.appendChild(tabContent);
          tabList.appendChild(sessionElement);
        } else {
          // Individual tabs (old format)
          const tab = sessionTabs[0];
          const tabElement = createTabElement(tab);
          tabList.appendChild(tabElement);
        }
      });
    });
  }

  // Create DOM element for a single tab
  function createTabElement(tab) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab-item';
    tabElement.innerHTML = `
      <div class="tab-title">${escapeHtml(tab.title)}</div>
      <div class="tab-url">${escapeHtml(tab.url)}</div>
    `;

    tabElement.addEventListener('click', () => {
      chrome.tabs.create({ url: tab.url });
    });

    return tabElement;
  }

  // Restore all tabs in a session
  function restoreSession(sessionTabs) {
    sessionTabs.forEach(tab => {
      chrome.tabs.create({ url: tab.url });
    });
    showMessage(`Restored ${sessionTabs.length} tabs!`);
  }

  // Delete a session and all its tabs
  function deleteSession(sessionId) {
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      const originalLength = savedTabs.length;
      
      // Remove tabs with the specified sessionId
      const updatedTabs = savedTabs.filter(tab => {
        if (sessionId === 'individual') {
          // For individual tabs, remove those without sessionId
          return tab.sessionId !== undefined;
        } else {
          // For session groups, remove tabs with matching sessionId
          // Convert both to string for proper comparison
          return String(tab.sessionId) !== String(sessionId);
        }
      });
      
      const deletedCount = originalLength - updatedTabs.length;
      
      chrome.storage.local.set({ savedTabs: updatedTabs }, () => {
        loadSavedTabs();
        showMessage(`Deleted session with ${deletedCount} tabs!`);
      });
    });
  }

  // Show temporary notification message
  function showMessage(message) {
    // Create a temporary message element
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #4285f4;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      font-weight: bold;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});

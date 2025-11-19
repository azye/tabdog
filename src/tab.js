/**
 * TabDog Chrome Extension - Main Tab Interface
 *
 * Primary interface for managing saved tabs and sessions.
 * Provides full functionality including saving, restoring, clearing,
 * and organizing tabs with session management and user feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  const MAX_SESSION_NAME_LENGTH = 120;
  const saveBtn = document.getElementById('saveAllTabs');
  const clearBtn = document.getElementById('clearAllTabs');
  const tabList = document.getElementById('tabList');
  const savedTabsCount = document.getElementById('savedTabsCount');

  saveBtn.addEventListener('click', saveAndCloseAllTabs);
  clearBtn.addEventListener('click', clearAllTabs);

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.matches('.menu-btn')) {
      document.querySelectorAll('.menu-content.show').forEach(content => {
        content.classList.remove('show');
      });
    }
  });

  loadSavedTabs();
  const uploadBtn = document.getElementById('uploadTabs');
  const downloadBtn = document.getElementById('downloadTabs');
  const fileInput = document.getElementById('fileInput');

  uploadBtn.addEventListener('click', () => fileInput.click());
  downloadBtn.addEventListener('click', downloadSavedTabs);
  fileInput.addEventListener('change', handleFileUpload);

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

  // Download all saved tabs as Text
  // Exports sessions with dates and custom names
  function downloadSavedTabs() {
    chrome.storage.local.get(['savedTabs', 'sessionMetadata'], (result) => {
      const savedTabs = result.savedTabs || [];
      const sessionMetadata = result.sessionMetadata || {};

      if (savedTabs.length === 0) {
        showMessage('No tabs to download!');
        return;
      }

      // Group by session to preserve order
      const sessions = {};
      const sessionIds = [];

      savedTabs.forEach(tab => {
        const sessionId = tab.sessionId || 'individual';
        if (!sessions[sessionId]) {
          sessions[sessionId] = [];
          sessionIds.push(sessionId);
        }
        sessions[sessionId].push(tab);
      });

      let content = '';

      sessionIds.forEach(sessionId => {
        const tabs = sessions[sessionId];
        const timestamp = tabs[0].timestamp;
        const dateStr = new Date(timestamp).toLocaleString();
        const name = sessionMetadata[sessionId];

        // Header: date - session name
        let header = dateStr;
        if (name) {
          header += ` - ${name}`;
        }

        content += header + '\n';
        tabs.forEach(tab => {
          content += tab.url + '\n';
        });
        content += '\n'; // Empty line delimiter
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      const date = new Date().toISOString().slice(0, 10);
      downloadAnchorNode.setAttribute("download", `tabdog_backup_${date}.txt`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
    });
  }

  // Handle file upload for importing tabs
  // Parses text file with "Date - Name" headers and URLs
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const blocks = text.split(/\n\s*\n/); // Split by empty lines

        chrome.storage.local.get(['savedTabs', 'sessionMetadata'], (result) => {
          const currentTabs = result.savedTabs || [];
          const currentMetadata = result.sessionMetadata || {};

          // Build lookup for existing sessions
          // Map<sessionId, { dateStr, name, urls: Set<url> }>
          const existingSessions = new Map();

          currentTabs.forEach(tab => {
            const sId = tab.sessionId || 'individual';
            if (!existingSessions.has(sId)) {
              const timestamp = tab.timestamp;
              const dateStr = new Date(timestamp).toLocaleString();
              const name = currentMetadata[sId];
              existingSessions.set(sId, {
                dateStr,
                name,
                urls: new Set()
              });
            }
            existingSessions.get(sId).urls.add(tab.url);
          });

          const newTabs = [];
          const metadataUpdates = {};
          let importedCount = 0;

          blocks.forEach(block => {
            const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) return; // Need at least header and 1 url

            const header = lines[0];
            const urls = lines.slice(1);

            // Parse header: "Date - Session Name" or just "Date"
            const separatorIndex = header.indexOf(' - ');
            let dateStr, sessionName;

            if (separatorIndex !== -1) {
              dateStr = header.substring(0, separatorIndex);
              sessionName = header.substring(separatorIndex + 3);
            } else {
              dateStr = header;
              sessionName = null;
            }

            // Find matching session
            let targetSessionId = null;

            for (const [sId, info] of existingSessions) {
              // Check if date string matches
              // And check if name matches (treat null/undefined as same)
              const nameMatches = (info.name || null) === (sessionName || null);
              if (info.dateStr === dateStr && nameMatches) {
                targetSessionId = sId;
                break;
              }
            }

            if (!targetSessionId) {
              // Create new session ID
              let timestamp = new Date(dateStr).getTime();
              if (isNaN(timestamp)) {
                timestamp = Date.now();
              }
              targetSessionId = timestamp;
            }

            // Get or create existing URLs set for this session
            let existingUrls;
            if (existingSessions.has(targetSessionId)) {
              existingUrls = existingSessions.get(targetSessionId).urls;
            } else {
              existingUrls = new Set();
              existingSessions.set(targetSessionId, {
                dateStr,
                name: sessionName,
                urls: existingUrls
              });

              // Mark metadata for update if it's a new session with a name
              if (sessionName) {
                metadataUpdates[targetSessionId] = sessionName;
              }
            }

            urls.forEach(url => {
              if (url.startsWith('http')) { // Basic validation
                if (!existingUrls.has(url)) {
                  newTabs.push({
                    title: url, // No title in text format
                    url: url,
                    timestamp: targetSessionId,
                    sessionId: targetSessionId
                  });
                  existingUrls.add(url); // Prevent duplicates within the same import
                  importedCount++;
                }
              }
            });
          });

          if (importedCount === 0) {
            showMessage('No new tabs found to import.');
            fileInput.value = '';
            return;
          }

          // Merge metadata
          const updatedMetadata = {
            ...currentMetadata,
            ...metadataUpdates
          };
          // Prepend uploaded tabs
          const updatedTabs = [...newTabs, ...currentTabs];

          chrome.storage.local.set({
            savedTabs: updatedTabs,
            sessionMetadata: updatedMetadata
          }, () => {
            loadSavedTabs();
            showMessage(`Imported ${importedCount} tabs successfully!`);
            fileInput.value = '';
          });
        });
      } catch (error) {
        showMessage('Error importing tabs: ' + error.message);
        console.error(error);
        fileInput.value = ''; // Reset on error too
      }
    };
    reader.readAsText(file);
  }

  // Lazy loading state
  let currentObserver = null;
  const BATCH_SIZE = 20;

  // Load and display saved tabs grouped by session with lazy loading
  function loadSavedTabs() {
    chrome.storage.local.get(['savedTabs', 'sessionMetadata'], (result) => {
      const savedTabs = result.savedTabs || [];
      const sessionMetadata = result.sessionMetadata || {};
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

      // Get all session IDs (preserving existing sort order of Object.keys)
      const sessionIds = Object.keys(sessions);
      let currentIndex = 0;

      // Cleanup previous observer if it exists
      if (currentObserver) {
        currentObserver.disconnect();
        currentObserver = null;
      }

      // Function to render a batch of sessions
      const renderBatch = () => {
        const batch = sessionIds.slice(currentIndex, currentIndex + BATCH_SIZE);
        currentIndex += BATCH_SIZE;

        batch.forEach(sessionId => {
          const sessionTabs = sessions[sessionId];
          const isGroup = sessionTabs.length > 1 || sessionTabs[0].sessionId;

          if (isGroup) {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'session-group';

            const sessionName = sessionMetadata[sessionId] || 'Session';
            const timestamp = sessionTabs[0].timestamp;
            const dateStr = new Date(timestamp).toLocaleString();

            const sessionHeader = document.createElement('div');
            sessionHeader.className = 'session-header';
            sessionHeader.innerHTML = `
              <div class="session-title-container">
                <span class="session-name-text">${escapeHtml(sessionName)}</span>
                <span> (${sessionTabs.length} tabs) - ${dateStr}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <button class="delete-session-btn">Delete Session</button>
                <button class="restore-all-btn">Restore All</button>
                <div class="session-menu-container">
                  <button class="menu-btn">⋮</button>
                  <div class="menu-content">
                    <div class="menu-item rename-session-btn">Rename Session</div>
                  </div>
                </div>
              </div>
            `;

            const restoreAllBtn = sessionHeader.querySelector('.restore-all-btn');
            restoreAllBtn.onclick = () => restoreSession(sessionTabs);

            const deleteSessionBtn = sessionHeader.querySelector('.delete-session-btn');
            deleteSessionBtn.onclick = () => deleteSession(sessionId);

            const menuBtn = sessionHeader.querySelector('.menu-btn');
            const menuContent = sessionHeader.querySelector('.menu-content');
            const renameBtn = sessionHeader.querySelector('.rename-session-btn');

            menuBtn.onclick = (e) => {
              e.stopPropagation();
              // Close other menus
              document.querySelectorAll('.menu-content.show').forEach(el => {
                if (el !== menuContent) el.classList.remove('show');
              });
              menuContent.classList.toggle('show');
            };

            renameBtn.onclick = (e) => {
              e.stopPropagation();
              menuContent.classList.remove('show');
              enableRenameMode(sessionHeader, sessionId, sessionName, sessionTabs.length, timestamp);
            };

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

        // If there are more sessions, add a sentinel for infinite scroll
        if (currentIndex < sessionIds.length) {
          const sentinel = document.createElement('div');
          sentinel.className = 'sentinel';
          sentinel.style.height = '20px';
          sentinel.style.margin = '10px 0';
          tabList.appendChild(sentinel);

          currentObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
              currentObserver.disconnect();
              sentinel.remove();
              renderBatch();
            }
          });
          currentObserver.observe(sentinel);
        }
      };

      // Initial render
      renderBatch();
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
    chrome.storage.local.get(['savedTabs', 'sessionMetadata'], (result) => {
      const savedTabs = result.savedTabs || [];
      const sessionMetadata = result.sessionMetadata || {};
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

      // Remove metadata if it exists
      if (sessionId !== 'individual' && sessionMetadata[sessionId]) {
        delete sessionMetadata[sessionId];
      }

      chrome.storage.local.set({ savedTabs: updatedTabs, sessionMetadata }, () => {
        loadSavedTabs();
        showMessage(`Deleted session with ${deletedCount} tabs!`);
      });
    });
  }

  // Enable rename mode for a session
  // Replaces title with input field and confirm button
  function enableRenameMode(headerElement, sessionId, currentName, tabCount, timestamp) {
    const titleContainer = headerElement.querySelector('.session-title-container');

    titleContainer.innerHTML = `
        <div class="rename-container">
            <input type="text" class="rename-input" value="${escapeHtml(currentName === 'Session' ? '' : currentName)}" placeholder="Session Name" maxlength="${MAX_SESSION_NAME_LENGTH}">
            <button class="rename-confirm-btn">✓</button>
            <span> (${tabCount} tabs) - ${new Date(timestamp).toLocaleString()}</span>
        </div>
    `;

    const input = titleContainer.querySelector('.rename-input');
    const confirmBtn = titleContainer.querySelector('.rename-confirm-btn');

    input.focus();
    // Move cursor to end
    const val = input.value;
    input.setSelectionRange(val.length, val.length);

    const saveRename = () => {
      const newName = input.value.trim();
      if (newName) {
        updateSessionName(sessionId, newName);
      } else {
        // Revert if empty, effectively removing custom name
        updateSessionName(sessionId, null);
      }
    };

    confirmBtn.onclick = saveRename;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveRename();
      } else if (e.key === 'Escape') {
        loadSavedTabs();
      }
    });
  }

  // Update session name in storage
  // Saves custom name to sessionMetadata
  function updateSessionName(sessionId, newName) {
    chrome.storage.local.get(['sessionMetadata'], (result) => {
      const metadata = result.sessionMetadata || {};
      if (newName) {
        metadata[sessionId] = newName;
      } else {
        delete metadata[sessionId];
      }

      chrome.storage.local.set({ sessionMetadata: metadata }, () => {
        loadSavedTabs();
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

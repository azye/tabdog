/**
 * TabDog Chrome Extension - Background Service Worker
 *
 * Handles extension lifecycle, tab management, and storage operations.
 * This service worker runs when the extension is installed or when the
 * extension icon is clicked.
 */

// Extension lifecycle: handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TabDog extension installed');

  chrome.contextMenus.create({
    id: 'open-manager',
    title: 'Open Tab Manager',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['action']
  });

  // Create context menu items
  chrome.contextMenus.create({
    id: 'save-tabs',
    title: 'Save + Close All Tabs',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'save-tabs-except-current',
    title: 'Save + Close All Tabs Except Current Tab',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'save-current-tab',
    title: 'Save + Close Current Tab',
    contexts: ['action']
  });


  chrome.contextMenus.create({
    id: 'clear-all',
    title: 'Clear All Saved Tabs',
    contexts: ['action']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'save-tabs':
      saveAndCloseAllTabs();
      break;
    case 'save-tabs-except-current':
      saveAndCloseAllTabsExceptCurrent();
      break;
    case 'save-current-tab':
      saveAndCloseCurrentTab();
      break;
    case 'open-manager':
      openTabManager(true, tab.windowId);
      break;
    case 'clear-all':
      clearAllSavedTabs();
      break;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'save-all-tabs':
      saveAndCloseAllTabs();
      break;
    case 'save-except-current':
      saveAndCloseAllTabsExceptCurrent();
      break;
    case 'open-manager':
      chrome.windows.getCurrent((win) => {
        openTabManager(true, win.id);
      });
      break;
    case 'save-current-tab':
      saveAndCloseCurrentTab();
      break;
  }
});

// Handle extension icon click: save tabs and open manager
chrome.action.onClicked.addListener((tab) => {
  saveAndCloseAllTabs();
});

// Save all non-extension tabs to storage and close them
function saveAndCloseAllTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    const currentWindowId = tabs[0].windowId;
    const extensionUrl = chrome.runtime.getURL('');
    const tabsToSave = tabs.filter(tab => !tab.url.includes(extensionUrl));

    if (tabsToSave.length === 0) {
      openTabManager(true, currentWindowId);
      return;
    }

    // Create a session group with timestamp
    const sessionId = Date.now();
    const tabDataArray = tabsToSave.map(tab => ({
      title: tab.title,
      url: tab.url,
      favicon: tab.favIconUrl,
      timestamp: sessionId,
      sessionId
    }));

    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      savedTabs.unshift(...tabDataArray);
      openTabManager(true, currentWindowId);
      chrome.storage.local.set({ savedTabs }, () => {
        // Close all non-extension tabs in reverse order so Ctrl+Shift+T restores them correctly
        const tabIdsToClose = tabsToSave.map(tab => tab.id).reverse();
        chrome.tabs.remove(tabIdsToClose);
      });
    });
  });
}

// Open or activate the tab manager interface
function openTabManager(active = true, targetWindowId = null) {
  chrome.tabs.query({ url: chrome.runtime.getURL('../pages/tab.html') }, (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];

      const updateAndReload = (tabId, windowId) => {
        if (active) {
          chrome.tabs.update(tabId, { active: true });
          chrome.windows.update(windowId, { focused: true });
        }
        chrome.tabs.reload(tabId);
      };

      // If targetWindowId is specified and different, move the tab
      if (targetWindowId && tab.windowId !== targetWindowId) {
        chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 }, (movedTab) => {
          // chrome.tabs.move returns the moved tab (or tabs)
          // Note: movedTab might be an array if multiple tabs moved, but here it's one ID
          const actualTab = Array.isArray(movedTab) ? movedTab[0] : movedTab;
          updateAndReload(actualTab.id, actualTab.windowId);
        });
      } else {
        updateAndReload(tab.id, tab.windowId);
      }

      // Close any additional extension tabs
      if (tabs.length > 1) {
        const tabsToClose = tabs.slice(1).map(t => t.id);
        chrome.tabs.remove(tabsToClose);
      }
    } else {
      // No extension tab exists, create new one
      const createProps = {
        url: chrome.runtime.getURL('../pages/tab.html'),
        active: active,
        pinned: true
      };
      if (targetWindowId) {
        createProps.windowId = targetWindowId;
      }
      chrome.tabs.create(createProps);
    }
  });
}

// Save all non-extension tabs except the current one and close them
function saveAndCloseAllTabsExceptCurrent() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    const currentWindowId = tabs[0].windowId;
    const extensionUrl = chrome.runtime.getURL('');
    const tabsToSave = tabs.filter(tab => !tab.url.includes(extensionUrl) && !tab.active);

    if (tabsToSave.length === 0) {
      console.log('No tabs to save (excluding current tab)');
      openTabManager(false, currentWindowId);
      return;
    }

    // Create a session group with timestamp
    const sessionId = Date.now();
    const tabDataArray = tabsToSave.map(tab => ({
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
        // Close all non-extension, non-active tabs in reverse order so Ctrl+Shift+T restores them correctly
        const tabIdsToClose = tabsToSave.map(tab => tab.id).reverse();
        chrome.tabs.remove(tabIdsToClose, () => {
          // Small delay to ensure storage is fully updated before opening manager
          setTimeout(() => openTabManager(false, currentWindowId), 100);
        });
      });
    });
  });
}

// Save and close the current tab
function saveAndCloseCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;

    const currentTab = tabs[0];
    const currentWindowId = currentTab.windowId;
    const extensionUrl = chrome.runtime.getURL('');

    // Don't save extension tabs
    if (currentTab.url.includes(extensionUrl)) {
      console.log('Cannot save extension tab');
      return;
    }

    // Create a session group with timestamp
    const sessionId = Date.now();
    const tabData = {
      title: currentTab.title,
      url: currentTab.url,
      favicon: currentTab.favIconUrl,
      timestamp: sessionId,
      sessionId
    };

    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      savedTabs.unshift(tabData);
      chrome.storage.local.set({ savedTabs }, () => {
        // Open extension tab in background
        openTabManager(false, currentWindowId);
        // Close current tab - Chrome will automatically activate next tab
        chrome.tabs.remove(currentTab.id);
      });
    });
  });
}

// Clear all saved tabs from storage
function clearAllSavedTabs() {
  chrome.storage.local.set({ savedTabs: [] }, () => {
    console.log('All saved tabs cleared');
  });
}

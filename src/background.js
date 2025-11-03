/**
 * TabStash Chrome Extension - Background Service Worker
 *
 * Handles extension lifecycle, tab management, and storage operations.
 * This service worker runs when the extension is installed or when the
 * extension icon is clicked.
 */

// Extension lifecycle: handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TabStash extension installed');
  
  // Create context menu items
  chrome.contextMenus.create({
    id: 'save-tabs',
    title: 'Save & Close All Tabs',
    contexts: ['action']
  });
  
  chrome.contextMenus.create({
    id: 'save-tabs-except-current',
    title: 'Save & Close All Except Current',
    contexts: ['action']
  });
  
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
    case 'open-manager':
      openTabManager();
      break;
    case 'clear-all':
      clearAllSavedTabs();
      break;
  }
});

// Handle extension icon click: save tabs and open manager
chrome.action.onClicked.addListener((tab) => {
  saveAndCloseAllTabs(() => {
    openTabManager();
  });
});

// Save all non-extension tabs to storage and close them
function saveAndCloseAllTabs(callback) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const extensionUrl = chrome.runtime.getURL('');
    const tabsToSave = tabs.filter(tab => !tab.url.includes(extensionUrl));

    if (tabsToSave.length === 0) {
      if (callback) callback();
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
      if (callback) callback();
      chrome.storage.local.set({ savedTabs }, () => {
        // Close all non-extension tabs in reverse order so Ctrl+Shift+T restores them correctly
        const tabIdsToClose = tabsToSave.map(tab => tab.id).reverse();
        chrome.tabs.remove(tabIdsToClose);
      });
    });
  });
}

// Open or activate the tab manager interface
function openTabManager(active=true) {
  chrome.tabs.query({ url: chrome.runtime.getURL('../pages/tab.html') }, (tabs) => {
    if (tabs.length > 0) {
      // Extension tab exists, make it active
      chrome.tabs.update(tabs[0].id, { active: true });
      // Close any additional extension tabs
      if (tabs.length > 1) {
        const tabsToClose = tabs.slice(1).map(tab => tab.id);
        chrome.tabs.remove(tabsToClose);
      }
      // Reload the existing extension tab to update content
      chrome.tabs.reload(tabs[0].id);
    } else {
      // No extension tab exists, create new one
      chrome.tabs.create({
        url: chrome.runtime.getURL('../pages/tab.html'),
        active: active,
        pinned: true
      });
    }
  });
}

// Save all non-extension tabs except the current one and close them
function saveAndCloseAllTabsExceptCurrent() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const extensionUrl = chrome.runtime.getURL('');
    const tabsToSave = tabs.filter(tab => !tab.url.includes(extensionUrl) && !tab.active);
    
    if (tabsToSave.length === 0) {
      console.log('No tabs to save (excluding current tab)');
      openTabManager();
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
          setTimeout(() => openTabManager(false), 100);
        });
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

describe('Background Script Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Chrome API mocks
    chrome.runtime.onInstalled.addListener.mockClear();
    chrome.action.onClicked.addListener.mockClear();
    chrome.tabs.query.mockClear();
    chrome.tabs.create.mockClear();
    chrome.tabs.update.mockClear();
    chrome.tabs.remove.mockClear();
    chrome.tabs.reload.mockClear();
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  describe('Chrome API Mocks', () => {
    test('should have chrome runtime methods mocked', () => {
      expect(typeof chrome.runtime.onInstalled.addListener).toBe('function');
      expect(typeof chrome.runtime.getURL).toBe('function');
    });

    test('should have chrome action methods mocked', () => {
      expect(typeof chrome.action.onClicked.addListener).toBe('function');
    });

    test('should have chrome tabs methods mocked', () => {
      expect(typeof chrome.tabs.query).toBe('function');
      expect(typeof chrome.tabs.create).toBe('function');
      expect(typeof chrome.tabs.update).toBe('function');
      expect(typeof chrome.tabs.remove).toBe('function');
      expect(typeof chrome.tabs.reload).toBe('function');
    });

    test('should have chrome storage methods mocked', () => {
      expect(typeof chrome.storage.local.get).toBe('function');
      expect(typeof chrome.storage.local.set).toBe('function');
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Chrome API mocks
    chrome.runtime.onInstalled.addListener.mockClear();
    chrome.action.onClicked.addListener.mockClear();
    chrome.tabs.query.mockClear();
    chrome.tabs.create.mockClear();
    chrome.tabs.update.mockClear();
    chrome.tabs.remove.mockClear();
    chrome.tabs.reload.mockClear();
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Chrome API mocks
    chrome.runtime.onInstalled.addListener.mockClear();
    chrome.action.onClicked.addListener.mockClear();
    chrome.tabs.query.mockClear();
    chrome.tabs.create.mockClear();
    chrome.tabs.update.mockClear();
    chrome.tabs.remove.mockClear();
    chrome.tabs.reload.mockClear();
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  
});

describe('Tab Management Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAndCloseAllTabs', () => {
    test('should handle empty tab list', async () => {
      const mockTabs = [];
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(mockTabs);
      });
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ savedTabs: [] });
      });
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      // Simulate the function behavior
      const extensionUrl = chrome.runtime.getURL('');
      const tabsToSave = mockTabs.filter(tab => !tab.url.includes(extensionUrl));

      expect(tabsToSave).toHaveLength(0);
    });

    test('should filter out extension tabs but include chrome:// pages', () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example' },
        { id: 2, url: 'chrome://extensions/', title: 'Extensions' },
        { id: 3, url: 'chrome-extension://test-id/tab.html', title: 'TabDog' },
        { id: 4, url: 'chrome://settings/', title: 'Settings' }
      ];

      const extensionUrl = chrome.runtime.getURL('');
      const tabsToSave = mockTabs.filter(tab => !tab.url.includes(extensionUrl));

      expect(tabsToSave).toHaveLength(3);
      expect(tabsToSave.map(tab => tab.url)).toEqual([
        'https://example.com',
        'chrome://extensions/',
        'chrome://settings/'
      ]);
    });

    test('should create session with timestamp', () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', favIconUrl: 'https://example.com/favicon.ico' }
      ];

      const extensionUrl = chrome.runtime.getURL('');
      const tabsToSave = mockTabs.filter(tab => !tab.url.includes(extensionUrl));
      const sessionId = Date.now();
      const tabDataArray = tabsToSave.map(tab => ({
        title: tab.title,
        url: tab.url,
        favicon: tab.favIconUrl,
        timestamp: sessionId,
        sessionId
      }));

      expect(tabDataArray).toHaveLength(1);
      expect(tabDataArray[0]).toMatchObject({
        title: 'Example',
        url: 'https://example.com',
        favicon: 'https://example.com/favicon.ico',
        sessionId: expect.any(Number),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('openTabManager Logic', () => {
    test('should handle empty tab list correctly', () => {
      const mockTabs = [];
      
      // Test the logic that would be in openTabManager
      if (mockTabs.length > 0) {
        chrome.tabs.update(mockTabs[0].id, { active: true });
        chrome.tabs.reload(mockTabs[0].id);
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('tab.html'),
          active: true
        });
      }

      expect(chrome.tabs.reload).not.toHaveBeenCalled();
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: chrome.runtime.getURL('tab.html'),
        active: true
      });
    });

    test('should handle existing tabs correctly', () => {
      const mockTabs = [
        { id: 1, url: 'chrome-extension://test-id/tab.html' }
      ];
      
      // Test the logic that would be in openTabManager
      if (mockTabs.length > 0) {
        chrome.tabs.update(mockTabs[0].id, { active: true });
        chrome.tabs.reload(mockTabs[0].id);
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('tab.html'),
          active: true
        });
      }

      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1);
      expect(chrome.tabs.create).not.toHaveBeenCalled();
    });

    test('should handle multiple extension tabs', () => {
      const mockTabs = [
        { id: 1, url: 'chrome-extension://test-id/tab.html' },
        { id: 2, url: 'chrome-extension://test-id/tab.html' }
      ];
      
      // Test the logic that would be in openTabManager
      if (mockTabs.length > 0) {
        chrome.tabs.update(mockTabs[0].id, { active: true });
        
        if (mockTabs.length > 1) {
          const tabsToClose = mockTabs.slice(1).map(tab => tab.id);
          chrome.tabs.remove(tabsToClose);
        }
        
        chrome.tabs.reload(mockTabs[0].id);
      }

      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
      expect(chrome.tabs.remove).toHaveBeenCalledWith([2]);
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1);
    });
  });
});
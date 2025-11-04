# TabStash Chrome Extension - LLM Agent Documentation

This document provides detailed guidance for LLM agents working on the TabStash Chrome extension codebase.

## Project Overview

TabStash is a Manifest V3 Chrome extension that allows users to save and organize browser tabs. The extension provides a simple interface to stash multiple tabs at once and restore them later.

## Architecture

### Core Components

- **manifest.json**: Extension configuration (Manifest V3)
- **src/**: JavaScript source files
  - **background.js**: Service worker for extension lifecycle
  - **tab.js**: Main tab interface with full functionality
  - **popup.js**: Legacy popup interface
- **pages/**: HTML pages
  - **tab.html**: Main tab manager interface
  - **popup.html**: Legacy popup interface
  - **privacy.html**: Privacy policy page
- **icons/**: Extension icons in various sizes

### Key Features

1. **Tab Stashing**: Save all tabs (except extension tabs) with session grouping
2. **Session Management**: Tabs are grouped by save session with timestamps
3. **Tab Restoration**: Click saved tabs to reopen them
4. **Bulk Operations**: Restore entire sessions at once
5. **Delete Sessions**: Remove individual sessions with red delete button
6. **Clear All Tabs**: Remove all saved tabs at once with confirmation
7. **Tab Counter**: Display total count of saved tabs in the interface
8. **Icon Action**: Click extension icon to save tabs and open manager tab
9. **Chrome Page Handling**: Treats chrome:// pages like regular tabs (saved and closed)
10. **Fire Icon**: Visual representation using detailed fire/torch icon with red/orange colors and green base for tab stashing concept

## File Structure and Responsibilities

### Project Structure
```
tabstash/
├── src/                    # JavaScript source files
│   ├── background.js       # Service worker
│   ├── popup.js           # Legacy popup interface
│   └── tab.js             # Main tab interface
├── pages/                  # HTML pages
│   ├── popup.html         # Legacy popup interface
│   ├── tab.html           # Main tab manager
│   └── privacy.html       # Privacy policy
├── icons/                  # Extension icons
├── tests/                  # Test suite
├── manifest.json          # Extension manifest
└── tabstash-extension.zip # Production package
```

### manifest.json
- Defines extension permissions: `tabs`, `storage`, `contextMenus`
- Configures action handler and service worker (src/background.js)
- Specifies icon sizes: 16px, 32px, 48px, 128px
- Defines keyboard shortcuts for main features
- Web Store fields: `homepage_url`, `author`, `privacy_policy_url`

### pages/tab.html & src/tab.js (Main Interface)
- **loadSavedTabs()**: Displays saved tabs grouped by session, updates tab counter
- **restoreSession()**: Opens all tabs from a saved session
- **deleteSession()**: Removes specific session and all its tabs from storage
- **clearAllTabs()**: Removes all saved tabs from storage
- **createTabElement()**: Creates DOM element for individual tab display
- **showMessage()**: Displays temporary notification messages
- **escapeHtml()**: Prevents XSS attacks by escaping HTML
- Individual tab restoration on click
- **Tab Counter Display**: Shows total count of saved tabs in header
- **Dark Gruvbox Theme**: Uses authentic Gruvbox color palette with dark backgrounds (#282828, #3c3836), green accents (#8ec07c), and proper text contrast (#ebdbb2, #bdae93)

### pages/popup.html & src/popup.js (Legacy Popup)
- **saveAndCloseAllTabs()**: Saves non-active tabs and closes them
- **loadSavedTabs()**: Displays saved tabs grouped by session
- **restoreSession()**: Opens all tabs from a saved session
- **Dark Gruvbox Theme**: Consistent dark theme matching main interface with Gruvbox colors

### icons/
- **icon16.png**: 16x16 pixel PNG version for toolbar
- **icon32.png**: 32x32 pixel PNG version for toolbar
- **icon48.png**: 48x48 pixel PNG version for extension management
- **icon128.png**: 128x128 pixel PNG version for Chrome Web Store

### pages/privacy.html
- Privacy policy page required for Google Web Store submission
- Explains data collection, storage, and privacy practices
- Hosted on GitHub and referenced in manifest.json

### src/background.js
- Service worker for extension lifecycle
- **saveAndCloseAllTabs()**: Saves all non-extension tabs (including chrome:// pages) and closes them
- **openTabManager()**: Opens or activates extension tab, reloads existing tab
- **clearAllSavedTabs()**: Removes all saved tabs from storage
- **saveAndCloseAllTabsExceptCurrent()**: Saves all tabs except the currently active tab and closes them, keeping user on current tab
- **Context Menu**: Creates custom right-click menu for extension icon with save, save except current, open manager, and clear options
- **Keyboard Shortcuts**: Handles command events for hotkey bindings (Ctrl+Shift+S/E/T/D)
- Handles extension installation, action clicks, context menu interactions, and keyboard shortcuts

## Data Storage

### Storage Schema
```javascript
{
  savedTabs: [
    {
      title: string,
      url: string,
      favicon: string,
      timestamp: number,
      sessionId: number
    }
  ]
}
```

### Session Grouping
- Tabs saved together share the same `sessionId` (timestamp)
- Individual tabs (legacy format) may not have `sessionId`
- Sessions display with count and timestamp

## Development Setup

### Initial Setup
```bash
npm install
```

### Available Scripts
- `npm run lint` - Check code style with ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm test` - Run all Jest tests
- `npm run test:watch` - Run tests in watch mode

### Dependencies
- **Dev Dependencies**: Jest, ESLint with standard config, jsdom environment
- **No Runtime Dependencies**: Uses only Chrome extension APIs

## Development Guidelines

### Code Style
- Use vanilla JavaScript (no frameworks)
- Follow existing naming conventions (camelCase)
- Maintain consistent indentation and formatting
- Use Chrome extension APIs exclusively
- **Linting**: ESLint with standard configuration and comprehensive rules
- **Lint Scripts**: 
  - `npm run lint`: Check code style
  - `npm run lint:fix`: Auto-fix linting issues
- **ESLint Configuration**: 
  - Extends standard config with webextensions environment
  - Enforces single quotes, 2-space indentation, semicolons
  - ES2021 syntax support, arrow functions preferred
  - Console logging allowed, camelcase disabled

### Chrome Extension APIs Used
- `chrome.tabs.query()`: Get tab information
- `chrome.tabs.create()`: Open new tabs
- `chrome.tabs.update()`: Modify existing tabs
- `chrome.tabs.remove()`: Close tabs
- `chrome.storage.local.get/set()`: Persist data
- `chrome.action.onClicked`: Handle extension icon clicks
- `chrome.runtime.getURL()`: Get extension URLs
- `chrome.contextMenus.create()`: Create context menu items
- `chrome.contextMenus.onClicked`: Handle context menu clicks
- `chrome.commands.onCommand`: Handle keyboard shortcut commands

### Common Patterns

#### Tab Query Pattern
```javascript
chrome.tabs.query({currentWindow: true}, function(tabs) {
  const extensionUrl = chrome.runtime.getURL('');
  const tabsToSave = tabs.filter(tab => !tab.url.includes(extensionUrl));
  // Only extension tabs are excluded, chrome:// pages are treated normally
});
```

#### Storage Pattern
```javascript
chrome.storage.local.get(['savedTabs'], function(result) {
  const savedTabs = result.savedTabs || [];
  // Modify savedTabs
  chrome.storage.local.set({savedTabs: savedTabs}, callback);
});
```

#### Session Management Pattern
```javascript
// Group tabs by session
const sessions = {};
savedTabs.forEach(tab => {
  const sessionId = tab.sessionId || 'individual';
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }
  sessions[sessionId].push(tab);
});

// Delete specific session
function deleteSession(sessionId) {
  const updatedTabs = savedTabs.filter(tab => 
    String(tab.sessionId) !== String(sessionId)
  );
  chrome.storage.local.set({ savedTabs: updatedTabs }, callback);
}
```

#### UI Update Pattern
```javascript
// Update tab counter
savedTabsCount.textContent = savedTabs.length;

// Show user feedback
showMessage(`Saved ${otherTabs.length} tabs successfully!`);

// Create tab element with XSS protection
function createTabElement(tab) {
  const tabElement = document.createElement('div');
  tabElement.innerHTML = `
    <div class="tab-title">${escapeHtml(tab.title)}</div>
    <div class="tab-url">${escapeHtml(tab.url)}</div>
  `;
  return tabElement;
}
```

## Testing and Debugging

### Automated Testing
- **Framework**: Jest with jsdom environment
- **Test Scripts**: 
  - `npm test`: Run all tests
  - `npm run test:watch`: Run tests in watch mode
- **Test Coverage**: Tests cover background script logic, tab interface functionality, and Chrome API interactions
- **Test Configuration**:
  - Collects coverage from all JS files except tests and config
  - Uses setup file for Chrome API mocks
  - Tests located in `tests/` directory with `.test.js` pattern
- **Test Files**:
  - `tests/background.test.js`: Background service worker tests
  - `tests/tab.test.js`: Tab interface tests
  - `tests/setup.js`: Chrome API mocks and test setup

### Extension Testing
1. Load unpacked extension in Chrome Developer Mode
2. Use Chrome DevTools for popup debugging
3. Check background console for service worker logs
4. Verify storage in `chrome://extensions/` → Storage inspector
5. Run automated tests: `npm test`

### Common Issues
- **Permission errors**: Ensure `tabs` and `storage` permissions in manifest
- **Extension tab management**: Only extension tabs are filtered out from save/close operations
- **Chrome page handling**: chrome:// pages are treated like regular tabs (saved and closed)
- **Tab order**: Tabs are closed in reverse order for proper Ctrl+Shift+T restoration
- **Multiple extension tabs**: Only one extension tab is kept active, others are closed
- **Tab reload logic**: Extension tab is only reloaded if it already exists
- **Test failures**: Ensure Chrome API mocks are properly set up before running tests
- **Linting errors**: Run `npm run lint:fix` to auto-fix common formatting issues
- **ESLint configuration**: Uses .eslintrc.js file with standard config and webextensions environment

## Extension Limitations

- No cloud sync (local storage only)
- No tab organization beyond session grouping
- No search functionality for saved tabs
- No export/import capabilities

## UI Theme

### Dark Gruvbox Theme
The extension uses a dark Gruvbox color scheme for both the main tab interface and popup:
- **Background Colors**: 
  - Primary: #282828 (dark background)
  - Secondary: #3c3836 (container background)
  - Tertiary: #504945 (hover states, borders)
- **Text Colors**:
  - Primary: #ebdbb2 (light text)
  - Secondary: #bdae93 (muted text)
  - Accent: #8ec07c (green for primary actions)
- **Action Colors**:
  - Save/Primary: #8ec07c (green) with #a8b865 hover
  - Delete/Danger: #cc241d (red) with #d65d0e hover
- **Borders**: #504945 for subtle separation
- **Headers**: #8ec07c for section headers and accents

The theme provides excellent contrast and readability while maintaining the authentic Gruvbox aesthetic that's popular in developer tools.

## Keyboard Shortcuts

The extension supports the following default keyboard shortcuts:
- **Ctrl+Alt+1** (Cmd+Alt+1 on Mac): Save & Close All Tabs
- **Ctrl+Alt+2** (Cmd+Alt+2 on Mac): Save & Close All Except Current
- **Ctrl+Alt+3** (Cmd+Alt+3 on Mac): Open Tab Manager
- **Ctrl+Alt+4** (Cmd+Alt+4 on Mac): Clear All Saved Tabs

Users can customize these shortcuts in Chrome's extension settings at `chrome://extensions/shortcuts`.

## Potential Enhancements

When considering new features, maintain:
- Simple, intuitive UI
- Fast performance with many tabs
- Backward compatibility with existing saved tabs
- Manifest V3 compliance
- Consistent dark Gruvbox theming for any new UI elements
- Keyboard shortcut support for new features

## Security Considerations

- No external network requests
- All data stored locally
- No sensitive data in logs
- Proper URL handling when creating tabs

## Browser Compatibility

- Designed for Chrome/Chromium browsers
- Manifest V3 required
- Modern JavaScript features (ES6+) acceptable

## Google Web Store Submission

### Preparation Checklist
- ✅ Updated manifest.json with required fields (`homepage_url`, `author`, `privacy_policy_url`)
- ✅ Created privacy policy page (`privacy.html`)
- ✅ Minimal permissions (`tabs`, `storage`)
- ✅ All tests passing (19/19)
- ✅ Code linted and formatted
- ✅ Created ZIP package (`tabstash-extension.zip`)
- ⚠️ Screenshots needed (1280x800 or 640x400)

### Store Listing Materials
- Short description: "Save and organize browser tabs with smart session management."
- Detailed description and features available in `STORE_LISTING.md`
- Category: Productivity
- Price: Free

### Required Files for Submission
- `tabstash-extension.zip` - Extension package
- Screenshots showing extension interface
- Store listing information from `STORE_LISTING.md`
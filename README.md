# TabDog

Save and close all your tabs

## 🚀 Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this directory
4. The TabDog extension will appear in your toolbar

## 📖 Usage

### Basic Usage
- Click the TabDog icon in your toolbar to instantly save all current tabs and open the manager
- The extension will save all tabs (except its own) and close them with one click
- Click on any saved tab to reopen it
- Use "Restore All" buttons to restore entire sessions
- Use the "Clear All Tabs" button to remove all saved tabs

### Extension Tab
- The extension opens in a full tab (not a popup) for better usability
- Only one extension tab is kept active at a time
- The extension tab is automatically refreshed when opened
- See your total saved tabs count right in the header

### ⌨️ Keyboard Shortcuts

TabDog supports the following keyboard shortcuts (customizable in `chrome://extensions/shortcuts`):

- **Alt+Shift+S** - Save & Close All Tabs
- **Alt+Shift+F** - Save & Close All Except Current Tab  
- **Alt+Shift+G** - Save & Close Current Tab
- **Alt+Shift+M** - Open Tab Manager

### 🖱️ Context Menu

Right-click the TabDog icon in your toolbar to access:
- Open Tab Manager
- Save + Close All Tabs
- Save + Close All Tabs Except Current Tab
- Save + Close Current Tab
- Clear All Saved Tabs

## 🛠️ Development

### Quick Setup
```bash
npm i
```

### Available Scripts
- `npm run lint` - Check code style with ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm test` - Run automated tests
- `npm run test:watch` - Run tests in watch mode

## 🧪 Testing

Run tests with:
```bash
npm test
```

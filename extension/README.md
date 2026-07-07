# Parental Keyboard Monitor Extension

## Installation Instructions

### Chrome / Edge / Opera

1. Open the browser and go to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension` folder
5. The extension icon will appear in your toolbar

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file from the extension folder

## How It Works

1. Click the extension icon in your browser toolbar
2. Click **Start Monitoring** to begin capturing keystrokes
3. All keystrokes from ALL TABS will be recorded
4. Click **Open Admin Dashboard** to view captured data
5. Data is organized by Device > Sessions > Individual Keystrokes

## Features

- **Browser-wide capture**: Records keystrokes from all tabs and websites
- **40-second session grouping**: Pauses in typing create separate sessions
- **Password protection**: Password fields are NOT recorded for security
- **Device identification**: Each installation has a unique device ID
- **Admin dashboard**: View all activity organized by device and session

## Privacy Note

This extension is intended for parental control on devices you own. Password fields are automatically excluded from monitoring for security reasons.

## Files

- `manifest.json` - Extension configuration
- `content.js` - Runs on every page to capture keystrokes
- `background.js` - Service worker that saves data to Supabase
- `popup.html/js` - Extension popup UI
- `admin.html/js` - Dashboard to view captured keystrokes

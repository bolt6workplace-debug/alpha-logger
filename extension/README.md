# Parental Keyboard Monitor

A professional parental control application for monitoring keyboard activity on devices you own.

---

## IMPORTANT: What This App Does

This app records all keyboard strokes typed on a device and saves them to a secure cloud database. It is designed for:

- **Parents** monitoring their children's computer activity
- **Device owners** tracking keyboard usage on their own devices

**This is NOT malware.** It is a legitimate parental control tool that:
- Requires explicit user consent before monitoring
- Stores data securely in a cloud database
- Can be uninstalled at any time
- Does NOT capture password fields (for security)

---

## Installation Guide

### Part 1: Installing the Web Application

The web application lets you view the admin dashboard from any browser.

#### Step-by-Step Instructions:

1. **Download the Project**
   - Download this entire project folder to your computer
   - Remember where you saved it (e.g., `Desktop/keyboard-monitor`)

2. **Install Node.js** (if you don't have it)
   - Go to: https://nodejs.org/
   - Download and install the "LTS" version
   - After installation, open your terminal/command prompt and type `node --version` to verify it works

3. **Open Your Terminal/Command Prompt**
   - **Windows**: Press `Win + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
   - **Linux**: Press `Ctrl + Alt + T`

4. **Navigate to the Project Folder**
   ```bash
   cd Desktop/keyboard-monitor
   ```
   (Replace with your actual folder location)

5. **Install Dependencies**
   ```bash
   npm install
   ```
   Wait for this to complete (about 30 seconds)

6. **Start the Application**
   ```bash
   npm run dev
   ```

7. **Open in Browser**
   - Open Chrome, Firefox, or Edge
   - Go to: `http://localhost:3000`
   - You should see the monitoring page

8. **Using the App**
   - Click "Start Monitoring" to begin recording keystrokes
   - Type anywhere on the page - keystrokes will be captured
   - Click "Admin" in the top navigation
   - Enter password: `862412`
   - View all recorded keystrokes in the admin dashboard

---

### Part 2: Installing the Chrome Extension (For Browser-Wide Monitoring)

The extension captures keystrokes from ALL browser tabs, not just the web app.

#### Step-by-Step Instructions:

1. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Click the three dots (menu) in the top-right corner
   - Hover over "More tools"
   - Click "Extensions"
   - OR simply type this address: `chrome://extensions/`

2. **Enable Developer Mode**
   - Look for a toggle switch called "Developer mode" in the TOP-RIGHT corner
   - Click it to turn it ON (it should turn blue)
   - You'll see new buttons appear

3. **Load the Extension**
   - Click the button that says "Load unpacked" (left side)
   - A file browser window will open
   - Navigate to your project folder
   - Select the folder called `extension`
   - Click "Select Folder"

4. **Verify Installation**
   - You should now see "Parental Keyboard Monitor" in your extensions list
   - You'll see a keyboard icon in your Chrome toolbar (top-right)

5. **Using the Extension**
   - Click the keyboard icon in your toolbar
   - Click "Start Monitoring" button
   - The extension will now capture ALL keystrokes from ALL tabs
   - Click "Open Admin Dashboard" to view captured data

---

## How to Use the Application

### Monitor Page (Main Screen)

1. When you first open the app, you'll see a consent popup
2. Click "Start Monitoring" to begin
3. The status will change from "Inactive" to "Active" (green)
4. Start typing - every keystroke will be recorded
5. You'll see:
   - **Total Keystrokes**: How many keys you've typed
   - **Sessions**: How many typing sessions (pauses create new sessions)
   - **Today**: Keystrokes typed today

### Admin Dashboard

1. Click "Admin" in the top navigation
2. Enter the admin password: `862412`
3. You'll see:
   - All registered devices
   - Total keystrokes across all devices
   - Sessions and daily statistics

4. **View Device Details**
   - Click on any device card
   - See all typing sessions from that device

5. **View Session Keystrokes**
   - Click on any session
   - See exactly what was typed, with timestamps

6. **Clear All Data**
   - Scroll to "Danger Zone"
   - Click "Clear All Data" to delete everything

---

## Changing the Admin Password

To change the admin password:

1. Open the file `src/main.js`
2. Find line that says: `const ADMIN_PASSWORD = '862412';`
3. Change `862412` to your desired password
4. Save the file
5. The app will reload automatically

---

## Troubleshooting

### "I don't see the start popup"
- Clear your browser storage: Open Developer Tools (F12) > Application > Clear Storage > Clear site data
- Refresh the page

### "Keystrokes aren't being recorded"
- Make sure you clicked "Start Monitoring"
- Check that the status shows "Active" (green)
- Check the browser console for errors (F12)

### "Extension not working"
- Go to `chrome://extensions/`
- Make sure the extension is enabled (toggle is blue)
- Click the refresh icon on the extension card
- Make sure you clicked "Start Monitoring" in the extension popup

### "Admin page won't open"
- Make sure you're entering the correct password: `862412`
- Check for any error messages

### "I want to completely reset the app"
- Open Developer Tools (F12)
- Go to Application > Storage
- Click "Clear site data"
- Refresh the page

---

## Privacy & Legal

- This tool is for monitoring devices you OWN
- Use responsibly and in accordance with local laws
- Inform users that they are being monitored
- Password fields are NEVER recorded (for security)
- Data is stored securely in a cloud database

---

## Files Included

| File | Purpose |
|------|---------|
| `index.html` | Main web application |
| `src/main.js` | Application logic |
| `src/styles.css` | Styling |
| `package.json` | Dependencies |
| `extension/` | Chrome extension files |

---

## Support

If you encounter issues:
1. Check the browser console for errors (press F12)
2. Make sure all dependencies are installed (`npm install`)
3. Try clearing browser storage and refreshing

---

## License

This software is provided for legitimate parental control purposes only. Misuse is prohibited.

# KeyMonitor Pro - Parental Keyboard Monitor

**Monitor everything your child types across ALL browser tabs, from anywhere.**

---

## How the System Works

There are **two parts** to this system:

| Part | What It Does | Who Uses It |
|------|-------------|-------------|
| **Chrome Extension** | Installs on child's device, records every keystroke across all tabs silently | Child's device |
| **Admin Dashboard** | Shows all recorded keystrokes from all devices | You (the parent) |

**Flow:**
1. You install the Chrome extension on your child's computer
2. You click "Start Monitoring" in the extension — that's it
3. Everything they type in Chrome (any tab, any website) is saved
4. You log into the Admin Dashboard from your own device to read everything

---

## PART 1: Installing the Chrome Extension on the Child's Device

> Do this on your child's computer or laptop (not yours)

### Step 1: Get the Extension Files

You need to have this project folder on the child's computer.

**Option A: Copy the folder**
- Copy the entire `extension` folder to a USB drive
- Plug into the child's computer
- Copy the `extension` folder somewhere on their computer (e.g., Documents)

**Option B: Download from your project link**
- If the project is hosted online, download the `extension` folder

---

### Step 2: Open Chrome Extensions Page

On the child's computer:
1. Open **Google Chrome**
2. In the address bar at the top, type exactly this and press **Enter**:
   ```
   chrome://extensions/
   ```
3. A page called "Extensions" will open

---

### Step 3: Turn On Developer Mode

On the Extensions page:
1. Look at the **top-right corner** of the page
2. You'll see a toggle switch that says **"Developer mode"**
3. Click that toggle to turn it **ON** (it should turn blue)
4. Three new buttons will appear: "Load unpacked", "Pack extension", "Update"

---

### Step 4: Load the Extension

1. Click the **"Load unpacked"** button (it's on the left)
2. A file browser window will open
3. Navigate to where you saved the `extension` folder
4. **Click on the `extension` folder** to select it (don't go inside it)
5. Click **"Select Folder"** (or "Open" on Mac)
6. The extension "KeyMonitor - Parental Control" will appear in the list

---

### Step 5: Start Monitoring

1. Look at the **top-right of the Chrome browser** — you'll see a puzzle piece icon
2. Click the puzzle piece, then find **"KeyMonitor - Parental Control"**
3. Click the **pin icon** next to it so it shows permanently in the toolbar
4. Click the **KeyMonitor icon** in the toolbar
5. A small popup appears with a green button
6. Click **"Start Monitoring"**
7. The button changes to red "Stop Monitoring" — monitoring is now ACTIVE

> The child does NOT need to do anything else. The extension runs silently in the background.

---

### What Gets Recorded

- Every key pressed on any website, any tab
- The time and page URL where it was typed
- Grouped into sessions automatically
- Password fields are **NEVER recorded** (browser security)

---

## PART 2: Viewing the Data (Admin Dashboard)

> Do this on YOUR device (not the child's)

### Step 1: Open the Web App

Go to the URL where this app is hosted (e.g., `http://localhost:3000` if running locally).

### Step 2: Click "Admin"

Click the **"Admin"** button in the top-right navigation bar.

### Step 3: Enter Password

Enter the admin password: **862412**

### Step 4: View All Data

You will see:
- **Total Keystrokes** — total keys recorded across all devices
- **Devices** — number of devices being monitored
- **Sessions** — number of typing sessions
- **Today** — keystrokes typed today

Click any **Device** to see its sessions.
Click any **Session** to read the exact keystrokes.

---

## Changing the Admin Password

1. Open `src/main.js` in any text editor
2. Find this line near the top:
   ```javascript
   const ADMIN_PASSWORD = '862412';
   ```
3. Replace `862412` with your new password
4. Save the file

---

## Running the Web App Locally

### Requirements
- Node.js (download from https://nodejs.org/)

### Steps

1. Open terminal/command prompt in the project folder
2. Run:
   ```bash
   npm install
   npm run dev
   ```
3. Open your browser and go to `http://localhost:3000`

---

## Troubleshooting

### Extension not showing in Chrome
- Make sure "Developer mode" is ON (blue toggle in chrome://extensions/)
- Make sure you selected the `extension` **folder**, not a file inside it

### "Load unpacked" button not visible
- Developer mode is not turned on — look for the toggle in top-right corner

### Keystrokes not appearing in Admin
- Make sure you clicked "Start Monitoring" in the extension popup
- The extension icon in the toolbar should show it's active
- Try refreshing the Admin page

### Can't access Admin page
- Password is: `862412`
- Make sure you're on the admin tab

### Extension stops working
- Go to chrome://extensions/ and make sure it's still enabled
- If the computer restarted, the extension is still installed but you may need to click "Start Monitoring" again in the popup

---

## Privacy & Legal

This tool is designed for monitoring devices you own, for parental control purposes. Users are responsible for complying with all applicable privacy and monitoring laws in their jurisdiction.

---

## Admin Password (default)

```
862412
```

Change it in `src/main.js` as described above.

# KeyMonitor Pro - Parental Keyboard Monitor

**A professional-grade parental control keyboard monitoring system.**

---

## What This App Does

This is a keyboard monitoring application designed for parents who want to supervise their children's computer usage. Here's how it works:

1. **Send the link** to your child's device
2. **They click "Start Monitoring"** on the popup
3. **Everything they type** on that page is recorded
4. **You view it all** in the Admin Dashboard

---

## Step-by-Step Installation Guide

### Prerequisites (Things You Need Before Starting)

1. **Node.js** - Download from: https://nodejs.org/
   - Click the "Download" button for your system
   - Run the installer and follow the prompts
   - Restart your computer after installation

2. **A code editor** (optional but recommended)
   - VS Code: https://code.visualstudio.com/
   - Or use Notepad/TextEdit

---

### Step 1: Download This Project

**Option A: If you received a ZIP file**
1. Find the ZIP file in your Downloads folder
2. Right-click and select "Extract All"
3. Choose a location like your Desktop
4. Open the extracted folder

**Option B: If you have Git installed**
```bash
git clone <repository-url>
cd keylogger-app
```

---

### Step 2: Open Terminal/Command Prompt

**On Windows:**
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. Type: `cd Desktop\keylogger-app` (or wherever you extracted it)

**On Mac:**
1. Press `Command + Space`
2. Type `Terminal` and press Enter
3. Type: `cd ~/Desktop/keylogger-app`

**On Linux:**
1. Open your terminal app
2. Navigate to the project folder

---

### Step 3: Install Dependencies

Type this command in your terminal and press Enter:

```bash
npm install
```

Wait for it to finish (this may take 1-2 minutes). You'll see a progress bar.

---

### Step 4: Set Up Environment Variables

1. Create a file named `.env` in the project root folder
2. Open it in any text editor
3. Add these lines:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note:** Replace the values with your actual Supabase credentials. If you don't have these, the app won't connect to the database.

---

### Step 5: Run the Application

In your terminal, type:

```bash
npm run dev
```

You should see something like:
```
VITE v5.x.x ready in xxx ms
Local: http://localhost:3000
```

Open your web browser and go to: **http://localhost:3000**

---

## How to Use the App

### For the Parent (Admin)

1. **Share the URL** - Send `http://localhost:3000` to your child's device
   - Note: For local testing, both devices need to be on the same network
   - For remote access, you'll need to deploy the app

2. **Access the Admin Dashboard**
   - Click the "Admin" button in the top right
   - Enter the password: **862412**
   - View all recorded keystrokes from all devices

3. **Change the Admin Password**
   - Open `src/main.js` in a text editor
   - Find line: `const ADMIN_PASSWORD = '862412';`
   - Change `862412` to your new password
   - Save the file and restart the app

### For the Child (Monitored Device)

1. Open the link in their browser
2. Click the **"Start Monitoring Now"** button on the popup
3. The page will start recording their keystrokes
4. A green indicator shows monitoring is active

---

## Understanding the Interface

### Monitor Page
- **Status Banner**: Shows if monitoring is active (green = recording)
- **Total Keystrokes**: All keys typed on this device
- **Sessions**: Number of recording sessions
- **Today**: Keys typed today
- **Device ID**: Unique identifier for this device
- **Reset Device**: Clears and creates a new device ID

### Admin Dashboard
- **Total Keystrokes**: All keystrokes across all devices
- **Devices**: Number of unique devices monitored
- **Sessions**: Total recording sessions
- **Devices List**: Click a device to see its sessions
- **Sessions List**: Click a session to view keystrokes
- **Danger Zone**: Delete all recorded data

---

## How Data is Stored

All keystroke data is stored securely in a **Supabase PostgreSQL database**:

- **typing_sessions table**: Records each monitoring session
- **keystroke_logs table**: Stores every individual keystroke

The data persists even after:
- Browser refresh
- Browser close
- Computer restart

---

## Security & Privacy Features

1. **Password fields are never recorded** for security
2. **Admin access is password protected**
3. **Device IDs are unique and anonymous**
4. **Data is stored in a secure cloud database**

---

## Troubleshooting

### "npm install" fails
- Make sure Node.js is installed
- Try: `npm install --force`

### Page shows "Loading..." forever
- Check your .env file has correct Supabase credentials
- Check your internet connection

### Keystrokes not recording
- Make sure you clicked "Start Monitoring Now"
- Check that the status shows "Recording Active" with a green dot
- Password fields are intentionally not recorded

### Admin page not opening
- Make sure you're using the correct password: `862412`
- Check browser console for errors (F12 > Console)

### Can't access from another device
- For local testing, use localhost only
- For network access, you may need to configure your firewall
- For remote access, deploy to a hosting service

---

## Deploying to Production

To make the app accessible over the internet:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to a hosting service:**
   - Vercel: `npx vercel`
   - Netlify: Upload the `dist` folder
   - Any static hosting service

3. **Update environment variables** on your hosting platform

---

## Legal Disclaimer

This tool is designed for legitimate parental control purposes on devices you own. Users are responsible for complying with all applicable laws regarding monitoring and privacy in their jurisdiction. Always inform family members about monitoring in accordance with local regulations.

---

## Changing Admin Password

1. Open `src/main.js` with any text editor
2. Find this line near the top:
   ```javascript
   const ADMIN_PASSWORD = '862412';
   ```
3. Change `862412` to your desired password
4. Save the file
5. Restart the dev server (`Ctrl+C` then `npm run dev`)

---

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript
- **Framework**: Vite (for fast development)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Can be deployed anywhere static sites work

---

## Need Help?

If you encounter any issues:
1. Check the Troubleshooting section above
2. Check browser console for error messages (F12 > Console)
3. Verify your Supabase connection settings

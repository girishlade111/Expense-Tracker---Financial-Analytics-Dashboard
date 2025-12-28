# Expense Tracker - Setup Instructions

## Quick Fix for "Unable to Load Data" Error

You're seeing a **400 Bad Request** error because your Google Sheet needs to be configured for public access.

### Step 1: Make Your Google Sheet Public

1. **Open your Google Sheet:** [Click here](https://docs.google.com/spreadsheets/d/1Armz9c9Tr1mXeGWymyhgUOhhw0cA_QvyTAcc2Q6uA9w/edit?usp=sharing)

2. **Click the "Share" button** (top right corner, green button)

3. **Change access settings:**
   - Click "Change" next to "Restricted"
   - Select **"Anyone with the link"**
   - Ensure permission is set to **"Viewer"**
   - Click **"Done"**

4. **Click "Copy link"** to confirm it's shareable

### Step 2: Verify API Key Settings

1. Go to [Google Cloud Console - API Credentials](https://console.cloud.google.com/apis/credentials)

2. Find your API Key (ends with `...8JE`)

3. Click the **Edit** (pencil) icon

4. Under **Application restrictions:**
   - Select **"HTTP referrers (web sites)"**
   - Click **"+ ADD AN ITEM"**
   - Add: `file:///*` (for local testing)
   - Add: `http://localhost:*` (for web server)

5. Under **API restrictions:**
   - Select **"Restrict key"**
   - Check **"Google Sheets API"**

6. Click **"Save"**

### Step 3: Test the Fix

**Option A - Quick Test (Direct File):**
1. Close your browser tab completely
2. Open `index.html` again
3. Wait a few seconds for data to load

**Option B - Recommended (Local Web Server):**
```bash
# In Command Prompt or PowerShell, navigate to the Expense folder:
cd C:\Users\a\Downloads\Expense

# Start a simple web server (choose one):

# Python 3
python -m http.server 8000

# OR Node.js
npx serve -p 8000
```

Then open: `http://localhost:8000/index.html`

---

## Features

✅ **Read-Only Interface** - View only, no editing capabilities  
✅ **Real-Time Sync** - Auto-refreshes every 60 seconds  
✅ **Financial Analytics** - Income, Expenses, Balance, Transaction Count  
✅ **Category Breakdown** - Visual progress bars showing spending by category  
✅ **Transaction History** - All 6 columns from your Google Sheet  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Matte Black Theme** - Modern, professional appearance  

---

## Troubleshooting

### Still seeing errors?

1. **Test API directly** - Open this URL in your browser:
   ```
   https://sheets.googleapis.com/v4/spreadsheets/1Armz9c9Tr1mXeGWymyhgUOhhw0cA_QvyTAcc2Q6uA9w/values/Table1!A2:F?key=AIzaSyDJ9pXCdrVBLO6xK-rbr4qf2CIAxLuy8JE
   ```
   - If you see JSON data → Sheet permissions are correct ✅
   - If you see an error → Follow Step 1 again

2. **Check sheet name** - Your sheet tab must be named exactly **"Table1"** (case-sensitive)

3. **Verify data format** - Row 1 should have headers, data starts from Row 2

4. **Browser console** - Press F12 and check Console tab for detailed error messages

---

## How It Works

1. **Google Sheets** - You maintain all data in your spreadsheet
2. **Automatic Sync** - App fetches data every 60 seconds
3. **Analytics** - Calculations happen in real-time in the browser
4. **Display** - Modern dashboard shows all your financial data

---

## Support

If you continue experiencing issues:
- Verify the sheet URL is correct
- Ensure API key is active in Google Cloud Console
- Try using a local web server instead of opening the file directly
- Check that Google Sheets API is enabled in your Google Cloud project
# Expense-Tracker---Financial-Analytics-Dashboard

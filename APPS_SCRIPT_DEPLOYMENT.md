# 🚀 Google Apps Script Deployment Guide

## SheetBrain AI - Google Sheets Add-on

This guide will help you deploy the SheetBrain AI add-on to your Google Sheets.

---

## 📋 Prerequisites

- Google Account
- Access to Google Sheets
- Backend deployed at: `https://sheetbrain-ai.vercel.app`

---

## 🎯 Quick Deployment (5 Minutes)

### **Option 1: Direct Copy-Paste (Recommended)**

1. **Open Google Sheets**
   - Go to [sheets.google.com](https://sheets.google.com)
   - Open an existing sheet or create a new one

2. **Open Apps Script Editor**
   - Click `Extensions` → `Apps Script`
   - This opens the script editor in a new tab

3. **Copy the Main Script**
   - Delete any existing code in `Code.gs`
   - Open [`apps-script-standalone-code.js`](apps-script-standalone-code.js) from this repository
   - Copy the entire file contents
   - Paste into `Code.gs` in the Apps Script editor

4. **Create the Sidebar HTML**
   - In Apps Script editor, click the `+` next to Files
   - Select `HTML` file
   - Name it `sidebar` (without .html extension)
   - Delete any existing content
   - Open [`apps-script/src/ui/sidebar.html`](apps-script/src/ui/sidebar.html)
   - Copy the entire file contents
   - Paste into the `sidebar.html` file

5. **Save and Deploy**
   - Click the floppy disk icon (💾) or press `Ctrl+S` to save
   - Name your project: `SheetBrain AI`
   - Click `Run` → Select `onOpen` function
   - Authorize the app (see Authorization section below)

6. **Test the Add-on**
   - Go back to your Google Sheet
   - Refresh the page (`F5` or `Ctrl+R`)
   - You should see a new menu: `🧠 SheetBrain AI`

---

### **Option 2: Build from Source (Advanced)**

```bash
# Navigate to apps-script directory
cd apps-script

# Install dependencies
pnpm install

# Build the project
pnpm build

# The output will be in dist/
# Copy dist/bundle.js content to Google Apps Script
```

---

## 🔐 Authorization Steps

When you first run the script, Google will ask for permissions:

1. **Click "Review Permissions"**
2. **Choose your Google account**
3. **Click "Advanced"** (if you see a warning)
4. **Click "Go to SheetBrain AI (unsafe)"**
5. **Click "Allow"** to grant permissions

**Permissions Required:**

- ✅ View and manage spreadsheets
- ✅ Display and run third-party web content
- ✅ Connect to an external service (SheetBrain API)

---

## 🎨 Using the Add-on

### **1. Open the Audit Panel**

```
Menu: 🧠 SheetBrain AI → 📊 Audit Formulas
```

### **2. Select Formulas to Audit**

- Click and drag to select cells with formulas
- Or select a single cell with a formula
- The add-on will analyze all formulas in the selection

### **3. Run Audit**

- Click the "🔍 Audit Selected Formulas" button
- Wait for analysis (usually 2-5 seconds)

### **4. Review Results**

Each formula will show:

- ✅ **Compliance Status**: Compliant or Non-Compliant
- 🎯 **Risk Level**: Low, Medium, or High
- 📋 **Issues Found**: Specific problems detected
- 💡 **Recommendations**: AI-powered suggestions
- 🔧 **Apply Button**: One-click formula fixes

---

## ⚙️ Configuration

### **Set Organization ID**

```
Menu: 🧠 SheetBrain AI → ⚙️ Settings
```

- **Organization ID**: Your company/team identifier
- **Department**: Finance, HR, Operations, etc.
- Click "Save Settings"

This customizes policy enforcement for your organization.

---

## 📤 Uploading Policies

### **Add Custom Policies**

```
Menu: 🧠 SheetBrain AI → 📤 Upload Policy
```

1. Enter policy title (e.g., "Financial Reporting Guidelines")
2. Enter policy content (copy-paste your policy document)
3. Click OK
4. Policy will be used in future audits

---

## 🔧 Advanced Configuration

### **Change Backend URL** (for self-hosted deployments)

```javascript
// In Code.gs, modify the CONFIG object:
const CONFIG = {
  BACKEND_URL: 'https://your-custom-domain.com',
  TIMEOUT_MS: 30000,
};
```

---

## 🧪 Testing & Debugging

### **Test Authentication**

```javascript
// Add this function to Code.gs
function testAuth() {
  try {
    const token = getAuthToken();
    Logger.log('Auth successful: ' + token.substring(0, 20) + '...');
  } catch (error) {
    Logger.log('Auth failed: ' + error.message);
  }
}
```

Run this function from the Apps Script editor to verify authentication.

### **Test API Connection**

```javascript
// Add this function to Code.gs
function testConnection() {
  const response = UrlFetchApp.fetch('https://sheetbrain-ai.vercel.app/api/health');
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}
```

### **View Logs**

```
Apps Script Editor → View → Logs (or Ctrl+Enter)
```

---

## 📝 Example Usage

### **Scenario: Audit Financial Formulas**

1. Open your financial spreadsheet
2. Select cells containing budget formulas (e.g., B2:B50)
3. Click `🧠 SheetBrain AI` → `📊 Audit Formulas`
4. Review results:
   - ✅ 45 formulas compliant
   - ⚠️ 3 medium risk (missing error handling)
   - ❌ 2 high risk (circular references)
5. Click "Apply Suggestion" on high-risk formulas
6. Re-run audit to verify fixes

---

## 🛠️ Troubleshooting

### **Problem: Menu doesn't appear**

**Solution:**

- Refresh the Google Sheet page
- Run `onOpen()` function manually in Apps Script editor
- Check browser console for errors

### **Problem: Authentication fails**

**Solution:**

- Clear stored credentials: Run `logout()` function
- Re-authorize the script
- Verify backend is running: Visit `https://sheetbrain-ai.vercel.app/api/health`

### **Problem: "No range selected" error**

**Solution:**

- Make sure cells are selected before clicking Audit
- Ensure selected cells contain formulas (start with `=`)

### **Problem: API timeout**

**Solution:**

- Reduce selection size (audit fewer cells at once)
- Check internet connection
- Verify backend status

---

## 🔄 Updating the Add-on

To update to a newer version:

1. Open Apps Script editor
2. Replace `Code.gs` content with new version
3. Replace `sidebar.html` content with new version
4. Save and refresh your sheet

---

## 📊 Features Overview

| Feature            | Description                    | Menu Path           |
| ------------------ | ------------------------------ | ------------------- |
| **Audit Formulas** | AI-powered formula analysis    | `📊 Audit Formulas` |
| **Upload Policy**  | Add custom compliance policies | `📤 Upload Policy`  |
| **Settings**       | Configure org ID & department  | `⚙️ Settings`       |
| **Help**           | Quick start guide              | `📖 Help`           |
| **Logout**         | Clear authentication           | `🚪 Logout`         |

---

## 🎯 Best Practices

### **1. Start Small**

- Begin with 10-20 formulas
- Gradually increase to larger ranges

### **2. Use Categories**

- Set department in Settings
- Upload relevant policies for your team

### **3. Regular Audits**

- Audit new formulas before sharing sheets
- Re-audit after major changes

### **4. Apply Suggestions Carefully**

- Review AI suggestions before applying
- Test applied formulas with sample data

---

## 🔒 Security & Privacy

- ✅ **Encrypted Communication**: All API calls use HTTPS
- ✅ **Token-Based Auth**: No passwords stored in sheets
- ✅ **Minimal Permissions**: Only accesses selected ranges
- ✅ **No Data Storage**: Formulas analyzed in real-time
- ✅ **Organization Isolation**: Your policies stay private

---

## 📞 Support

### **Issues & Bugs**

- Report issues: [GitHub Issues](https://github.com/yocho1/SheetBrain-AI/issues)
- Email: support@sheetbrain.ai

### **Documentation**

- Full docs: [docs.sheetbrain.ai](https://github.com/yocho1/SheetBrain-AI)
- API reference: [api.sheetbrain.ai/docs](https://sheetbrain-ai.vercel.app/api/health)

### **Community**

- Discord: [Join our server](#)
- Twitter: [@SheetBrainAI](#)

---

## 📜 License

MIT License - See [LICENSE](LICENSE) file

---

## 🎉 You're All Set!

Your SheetBrain AI add-on is now ready to use. Start auditing formulas and improving your spreadsheet quality!

**Next Steps:**

1. ✅ Select some formulas
2. ✅ Click "Audit Formulas"
3. ✅ Review the AI-powered insights
4. ✅ Apply suggestions to improve your formulas

Happy auditing! 🧠✨

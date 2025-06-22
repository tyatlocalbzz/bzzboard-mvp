# How to Access Google Drive Settings

## 📍 **Where to Find the Settings**

### **Step 1: Navigate to Integrations**
1. **From Dashboard**: Tap your profile avatar → **Account** → **Integrations**
2. **Direct URL**: Go to `/account/integrations`

### **Step 2: Connect Google Drive (if not already connected)**
1. Find the **Google Drive** integration card
2. Tap **Connect** 
3. Follow the OAuth flow to authorize Buzzboard
4. You'll be redirected back to the integrations page

### **Step 3: Access Organization Settings**
1. Once Google Drive is connected, you'll see an expandable section below the integration card
2. Tap **Organization Settings** to expand the settings preview
3. Tap **Configure** to open the full settings dialog

## ⚙️ **Available Settings**

### **1. Parent Folder Selection**
- **Purpose**: Choose where all your client folders will be created
- **Default**: Root Drive (`/My Drive`)
- **Options**: Browse and select any folder in your Google Drive

**Example Structures:**
```
Option A: Business Folder
/My Drive/
├── Personal Files/
└── Buzzboard Content/          ← All clients here
    ├── Acme Corp/
    └── TechStart Inc/

Option B: Year Organization  
/My Drive/
└── Content Production/
    ├── 2024/                   ← Current year
    │   ├── Acme Corp/
    │   └── TechStart Inc/
    └── 2023/                   ← Previous year
```

### **2. Auto-Create Year Folders**
- **Purpose**: Automatically organize clients by year
- **When Enabled**: Creates year folders (e.g., `2024/`) inside your parent folder
- **When Disabled**: Creates client folders directly in parent folder

### **3. Client Folder Naming Pattern**
- **Client Only**: `Acme Corp`
- **Year-Client**: `2024 - Acme Corp`  
- **Custom Template**: Use variables like `{year}-{month} {client}`

### **4. Live Preview**
- Shows exactly how your folder structure will look
- Updates in real-time as you change settings
- Helps visualize the organization before applying

## 🎯 **Quick Access Path**

```
Dashboard → Profile → Account → Integrations → Google Drive → Organization Settings → Configure
```

## 📱 **Mobile Navigation**

1. **Tap** the hamburger menu (if using bottom nav)
2. **Tap** your profile avatar
3. **Tap** "Account" 
4. **Tap** "Integrations"
5. **Scroll** to Google Drive section
6. **Tap** "Organization Settings" to expand
7. **Tap** "Configure" button

## 🔄 **Settings Auto-Load**

- Settings automatically load when you connect Google Drive
- Changes are saved immediately when you modify them
- Settings persist across sessions and devices

## 🛠️ **Troubleshooting**

### **Settings Not Loading**
- Ensure Google Drive is connected
- Check your internet connection
- Try refreshing the integrations page

### **Can't Browse Folders**
- Verify Google Drive permissions are granted
- Check that your access token is valid
- Try disconnecting and reconnecting Google Drive

### **Settings Not Saving**
- Ensure you have an active internet connection
- Check browser console for any errors
- Try refreshing and configuring again

## 💡 **Best Practices**

### **For Freelancers**
```
Parent Folder: /My Drive/Client Work/
Year Folders: Enabled
Naming: Client Only
Result: /My Drive/Client Work/2024/Acme Corp/
```

### **For Agencies**
```
Parent Folder: /My Drive/Agency Projects/
Year Folders: Disabled  
Naming: Year-Client
Result: /My Drive/Agency Projects/2024 - Acme Corp/
```

### **For Multi-Business**
```
Parent Folder: /My Drive/Photography Business/
Year Folders: Enabled
Naming: Custom → "{month}-{year} {client}"
Result: /My Drive/Photography Business/2024/01-2024 Acme Corp/
```

The settings provide maximum flexibility while maintaining clean, professional organization of your content files. 
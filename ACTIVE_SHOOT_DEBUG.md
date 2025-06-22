# Active Shoot Page Loading Issue - Debug Guide

## 🔍 **Issue Description**
The active shoot page shows "Loading..." indefinitely when starting a shoot and navigating to the active shoot view.

## 🛠️ **Debugging Steps Implemented**

### **1. Enhanced Console Logging**
Added comprehensive logging to track the data loading process:

```javascript
// In src/app/shoots/[id]/active/page.tsx
console.log('🔍 Loading active shoot data for ID:', shootId)
console.log('📊 Received data:', data)
console.log('📊 Data type:', typeof data)
console.log('📊 Data keys:', data ? Object.keys(data) : 'null')
```

### **2. Fallback Data Implementation**
Added fallback data to unblock the UI if API returns invalid structure:

```javascript
const fallbackData: ActiveShootData = {
  shoot: {
    id: parseInt(shootId),
    title: "Active Shoot",
    client: "Demo Client",
    // ... other fields
  },
  postIdeas: [/* demo post ideas */]
}
```

### **3. Direct API Calls**
Bypassed the `useAsync` hook to eliminate potential async handling issues:

```javascript
// Direct call instead of useAsync
const data = await shootsApi.fetchActiveShootData(shootId)
```

### **4. Improved Loading State Management**
Added `isInitialLoading` state to better control loading indicators:

```javascript
const [isInitialLoading, setIsInitialLoading] = useState(true)
```

## 🧪 **Testing Instructions**

### **Step 1: Open Browser Console**
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Clear any existing logs

### **Step 2: Start a Shoot**
1. Navigate to `/shoots`
2. Click on any shoot
3. Click "Start" button
4. Navigate to active shoot page

### **Step 3: Check Console Logs**
Look for these log messages:

**Expected Success Flow:**
```
🔍 Loading active shoot data for ID: 49
🔍 fetchActiveShootData called with shootId: 49
📊 Raw shoot data: {shoot object}
📊 Raw post ideas: {post ideas array}
✅ Returning active shoot data: {complete data}
📊 Received data: {complete data}
📊 Data type: object
📊 Data keys: ["shoot", "postIdeas"]
✅ Active data set successfully
🏁 Loading completed, isInitialLoading set to false
✅ Rendering active shoot page with data: {data}
```

**Error Flow (if API fails):**
```
🔍 Loading active shoot data for ID: 49
❌ Error in fetchActiveShootData: {error details}
❌ Error loading data: {error}
🔄 Using fallback data after error: {fallback data}
🏁 Loading completed, isInitialLoading set to false
✅ Rendering active shoot page with data: {fallback data}
```

## 🚨 **Potential Issues to Look For**

### **1. API Call Failures**
- Network errors
- TypeScript compilation errors
- Invalid shoot ID

### **2. Data Structure Mismatches**
- Missing `shoot` or `postIdeas` properties
- Incorrect type structure
- Null/undefined responses

### **3. Context Issues**
- Active shoot context not properly initialized
- Hydration timing issues
- localStorage conflicts

### **4. Authentication Issues**
- User not logged in
- Session expired
- Permission denied

## 🔧 **Quick Fixes to Try**

### **Fix 1: Clear Browser Storage**
```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### **Fix 2: Hard Refresh**
- Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- This clears any cached JavaScript

### **Fix 3: Check Network Tab**
- Look for failed API requests
- Check for 404, 500, or other HTTP errors

## 📋 **Expected Results After Fixes**

1. **Console shows successful data loading logs**
2. **Active shoot page displays with:**
   - Shoot client name in header
   - Timer showing elapsed time
   - Progress bar
   - Post ideas with shots
   - "End Shoot" button

3. **No infinite loading state**
4. **Fallback data displayed if API fails**

## 🆘 **If Still Not Working**

1. **Check the exact console error messages**
2. **Verify the shoot ID in the URL**
3. **Ensure you're logged in**
4. **Try with a different shoot**
5. **Check if the development server is running properly**

The enhanced debugging should now provide clear visibility into what's happening during the loading process. 
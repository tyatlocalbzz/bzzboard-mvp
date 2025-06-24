# 🧹 Mock Data Cleanup Guide

This guide will help you remove all sample/mock data from your BzzBoard MVP and start fresh with your real clients.

## 📋 What Was Cleaned Up

### ✅ Completed Cleanup Tasks

1. **Mock Client Data Removed**
   - Removed `mockClients` array from `src/lib/types/client.ts`
   - Kept only the "All Clients" default client for the selector

2. **Database Sample Data**
   - Created `cleanup-mock-data.sql` script to remove all sample data
   - Preserves user accounts and integrations
   - Resets auto-increment sequences to start fresh

3. **API Fallback Data Removed**
   - Removed mock folder data from Google Drive browse API
   - Removed fallback data from storage settings components
   - Updated error handling to show proper errors instead of mock data

4. **Frontend Mock Data Cleaned**
   - Removed sample shoots and post ideas from dashboard (`src/app/page.tsx`)
   - Removed fallback data from active shoot page
   - Updated date logic to use current date instead of fixed demo dates

5. **Development Helpers Removed**
   - Deleted `src/lib/db/seed.ts` file completely
   - Updated API layer to use real endpoints instead of mock responses

## 🗄️ Database Cleanup

### Step 1: Run the Cleanup Script

Execute the following SQL script in your database (Supabase SQL editor or direct connection):

```sql
-- Run the contents of cleanup-mock-data.sql
```

This will:
- Remove all sample clients, shoots, post ideas, and relationships
- Reset ID sequences to start from 1
- Preserve your user accounts and integration settings

### Step 2: Verify Cleanup

After running the script, you should see:
- ✅ 0 records in clients, shoots, post_ideas, shoot_post_ideas tables
- ✅ Your user accounts preserved in users table
- ✅ Your integration settings preserved in integrations table

## 🚀 Starting Fresh

### Your Clean Slate Includes:

1. **User Authentication** ✅
   - Your user accounts are preserved
   - Sign-in/sign-out functionality works
   - Account settings and profiles intact

2. **Integration Settings** ✅
   - Google Drive connection status preserved
   - Google Calendar connection status preserved
   - All integration settings and tokens maintained

3. **Clean Data Tables** ✅
   - No sample clients
   - No demo shoots
   - No test post ideas
   - Ready for your real data

### Next Steps:

1. **Add Your First Real Client**
   - Go to Settings → Client Settings
   - Click "Add New Client" 
   - Enter your actual client information

2. **Configure Storage Settings**
   - Set up Google Drive folder structure for each client
   - Configure naming patterns and organization preferences

3. **Create Your First Shoot**
   - Navigate to Shoots page
   - Click "Schedule New Shoot"
   - Add real post ideas and shot lists

4. **Test the Workflow**
   - Schedule a shoot with real post ideas
   - Use Active Shoot mode during your session
   - Upload content to your configured Google Drive folders

## 🔧 What Still Works

- ✅ User authentication and accounts
- ✅ Google Drive integration (if connected)
- ✅ Google Calendar integration (if connected)
- ✅ Client management system
- ✅ Shoot scheduling and management
- ✅ Post idea creation and tracking
- ✅ Active shoot mode
- ✅ File upload and organization
- ✅ Settings and preferences

## 🚨 Important Notes

1. **No More Fallback Data**: Error states now show proper errors instead of demo data
2. **Real API Calls**: All functionality now requires proper API responses
3. **Clean Start**: ID sequences start from 1 for your first real entries
4. **Preserved Integrations**: Your Google Drive/Calendar connections remain intact

## 🐛 If You Encounter Issues

1. **Empty Dashboard**: This is expected! Add your first client to see data
2. **Google Drive Errors**: Ensure your Google Drive integration is properly connected
3. **Missing Data**: Check that you've added clients and shoots through the UI
4. **API Errors**: Check browser console for specific error messages

## 📞 Ready to Use

Your BzzBoard MVP is now clean and ready for production use with your real clients and shoots!

Start by adding your first client in Settings → Client Settings, then create your first shoot to test the full workflow. 
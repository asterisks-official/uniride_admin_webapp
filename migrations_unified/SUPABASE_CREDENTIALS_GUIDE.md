# 🔑 Supabase Credentials Guide

## What Credentials Do You Need?

For **UniRide** to work with Supabase, you need these 2 credentials:

### 1. **Supabase URL**
- Format: `https://xxxxxxxxxxxxx.supabase.co`
- Used to connect your app to your database

### 2. **Supabase Anon Key** (Public API Key)
- Format: Long string starting with `eyJ...`
- Safe to use in client-side code
- Has Row Level Security (RLS) restrictions

---

## 📍 Where to Find Them

### Step-by-Step:

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Select Your Project**
   - Click on your project name from the list
   - If you don't have a project, click "New Project"

3. **Go to Project Settings**
   - Click the ⚙️ **Settings** icon in the left sidebar (bottom)
   - Or click your project name → **Settings**

4. **Click "API" in Settings Menu**
   ```
   Settings → API
   ```

5. **Copy Your Credentials**
   
   You'll see a page with:
   
   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   ↑ This is your Supabase URL
   
   **API Keys:**
   - `anon` `public` - ✅ **This is what you need**
   - `service_role` `secret` - ⚠️ Never use in client apps!

---

## 📋 Visual Guide

```
Supabase Dashboard
└── Your Project
    └── ⚙️ Settings (left sidebar)
        └── API
            ├── Project URL: https://xxxxx.supabase.co  ← Copy this
            └── Project API keys:
                ├── anon public: eyJhbG...  ← Copy this
                └── service_role: eyJhbG...  ← DON'T use in app
```

---

## 🔧 Where to Use Them

### In Flutter App (`lib/main.dart`):

```dart
await Supabase.initialize(
  url: 'YOUR_SUPABASE_URL',           // ← Paste Project URL here
  anonKey: 'YOUR_SUPABASE_ANON_KEY',  // ← Paste anon public key here
);
```

### Example:

```dart
await Supabase.initialize(
  url: 'https://abcdefghijklmnop.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMjE1...',
);
```

---

## ⚠️ Important Security Notes

### ✅ Safe to Use in Client Apps:
- **Supabase URL** - Yes, public
- **Anon Key** - Yes, protected by RLS policies

### ❌ NEVER Use in Client Apps:
- **Service Role Key** - Server-only, bypasses RLS
- **Database Password** - Direct database access

### 🔒 Why Anon Key is Safe:
- Row Level Security (RLS) protects your data
- Users can only access data they're allowed to see
- Firebase JWT authentication adds extra security

---

## 🆕 Creating a New Project

If you don't have a Supabase project yet:

1. **Go to:** https://supabase.com/dashboard
2. **Click:** "New Project"
3. **Fill in:**
   - **Name:** `uniride` (or any name)
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to your users
   - **Plan:** Free tier is fine for development
4. **Click:** "Create new project"
5. **Wait:** ~2 minutes for project setup
6. **Go to:** Settings → API (follow steps above)

---

## 📝 How to Save Credentials

### Option 1: Environment Variables (Recommended for Production)
Create `.env` file in project root:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Add `.env` to `.gitignore`** to avoid committing secrets!

### Option 2: Hardcode (OK for Development)
Put directly in `lib/main.dart`:
```dart
await Supabase.initialize(
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key-here',
);
```

---

## 🔍 Verify Your Credentials

### Test Connection in Dart:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  await Supabase.initialize(
    url: 'YOUR_URL',
    anonKey: 'YOUR_KEY',
  );
  
  // Test connection
  final response = await Supabase.instance.client
    .from('rides')
    .select('count')
    .execute();
    
  print('Connected! ${response.data}');
}
```

---

## 🆘 Troubleshooting

### "Invalid API key"
- ❌ Wrong key format
- ✅ Copy the **anon public** key, not service_role

### "Connection failed"
- ❌ Wrong URL format
- ✅ Include `https://` and `.supabase.co`

### "Table doesn't exist"
- ❌ Migrations not run yet
- ✅ Run SQL migrations first (see QUICK_START.md)

### "RLS policy violation"
- ❌ User not authenticated
- ✅ Sign in with Firebase first

---

## 📦 Full Setup Checklist

- [ ] Create Supabase project
- [ ] Copy Project URL from Settings → API
- [ ] Copy anon public key from Settings → API
- [ ] Add credentials to Flutter app (`lib/main.dart`)
- [ ] Run database migrations (see migrations_unified folder)
- [ ] Test connection with a simple query
- [ ] Set up Firebase authentication
- [ ] Enable RLS policies

---

## 🎯 Next Steps

1. ✅ Get your Supabase credentials (follow guide above)
2. 🔧 Add them to your Flutter app
3. 🗄️ Run database migrations from `migrations_unified` folder
4. 🧪 Test the connection
5. 🚀 Start building!

---

## 📞 Need Help?

**Supabase Docs:**
- Dashboard: https://supabase.com/dashboard
- API Docs: https://supabase.com/docs/guides/api
- Flutter Guide: https://supabase.com/docs/guides/getting-started/quickstarts/flutter

**UniRide Migrations:**
- See `migrations_unified/QUICK_START.md` for database setup
- See `migrations_unified/README.md` for detailed guide

---

**Last Updated:** November 21, 2025
**Supabase Free Tier:** ✅ Sufficient for development and small apps

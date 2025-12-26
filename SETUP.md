# Habit Tracker - Setup Guide

This guide will walk you through setting up the Habit Tracker application from scratch.

## Step-by-Step Setup

### 1. Install Node.js

If you don't have Node.js installed:

1. Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
2. Run the installer
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `habit-tracker-app` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 3. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"
5. Enable **Google**:
   - Click on "Google"
   - Toggle "Enable"
   - Select support email
   - Click "Save"

### 4. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Select **"Start in production mode"**
4. Choose a location (closest to your users)
5. Click "Enable"

### 5. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the **Web** icon (`</>`)
4. Enter app nickname: "Habit Tracker Web"
5. Click "Register app"
6. Copy the `firebaseConfig` object - you'll need this!

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 6. Configure Environment Variables

1. In your project folder, copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and paste your Firebase config values:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   ```

### 7. Install Dependencies

```bash
# Install main app dependencies
npm install

# Install Cloud Functions dependencies (optional for now)
cd functions
npm install
cd ..
```

### 8. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you should see the login page!

### 9. Test Authentication

1. Click "Sign Up"
2. Enter email, password, and display name
3. Click "Sign Up"
4. You should be redirected to the dashboard

### 10. Deploy Firestore Security Rules

Install Firebase CLI:
```bash
npm install -g firebase-tools
```

Login to Firebase:
```bash
firebase login
```

Initialize Firebase in your project:
```bash
firebase init
```

Select:
- **Firestore** (rules and indexes)
- **Functions** (optional, for Cloud Functions)
- **Hosting** (optional, for deployment)

Use existing project and select your Firebase project.

Deploy security rules:
```bash
firebase deploy --only firestore:rules
```

### 11. Add Your First Habit

1. In the dashboard, click "Add Habit"
2. Enter habit name: "Morning Exercise"
3. Add description (optional)
4. Select "Daily"
5. Click "Create Habit"
6. Check the checkbox to mark it complete!

### 12. Deploy Cloud Functions (Optional)

For automatic daily resets at midnight:

1. Upgrade to Blaze plan in Firebase Console:
   - Go to **Usage and billing** > **Details & settings**
   - Click "Modify plan"
   - Select "Blaze (Pay as you go)"

2. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

### 13. Deploy to Production

Build the app:
```bash
npm run build
```

Deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

Your app is now live at: `https://your-project.web.app`

## Troubleshooting

### "Firebase App not initialized"
- Make sure `.env.local` has all required variables
- Restart the dev server: `npm run dev`

### "Permission denied" errors
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Make sure you're logged in

### Cloud Functions not working
- Ensure you're on Blaze plan
- Check logs: `firebase functions:log`

### Port 3000 already in use
```bash
# Use a different port
npm run dev -- -p 3001
```

## Next Steps

1. ✅ Create more habits
2. ✅ Test on mobile device
3. ✅ Share with friends
4. ✅ Build your streak!

For more help, see the main [README.md](README.md) or open an issue on GitHub.

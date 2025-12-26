# 🎯 Gamified Habit Tracker - SaaS Web Application

A modern, full-stack habit tracking application built with **Next.js**, **Firebase**, and **TypeScript**. Track your daily habits, build streaks, earn points, and achieve your goals with real-time synchronization across all your devices.

![Habit Tracker](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-10-orange?style=for-the-badge&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwind-css)

## ✨ Features

- 🔐 **User Authentication**: Google Sign-in and Email/Password authentication
- 📊 **Real-time Sync**: Changes sync instantly across all devices
- 🎨 **Premium Dark UI**: Beautiful dark mode with green accent colors
- 📈 **Visual Progress**: Animated health bar shows daily completion percentage
- 🔥 **Streak Tracking**: Build streaks and earn points for consistency
- ⏰ **Daily Auto-Reset**: Cloud Functions automatically reset habits at midnight UTC
- 🔒 **Data Privacy**: Firestore security rules ensure users only access their own data
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **Backend**: Firebase (BaaS)
  - **Authentication**: Firebase Auth (Google OAuth, Email/Password)
  - **Database**: Cloud Firestore (NoSQL, real-time)
  - **Automation**: Cloud Functions (scheduled tasks)
  - **Hosting**: Firebase Hosting

### Database Schema

```
users/{userId}
  ├── email: string
  ├── displayName: string
  ├── createdAt: Timestamp
  └── lastLoginAt: Timestamp
  
  └── habits/{habitId}
      ├── title: string
      ├── description: string
      ├── category: 'daily' | 'weekly' | 'monthly'
      ├── isCompleted: boolean
      ├── streak: number
      ├── points: number
      └── currentDate: string
  
  └── stats/summary
      ├── totalPoints: number
      ├── currentStreak: number
      ├── habitsCompletedToday: number
      └── healthBarPercentage: number
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm installed
- **Firebase** account (free tier works fine)
- **Git** for version control

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/habit-tracker-app.git
cd habit-tracker-app
```

### 2. Install Dependencies

```bash
# Install main app dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or select existing)
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable **Email/Password**
   - Enable **Google**
4. Create **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in **production mode** (we'll deploy security rules later)
   - Choose a location
5. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps" > Web app
   - Copy the config object

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 5. Deploy Firestore Security Rules

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore (rules and indexes)
# - Functions
# - Hosting

# Deploy security rules
firebase deploy --only firestore:rules
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Deploy Cloud Functions (Optional for Development)

Cloud Functions are needed for the daily habit reset automation:

```bash
# Deploy functions to Firebase
firebase deploy --only functions
```

**Note**: Cloud Functions require the **Blaze (Pay-as-you-go) plan**. The free tier is generous, but you need to upgrade from the Spark plan.

## 📦 Deployment

### Deploy to Firebase Hosting

1. Build the Next.js app for production:

```bash
npm run build
```

2. Export static files (if using static export):

```bash
# Add to package.json scripts:
"export": "next export"

npm run export
```

3. Deploy to Firebase:

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

### Deploy to Vercel (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts and add environment variables
```

## 🔧 Configuration

### Customizing the Daily Reset Time

Edit `functions/src/index.ts`:

```typescript
// Change the cron schedule (currently midnight UTC)
.schedule('0 0 * * *') // Format: 'minute hour day month dayOfWeek'

// Examples:
// '0 6 * * *'  = 6:00 AM UTC daily
// '0 0 * * 1'  = Midnight every Monday
```

### Changing Theme Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  primary: {
    500: '#10b981', // Main accent color (green)
    // Customize other shades
  }
}
```

## 📁 Project Structure

```
habit-tracker-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── login/              # Authentication page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── auth/               # Authentication components
│   │   └── habits/             # Habit tracking components
│   ├── lib/                    # Utilities and configs
│   │   ├── firebase.ts         # Firebase initialization
│   │   ├── auth.ts             # Auth helpers
│   │   ├── firestore.ts        # Database operations
│   │   └── hooks/              # Custom React hooks
│   └── types/                  # TypeScript types
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       └── index.ts            # Daily reset & stats functions
├── public/                     # Static assets
├── firestore.rules             # Firestore security rules
├── firebase.json               # Firebase configuration
└── package.json
```

## 🛡️ Security

### Firestore Security Rules

The app uses strict security rules to ensure data privacy:

- Users can only read/write their own data
- Each user's habits, stats, and history are isolated
- Cloud Functions use Admin SDK to bypass rules for automation

### Authentication

- Google OAuth 2.0 for social login
- Firebase Auth handles password hashing and security
- Session tokens automatically managed by Firebase SDK

## 🎨 UI Components

### Main Components

- **HabitList**: Displays all habits with real-time updates
- **HabitItem**: Individual habit checkbox with streak/points
- **HealthBar**: Animated progress bar (changes color based on completion)
- **AddHabitModal**: Dialog for creating new habits
- **LoginForm**: Email/password and Google sign-in

## 🧪 Testing

### Test Authentication Flow

1. Sign up with email/password
2. Sign out and sign in with Google
3. Verify data persists across sessions

### Test Real-time Sync

1. Open app in two different browsers/devices
2. Make changes in one
3. Verify instant updates in the other

### Test Cloud Functions

```bash
# Run functions locally
cd functions
npm run serve

# Test the daily reset (manual trigger)
firebase functions:shell
> dailyHabitReset()
```

## 🐛 Troubleshooting

### Firebase Not Initializing

- Check `.env.local` has correct credentials
- Ensure all `NEXT_PUBLIC_` prefixes are present
- Restart dev server after changing env vars

### Cloud Functions Not Deploying

- Ensure you're on Blaze plan
- Check `functions/package.json` dependencies are installed
- Run `firebase login` to re-authenticate

### Firestore Permission Denied

- Deploy security rules: `firebase deploy --only firestore:rules`
- Ensure user is authenticated before accessing data
- Check userId matches authenticated user's UID

## 📝 Future Enhancements

- [ ] Weekly and monthly habit tracking
- [ ] Custom habit colors and icons
- [ ] Analytics and trend charts
- [ ] Habit categories and tags
- [ ] Social features (share progress)
- [ ] Push notifications for reminders
- [ ] Per-user timezone support
- [ ] Dark/light theme toggle
- [ ] Export data to CSV

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Firebase](https://firebase.google.com/)

---

**Happy habit tracking! 🎯**

For questions or support, please open an issue on GitHub.

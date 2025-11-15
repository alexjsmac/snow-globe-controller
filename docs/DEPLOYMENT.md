# Firebase Deployment Guide

## 🚀 Complete Firebase Deployment

This guide will help you deploy the Snow Globe Controller (Christmas Theme Selection Queue System) to Firebase Hosting with Realtime Database and Firestore.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project with Realtime Database and Firestore enabled
- Environment variables configured
- Node.js 18+ installed

## Step 1: Firebase Setup

### Enable Firebase Services

**Realtime Database:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to "Build" → "Realtime Database"
4. Click "Create Database"
5. Choose "Start in test mode" (we'll update rules later)
6. Select your preferred location (choose closest to your users)

**Firestore Database:**

1. Navigate to "Build" → "Firestore Database"
2. Click "Create Database"
3. Choose "Start in test mode"
4. Select your preferred location (same as Realtime Database recommended)

### Get Database URL

1. In Realtime Database, copy the database URL
2. It looks like: `https://your-project-default-rtdb.firebaseio.com/`
3. Add this to your `.env.local` as `NEXT_PUBLIC_FIREBASE_DATABASE_URL`

## Step 2: Environment Configuration

Create `.env.local` with your Firebase config:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Admin Dashboard Password
NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your-secure-password

# Optional: Firebase Admin SDK (for TouchDesigner token generation)
FIREBASE_ADMIN_SERVICE_ACCOUNT=path/to/firebase-admin-key.json
```

**Where to find these values:**
1. Firebase Console → Project Settings → General
2. Scroll to "Your apps" section
3. Select your web app or create one
4. Copy the Firebase configuration values

## Step 3: Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# ✓ Hosting: Configure files for Firebase Hosting
# ✓ Realtime Database: Configure a realtime database and rules file
# ✓ Firestore: Configure Firestore and rules file
```

When prompted:

- **Database rules file**: Use `database.rules.json` (already created)
- **Firestore rules file**: Use `firestore.rules` (already created)
- **Firestore indexes file**: Use `firestore.indexes.json` (already created)
- **Public directory**: Use `out`
- **Single-page app**: Yes
- **Automatic builds with GitHub**: Optional (recommended for CI/CD)
- **Overwrite index.html**: No

## Step 4: Deploy Database Rules

Update your database rules before deploying the application:

```bash
# Deploy Realtime Database rules
firebase deploy --only database

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

This uploads rules from `database.rules.json` and `firestore.rules` to secure your databases.

### Verify Rules Deployment

1. Go to Firebase Console → Realtime Database → Rules
2. Verify the rules match your `database.rules.json` file
3. Go to Firestore → Rules
4. Verify the rules match your `firestore.rules` file

## Step 5: Build and Deploy Application

```bash
# Install dependencies
npm install

# Build for production (creates static export)
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Build outputs:**
- Creates optimized production build
- Exports static files to `out/` directory
- Minifies JavaScript and CSS
- Optimizes images and assets

## Step 6: Verify Deployment

1. Firebase will provide a URL (e.g., `https://your-project.web.app`)
2. Open the URL to verify the application loads
3. Test the queue system:
   - Select a theme (Color, Pattern, Effect)
   - Submit and join queue
   - Open in another tab and submit another theme
   - Verify queue updates in real-time
4. Access admin dashboard at `https://your-project.web.app/admin`
5. Check Firebase Console to see live data in Realtime Database

## TouchDesigner Integration

### Direct Database Access

TouchDesigner can read theme data through Firebase REST API:

**Current Theme Values (Recommended for TouchDesigner):**

```
GET https://your-project-default-rtdb.firebaseio.com/themeValues/current.json
```

**Response:**
```json
{
  "row1": "red",
  "row2": "snowflakes",
  "row3": "sparkle",
  "sessionId": "uuid-string",
  "timestamp": 1234567890000,
  "active": true
}
```

**Queue State:**

```
GET https://your-project-default-rtdb.firebaseio.com/queue.json
```

**Response:**
```json
{
  "activeUser": {
    "sessionId": "uuid-string",
    "startTime": 1234567890000,
    "endTime": 1234567920000,
    "remainingTime": 45
  },
  "waitingUsers": { ... },
  "queueLength": 3
}
```

### TouchDesigner Setup

1. Create a Web Client DAT in TouchDesigner
2. Set URL to the theme values endpoint
3. Set refresh rate to 500ms-1000ms
4. Parse JSON response in Python
5. Map theme values to visual parameters

See `docs/TOUCHDESIGNER.md` for detailed integration guide.

## Maintenance Commands

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only database rules
firebase deploy --only database

# Deploy only Firestore rules and indexes
firebase deploy --only firestore

# View deployment history
firebase hosting:channel:list

# Rollback to previous deployment
firebase hosting:clone SOURCE_CHANNEL:SITE_ID TARGET_CHANNEL:SITE_ID
```

## Environment-Specific Deployments

### Development Environment

```bash
# Use development database
firebase use development
firebase deploy
```

### Production Environment

```bash
# Switch to production
firebase use production

# Deploy with production environment variables
firebase deploy
```

### Preview Channels

```bash
# Create preview deployment
firebase hosting:channel:deploy preview-feature-name

# This creates a temporary URL like:
# https://your-project--preview-feature-name-abc123.web.app
```

## Post-Deployment Checklist

- ✅ Application loads without errors
- ✅ Theme selection works correctly
- ✅ Queue system updates in real-time
- ✅ Admin dashboard is accessible
- ✅ Firebase Realtime Database shows live data
- ✅ Firestore stores session history
- ✅ Multiple users can join queue simultaneously
- ✅ Active user timer counts down correctly
- ✅ Theme transitions work smoothly
- ✅ TouchDesigner can read theme values

## Security Hardening for Production

### Update Database Rules

For production, update `database.rules.json`:

```json
{
  "rules": {
    ".read": true,
    ".write": false,
    "queue": {
      ".write": true
    },
    "themeValues": {
      ".write": true
    }
  }
}
```

### Update Firestore Rules

For production, update `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{document=**} {
      allow read: if true;
      allow write: if request.time < timestamp.date(2024, 12, 31);
    }
  }
}
```

### Enable Firebase App Check

1. Firebase Console → Build → App Check
2. Enable reCAPTCHA v3 for web apps
3. Add your domain to allowed domains
4. Update your application code to use App Check

## Monitoring and Analytics

### Enable Firebase Analytics

```bash
# Initialize Firebase Analytics
firebase init analytics
```

### Monitor Performance

1. Firebase Console → Performance
2. Enable Performance Monitoring
3. Track page load times and API calls

### Set Up Alerts

1. Firebase Console → Alerts
2. Set up alerts for:
   - Database usage exceeding quota
   - Hosting bandwidth limits
   - Error rates
   - Slow queries

## Troubleshooting

### Build Fails

1. Clear Next.js cache: `rm -rf .next`
2. Delete node_modules: `rm -rf node_modules`
3. Reinstall: `npm install`
4. Rebuild: `npm run build`

### Deployment Fails

1. Check Firebase CLI is latest: `npm install -g firebase-tools`
2. Re-authenticate: `firebase login --reauth`
3. Verify project: `firebase projects:list`
4. Check quota limits in Firebase Console

### Application Doesn't Load

1. Check browser console for errors
2. Verify all environment variables are set
3. Check Firebase Hosting deployment logs
4. Verify Firebase configuration is correct

### Theme Values Not Updating

1. Check Realtime Database rules allow writes
2. Verify application is connecting to correct database
3. Check browser network tab for failed requests
4. Test database connection in Firebase Console

### Queue Not Working

1. Verify Realtime Database is enabled and accessible
2. Check security rules allow queue operations
3. Test queue operations in Firebase Console
4. Review application logs for errors

## Cost Optimization

### Firebase Spark (Free) Plan Limits

- **Realtime Database**: 1 GB storage, 10 GB/month downloads
- **Firestore**: 1 GB storage, 50,000 reads/day, 20,000 writes/day
- **Hosting**: 10 GB storage, 360 MB/day transfer

### Optimization Tips

1. **Reduce Database Reads**:
   - Use listeners efficiently
   - Cache data client-side
   - Batch operations when possible

2. **Minimize Writes**:
   - Only update changed values
   - Use transactions for atomic updates
   - Clean up old queue entries

3. **Optimize Hosting**:
   - Enable compression
   - Use CDN caching headers
   - Minimize asset sizes

## Backup and Recovery

### Automated Backups

```bash
# Export Firestore data
gcloud firestore export gs://your-bucket/backups

# Export Realtime Database
firebase database:get / > backup.json
```

### Manual Backup

1. Firebase Console → Realtime Database
2. Click "Export JSON"
3. Save file securely

---

✅ **Your Snow Globe Controller is now deployed and ready for interactive Christmas magic!**

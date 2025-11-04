# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Snow Globe Controller is a Next.js web application that provides a real-time, queue-based interactive control system for TouchDesigner installations. Users join a queue to control various visual effects that are displayed in a physical installation. The system has evolved from a simple slider controller to a Christmas-themed selector with multiple customization options.

## Architecture

### Core Components

**Static Next.js App with Firebase Backend**
- Next.js 15.x frontend with React 19 and TypeScript
- Firebase Realtime Database for real-time state (queue, active users, current values)
- Firebase Firestore for session history and data persistence
- No server-side components - everything runs client-side

**Queue Management System**
- Main queue logic in `lib/queue-manager.ts` handles:
  - User queue ordering and position tracking
  - 60-second timer activation for active users
  - 100ms value sampling during active sessions
  - Automatic progression to next queued user
  - Session data persistence to Firebase Firestore

**Theme Selection System**
- Replaced original slider with theme selection interface
- Three customizable rows (Color, Pattern, Effect) for Christmas-themed installation
- Each theme selection transmits to TouchDesigner via Firebase

**Data Flow**
1. Client generates unique session ID and connects to Firebase
2. User selects theme options and joins queue via Firebase Realtime Database
3. When activated → 60-second timer starts, theme is displayed
4. Theme selections → sent directly to Firebase Realtime DB and Firestore
5. On deactivation → session summary saved to Firestore for TouchDesigner
6. Next user automatically activated from queue via Firebase listeners

## Development Commands

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Static export for hosting (CDN/GitHub Pages)
npm run build && npm run export
```

### Code Quality

```bash
# Run ESLint
npm run lint

# TypeScript type checking (no dedicated script, runs during build)
npm run build
```

### Queue Management Scripts

```bash
# Reset queue in interactive mode
npm run reset-queue

# Quick reset (clears active users and queue only)
npm run reset-queue -- --quick --force

# Full reset (attempts to clear everything including session history)
npm run reset-queue -- --full --force

# Admin reset with service account (requires setup)
npm run admin-reset

# Generate OAuth2 token for TouchDesigner
npm run touchdesigner:token

# Analyze session trends
npm run analyze-trends
```

### Firebase Database Management
```bash
# No local database - all data is stored in Firebase
# View data via Firebase Console:
# - Realtime Database: https://console.firebase.google.com/project/[PROJECT_ID]/database
# - Firestore: https://console.firebase.google.com/project/[PROJECT_ID]/firestore
```

## Environment Configuration

Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```

Required Firebase configuration:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (for Realtime Database)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (use 's3nsora-dev' for development)
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

For admin dashboard access:
- `NEXT_PUBLIC_ADMIN_PASSWORD_HASH`

## Firebase Database Structure

### Realtime Database Paths

**Queue Management** (`/queue`):
- `activeUser`: { sessionId, startTime, endTime, remainingTime }
- `waitingUsers`: { [sessionId]: { sessionId, joinedAt, position } }
- `queueLength`: number
- `themes`: { [sessionId]: { row1, row2, row3, submittedAt } }

**Theme Values** (`/themeValues`):
- `current`: { row1, row2, row3, sessionId, timestamp }

**Slider Values** (Legacy) (`/sliderValues`):
- `current`: { value, normalizedValue, sessionId, timestamp }

### Firestore Collections

- `sessions`: Session summaries with statistics and metadata

## TouchDesigner Integration

The system sends data to Firebase in two ways:

1. **Real-time values** (Realtime Database):
   - `themeValues/current`: Current theme selection for Christmas installation
   - `sliderValues/current`: Legacy slider values (still supported)
   - Public access for TouchDesigner integration (no auth required)
   - Throttled to prevent flooding Firebase

2. **Session summaries** (Firestore Collection: `sessions`):
   - Sent when user's 60-second turn ends
   - Includes: statistics, duration, dataPoints count
   - Requires authentication for access

Generate authentication token for TouchDesigner:
```bash
npm run touchdesigner:token
```

This creates a `touchdesigner-config.json` file with:
- OAuth2 access token for protected Firestore endpoints
- All Firebase endpoint URLs for TouchDesigner
- Token expires after ~1 hour, regenerate as needed

For detailed integration steps, see `docs/TOUCHDESIGNER.md`.

## Key Features

### Admin Dashboard
- Located at `/admin` route
- Password protection via environment variable
- Real-time queue monitoring
- Skip active users, remove queue entries
- Reset queue system
- Configure password via `NEXT_PUBLIC_ADMIN_PASSWORD_HASH`

### Christmas Theme Selection
- Three customizable rows (colors, patterns, effects)
- User interface located in `components/ThemeSelector.tsx`
- Theme options defined in `lib/theme-options.ts`
- Current implementation uses 60-second turns (vs. 30-second in slider mode)

### Real-time Queue Management
- Queue position updates in real-time
- Firebase listeners handle state changes
- Automatic progression to next queued user
- Session data collection and statistics

## Common Development Tasks

### Modifying Queue Duration
Change the timer duration in `lib/queue-manager.ts`:
- Around line ~165: Update `endTime` calculation (60 * 1000 = 60 seconds)
- Around line ~184: Update `setTimeout` duration (60000 = 60 seconds)
- Update progress bar calculation in page.tsx (divide by 60)
- Update duration field in Firestore session summary

### Customizing Theme Options
Edit theme options in `lib/theme-options.ts`:
- `colorOptions`: First row selection options
- `patternOptions`: Second row selection options
- `effectOptions`: Third row selection options
- Each option needs `id`, `name`, and `symbol` properties

### Debugging Connection Issues
1. Check Firebase connection in browser DevTools Console
2. Verify Firebase configuration in `.env.local`
3. Ensure Firebase Realtime Database and Firestore are enabled
4. Check Firebase security rules allow read/write access
5. Enable debug logging in localStorage: `localStorage.debug = 'slider-queue:*'`

### Testing Queue Behavior
Open multiple browser tabs/windows to simulate multiple users:
- Each tab gets unique session ID (stored in localStorage)
- Can test queue ordering, position updates, activation cycling
- Monitor browser console for Firebase connection logs
- View live data in Firebase Console

## Deployment

For full deployment steps, see `docs/DEPLOYMENT.md`.

Quick deployment steps:
1. Set up Firebase project with Realtime Database and Firestore
2. Configure environment variables with Firebase credentials
3. Build and export static site: `npm run build && npm run export`
4. Deploy using Firebase Hosting or any static hosting:
   ```bash
   # Initialize Firebase Hosting
   firebase init hosting
   # Deploy to Firebase
   firebase deploy --only hosting
   ```

## Key Technical Details

### Firebase Realtime Database Structure

**Queue Management** (`/queue`):
- `activeUser`: { sessionId, startTime, endTime, remainingTime }
- `waitingUsers`: { [sessionId]: { sessionId, joinedAt, position } }
- `queueLength`: number

**Slider Values** (`/sliderValues`):
- `current`: { value, normalizedValue, sessionId, timestamp }

**React Hook Events** (`useFirebaseQueue`):
- Real-time listeners automatically update queue position, active status, and remaining time
- No manual event handling needed - Firebase listeners manage all state updates

### State Management

- Client state managed via `useFirebaseQueue` hook (aliased as `useSocket` for backward compatibility)
- Firebase Realtime Database maintains persistent queue state
- Session IDs stored in localStorage for persistence across page reloads
- Active user has exclusive slider control enforced by Firebase security rules

### Data Persistence

**Firebase Firestore Collections:**
- `sessions`: session summaries with statistics only

**Firebase Realtime Database:**
- `queue`: Live queue state and user management
- `sliderValues/current`: Real-time slider values for TouchDesigner

**Value Sampling:**
- Client collects slider values at 100ms intervals during active sessions
- Client throttles slider transmission at 100ms to prevent flooding
- Session summaries saved to Firestore with statistics only (no raw data)

## Common Development Tasks

### Adding New Firebase Operations
1. Add method to `FirebaseQueueManager` class in `lib/firebase-queue.ts`
2. Add corresponding hook method in `hooks/useFirebaseQueue.ts`
3. Update TypeScript interfaces in `lib/types.ts`

### Modifying Queue Duration
Change the timer duration in `lib/firebase-queue.ts`:
- Line 135: Update `endTime` calculation (30 * 1000 = 30 seconds)
- Line 154: Update `setTimeout` duration (30000 = 30 seconds)
- Update duration field in Firestore session summary

### Debugging Connection Issues
1. Check Firebase connection in browser DevTools Console
2. Verify Firebase configuration in `.env.local`
3. Ensure Firebase Realtime Database and Firestore are enabled in Firebase Console
4. Check Firebase security rules allow read/write access

### Testing Queue Behavior
Open multiple browser tabs/windows to simulate multiple users:
- Each tab gets unique session ID (stored in localStorage)
- Can test queue ordering, position updates, activation cycling
- Monitor browser console for Firebase connection logs
- View live data in Firebase Console

## Performance Considerations

- Theme values throttled to prevent Firebase quota exhaustion
- Firebase writes are fire-and-forget to avoid blocking queue operations
- Session statistics saved to Firestore (no raw data) to minimize storage costs
- React re-renders minimized through proper dependency arrays
- Firebase Realtime Database provides efficient real-time updates
- Static export enables CDN deployment for global performance

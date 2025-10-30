# TouchDesigner Queue Controller

A real-time, queue-based interactive control system for TouchDesigner installations. Originally designed for slider control, now featuring a Christmas-themed installation with customizable theme selection.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5.1-black.svg)
![Firebase](https://img.shields.io/badge/Firebase-12.1.0-orange.svg)

## 🎄 Christmas Theme Installation

![Christmas Magic Installation](https://github.com/user-attachments/assets/3d21e848-a614-4d9c-9514-d926c498557e)

The latest version features a Christmas-themed interactive installation where users can:
- **Select a theme** from 3 customizable rows (Color, Pattern, Effect)
- **Join a queue** and wait for their turn
- **See their theme displayed** for 1 minute when it's their turn
- **Experience real-time updates** as the queue progresses

### Theme Options
- **Colors**: 🔴 Red, 🟢 Green, 🟡 Gold
- **Patterns**: ❄️ Snowflakes, ⭐ Stars, 💡 Lights
- **Effects**: ✨ Sparkle, 💫 Pulse, 🌊 Wave

## 🎮 Original Slider Mode

The original slider control system is still available where users can:
- Join a queue to control a slider interface
- Take turns controlling the slider (configurable duration)
- Send real-time values (-1 to 1) to TouchDesigner
- View their queue position and wait time

Perfect for interactive installations, collaborative performances, or live VJ sessions where audience participation enhances the visual experience.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.5, React 19, TailwindCSS
- **Backend**: Firebase Realtime Database + Firestore
- **Database**: Firebase Firestore (session summaries) + Realtime Database (live queue state)
- **Real-time**: Firebase Realtime Database listeners
- **Language**: TypeScript

### Data Flow
```
User → Web Interface → Firebase Realtime DB → Queue Management
                    ↓                              ↓
              Firebase Firestore ← Session Data ←──┘
                    ↓
              TouchDesigner
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn
- Firebase account with Firestore and Realtime Database enabled
- TouchDesigner (for receiving data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/touchdesigner-slider-queue.git
   cd touchdesigner-slider-queue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔥 Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Realtime Database

### Step 2: Get Configuration
1. Go to Project Settings → General
2. Scroll to "Your apps" and add a Web app
3. Copy the configuration object
4. Add values to your `.env.local` file

### Step 3: Set Database Rules

**Firestore Rules** (copy to Firebase Console):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Session summaries - write from web app, read requires authentication
    match /sessions/{sessionId} {
      allow write: if true; // Web app can write session summaries
      allow read: if request.auth != null; // Only authenticated users can read
    }
    
    // System state - requires authentication
    match /system/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Realtime Database Rules** (copy to Firebase Console):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 📡 TouchDesigner Integration

### Firebase Data Sources

**Christmas Theme Mode** - Current theme selection:
   ```json
   // /themeValues/current
   {
     "row1": "green",         // Selected color option
     "row2": "snowflakes",    // Selected pattern option
     "row3": "wave",          // Selected effect option
     "sessionId": "uuid",     // Unique session identifier
     "timestamp": 1234567890  // Unix timestamp
   }
   ```

**Slider Mode** - Current slider value:
   ```json
   // /sliderValues/current
   {
     "value": -0.5,           // Raw slider value (-1 to 1)
     "normalizedValue": 0.25, // Normalized value (0 to 1)
     "sessionId": "uuid",     // Unique session identifier
     "timestamp": 1234567890  // Unix timestamp
   }
   ```

2. **Firestore Collection** - Historical data
   - **`sessions`** - Session summaries with statistics
   ```json
   {
     "sessionId": "uuid",
     "startTime": "2024-08-31T10:00:00.000Z",
     "endTime": "2024-08-31T10:00:30.000Z",
     "duration": 30,          // Seconds
     "dataPoints": 300,       // Total samples
     "statistics": {
       "min": -0.8,
       "max": 0.9,
       "average": 0.1,
       "standardDeviation": 0.45
     }
   }
   ```

### TouchDesigner Setup

1. **Christmas Theme Mode**:
   ```python
   # In TouchDesigner, use Web Client DAT
   # URL: https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/themeValues/current.json
   # Method: GET
   # Poll every 1-5 seconds (themes change every 60 seconds)
   # Parse JSON to get row1, row2, row3 values
   ```

2. **Slider Mode**:
   ```python
   # In TouchDesigner, use Web Client DAT
   # URL: https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/sliderValues/current.json
   # Method: GET
   # Poll every 50-100ms for real-time updates
   ```

2. **Firestore Session History** (requires authentication):
   ```python
   # For session summaries:
   # URL: https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/sessions
   # Requires Bearer token in Authorization header
   ```

3. **Value Processing**:
   - Use `value` field for -1 to 1 range
   - Use `normalizedValue` field for 0 to 1 range
   - Filter by `timestamp` for freshest data

## 🛠️ Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Export static site
npm run export
```

### Project Structure

```
touchdesigner-slider-queue/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main queue interface
├── components/          
│   └── Slider.tsx         # Slider UI component
├── hooks/
│   └── useFirebaseQueue.ts # Firebase React hook
├── lib/
│   ├── firebase.ts        # Firebase configuration
│   ├── firebase-queue.ts  # Firebase queue manager
│   └── types.ts           # TypeScript type definitions
├── public/                # Static assets
├── firestore.rules        # Firestore security rules
└── database.rules.json    # Realtime Database security rules
```

### Key Components

- **FirebaseQueueManager**: Handles user queue ordering, timing, and progression
- **Firebase Realtime Database**: Manages live queue state and current values
- **useFirebaseQueue Hook**: Provides real-time state to React components
- **Slider Component**: Interactive slider with throttled updates

## ⚙️ Configuration

### Modifying Queue Duration

To change the turn duration (currently 60 seconds for Christmas theme), update in `lib/queue-manager.ts`:
- Line ~163: `endTime` calculation (60 * 1000 = 60 seconds)
- Line ~183: `setTimeout` duration (60000 = 60 seconds)
- Update progress bar calculations in component files (divide by 60)

### Adjusting Sampling Rate

The client samples slider values every 100ms. To modify:
- Update throttle value in `hooks/useFirebaseQueue.ts`
- Adjust sampling interval in `lib/firebase-queue.ts`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |

## 🐛 Troubleshooting

### Common Issues

1. **Connection Issues**
   - Check Firebase connection in browser DevTools Console
   - Verify Firebase configuration in `.env.local`
   - Ensure Firebase Realtime Database and Firestore are enabled

2. **Firebase Errors**
   - Verify all Firebase environment variables are set
   - Check Firestore security rules allow write access
   - Confirm Firebase project is active
   - Test Firebase connection with browser console

3. **Queue Not Progressing**
   - Check browser console for Firebase connection errors
   - Verify Firebase Realtime Database rules allow read/write
   - Test with multiple browser windows/tabs

4. **Slider Not Responding**
   - Ensure user is active (position 0 in queue)
   - Check Firebase connection status in console
   - Verify slider component is not disabled

### Firebase Console

View data using Firebase Console:
```
# Realtime Database
https://console.firebase.google.com/project/YOUR_PROJECT_ID/database

# Firestore
https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore

# Current queue state: /queue
# Current slider value: /sliderValues/current
# Session summaries: /sessions collection
```

### Debug Mode

Enable debug logging by setting in browser console:
```javascript
localStorage.setItem('debug', 'slider-queue:*');
```

## 🚀 Production Deployment

### Build for Production

```bash
# Build the Next.js application
npm run build

# Start production server
npm run start
```

### Environment Considerations

- Use environment-specific Firebase projects (dev/staging/prod)
- Configure proper Firebase security rules for production
- Set up Firebase quota monitoring and alerts
- Enable Firebase App Check for additional security
- Consider CDN deployment for static assets

### Recommended Hosting

- **Vercel**: Automatic deployment with Next.js optimization
- **Netlify**: Static site hosting with CDN
- **Firebase Hosting**: Native Firebase integration
- **GitHub Pages**: Free static hosting option
- **Cloudflare Pages**: Fast global CDN

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance & Monitoring

### Performance Metrics
- Slider updates throttled to 100ms intervals
- Firebase handles 300+ data points per 30-second session
- Firebase writes are fire-and-forget for low latency
- Firebase Realtime Database provides sub-100ms updates
- React re-renders optimized with proper dependency arrays

### Monitoring
- Monitor Firebase quota and billing usage
- Track Firebase connection count in console
- Monitor Firestore document count and storage
- Set up uptime monitoring for production

### Scaling Considerations
- Firebase handles scaling automatically
- Use Firebase App Check for DDoS protection
- Implement client-side rate limiting
- Deploy to multiple regions with Firebase
- Use CDN for static assets

## 🧪 Testing

### Manual Testing
- Open multiple browser tabs to simulate multiple users
- Test queue ordering and position updates
- Verify timer functionality and automatic progression
- Test reconnection after network interruption

### Automated Testing (Future)
- Unit tests for queue management logic
- Integration tests for Socket.IO connections
- End-to-end tests for user flows
- Firebase emulator tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add proper error handling
- Update documentation for new features
- Test with multiple concurrent users
- Consider TouchDesigner integration implications

## 📝 API Reference

### Firebase API Reference

**Key Functions in FirebaseQueueManager:**
- `joinQueue(sessionId)`: Add user to queue
- `leaveQueue(sessionId)`: Remove user from queue
- `updateSliderValue(sessionId, value)`: Send slider value
- `listenToQueueState(callback)`: Subscribe to queue updates
- `generateSessionId()`: Create unique session ID

**Firebase Realtime Database Paths:**
- `/queue/activeUser`: Current active user data
- `/queue/waitingUsers/{sessionId}`: User in waiting queue
- `/queue/queueLength`: Number of users waiting
- `/sliderValues/current`: Latest slider value

### Firestore Schema

See the Firebase Integration section above for detailed collection schemas.

## 🔒 Security

- Firestore rules validate data types and value ranges
- No authentication required (public installation focus)
- Rate limiting considerations in production
- Input validation on both client and server
- CORS protection for API endpoints

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built for creative coders and VJ communities
- Inspired by interactive installation art
- Powered by the TouchDesigner community
- Thanks to contributors and testers

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the WARP.md file for technical details
3. Open an issue on GitHub
4. Join the TouchDesigner community forums

---

**Happy coding and happy visuals! 🎨✨**

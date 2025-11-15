# Admin Dashboard Documentation

## Overview

The Snow Globe Controller Admin Dashboard provides real-time monitoring and control of the theme selection queue system. It allows administrators to view queue status, manage users, and reset the system when needed.

## Accessing the Dashboard

Navigate to: `http://localhost:3000/admin` (or your production URL + `/admin`)

### Setting Up Authentication

1. **Set the admin password in your `.env.local` file:**

   ```bash
   NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your_secure_password_here
   ```

2. **Keep this password secure:**
   - Never commit passwords to version control
   - Store passwords in a secure password manager
   - Share with team members through secure channels only
   - Use different passwords for development and production

> ⚠️ **Security Note**: The `.env.local` file should never be committed to Git. It's already in `.gitignore`.

## Dashboard Features

### 1. Real-Time Statistics

The dashboard displays key metrics:

- **Queue Status**: Shows if the system is Active (with a live user) or Idle
- **Queue Length**: Number of users currently waiting
- **Active User Session**: Current user's session ID and remaining time
- **System State**: Real-time connection status

### 2. Queue Management

#### Active User Section

- Displays the currently active user with their session ID
- Shows remaining time in their 60-second session
- Displays the active theme selection:
  - **Color**: Red, Green, or Gold
  - **Pattern**: Snowflakes, Stars, or Lights
  - **Effect**: Sparkle, Pulse, or Wave
- **Skip Button**: Immediately end the current user's session and activate the next user

#### Waiting Users

- Lists all users waiting in the queue with their position
- Each user shows:
  - Session ID (truncated for readability)
  - Queue position number
  - Selected theme preview
- **Remove Button**: Remove any waiting user from the queue

#### Current Theme Display

- Real-time display of the active theme combination
- Visual indicators showing:
  - 🎨 **Color** selection (Red/Green/Gold)
  - ✨ **Pattern** selection (Snowflakes/Stars/Lights)
  - 🎭 **Effect** selection (Sparkle/Pulse/Wave)
- Updates automatically when a new user's theme is activated

### 3. System Controls

#### Quick Reset

- Clears the current queue and theme values
- Preserves session history in Firestore for analytics
- Initializes an empty queue structure
- Resets current theme to default state
- Use when you need to clear a stuck queue without losing historical data

#### Full Reset

- Clears everything including:
  - Current queue and active user
  - All theme values
  - All session history in Firestore
- Use with caution as this removes all historical data
- Requires confirmation before executing
- Use only for complete system resets

### 4. Analytics Dashboard

Access at `/admin/analytics` to view:

- Session completion trends
- Popular theme combinations
- Queue wait times
- User engagement patterns
- Peak usage times

## Technical Implementation

### Authentication

The admin dashboard uses a simple password-based authentication system:

- Password stored in environment variable
- Session persisted in localStorage
- Automatic logout on page navigation
- No external authentication service required

### Real-Time Updates

- Uses Firebase Realtime Database listeners
- Updates automatically when queue state changes
- Real-time theme value monitoring
- No manual refresh needed
- Efficient delta updates for minimal bandwidth

### Firebase Operations

The dashboard can perform these operations:

- Read queue state (via Realtime Database listeners)
- Modify queue structure (add/remove users)
- Skip/remove users from queue
- Activate next user in queue
- Update theme values
- Reset system state
- Clear Firestore sessions (with proper permissions)

## User Flow

1. **Guest Selects Theme**: User chooses color, pattern, and effect
2. **Join Queue**: User submits theme and enters waiting queue
3. **Queue Position**: User sees their position and estimated wait time
4. **Activation**: When it's their turn, countdown timer starts (60 seconds)
5. **Theme Display**: TouchDesigner displays their selected theme
6. **Session Complete**: After 60 seconds, session is saved and next user activated
7. **Go Again**: User can select a new theme and rejoin the queue

## Admin Monitoring

### What Admins Can See

- All waiting users with their selected themes
- Current active user and their remaining time
- Queue length and system status
- Real-time theme changes
- Session completion history

### Admin Actions

**Skip Current User:**

- Immediately ends the active session
- Saves session data to Firestore
- Activates next user in queue
- Use when a user's session needs to be cut short

**Remove Waiting User:**

- Removes a specific user from the waiting queue
- Deletes their theme selection
- Updates queue positions for remaining users
- Use to manage inappropriate submissions or stuck users

**Clear Queue:**

- Removes all waiting users
- Clears all stored theme selections
- Resets queue to empty state
- Keeps active user if present

**Full Reset:**

- Stops active session
- Clears entire queue
- Resets theme values to default
- Deletes all session history
- Use only for complete system restart

## Security Considerations

### For Development

Set a simple password in your `.env.local` file for local development:

```bash
NEXT_PUBLIC_ADMIN_PASSWORD_HASH=admin123
```

### For Production

1. **Change the Admin Password**:

   ```bash
   # In production .env file
   NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your-secure-production-password
   ```

2. **Firebase Security Rules**:
   - Currently set to allow all reads/writes for development
   - For production, implement proper authentication:
     - Use Firebase Authentication for admin users
     - Add role-based access control
     - Restrict write operations to authenticated admins

3. **Network Security**:
   - Deploy over HTTPS only
   - Consider IP whitelisting for admin dashboard
   - Use environment variables for all secrets
   - Enable Firebase App Check for additional security

### Recommended Production Setup

```javascript
// Example: Production Realtime Database rules
{
  "rules": {
    ".read": true,
    ".write": "auth != null && auth.token.admin === true",
    "queue": {
      ".write": true  // Allow queue operations
    },
    "themeValues": {
      ".write": true  // Allow theme updates
    }
  }
}
```

## Troubleshooting

### Cannot Access Admin Dashboard

1. Check that the server is running: `npm run dev`
2. Verify the URL: `http://localhost:3000/admin`
3. Check browser console for errors
4. Ensure Firebase is properly configured

### Login Issues

1. Verify `NEXT_PUBLIC_ADMIN_PASSWORD_HASH` is set in `.env.local`
2. Clear browser localStorage and try again
3. Check browser console for authentication errors
4. Restart development server after changing environment variables

### Queue Not Updating

1. Check Firebase connection in browser DevTools
2. Verify Firebase configuration in `.env.local`
3. Ensure Firebase Realtime Database is enabled in Firebase Console
4. Check database rules allow read access
5. Look for JavaScript errors in browser console

### Theme Not Displaying

1. Verify `themeValues/current` exists in Realtime Database
2. Check that active user has a valid theme selection
3. Ensure TouchDesigner is connected and reading from correct endpoint
4. Verify theme values are valid options (red/green/gold, etc.)

### Reset Operations Failing

1. Check Firebase security rules allow write access
2. Verify admin is logged in
3. Check browser console for Firebase errors
4. Ensure Firebase project has Firestore enabled (for full reset)
5. Try clearing browser cache and reloading

### Performance Issues

1. Check number of concurrent listeners (should be minimal)
2. Verify Firebase quota hasn't been exceeded
3. Monitor network tab for excessive requests
4. Check for memory leaks in browser DevTools

## Support

For additional help:

- Check Firebase Console for quota and error logs
- Review browser console for JavaScript errors
- Verify all environment variables are correctly set
- Ensure Firebase project is properly configured with Realtime Database and Firestore

---

✅ **Admin dashboard provides complete control over the Christmas theme installation queue system!**

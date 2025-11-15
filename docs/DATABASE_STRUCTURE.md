# Firebase Database Architecture

The Snow Globe Controller uses a **dual-database approach** with Firebase:

- **Realtime Database**: Live queue state and current theme values
- **Firestore**: Session summaries and historical data

## Firebase Realtime Database Schema

> Used for real-time queue management and current theme display

```json
{
  "queue": {
    "activeUser": {
      "sessionId": "uuid-string",
      "startTime": 1234567890000,
      "endTime": 1234567890000,
      "remainingTime": 60
    },
    "waitingUsers": {
      "user-uuid-1": {
        "sessionId": "user-uuid-1",
        "joinedAt": 1234567890000,
        "position": 1
      },
      "user-uuid-2": {
        "sessionId": "user-uuid-2",
        "joinedAt": 1234567890000,
        "position": 2
      }
    },
    "themes": {
      "user-uuid-1": {
        "row1": "red",
        "row2": "snowflakes",
        "row3": "sparkle",
        "submittedAt": 1234567890000
      },
      "user-uuid-2": {
        "row1": "green",
        "row2": "stars",
        "row3": "pulse",
        "submittedAt": 1234567890000
      }
    },
    "queueLength": 2
  },
  "themeValues": {
    "current": {
      "row1": "red",
      "row2": "snowflakes",
      "row3": "sparkle",
      "sessionId": "uuid-string",
      "timestamp": 1234567890000,
      "active": true
    }
  }
}
```

### Theme Options

**Row 1 - Colors:**

- `red` - Classic Christmas red (🔴)
- `green` - Traditional Christmas green (🟢)
- `gold` - Elegant golden accents (🟡)

**Row 2 - Patterns:**

- `snowflakes` - Delicate winter snowflakes (❄️)
- `stars` - Twinkling holiday stars (⭐)
- `lights` - Festive Christmas lights (💡)

**Row 3 - Effects:**

- `sparkle` - Gentle sparkling animation (✨)
- `pulse` - Rhythmic pulsing effect (💫)
- `wave` - Flowing wave motion (🌊)

## Firebase Firestore Collections

> Used for session summaries and historical analytics

### `sessions` Collection

```json
{
  "sessionId": "uuid-string",
  "startTime": 1234567890000,
  "endTime": 1234567920000,
  "duration": 60,
  "queueJoinTime": 1234567850000,
  "queueWaitTime": 40,
  "theme": {
    "row1": "red",
    "row2": "snowflakes",
    "row3": "sparkle"
  },
  "createdAt": 1234567920000
}
```

**Fields:**

- `sessionId`: Unique identifier for the session
- `startTime`: When the theme became active (Unix timestamp)
- `endTime`: When the session ended (Unix timestamp)
- `duration`: Length of session in seconds (default: 60 seconds)
- `queueJoinTime`: When user joined the queue
- `queueWaitTime`: Time spent waiting in queue (seconds)
- `theme`: The selected theme combination
- `createdAt`: Firestore document creation timestamp

## Realtime Database Rules

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "queue": {
      "activeUser": {
        ".validate": "newData.hasChildren(['sessionId', 'startTime', 'endTime'])"
      },
      "waitingUsers": {
        "$userId": {
          ".validate": "newData.hasChildren(['sessionId', 'joinedAt'])"
        }
      },
      "themes": {
        "$userId": {
          ".validate": "newData.hasChildren(['row1', 'row2', 'row3', 'submittedAt'])"
        }
      }
    },
    "themeValues": {
      "current": {
        ".validate": "newData.hasChildren(['row1', 'row2', 'row3', 'sessionId', 'timestamp'])"
      }
    }
  }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write to sessions collection
    match /sessions/{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Data Flow

1. **User Selection**: User selects theme options (color, pattern, effect)
2. **Join Queue**: Theme is stored in `queue/themes/{sessionId}` and user added to `queue/waitingUsers`
3. **Activation**: When user's turn comes, their theme is copied to `themeValues/current` and they become `activeUser`
4. **Display**: TouchDesigner reads from `themeValues/current` to display the active theme
5. **Completion**: After 60 seconds, session is saved to Firestore `sessions` collection
6. **Next User**: Next waiting user is automatically activated

## Queue Management

### Position Calculation

Users in `waitingUsers` are sorted by `joinedAt` timestamp to determine queue position:

- Position 1 = oldest `joinedAt` (next to be activated)
- Position 2 = second oldest
- etc.

### Session Duration

- Default active session: **60 seconds**
- Countdown timer updates in real-time
- Automatic progression to next user

### Admin Operations

Admins can:

- Skip current active user
- Remove waiting users
- Clear entire queue
- Reset system state

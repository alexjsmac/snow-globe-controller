# TouchDesigner Firebase Integration

This guide shows how to connect TouchDesigner to your Firebase theme selection queue system using Web Client DATs to read real-time Christmas theme data.

## 🚀 Quick Start

### 1. Install Dependencies (Optional - for token generation)

```bash
npm install firebase-admin google-auth-library
```

### 2. Get Firebase Service Account Key (Optional)

Only needed if you want to access authenticated Firestore endpoints for analytics:

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your Project
2. Navigate to **Project Settings** → **Service Accounts**
3. Click **"Generate new private key"**
4. Save the JSON file as `firebase-admin-key.json` in your project root

### 3. Generate Authentication Token (Optional)

```bash
# Generate OAuth token for authenticated Firestore access
npm run touchdesigner:token
```

This creates `touchdesigner-config.json` with authenticated access for Firestore session history.

### 4. Configure TouchDesigner

#### Web Client DAT Setup

1. **Create Web Client DAT** in TouchDesigner
2. **Set Request Method**: `GET`
3. **Set Request URL** to one of:
   - **Current theme** (recommended): `https://YOUR_PROJECT-default-rtdb.firebaseio.com/themeValues/current.json`
   - **Queue state**: `https://YOUR_PROJECT-default-rtdb.firebaseio.com/queue.json`
   - **Session history** (requires auth): `https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/sessions`

4. **Add Headers** (only for authenticated Firestore endpoints):
   - **Header 1**: `Authorization` = `Bearer YOUR_ACCESS_TOKEN`
   - **Header 2**: `Content-Type` = `application/json`

5. **Configure Auto-refresh**: Set to 500-1000ms for real-time updates

## 📡 Available Endpoints

### 🟢 Public Access (No Authentication Required)

Perfect for real-time TouchDesigner integration:

#### Current Theme Values

```bash
GET https://YOUR_PROJECT-default-rtdb.firebaseio.com/themeValues/current.json
```

**Response:**

```json
{
  "row1": "red", // Color: red, green, or gold
  "row2": "snowflakes", // Pattern: snowflakes, stars, or lights
  "row3": "sparkle", // Effect: sparkle, pulse, or wave
  "sessionId": "abc123", // Current user's session ID
  "timestamp": 1234567890000,
  "active": true // Whether a theme is currently active
}
```

**Theme Value Options:**

- **row1 (Colors)**: `red`, `green`, `gold`
- **row2 (Patterns)**: `snowflakes`, `stars`, `lights`
- **row3 (Effects)**: `sparkle`, `pulse`, `wave`

#### Queue State

```bash
GET https://YOUR_PROJECT-default-rtdb.firebaseio.com/queue.json
```

**Response:**

```json
{
  "activeUser": {
    "sessionId": "abc123",
    "startTime": 1234567890000,
    "endTime": 1234567950000,
    "remainingTime": 45
  },
  "waitingUsers": {
    "user1": {
      "sessionId": "user1",
      "joinedAt": 1234567850000,
      "position": 1
    }
  },
  "themes": {
    "abc123": {
      "row1": "red",
      "row2": "snowflakes",
      "row3": "sparkle",
      "submittedAt": 1234567840000
    },
    "user1": {
      "row1": "green",
      "row2": "stars",
      "row3": "pulse",
      "submittedAt": 1234567850000
    }
  },
  "queueLength": 1
}
```

### 🔒 Authenticated Access (Requires Token)

For session history and analytics:

```bash
# Historical session data
GET https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/sessions
Authorization: Bearer YOUR_ACCESS_TOKEN

# Response: Firestore documents with session statistics
```

## 💻 TouchDesigner Code Examples

### Real-time Theme Display

```python
# In TouchDesigner Python DAT - reads current theme
import json

# Get data from Web Client DAT
web_client = op('webClient1')
if web_client.text:
    try:
        data = json.loads(web_client.text)

        # Extract theme values
        color = data.get('row1', 'red')        # red, green, or gold
        pattern = data.get('row2', 'snowflakes')  # snowflakes, stars, or lights
        effect = data.get('row3', 'sparkle')   # sparkle, pulse, or wave
        is_active = data.get('active', False)
        session_id = data.get('sessionId', '')

        # Map color to RGB values
        color_map = {
            'red': (1.0, 0.0, 0.0),
            'green': (0.0, 1.0, 0.0),
            'gold': (1.0, 0.84, 0.0)
        }
        rgb = color_map.get(color, (1.0, 1.0, 1.0))

        # Apply color to material
        op('constantMAT1').par.colorr = rgb[0]
        op('constantMAT1').par.colorg = rgb[1]
        op('constantMAT1').par.colorb = rgb[2]

        # Map pattern to geometry
        if pattern == 'snowflakes':
            op('switch_pattern').par.index = 0
        elif pattern == 'stars':
            op('switch_pattern').par.index = 1
        elif pattern == 'lights':
            op('switch_pattern').par.index = 2

        # Map effect to animation
        if effect == 'sparkle':
            op('noise1').par.amp = 0.5
            op('noise1').par.freq = 2.0
        elif effect == 'pulse':
            op('lfo1').par.freq = 1.0
            op('lfo1').par.amp = 0.3
        elif effect == 'wave':
            op('wave1').par.freq = 0.5
            op('wave1').par.amp = 1.0

        # Display session info
        op('text_session').par.text = f"Session: {session_id[:8]}"

        # Enable/disable based on active state
        op('switch_active').par.index = 1 if is_active else 0

    except json.JSONDecodeError:
        print("Invalid JSON from Firebase")
```

### Queue State Monitor

```python
# Monitor queue and display countdown
import json

web_client = op('queueClient')
if web_client.text:
    try:
        queue_data = json.loads(web_client.text)

        # Get active user info
        active_user = queue_data.get('activeUser')
        if active_user:
            remaining_time = active_user.get('remainingTime', 0)
            session_id = active_user.get('sessionId', '')

            # Display countdown timer
            op('text_timer').par.text = f"Time: {remaining_time}s"

            # Flash when time is low
            if remaining_time <= 10:
                flash = 1 if (remaining_time % 2) == 0 else 0
                op('constant_flash').par.value0 = flash

            # Display active user
            op('text_active').par.text = f"Active: {session_id[:8]}"
        else:
            op('text_timer').par.text = "Waiting..."
            op('text_active').par.text = "No active user"

        # Show queue length
        queue_length = queue_data.get('queueLength', 0)
        op('text_queue').par.text = f"Queue: {queue_length}"

        # Get next user's theme preview
        waiting_users = queue_data.get('waitingUsers', {})
        themes = queue_data.get('themes', {})

        if waiting_users:
            # Get first waiting user
            next_user = min(waiting_users.values(), key=lambda x: x.get('joinedAt', 0))
            next_session = next_user.get('sessionId')

            # Get their theme
            if next_session in themes:
                next_theme = themes[next_session]
                preview_text = f"Next: {next_theme.get('row1')} {next_theme.get('row2')} {next_theme.get('row3')}"
                op('text_preview').par.text = preview_text

    except json.JSONDecodeError:
        print("Invalid queue data")
```

### Advanced Theme Mapping

```python
# Map theme combinations to complex visual parameters
import json

web_client = op('webClient1')
if web_client.text:
    try:
        data = json.loads(web_client.text)

        color = data.get('row1', 'red')
        pattern = data.get('row2', 'snowflakes')
        effect = data.get('row3', 'sparkle')

        # Create composite parameter based on all three values
        # Each combination creates a unique visual style

        # Particle count based on pattern
        particle_counts = {
            'snowflakes': 500,
            'stars': 300,
            'lights': 1000
        }
        op('particle1').par.count = particle_counts.get(pattern, 500)

        # Animation speed based on effect
        speed_map = {
            'sparkle': 2.0,
            'pulse': 1.0,
            'wave': 0.5
        }
        op('speed1').par.speed = speed_map.get(effect, 1.0)

        # Color intensity based on combination
        if color == 'red' and effect == 'sparkle':
            intensity = 1.0
        elif color == 'gold' and effect == 'pulse':
            intensity = 0.8
        else:
            intensity = 0.6

        op('level1').par.opacity = intensity

        # Size variations based on pattern + effect
        if pattern == 'snowflakes' and effect == 'wave':
            op('transform1').par.scale = 1.5
        elif pattern == 'stars' and effect == 'sparkle':
            op('transform1').par.scale = 0.8
        else:
            op('transform1').par.scale = 1.0

        # Store values for smooth transitions
        op('constant_color').par.name0 = color
        op('constant_pattern').par.name0 = pattern
        op('constant_effect').par.name0 = effect

    except json.JSONDecodeError:
        print("Invalid theme data")
```

### Session History Analysis

```python
# Analyze popular theme combinations (requires auth token)
import json

web_client = op('sessionHistoryClient')
if web_client.text:
    try:
        firestore_response = json.loads(web_client.text)
        sessions = firestore_response.get('documents', [])

        # Track theme combinations
        theme_counts = {}
        total_sessions = len(sessions)

        for session in sessions:
            fields = session.get('fields', {})
            theme = fields.get('theme', {}).get('mapValue', {}).get('fields', {})

            if theme:
                row1 = theme.get('row1', {}).get('stringValue', '')
                row2 = theme.get('row2', {}).get('stringValue', '')
                row3 = theme.get('row3', {}).get('stringValue', '')

                combo = f"{row1}-{row2}-{row3}"
                theme_counts[combo] = theme_counts.get(combo, 0) + 1

        # Find most popular combination
        if theme_counts:
            popular = max(theme_counts, key=theme_counts.get)
            count = theme_counts[popular]

            op('text_popular').par.text = f"Most Popular: {popular} ({count}x)"

            # Apply popular theme to preview
            parts = popular.split('-')
            if len(parts) == 3:
                op('constant_popular_color').par.name0 = parts[0]
                op('constant_popular_pattern').par.name0 = parts[1]
                op('constant_popular_effect').par.name0 = parts[2]

        op('text_total').par.text = f"Total Sessions: {total_sessions}"

    except json.JSONDecodeError:
        print("Invalid session history data")
```

## 🔄 Token Management

### Token Expiration

- **OAuth tokens last ~1 hour**
- **Re-run script to refresh**: `npm run touchdesigner:token`
- **Check expiration**: Look at `expires_at` in `touchdesigner-config.json`

### Note on Public Endpoints

For the **current theme** and **queue state** endpoints, **no authentication is required**. These are public Firebase Realtime Database endpoints that TouchDesigner can access directly without tokens.

## 🔒 Security Features

### What's Protected

- ✅ **Session history**: Requires authentication (prevents abuse)
- ✅ **Firestore analytics**: Admin access for detailed data
- ✅ **Token expiration**: Automatic timeout for security

### What's Public

- ✅ **Real-time theme values**: Public for TouchDesigner integration
- ✅ **Queue state**: Public for real-time updates
- ✅ **Current active user**: Public for display purposes

### Firebase Security Rules

The system implements tiered access:

1. **Public endpoints**: Real-time theme data for TouchDesigner (Realtime Database)
2. **Authenticated endpoints**: Historical data and analytics (Firestore)
3. **Admin endpoints**: System configuration and management

## 📊 Performance Tips

### TouchDesigner Optimization

- **Use 500-1000ms refresh rate** for real-time feel without overwhelming Firebase
- **Parse JSON efficiently** - cache parsed data between frames
- **Handle connection errors** gracefully with try/catch blocks
- **Use different Web Client DATs** for different endpoints to avoid conflicts
- **Store previous values** to detect changes and avoid unnecessary updates

### Firebase Quota Management

- **Realtime Database** is optimized for frequent access
- **Read operations are efficient** with proper listeners
- **Public endpoints** don't count against auth quota
- **Cache data locally** when possible to reduce reads

### Smooth Transitions

```python
# Smooth transition between theme changes
import json

web_client = op('webClient1')
prev_theme = op('constant_prev_theme')

if web_client.text:
    try:
        data = json.loads(web_client.text)
        current = f"{data.get('row1')}-{data.get('row2')}-{data.get('row3')}"
        previous = prev_theme.par.name0

        # Detect theme change
        if current != previous:
            # Trigger transition animation
            op('transition').par.play = 1

            # Store new theme
            prev_theme.par.name0 = current

            print(f"Theme changed: {previous} → {current}")

    except json.JSONDecodeError:
        pass
```

## 🛠️ Troubleshooting

### Common Issues

**"Connection refused" or no data**

- Verify Firebase project ID in URL
- Check Firebase Realtime Database is enabled
- Test endpoint in browser first
- Ensure database rules allow public read access

**"Invalid JSON response"**

- Check that data exists at the endpoint
- Verify Firebase database has `themeValues/current` node
- Enable verbose mode in Web Client DAT
- Check HTTP status code (should be 200)

**Theme not updating in TouchDesigner**

- Verify Web Client DAT refresh rate is set (500-1000ms)
- Check that `Active` parameter is ON
- Look for Python errors in textport
- Verify JSON parsing logic

**High latency or delays**

- Reduce refresh rate if needed
- Use Firebase CDN endpoints
- Check network connection
- Monitor Firebase usage in console

### Debug Mode

Enable verbose logging in TouchDesigner:

```python
# Add debug output to your Python DAT
import json

web_client = op('webClient1')
debug_text = op('text_debug')

if web_client.text:
    try:
        data = json.loads(web_client.text)
        debug_text.par.text = json.dumps(data, indent=2)
    except json.JSONDecodeError as e:
        debug_text.par.text = f"JSON Error: {e}"
else:
    debug_text.par.text = "No data received"
```

---

## 📁 Generated Files

After running `npm run touchdesigner:token` (optional):

- **`touchdesigner-config.json`**: Complete configuration with tokens and endpoints
- **Contains**: Access tokens, endpoint URLs, setup instructions
- **Expires**: ~1 hour, re-run script to refresh

## 🔗 Links

- [TouchDesigner Web Client DAT Docs](https://docs.derivative.ca/Web_Client_DAT)
- [Firebase Realtime Database REST API](https://firebase.google.com/docs/database/rest/start)
- [Firebase Console](https://console.firebase.google.com/)

---

✅ **You're ready to create amazing real-time Christmas theme visualizations with TouchDesigner!**

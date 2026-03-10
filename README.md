# FocusMithra

**Stock Request Management System** by Focus Next Digital World

A Progressive Web App (PWA) for managing stock and inventory requests within teams. Workers raise requests, seniors process them, and admins oversee everything — all in real time.

## Features

- **Role-based access** — Worker, Senior Incharge, and Admin roles
- **Real-time sync** — Powered by Firebase Realtime Database
- **Offline support** — Service worker caching with network-first strategy
- **Push notifications** — Browser notification alerts for new requests
- **Alarm system** — Configurable sound alarms with beep, alert, and chime options
- **Image attachments** — Attach photos to requests with automatic compression
- **Installable PWA** — Add to home screen on mobile devices
- **Dark theme** — Modern dark UI optimized for mobile

## Workflows

### Worker Flow
1. Sign in with credentials provided by Admin
2. Tap **Request for Order** to create a new stock request
3. Fill in item name, photo, notes, priority, and assign to a senior
4. Track request status (Pending → Accepted → Completed)

### Senior Incharge Flow
1. Receive notifications when new requests are assigned
2. **Accept** pending requests to acknowledge them
3. **Complete** requests after fulfilling the order (requires captcha verification)
4. Set **alarms** on requests for periodic reminders

### Admin Flow
1. **Add members** — Create accounts with name, password, and role
2. **Manage roles** — Change any member's role
3. **Remove members** — Delete accounts
4. **View all requests** — Full visibility across the organization
5. **Delete requests** — Remove any request

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML / CSS / JavaScript | Frontend (single-page app) |
| Firebase Realtime Database | Backend data storage and real-time sync |
| Service Workers | Offline caching and push notifications |
| Web Audio API | Alarm sound generation |
| Vercel | Deployment platform |

## Getting Started

### Prerequisites
- A [Firebase](https://firebase.google.com/) project with Realtime Database enabled
- A [Vercel](https://vercel.com/) account (or any static hosting)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Arkuuuu/focusmithra.git
   cd focusmithra
   ```

2. **Configure Firebase**
   Open `index.html` and update the `FIREBASE_CONFIG` object (around line 610) with your Firebase project credentials:
   ```javascript
   const FIREBASE_CONFIG = {
     apiKey:            "YOUR_API_KEY",
     authDomain:        "YOUR_PROJECT.firebaseapp.com",
     databaseURL:       "https://YOUR_PROJECT.firebasedatabase.app",
     projectId:         "YOUR_PROJECT_ID",
     storageBucket:     "YOUR_PROJECT.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId:             "YOUR_APP_ID"
   };
   ```

3. **Deploy**
   ```bash
   # Using Vercel CLI
   npm i -g vercel
   vercel

   # Or simply push to GitHub and connect to Vercel
   ```

4. **First Login**
   - Default admin account is created automatically on first run
   - Change the admin password after your first login
   - Use the Admin panel to add team members

### Local Development
Since this is a static site, you can serve it with any HTTP server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

## Project Structure

```
focusmithra/
├── index.html        # Main application (HTML + CSS + JS)
├── sw.js             # Service worker (caching + push notifications)
├── manifest.json     # PWA manifest
├── vercel.json       # Vercel deployment config with caching headers
├── logo.png          # App logo
└── icon-*.png        # PWA icons (72px to 512px)
```

## Security Notes

- Firebase API keys in client-side code are expected — restrict them via Firebase Console > Project Settings > API restrictions
- Set Firebase Realtime Database rules to restrict read/write access
- Change the default admin password immediately after first deployment
- Passwords are stored in Firebase — consider implementing hashing for production use

## Browser Support

- Chrome / Edge (full PWA + push notifications)
- Firefox (full PWA + push notifications)
- Safari 13+ (PWA, limited push notification support)
- Mobile: Android 5+, iOS 13+

## License

This project is maintained by Focus Next Digital World.

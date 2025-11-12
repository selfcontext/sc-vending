# Firebase Backend for Vending Machine System

This directory contains all Firebase-related configuration and cloud functions for the vending machine system.

## Structure

```
firebase/
├── functions/          # Cloud Functions (TypeScript)
│   ├── src/
│   │   └── index.ts   # Main functions
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules    # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── storage.rules      # Storage security rules
├── firebase.json      # Firebase configuration
├── .firebaserc        # Firebase project config
└── seed-data.json     # Initial data for testing
```

## Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Create a Firebase Project

1. Go to https://console.firebase.google.com/
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication (Email/Password and Anonymous)
5. Enable Storage
6. Enable Cloud Functions

### 4. Link Your Project

```bash
# Update .firebaserc with your project ID
firebase use --add
```

### 5. Install Dependencies

```bash
cd functions
npm install
cd ..
```

### 6. Configure Environment Variables

Create `.env` file in functions directory:

```env
CLIENT_URL=https://your-app.web.app
```

## Development

### Start Emulators

```bash
firebase emulators:start
```

This will start:
- Firestore Emulator (port 8080)
- Functions Emulator (port 5001)
- Auth Emulator (port 9099)
- Storage Emulator (port 9199)
- Emulator UI (port 4000)

### Load Seed Data

#### Automated Seeding (Recommended)

Load sample data into Firestore automatically:

```bash
# Set up service account (one-time setup)
# 1. Go to Firebase Console → Project Settings → Service Accounts
# 2. Generate new private key and save as service-account-key.json
# 3. Never commit this file to git

export GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Run the seed script
cd functions
npm run seed
```

This will populate:
- Configuration settings (session timeout, retries, etc.)
- Vending machine data
- Sample inventory products (6 items)

#### Manual Seeding

You can also manually add the seed data from `seed-data.json` through the Emulator UI at http://localhost:4000

## Deployment

### Deploy Everything

```bash
firebase deploy
```

### Deploy Specific Components

```bash
# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only storage rules
firebase deploy --only storage
```

## Cloud Functions

### Available Functions

1. **createSession** - Creates a new vending session with QR code (rate limited: 10/min per machine)
2. **addToBasket** - Adds products to session basket
3. **checkout** - Processes payment and creates dispense events
4. **extendSession** - Extends session expiry by timeout duration (once per session, rate limited: 2/5min)
5. **monitorLowStock** - Firestore trigger that alerts when product quantity ≤ 3
6. **manualDispenseTest** - Admin-only function to test product dispensing
7. **expireSessions** - Scheduled function to expire old sessions (runs every 5 min)
8. **cleanupOldEvents** - Scheduled function to clean up old events (runs daily)
9. **updateHeartbeat** - Updates vending machine status

### Testing Functions Locally

```bash
# In functions directory
npm run serve
```

## Firestore Collections

### config
- **app**: Global app configuration
  - sessionTimeoutMinutes: number
  - maxRetries: number
  - enableAnalytics: boolean
  - maintenanceMode: boolean

### inventory
Products available in vending machines
- name, description, imageUrl, slot, price, quantity, vendingMachineId, category, isActive, allergens

### sessions
Active and historical vending sessions
- vendingMachineId, status, basket, payments, totalAmount, dispensedItems, qrCodeData, timestamps

### events
System events for tracking and triggering actions
- type, sessionId, vendingMachineId, payload, timestamp, processed

### vendingMachines
Registered vending machines
- name, location, status, currentSessionId, lastHeartbeat, configuration

## Security Rules

Security rules are defined in `firestore.rules` and `storage.rules`. Key points:

- **Public read**: Config, Inventory, Vending Machines, Sessions
- **Admin write**: Config, Inventory, Vending Machines (admin = non-anonymous auth)
- **User update**: Sessions (basket and totalAmount only)
- **Function-controlled**: Events creation

## Indexes

Composite indexes are defined in `firestore.indexes.json` for optimized queries:
- Sessions by vendingMachineId and createdAt
- Sessions by status and createdAt
- Events by sessionId, processed, and timestamp
- Events by vendingMachineId, processed, and timestamp

## Monitoring

### View Logs

```bash
firebase functions:log
```

### Firebase Console

Monitor functions, database, and storage usage at:
https://console.firebase.google.com/

## Troubleshooting

### Functions not deploying
- Check Node.js version (should be 18)
- Ensure all dependencies are installed
- Check for TypeScript errors: `npm run build`

### Permission denied errors
- Check firestore.rules
- Ensure user is authenticated
- Verify admin privileges for admin operations

### Emulator not starting
- Check if ports are already in use
- Kill existing processes: `lsof -ti:8080 | xargs kill`

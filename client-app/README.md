# Client Web App (React + TypeScript)

Modern web application for customers to shop from vending machines via QR code scanning.

## ✨ Features

### Customer Features
- **QR Code Shopping** - Scan machine QR to start shopping
- **Product Catalog** - Beautiful grid layout with images
- **Real-time Cart** - Syncs instantly with vending machine
- **Checkout** - Integrated payment processing
- **Live Dispensing** - Watch products being dispensed
- **Success Screen** - Celebration with order summary
- **Refund Handling** - Auto-refund for failed dispenses

### Admin Features
- **Dashboard** - Overview of sales and inventory
- **Inventory Management** - Add/edit/delete products
- **Session Monitoring** - View active and recent sessions
- **Analytics** - Revenue and sales statistics

### Technical Features
- **Real-time Sync** - Firestore listeners (<500ms latency)
- **Anonymous Auth** - Automatic sign-in for customers
- **Admin Auth** - Email/password for administrators
- **Responsive Design** - Works on all screen sizes
- **PWA Ready** - Can be installed as app
- **Offline Support** - Graceful error handling

## 🏗️ Architecture

```
src/
├── assets/
│   └── animations/        # Lottie animation files
├── hooks/
│   └── useAuth.ts        # Authentication hook
├── lib/
│   └── firebase.ts       # Firebase configuration
├── pages/
│   ├── ShoppingPage.tsx  # Product catalog
│   ├── CheckoutPage.tsx  # Payment screen
│   ├── DispensingPage.tsx # Dispensing progress
│   ├── SuccessPage.tsx   # Success screen
│   └── admin/
│       ├── AdminLoginPage.tsx
│       └── AdminDashboard.tsx
├── services/
│   └── payment.service.ts # Payment integration
├── types/
│   └── index.ts          # TypeScript definitions
├── App.tsx               # Main app component
└── main.tsx              # Entry point
```

## 🚀 Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Get these from Firebase Console → Project Settings → Web App

### 3. Run Development Server

```bash
npm run dev
```

App runs at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

Output in `dist/` directory

## 🎨 Customization

### Theme & Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#faf5ff',
        // ... customize colors
        900: '#581c87',
      },
    },
  },
}
```

### Fonts

Update in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Your+Font&display=swap" rel="stylesheet">
```

And `tailwind.config.js`:

```javascript
fontFamily: {
  sans: ['Your Font', 'sans-serif'],
},
```

### Animations

Replace Lottie files in `src/assets/animations/`:
- `shopping.json` - Loading animation
- `dispensing.json` - Dispensing animation
- `success.json` - Success celebration

Download from [LottieFiles.com](https://lottiefiles.com)

## 💳 Payment Integration

### Replace Mock Payment

Edit `src/services/payment.service.ts`:

```typescript
export class PaymentService {
  static async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Replace with your payment gateway
    const response = await fetch('https://your-gateway.com/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: request.amount,
        currency: 'USD',
        // ... other params
      }),
    });

    const result = await response.json();

    return {
      success: result.success,
      transactionId: result.id,
      error: result.error,
    };
  }
}
```

### Supported Gateways

- **Stripe** - Use `@stripe/stripe-js` and `@stripe/react-stripe-js`
- **Square** - Use Square Web Payments SDK
- **PayPal** - Use PayPal Checkout
- **TapPay** (Taiwan) - Use TapPay SDK

Example with Stripe:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_...');

const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
  },
});
```

## 🔐 Admin Setup

### Create Admin User

```bash
# Using Firebase CLI
firebase auth:export users.json --project your-project

# Or use Firebase Console
# Authentication → Users → Add User
# Email: admin@example.com
# Password: YourSecurePassword
```

### Admin Access

1. Go to `/admin/login`
2. Sign in with admin credentials
3. Access inventory management

## 📱 Routes

| Path | Description |
|------|-------------|
| `/session/:sessionId` | Shopping page (from QR) |
| `/checkout/:sessionId` | Checkout page |
| `/dispensing/:sessionId` | Dispensing progress |
| `/success/:sessionId` | Success screen |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |

## 🔧 Configuration

### Firebase Functions URL

For local development with emulators:

```typescript
// lib/firebase.ts
import { connectFunctionsEmulator } from 'firebase/functions';
import { connectFirestoreEmulator } from 'firebase/firestore';

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Session Handling

Sessions are read-only from the client side except for basket updates:

```typescript
// Update basket
await updateDoc(doc(db, 'sessions', sessionId), {
  basket: newBasket,
  totalAmount,
});
```

## 🎯 State Management

Uses React Query for server state and Zustand for client state:

```typescript
// Example: Shopping cart with Zustand
import { create } from 'zustand';

const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
}));
```

## 🐛 Debugging

### Firebase Connection

```typescript
// Enable Firestore debug logs
import { enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

enableIndexedDbPersistence(db, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});
```

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

## 🚀 Deployment

### Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### Other Platforms

**Vercel:**
```bash
vercel deploy
```

**Netlify:**
```bash
netlify deploy --prod
```

**Custom Server:**
```bash
npm run build
# Serve dist/ folder with any static server
```

### Environment Variables

For production, set environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- Firebase: Use `.env.production` (not recommended for secrets)

## 📊 Analytics

### Firebase Analytics

```typescript
import { logEvent } from 'firebase/analytics';

logEvent(analytics, 'add_to_cart', {
  items: [{ id: productId, name: productName }],
});
```

### Custom Events

```typescript
// Track successful checkout
logEvent(analytics, 'purchase', {
  transaction_id: transactionId,
  value: amount / 100,
  currency: 'USD',
  items: basket,
});
```

## 🧪 Testing

```bash
# Lint
npm run lint

# Type check
npm run type-check

# Run tests (add test framework)
npm test
```

## 🎨 UI Components

Built with Tailwind CSS and custom components:

### Button Variants

```tsx
<button className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
  Primary Button
</button>
```

### Cards

```tsx
<div className="glass-strong rounded-3xl p-6">
  Content
</div>
```

### Animations

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Animated content
</motion.div>
```

## ⚡ Performance

### Code Splitting

```typescript
// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

### Image Optimization

```typescript
// Use optimized image URLs
const imageUrl = `${product.imageUrl}?w=400&h=400&fit=crop`;
```

### Bundle Analysis

```bash
npm run build -- --mode analyze
```

## 📱 PWA Support

Create `public/manifest.json`:

```json
{
  "name": "Second Space Vending",
  "short_name": "Vending",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#9333ea",
  "background_color": "#ffffff"
}
```

## 🆘 Troubleshooting

### Build Errors

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Firebase Connection Issues

Check console for errors:
- Invalid API key → Update .env
- Permission denied → Check Firestore rules
- Network error → Check internet connection

### Payment Failures

Check `payment.service.ts` implementation and logs

---

For backend setup, see [../firebase/README.md](../firebase/README.md)

For vending app, see [../vending-app/README.md](../vending-app/README.md)

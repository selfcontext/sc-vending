# Vending Machine App (Flutter)

Flutter application for the vending machine display screen. Shows QR codes, customer baskets, and handles product dispensing.

## 📱 Features

- **QR Code Generation** - Creates unique session QR codes
- **Auto-Refresh** - New QR every 3 minutes or after session completion
- **Real-time Basket** - Shows customer's cart updates instantly
- **Product Dispensing** - Integrates with Android vending SDK
- **Retry Logic** - Auto-retries failed dispenses (configurable)
- **Completion Screen** - Thank you message with summary
- **Lottie Animations** - Professional, smooth animations
- **Offline Support** - Handles connection issues gracefully

## 🏗️ Architecture

```
lib/
├── models/
│   ├── session.dart           # Session data model
│   └── vending_event.dart     # Event data model
├── screens/
│   ├── qr_screen.dart         # QR code display
│   ├── basket_screen.dart     # Shopping basket view
│   ├── dispensing_screen.dart # Dispensing progress
│   └── completion_screen.dart # Thank you screen
├── services/
│   ├── firebase_service.dart  # Firebase integration
│   ├── VendingService.dart    # Android SDK integration
│   └── VendingServiceStub.dart # Stub for testing
└── main.dart                  # App entry point
```

## 🚀 Setup

### Prerequisites

- Flutter 3.8 or higher
- Android Studio / Xcode (for emulator)
- Firebase project created
- FlutterFire CLI

### 1. Install Dependencies

```bash
flutter pub get
```

### 2. Configure Firebase

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure Firebase for this project
flutterfire configure
```

This will create `lib/firebase_options.dart` with your Firebase configuration.

### 3. Update Vending Machine ID

Edit `lib/services/firebase_service.dart`:

```dart
static const String vendingMachineId = 'machine_001'; // Change to your machine ID
```

### 4. Run the App

```bash
# Development
flutter run

# Release build for Android
flutter build apk --release

# Web (for testing)
flutter run -d chrome
```

## 🔧 Configuration

### Vending SDK Integration

The app uses a vending machine SDK for dispensing products. Two implementations:

1. **VendingServiceStub.dart** - Mock implementation for testing
2. **VendingService.dart** - Real Android SDK integration

To switch to real SDK:

1. Update `lib/Globals.dart`:
```dart
import 'services/VendingService.dart';
final vendingInstance = Vendingservice();
```

2. Add Android platform channel in `android/app/src/main/kotlin/MainActivity.kt`

### Session Configuration

Session timeout and retry logic are configured in Firestore `config/app`:

```json
{
  "sessionTimeoutMinutes": 3,
  "maxRetries": 2
}
```

## 📦 Dependencies

```yaml
dependencies:
  firebase_core: ^2.24.2          # Firebase initialization
  cloud_firestore: ^4.14.0        # Real-time database
  cloud_functions: ^4.5.12        # Cloud Functions calls
  qr_flutter: ^4.1.0              # QR code generation
  lottie: ^3.0.0                  # Animations
  provider: ^6.1.1                # State management (future use)
```

## 🎨 Customization

### Theme

Edit `lib/main.dart`:

```dart
theme: ThemeData(
  useMaterial3: true,
  colorSchemeSeed: Colors.deepPurple, // Change color
  fontFamily: 'YourFont',             // Change font
),
```

### Animations

Replace Lottie files in `assets/animations/`:
- `scan.json` - QR scanning animation
- `shopping.json` - Shopping cart animation
- `dispensing.json` - Product dispensing animation

Download animations from [LottieFiles.com](https://lottiefiles.com)

### Screen Layout

Modify screens in `lib/screens/` to adjust layout, spacing, or add features.

## 🔌 Android SDK Integration

### Method Channel Setup

Create `android/app/src/main/kotlin/.../MainActivity.kt`:

```kotlin
class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.cubeworks.vending/sdk"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "initializeSdk" -> {
                        // Initialize SDK
                        result.success(true)
                    }
                    "ship" -> {
                        val slotNo = call.argument<Int>("slotNo")
                        val amount = call.argument<Int>("amount")
                        // Call actual SDK
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
```

## 🐛 Debugging

### Enable Debug Logs

```dart
// In firebase_service.dart
print('Debug: Creating session for $vendingMachineId');
```

### Test Without Hardware

Use the stub service:
```dart
import 'services/VendingServiceStub.dart';
final vendingInstance = VendingserviceStub();
```

### Firebase Emulator

```bash
# In firebase directory
firebase emulators:start

# Then run Flutter with emulator config
flutter run
```

## 📱 Building for Production

### Android APK

```bash
# Build release APK
flutter build apk --release

# Build App Bundle (for Play Store)
flutter build appbundle --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Android Configuration

Update `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.secondspace.vending"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### Code Signing

Create `android/key.properties`:

```properties
storePassword=yourpassword
keyPassword=yourpassword
keyAlias=yourkey
storeFile=path/to/keystore.jks
```

## 🔄 State Management

The app uses Firestore real-time listeners for state management:

```dart
FirebaseService.watchSession(sessionId).listen((session) {
  setState(() => _session = session);
  // React to changes
});
```

For complex state, consider adding Provider or Riverpod.

## ⚡ Performance

### Optimization Tips

1. **Reduce rebuilds** - Use `const` constructors
2. **Cache images** - Use `CachedNetworkImage` package
3. **Lazy load** - Only load visible items
4. **Optimize animations** - Keep at 60fps

### Memory Management

```dart
@override
void dispose() {
  _controller.dispose();
  _subscription?.cancel();
  super.dispose();
}
```

## 🧪 Testing

```bash
# Run unit tests
flutter test

# Run widget tests
flutter test test/widget_test.dart
```

## 📚 Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Firebase for Flutter](https://firebase.flutter.dev/)
- [QR Flutter Package](https://pub.dev/packages/qr_flutter)
- [Lottie Flutter](https://pub.dev/packages/lottie)

## 🆘 Troubleshooting

### Firebase not connecting

```bash
flutterfire configure --force
flutter clean
flutter pub get
```

### Build failures

```bash
flutter clean
cd android && ./gradlew clean && cd ..
flutter pub get
flutter build apk
```

### QR code not scanning

- Ensure session creation is successful
- Check Firebase Functions logs
- Verify firestore rules allow session creation

---

For backend setup, see [../firebase/README.md](../firebase/README.md)

For customer app, see [../client-app/README.md](../client-app/README.md)

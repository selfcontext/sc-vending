import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/qr_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  // Note: You'll need to add firebase_options.dart using FlutterFire CLI
  // Run: flutterfire configure
  try {
    await Firebase.initializeApp();
  } catch (e) {
    print('Firebase initialization error: $e');
    print('Make sure to run: flutterfire configure');
  }

  runApp(const VendingMachineApp());
}

class VendingMachineApp extends StatelessWidget {
  const VendingMachineApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Second Space Vending',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.deepPurple,
        fontFamily: 'SF Pro',
        brightness: Brightness.light,
      ),
      home: const QrScreen(),
    );
  }
}

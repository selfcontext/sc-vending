import 'package:flutter/material.dart';

import 'VendignApp.dart' show VendingApp;

void main() {
  runApp(MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Second Space Vending',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.deepPurple,
        fontFamily: 'SF Pro',
      ),
      home: const VendingApp()));
}

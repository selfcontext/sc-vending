import 'package:cloud_firestore/cloud_firestore.dart';

class BasketItem {
  final String productId;
  final String productName;
  final int quantity;
  final int price;
  final int slot;

  BasketItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.slot,
  });

  factory BasketItem.fromMap(Map<String, dynamic> map) {
    return BasketItem(
      productId: map['productId'] ?? '',
      productName: map['productName'] ?? '',
      quantity: map['quantity'] ?? 0,
      price: map['price'] ?? 0,
      slot: map['slot'] ?? 0,
    );
  }
}

class DispensedItem {
  final String productId;
  final int slot;
  final String status; // 'pending', 'dispensed', 'failed'
  final DateTime timestamp;
  final int? retryCount;

  DispensedItem({
    required this.productId,
    required this.slot,
    required this.status,
    required this.timestamp,
    this.retryCount,
  });

  factory DispensedItem.fromMap(Map<String, dynamic> map) {
    // Safe timestamp parsing with fallback to current time
    DateTime timestamp;
    final timestampData = map['timestamp'];
    if (timestampData is Timestamp) {
      timestamp = timestampData.toDate();
    } else if (timestampData != null) {
      // Handle other possible formats
      timestamp = DateTime.now();
    } else {
      timestamp = DateTime.now();
    }

    return DispensedItem(
      productId: map['productId'] ?? '',
      slot: map['slot'] ?? 0,
      status: map['status'] ?? 'pending',
      timestamp: timestamp,
      retryCount: map['retryCount'] as int?,
    );
  }
}

class VendingSession {
  final String id;
  final String vendingMachineId;
  final String status; // 'active', 'completed', 'expired', 'cancelled'
  final List<BasketItem> basket;
  final int totalAmount;
  final List<DispensedItem> dispensedItems;
  final DateTime createdAt;
  final DateTime expiresAt;
  final DateTime? completedAt;
  final DateTime? updatedAt;
  final String qrCodeData;
  final int extendedCount;

  VendingSession({
    required this.id,
    required this.vendingMachineId,
    required this.status,
    required this.basket,
    required this.totalAmount,
    required this.dispensedItems,
    required this.createdAt,
    required this.expiresAt,
    this.completedAt,
    this.updatedAt,
    required this.qrCodeData,
    this.extendedCount = 0,
  });

  /// Helper function to safely parse Timestamp fields
  static DateTime? _parseTimestamp(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    return null;
  }

  /// Helper function to safely parse required Timestamp fields with fallback
  static DateTime _parseRequiredTimestamp(dynamic value, DateTime fallback) {
    if (value is Timestamp) return value.toDate();
    return fallback;
  }

  factory VendingSession.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>?;

    if (data == null) {
      throw FormatException('Document data is null for session ${doc.id}');
    }

    final now = DateTime.now();

    return VendingSession(
      id: doc.id,
      vendingMachineId: data['vendingMachineId'] as String? ?? '',
      status: data['status'] as String? ?? 'active',
      basket: (data['basket'] as List<dynamic>?)
              ?.map((item) => BasketItem.fromMap(item as Map<String, dynamic>))
              .toList() ??
          [],
      totalAmount: data['totalAmount'] as int? ?? 0,
      dispensedItems: (data['dispensedItems'] as List<dynamic>?)
              ?.map((item) => DispensedItem.fromMap(item as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: _parseRequiredTimestamp(data['createdAt'], now),
      expiresAt: _parseRequiredTimestamp(data['expiresAt'], now.add(const Duration(minutes: 3))),
      completedAt: _parseTimestamp(data['completedAt']),
      updatedAt: _parseTimestamp(data['updatedAt']),
      qrCodeData: data['qrCodeData'] as String? ?? '',
      extendedCount: data['extendedCount'] as int? ?? 0,
    );
  }

  bool get hasPayment => status == 'completed';

  bool get allItemsDispensed =>
      dispensedItems.where((item) => item.status == 'dispensed').length ==
      basket.fold<int>(0, (sum, item) => sum + item.quantity);

  int get successfullyDispensedCount =>
      dispensedItems.where((item) => item.status == 'dispensed').length;

  int get failedDispenseCount =>
      dispensedItems.where((item) => item.status == 'failed').length;
}

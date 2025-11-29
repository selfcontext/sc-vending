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
    return DispensedItem(
      productId: map['productId'] ?? '',
      slot: map['slot'] ?? 0,
      status: map['status'] ?? 'pending',
      timestamp: (map['timestamp'] as Timestamp).toDate(),
      retryCount: map['retryCount'],
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
  final String qrCodeData;

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
    required this.qrCodeData,
  });

  factory VendingSession.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;

    return VendingSession(
      id: doc.id,
      vendingMachineId: data['vendingMachineId'] ?? '',
      status: data['status'] ?? 'active',
      basket: (data['basket'] as List<dynamic>?)
              ?.map((item) => BasketItem.fromMap(item as Map<String, dynamic>))
              .toList() ??
          [],
      totalAmount: data['totalAmount'] ?? 0,
      dispensedItems: (data['dispensedItems'] as List<dynamic>?)
              ?.map((item) => DispensedItem.fromMap(item as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      expiresAt: (data['expiresAt'] as Timestamp).toDate(),
      completedAt: data['completedAt'] != null
          ? (data['completedAt'] as Timestamp).toDate()
          : null,
      qrCodeData: data['qrCodeData'] ?? '',
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

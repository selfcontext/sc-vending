import 'package:cloud_firestore/cloud_firestore.dart';

class VendingEvent {
  final String id;
  final String type;
  final String sessionId;
  final String vendingMachineId;
  final Map<String, dynamic> payload;
  final DateTime timestamp;
  final int sequenceNumber;
  final bool processed;

  VendingEvent({
    required this.id,
    required this.type,
    required this.sessionId,
    required this.vendingMachineId,
    required this.payload,
    required this.timestamp,
    required this.sequenceNumber,
    required this.processed,
  });

  factory VendingEvent.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;

    return VendingEvent(
      id: doc.id,
      type: data['type'] ?? '',
      sessionId: data['sessionId'] ?? '',
      vendingMachineId: data['vendingMachineId'] ?? '',
      payload: data['payload'] as Map<String, dynamic>? ?? {},
      timestamp: (data['timestamp'] as Timestamp).toDate(),
      sequenceNumber: data['sequenceNumber'] ?? 0,
      processed: data['processed'] ?? false,
    );
  }

  bool get isProductDispatch => type == 'ProductDispatch';
}

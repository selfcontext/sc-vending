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
    final data = doc.data() as Map<String, dynamic>?;

    if (data == null) {
      throw FormatException('Document data is null for event ${doc.id}');
    }

    // Safe timestamp parsing with fallback
    DateTime timestamp;
    final timestampData = data['timestamp'];
    if (timestampData is Timestamp) {
      timestamp = timestampData.toDate();
    } else {
      timestamp = DateTime.now();
    }

    return VendingEvent(
      id: doc.id,
      type: data['type'] as String? ?? '',
      sessionId: data['sessionId'] as String? ?? '',
      vendingMachineId: data['vendingMachineId'] as String? ?? '',
      payload: data['payload'] as Map<String, dynamic>? ?? {},
      timestamp: timestamp,
      sequenceNumber: data['sequenceNumber'] as int? ?? 0,
      processed: data['processed'] as bool? ?? false,
    );
  }

  bool get isProductDispatch => type == 'ProductDispatch';
}

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/session.dart';
import '../models/vending_event.dart';

class FirebaseService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseFunctions _functions = FirebaseFunctions.instance;

  static const String vendingMachineId = 'machine_001'; // TODO: Make this configurable

  /// Create a new session
  static Future<VendingSession?> createSession() async {
    try {
      final result = await _functions.httpsCallable('createSession').call({
        'vendingMachineId': vendingMachineId,
      });

      final sessionId = result.data['sessionId'];
      final sessionDoc = await _firestore.collection('sessions').doc(sessionId).get();

      if (sessionDoc.exists) {
        return VendingSession.fromFirestore(sessionDoc);
      }
      return null;
    } catch (e) {
      print('Error creating session: $e');
      return null;
    }
  }

  /// Listen to session changes
  static Stream<VendingSession?> watchSession(String sessionId) {
    return _firestore
        .collection('sessions')
        .doc(sessionId)
        .snapshots()
        .map((snapshot) {
      if (snapshot.exists) {
        return VendingSession.fromFirestore(snapshot);
      }
      return null;
    });
  }

  /// Listen to unprocessed events for this machine
  static Stream<List<VendingEvent>> watchEvents() {
    return _firestore
        .collection('events')
        .where('vendingMachineId', isEqualTo: vendingMachineId)
        .where('processed', isEqualTo: false)
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => VendingEvent.fromFirestore(doc))
          .toList();
    });
  }

  /// Confirm product dispense
  static Future<void> confirmDispense({
    required String sessionId,
    required String productId,
    required int slot,
    required bool success,
    required String eventId,
  }) async {
    try {
      await _functions.httpsCallable('confirmDispense').call({
        'sessionId': sessionId,
        'productId': productId,
        'slot': slot,
        'success': success,
        'eventId': eventId,
      });
    } catch (e) {
      print('Error confirming dispense: $e');
      rethrow;
    }
  }

  /// Update heartbeat
  static Future<void> updateHeartbeat() async {
    try {
      await _functions.httpsCallable('updateHeartbeat').call({
        'vendingMachineId': vendingMachineId,
      });
    } catch (e) {
      print('Error updating heartbeat: $e');
    }
  }
}

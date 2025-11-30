import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/session.dart';
import '../models/vending_event.dart';

/// Custom exception for Firebase service errors with context
class FirebaseServiceException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  FirebaseServiceException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'FirebaseServiceException: $message${code != null ? ' (code: $code)' : ''}';
}

class FirebaseService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Configurable machine ID - can be set from environment or config
  static String _vendingMachineId = 'machine_001';

  /// Get the current vending machine ID
  static String get vendingMachineId => _vendingMachineId;

  /// Configure the vending machine ID (call this at app startup)
  static void setVendingMachineId(String machineId) {
    if (machineId.isEmpty) {
      throw FirebaseServiceException('Machine ID cannot be empty', code: 'invalid-argument');
    }
    _vendingMachineId = machineId;
  }

  // Track current session ID for event filtering
  static String? _currentSessionId;

  /// Set the current session ID for event filtering
  static void setCurrentSessionId(String? sessionId) {
    _currentSessionId = sessionId;
  }

  /// Get the current session ID
  static String? get currentSessionId => _currentSessionId;

  /// Create a new session
  static Future<VendingSession?> createSession() async {
    try {
      final result = await _functions.httpsCallable('createSession').call({
        'vendingMachineId': _vendingMachineId,
      });

      final sessionId = result.data['sessionId'] as String?;
      if (sessionId == null) {
        throw FirebaseServiceException('No session ID returned from server', code: 'invalid-response');
      }

      // Set the current session ID for event filtering
      _currentSessionId = sessionId;

      final sessionDoc = await _firestore.collection('sessions').doc(sessionId).get();

      if (sessionDoc.exists) {
        return VendingSession.fromFirestore(sessionDoc);
      }

      throw FirebaseServiceException('Session document not found after creation', code: 'not-found');
    } on FirebaseFunctionsException catch (e) {
      throw FirebaseServiceException(
        'Failed to create session: ${e.message}',
        code: e.code,
        originalError: e,
      );
    } catch (e) {
      if (e is FirebaseServiceException) rethrow;
      throw FirebaseServiceException('Error creating session', originalError: e);
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

  /// Listen to unprocessed events for this machine and current session
  /// Requires sessionId to prevent cross-session event leakage
  static Stream<List<VendingEvent>> watchEvents({String? sessionId}) {
    // Use provided sessionId or fall back to current session
    final filterSessionId = sessionId ?? _currentSessionId;

    // SECURITY: Require sessionId to prevent listening to all events
    if (filterSessionId == null) {
      throw FirebaseServiceException(
        'Session ID required to watch events. Call setCurrentSession() first or provide sessionId parameter.',
      );
    }

    final query = _firestore
        .collection('events')
        .where('vendingMachineId', isEqualTo: _vendingMachineId)
        .where('processed', isEqualTo: false)
        .where('sessionId', isEqualTo: filterSessionId);

    return query
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snapshot) {
      final events = snapshot.docs
          .map((doc) => VendingEvent.fromFirestore(doc))
          .toList();
      // Sort by timestamp first, then by sequenceNumber for deterministic ordering
      events.sort((a, b) {
        final timestampCompare = a.timestamp.compareTo(b.timestamp);
        if (timestampCompare != 0) return timestampCompare;
        return a.sequenceNumber.compareTo(b.sequenceNumber);
      });
      return events;
    });
  }

  /// Confirm product dispense with proper error handling
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
    } on FirebaseFunctionsException catch (e) {
      throw FirebaseServiceException(
        'Failed to confirm dispense: ${e.message}',
        code: e.code,
        originalError: e,
      );
    } catch (e) {
      throw FirebaseServiceException('Error confirming dispense', originalError: e);
    }
  }

  /// Update heartbeat
  static Future<void> updateHeartbeat() async {
    try {
      await _functions.httpsCallable('updateHeartbeat').call({
        'vendingMachineId': _vendingMachineId,
      });
    } on FirebaseFunctionsException catch (e) {
      // Log but don't throw - heartbeat failures shouldn't crash the app
      print('Error updating heartbeat: ${e.message} (code: ${e.code})');
    } catch (e) {
      print('Error updating heartbeat: $e');
    }
  }

  /// Clear the current session (call when session ends)
  static void clearCurrentSession() {
    _currentSessionId = null;
  }
}

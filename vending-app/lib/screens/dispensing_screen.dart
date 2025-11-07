import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import '../models/session.dart';
import '../models/vending_event.dart';
import '../services/firebase_service.dart';
import '../services/VendingServiceStub.dart';
import 'completion_screen.dart';

class DispensingScreen extends StatefulWidget {
  final String sessionId;

  const DispensingScreen({super.key, required this.sessionId});

  @override
  State<DispensingScreen> createState() => _DispensingScreenState();
}

class _DispensingScreenState extends State<DispensingScreen> {
  VendingSession? _session;
  final List<VendingEvent> _pendingEvents = [];
  final Map<String, int> _retryCount = {};
  bool _isProcessing = false;
  static const int maxRetries = 2;

  @override
  void initState() {
    super.initState();
    _listenToSession();
    _listenToEvents();
  }

  void _listenToSession() {
    FirebaseService.watchSession(widget.sessionId).listen((session) {
      if (session == null || !mounted) return;

      setState(() => _session = session);

      // Check if all items are dispensed or failed
      if (_isComplete(session)) {
        Timer(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => CompletionScreen(sessionId: widget.sessionId),
              ),
            );
          }
        });
      }
    });
  }

  void _listenToEvents() {
    FirebaseService.watchEvents().listen((events) {
      if (!mounted) return;

      final productDispatchEvents = events.where((e) => e.isProductDispatch).toList();

      setState(() {
        _pendingEvents.clear();
        _pendingEvents.addAll(productDispatchEvents);
      });

      // Process events
      _processNextEvent();
    });
  }

  Future<void> _processNextEvent() async {
    if (_isProcessing || _pendingEvents.isEmpty || !mounted) return;

    _isProcessing = true;
    final event = _pendingEvents.first;

    try {
      final productId = event.payload['productId'] as String;
      final productName = event.payload['productName'] as String;
      final slot = event.payload['slot'] as int;
      final eventKey = '${event.id}_$productId';

      // Get retry count
      final retries = _retryCount[eventKey] ?? 0;

      print('Dispensing: $productName (slot $slot), attempt ${retries + 1}');

      // Simulate dispensing delay
      await Future.delayed(const Duration(seconds: 2));

      // Call actual vending SDK
      bool success = false;
      try {
        await vendingInstance.ship(
          slotNo: slot,
          shipMethod: 0,
          amount: event.payload['price'] as int,
          tradeNo: 'txn_${event.sessionId}_${DateTime.now().millisecondsSinceEpoch}',
        );
        success = true;
        print('✓ Dispensed successfully: $productName');
      } catch (e) {
        print('✗ Dispense failed: $e');
        success = false;
      }

      // If failed and retries available, retry
      if (!success && retries < maxRetries) {
        setState(() {
          _retryCount[eventKey] = retries + 1;
        });
        print('Retrying... (${retries + 1}/$maxRetries)');

        // Wait before retry
        await Future.delayed(const Duration(seconds: 1));

        _isProcessing = false;
        _processNextEvent();
        return;
      }

      // Confirm dispense (success or final failure)
      await FirebaseService.confirmDispense(
        sessionId: widget.sessionId,
        productId: productId,
        slot: slot,
        success: success,
        eventId: event.id,
      );

      // Remove from pending
      setState(() {
        _pendingEvents.removeWhere((e) => e.id == event.id);
        _retryCount.remove(eventKey);
      });

      _isProcessing = false;

      // Process next event
      if (_pendingEvents.isNotEmpty) {
        await Future.delayed(const Duration(milliseconds: 500));
        _processNextEvent();
      }
    } catch (e) {
      print('Error processing event: $e');
      _isProcessing = false;

      // Retry after error
      await Future.delayed(const Duration(seconds: 2));
      _processNextEvent();
    }
  }

  bool _isComplete(VendingSession session) {
    final totalItems = session.basket.fold<int>(0, (sum, item) => sum + item.quantity);
    final processedItems = session.dispensedItems.where((item) => item.status != 'pending').length;
    return processedItems >= totalItems;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_session == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              Text(
                'Loading...',
                style: theme.textTheme.titleLarge,
              ),
            ],
          ),
        ),
      );
    }

    final totalItems = _session!.basket.fold<int>(0, (sum, item) => sum + item.quantity);
    final dispensedCount = _session!.successfullyDispensedCount;
    final failedCount = _session!.failedDispenseCount;
    final progress = totalItems > 0 ? (dispensedCount + failedCount) / totalItems : 0.0;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary.withOpacity(0.1),
              theme.colorScheme.secondary.withOpacity(0.1),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Text(
                      'Dispensing Products',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please wait while we prepare your items',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),

              // Dispensing animation
              SizedBox(
                height: 250,
                child: Lottie.asset(
                  'assets/animations/dispensing.json',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(
                      Icons.local_shipping_outlined,
                      size: 120,
                      color: Colors.grey,
                    );
                  },
                ),
              ),

              // Progress
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$dispensedCount',
                          style: theme.textTheme.displayMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        Text(
                          ' / $totalItems',
                          style: theme.textTheme.displayMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Items Dispensed',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 12,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Items list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  itemCount: _session!.basket.length,
                  itemBuilder: (context, index) {
                    final basketItem = _session!.basket[index];
                    return _buildItemStatus(basketItem, theme);
                  },
                ),
              ),

              // Failed items notice
              if (failedCount > 0)
                Container(
                  margin: const EdgeInsets.all(24),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.amber.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.warning_amber_rounded,
                        color: Colors.amber[700],
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          '$failedCount item(s) failed to dispense. Refund will be processed.',
                          style: TextStyle(
                            color: Colors.amber[900],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildItemStatus(BasketItem basketItem, ThemeData theme) {
    final itemDispenses = _session!.dispensedItems
        .where((di) => di.productId == basketItem.productId)
        .toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  basketItem.productName,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                '${itemDispenses.where((d) => d.status == 'dispensed').length}/${basketItem.quantity}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...List.generate(basketItem.quantity, (index) {
            final dispenseStatus =
                index < itemDispenses.length ? itemDispenses[index].status : 'pending';

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  _getStatusIcon(dispenseStatus),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _getStatusText(dispenseStatus),
                      style: TextStyle(
                        color: _getStatusColor(dispenseStatus),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _getStatusIcon(String status) {
    switch (status) {
      case 'dispensed':
        return const Icon(Icons.check_circle, color: Colors.green, size: 20);
      case 'failed':
        return const Icon(Icons.error, color: Colors.red, size: 20);
      default:
        return const SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        );
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'dispensed':
        return 'Dispensed successfully';
      case 'failed':
        return 'Failed to dispense';
      default:
        return 'Dispensing...';
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'dispensed':
        return Colors.green;
      case 'failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

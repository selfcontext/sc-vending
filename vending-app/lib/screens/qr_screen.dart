import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:lottie/lottie.dart';
import '../models/session.dart';
import '../services/firebase_service.dart';
import 'basket_screen.dart';

class QrScreen extends StatefulWidget {
  const QrScreen({super.key});

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> with SingleTickerProviderStateMixin {
  VendingSession? _session;
  bool _loading = true;
  bool _hasNavigated = false;
  late AnimationController _pulseController;
  StreamSubscription<VendingSession?>? _sessionSubscription;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _createSession();
    _startCountdownTimer();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _sessionSubscription?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdownTimer() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      // Trigger rebuild to update countdown display
      setState(() {});
    });
  }

  Future<void> _createSession() async {
    // Cancel any existing subscription before creating new session
    _sessionSubscription?.cancel();
    _sessionSubscription = null;

    // Reset navigation guard for new session
    _hasNavigated = false;

    // Clear any existing session in the service
    FirebaseService.clearCurrentSession();

    setState(() => _loading = true);

    try {
      final session = await FirebaseService.createSession();

      if (session != null && mounted) {
        setState(() {
          _session = session;
          _loading = false;
        });

        // Start listening to session changes
        _listenToSession(session.id);
      } else {
        setState(() => _loading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to create session')),
          );
        }
      }
    } on FirebaseServiceException catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}')),
        );
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Unexpected error: $e')),
        );
      }
    }
  }

  void _listenToSession(String sessionId) {
    _sessionSubscription?.cancel();
    _sessionSubscription = FirebaseService.watchSession(sessionId).listen(
      (session) {
        if (session == null || !mounted) return;

        setState(() => _session = session);

        // Navigate to basket screen when there's activity (with guard to prevent multiple triggers)
        if (session.basket.isNotEmpty && session.status == 'active' && !_hasNavigated) {
          _hasNavigated = true;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => BasketScreen(sessionId: sessionId),
            ),
          );
        }
      },
      onError: (error) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Session error: $error')),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return Scaffold(
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                theme.colorScheme.primary,
                theme.colorScheme.secondary,
              ],
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(color: Colors.white),
                const SizedBox(height: 24),
                Text(
                  'Initializing...',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary,
              theme.colorScheme.secondary,
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
                      'Second Space Vending',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Scan QR code to start shopping',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ],
                ),
              ),

              // QR Code
              Expanded(
                child: Center(
                  child: AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: 1.0 + (_pulseController.value * 0.05),
                        child: child,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(32),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_session != null)
                            QrImageView(
                              data: _session!.qrCodeData,
                              version: QrVersions.auto,
                              size: 300,
                              backgroundColor: Colors.white,
                            )
                          else
                            Container(
                              width: 300,
                              height: 300,
                              alignment: Alignment.center,
                              child: const CircularProgressIndicator(),
                            ),
                          const SizedBox(height: 24),
                          Text(
                            'Scan with your phone',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_session != null)
                            Text(
                              'Session expires in ${_getTimeRemaining()}',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: Colors.grey[600],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Bottom animation
              SizedBox(
                height: 200,
                child: Lottie.asset(
                  'assets/animations/scan.json',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(
                      Icons.qr_code_scanner,
                      size: 80,
                      color: Colors.white,
                    );
                  },
                ),
              ),

              // Refresh button
              Padding(
                padding: const EdgeInsets.all(24),
                child: ElevatedButton.icon(
                  onPressed: _createSession,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Generate New QR Code'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: theme.colorScheme.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getTimeRemaining() {
    if (_session == null) return '';

    final remaining = _session!.expiresAt.difference(DateTime.now());
    if (remaining.isNegative) return 'Expired';

    final minutes = remaining.inMinutes;
    final seconds = remaining.inSeconds % 60;
    return '${minutes}m ${seconds}s';
  }
}

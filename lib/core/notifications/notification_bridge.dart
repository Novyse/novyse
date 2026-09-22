import 'dart:async';
import 'dart:isolate';
import 'dart:ui' show IsolateNameServer;

import 'package:flutter/foundation.dart';

class NotificationBridge {
  NotificationBridge._();

  static const String portName = 'novyse_notif_bridge';
  static const String viaNotificationKey = 'viaNotification';

  static StreamSubscription? _subscription;
  static ReceivePort? _port;

  static void registerReceiver(
    Future<void> Function(Map<String, dynamic> message) onMessage,
  ) {
    try {
      if (_subscription != null) return;
      _port ??= ReceivePort();
      IsolateNameServer.removePortNameMapping(portName);
      IsolateNameServer.registerPortWithName(_port!.sendPort, portName);
      _subscription = _port!.listen((data) async {
        try {
          if (data is Map) {
            await onMessage(Map<String, dynamic>.from(data));
          }
        } catch (e) {
          debugPrint('[NotificationBridge] receiver failed: $e');
        }
      });
    } catch (e) {
      debugPrint('[NotificationBridge] register failed: $e');
    }
  }

  static void unregister() {
    try {
      _subscription?.cancel();
    } catch (_) {}
    _subscription = null;
    try {
      IsolateNameServer.removePortNameMapping(portName);
    } catch (_) {}
    try {
      _port?.close();
    } catch (_) {}
    _port = null;
  }

  static bool forwardMessage(Map<String, dynamic> message) {
    try {
      if (kIsWeb) return false;
      final port = IsolateNameServer.lookupPortByName(portName);
      if (port == null) return false;
      port.send(Map<String, dynamic>.from(message));
      return true;
    } catch (e) {
      debugPrint('[NotificationBridge] forward failed: $e');
      return false;
    }
  }
}

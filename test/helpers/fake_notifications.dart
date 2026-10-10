import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';

/// The channel `flutter_local_notifications` uses on its method-channel path.
const notificationsChannel = MethodChannel(
  'dexterous.com/flutter/local_notifications',
);

/// A `show` invocation captured from the notification channel.
class ShownNotification {
  const ShownNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.payload,
    this.details,
  });

  final int id;
  final String? title;
  final String? body;
  final String? payload;

  /// The serialized `platformSpecifics` map, i.e. the notification details.
  final Map<dynamic, dynamic>? details;

  /// The MessagingStyle block, present on chat notifications.
  Map<dynamic, dynamic> get style =>
      (details?['styleInformation'] as Map?)?.cast<dynamic, dynamic>() ??
      <dynamic, dynamic>{};

  /// The MessagingStyle people, one per message in the thread.
  List<Map<dynamic, dynamic>> get people =>
      (style['messages'] as List?)?.cast<Map<dynamic, dynamic>>() ??
      <Map<dynamic, dynamic>>[];

  /// The MessagingStyle conversation title.
  String? get conversation => style['conversationTitle'] as String?;

  /// The messaging-style message bodies, oldest first.
  List<String> get messages =>
      people.map((p) => p['text'] as String? ?? '').toList(growable: false);

  /// The android action ids declared on the notification.
  List<String> get actionIds => ((details?['actions'] as List?) ?? const [])
      .map((a) => (a as Map)['id'] as String? ?? '')
      .toList(growable: false);
}

/// Records everything sent to the local-notification method channel.
///
/// `LocalNotificationService` holds a private `FlutterLocalNotificationsPlugin`
/// that funnels into a method channel, so intercepting the channel is the only
/// way to observe what it would have displayed.
class FakeNotifications {
  FakeNotifications._(
    this.shown,
    this.cancelled,
    this.cancelledAll,
    this.inits,
  );

  /// Notifications passed to `show`, in order.
  final List<ShownNotification> shown;

  /// Ids passed to `cancel`, in order.
  final List<int> cancelled;

  /// How many times `cancelAll` was invoked.
  final List<void> cancelledAll;

  /// How many times the plugin was initialized.
  final List<void> inits;

  ShownNotification get last => shown.last;

  int get showCount => shown.length;

  /// Forgets everything recorded so far, for use after singleton setup.
  void clearRecords() {
    shown.clear();
    cancelled.clear();
    cancelledAll.clear();
    inits.clear();
  }

  /// Installs the fake for the duration of the current test and tears it down
  /// afterwards.
  ///
  /// `flutter_local_notifications` dispatches through
  /// `FlutterLocalNotificationsPlatform.instance`, which is a `late` field
  /// that only gets set by a platform's `registerWith()`. In `flutter_test`
  /// `defaultTargetPlatform` is Android, so registering the Android
  /// implementation makes `LocalNotificationService` route every call to the
  /// method channel intercepted below.
  static FakeNotifications install() {
    final fake = FakeNotifications._(
      <ShownNotification>[],
      <int>[],
      <void>[],
      <void>[],
    );
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

    messenger.setMockMethodCallHandler(notificationsChannel, (call) async {
      switch (call.method) {
        case 'show':
          final args = (call.arguments as Map).cast<String, dynamic>();
          fake.shown.add(
            ShownNotification(
              id: args['id'] as int,
              title: args['title'] as String?,
              body: args['body'] as String?,
              payload: args['payload'] as String?,
              details: (args['platformSpecifics'] as Map?)
                  ?.cast<dynamic, dynamic>(),
            ),
          );
          return null;
        case 'cancel':
          // The Android implementation sends `{id, tag}`; the method-channel
          // base class sends the bare id.
          final args = call.arguments;
          fake.cancelled.add(args is Map ? args['id'] as int : args as int);
          return null;
        case 'cancelAll':
          fake.cancelledAll.add(null);
          return null;
        case 'initialize':
          fake.inits.add(null);
          return true;
        case 'createNotificationChannel':
          return null;
        case 'requestNotificationsPermission':
          return true;
        default:
          return null;
      }
    });

    AndroidFlutterLocalNotificationsPlugin.registerWith();

    addTearDown(() {
      messenger.setMockMethodCallHandler(notificationsChannel, null);
    });

    return fake;
  }
}

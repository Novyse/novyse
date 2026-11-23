import 'dart:js_interop_unsafe';

import 'package:web/web.dart' as web;

/// Whether the browser exposes the Notification API.
bool get webNotificationsSupported => web.window.has('Notification');

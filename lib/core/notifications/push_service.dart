import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../../data/repositories/notifications_repository.dart';

/// Requests permission, registers the device's FCM token with the backend,
/// and surfaces incoming pushes while the app is open. Android suppresses
/// the system notification tray for foreground apps by default, so a
/// foreground push (e.g. a hot lead notifyIfHot() fired) is shown as an
/// in-app banner via [scaffoldMessengerKey] instead of relying on the OS.
class PushService {
  final NotificationsRepository _repo;
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;

  PushService(this._repo, this.scaffoldMessengerKey);

  bool _initialized = false;

  /// Call once, after the user is authenticated (voice unlock passed) —
  /// registering a token before that point isn't useful and the permission
  /// prompt reads better once the user is actually inside the app.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _repo.registerToken(token);

      // Token can rotate (app reinstall, etc.) — keep the backend in sync.
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        _repo.registerToken(newToken).catchError((_) {});
      });

      FirebaseMessaging.onMessage.listen(_showForegroundBanner);
      FirebaseMessaging.onMessageOpenedApp.listen(_showForegroundBanner);
    } catch (_) {
      // Firebase not configured, no Play Services on this device, permission
      // flow interrupted, etc. — the rest of the app works fine without push.
    }
  }

  void _showForegroundBanner(RemoteMessage message) {
    final title = message.notification?.title;
    final body = message.notification?.body;
    if (title == null && body == null) return;
    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Text(body != null ? '$title\n$body' : title!),
        duration: const Duration(seconds: 5),
      ),
    );
  }
}

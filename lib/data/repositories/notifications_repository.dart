import '../../core/network/api_client.dart';

class NotificationsRepository {
  final ApiClient _client;
  NotificationsRepository(this._client);

  Future<void> registerToken(String token, {String platform = 'android'}) =>
      _client.post('/notifications/register-token', body: {'token': token, 'platform': platform});
}

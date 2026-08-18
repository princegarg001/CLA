import '../../core/network/api_client.dart';
import '../models/analytics_models.dart';

class AnalyticsRepository {
  final ApiClient _client;
  AnalyticsRepository(this._client);

  Future<UmamiStats> umamiStats() async {
    final data = await _client.get('/umami/stats');
    return UmamiStats.fromJson(data as Map<String, dynamic>);
  }

  Future<int> umamiActiveVisitors() async {
    final data = await _client.get('/umami/active');
    return ((data as Map)['visitors'] as num?)?.toInt() ?? 0;
  }

  Future<SentryHealth> sentryHealth() async {
    final data = await _client.get('/sentry/health');
    return SentryHealth.fromJson(data as Map<String, dynamic>);
  }

  Future<WeeklyReport> weeklyReport() async {
    final data = await _client.get('/intelligence/weekly-report');
    return WeeklyReport.fromJson(data as Map<String, dynamic>);
  }
}

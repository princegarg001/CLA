import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/analytics_models.dart';
import '../data/repositories/analytics_repository.dart';

class AnalyticsProvider extends ChangeNotifier with ViewStateMixin {
  final AnalyticsRepository _repo;
  AnalyticsProvider(this._repo);

  UmamiStats? umami;
  int activeVisitors = 0;
  SentryHealth? sentry;
  WeeklyReport? weeklyReport;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([
          _repo.umamiStats(),
          _repo.umamiActiveVisitors(),
          _repo.sentryHealth(),
          _repo.weeklyReport(),
        ]);
        umami = results[0] as UmamiStats;
        activeVisitors = results[1] as int;
        sentry = results[2] as SentryHealth;
        weeklyReport = results[3] as WeeklyReport;
      });
}

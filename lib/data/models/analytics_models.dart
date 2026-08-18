/// GET /api/umami/stats
class UmamiStats {
  final int pageviews;
  final int visitors;
  final num? bounceRate;
  final List<Map<String, dynamic>> topSources;
  final List<Map<String, dynamic>> topPages;
  final Map<String, int> geography;

  UmamiStats({
    this.pageviews = 0,
    this.visitors = 0,
    this.bounceRate,
    this.topSources = const [],
    this.topPages = const [],
    this.geography = const {},
  });

  factory UmamiStats.fromJson(Map<String, dynamic> json) => UmamiStats(
        pageviews: (json['pageviews'] as num?)?.toInt() ?? 0,
        visitors: (json['visitors'] as num?)?.toInt() ?? 0,
        bounceRate: json['bounceRate'] as num?,
        topSources: (json['topSources'] as List?)?.cast<Map<String, dynamic>>() ?? const [],
        topPages: (json['topPages'] as List?)?.cast<Map<String, dynamic>>() ?? const [],
        geography: (json['geography'] as Map?)?.map((k, v) => MapEntry(k.toString(), (v as num).toInt())) ?? const {},
      );
}

/// GET /api/sentry/issues + /api/sentry/health
class SentryHealth {
  final String status; // red | amber | green
  final int errorsToday;
  final int critical;
  final int warnings;
  final int resolved;
  final List<Map<String, dynamic>> recent;

  SentryHealth({
    this.status = 'green',
    this.errorsToday = 0,
    this.critical = 0,
    this.warnings = 0,
    this.resolved = 0,
    this.recent = const [],
  });

  factory SentryHealth.fromJson(Map<String, dynamic> json) => SentryHealth(
        status: json['status']?.toString() ?? 'green',
        errorsToday: (json['errorsToday'] as num?)?.toInt() ?? 0,
        critical: (json['critical'] as num?)?.toInt() ?? 0,
        warnings: (json['warnings'] as num?)?.toInt() ?? 0,
        resolved: (json['resolved'] as num?)?.toInt() ?? 0,
        recent: (json['recent'] as List?)?.cast<Map<String, dynamic>>() ?? const [],
      );
}

/// GET /api/intelligence/weekly-report
class WeeklyReport {
  final int newLeads;
  final int callsBooked;
  final int dealsClosed;
  final num revenueClosed;
  final String insight;

  WeeklyReport({
    this.newLeads = 0,
    this.callsBooked = 0,
    this.dealsClosed = 0,
    this.revenueClosed = 0,
    this.insight = '',
  });

  factory WeeklyReport.fromJson(Map<String, dynamic> json) => WeeklyReport(
        newLeads: (json['newLeads'] as num?)?.toInt() ?? 0,
        callsBooked: (json['callsBooked'] as num?)?.toInt() ?? 0,
        dealsClosed: (json['dealsClosed'] as num?)?.toInt() ?? 0,
        revenueClosed: (json['revenueClosed'] as num?) ?? 0,
        insight: json['insight']?.toString() ?? '',
      );
}

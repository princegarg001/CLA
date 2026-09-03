/// GET /api/revenue/trustmrr
class MrrData {
  final num mrr;
  final num arr;
  final num? newMrr;
  final num? churnRate;
  final num? expansionMrr;
  final num? netRevenueRetention;

  MrrData({required this.mrr, required this.arr, this.newMrr, this.churnRate, this.expansionMrr, this.netRevenueRetention});

  factory MrrData.fromJson(Map<String, dynamic> json) => MrrData(
        mrr: (json['mrr'] as num?) ?? 0,
        arr: (json['arr'] as num?) ?? 0,
        newMrr: json['newMrr'] as num?,
        churnRate: json['churnRate'] as num?,
        expansionMrr: json['expansionMrr'] as num?,
        netRevenueRetention: json['netRevenueRetention'] as num?,
      );
}

/// GET /api/revenue/trend — one point per week for the MRR chart.
class TrendPoint {
  final int week;
  final num mrr;
  TrendPoint({required this.week, required this.mrr});

  factory TrendPoint.fromJson(Map<String, dynamic> json) => TrendPoint(
        week: (json['week'] as num?)?.toInt() ?? 0,
        mrr: (json['mrr'] as num?) ?? 0,
      );
}

/// GET/POST /api/revenue/deals
class Deal {
  final String id;
  final String title;
  final num value;
  final String? source;
  final DateTime? closedAt;

  Deal({required this.id, required this.title, required this.value, this.source, this.closedAt});

  factory Deal.fromJson(Map<String, dynamic> json) => Deal(
        id: (json['id'] ?? '').toString(),
        title: json['title']?.toString() ?? 'Untitled deal',
        value: (json['value'] as num?) ?? 0,
        source: json['source'] as String?,
        closedAt: DateTime.tryParse((json['closed_at'] ?? json['created_at'])?.toString() ?? ''),
      );

  Map<String, dynamic> toCreateJson() => {
        'title': title,
        'value': value,
        if (source != null) 'source': source,
      };
}

/// The referral-attribution block inside GET /api/revenue/summary.
class ReferralStats {
  final int leadCount;
  final int clientCount;
  final num revenue;

  ReferralStats({this.leadCount = 0, this.clientCount = 0, this.revenue = 0});

  factory ReferralStats.fromJson(Map<String, dynamic> json) => ReferralStats(
        leadCount: (json['leadCount'] as num?)?.toInt() ?? 0,
        clientCount: (json['clientCount'] as num?)?.toInt() ?? 0,
        revenue: (json['revenue'] as num?) ?? 0,
      );
}

/// GET /api/revenue/summary
class RevenueSummary {
  final num mrr;
  final num arr;
  final num projectRevenue;
  final num totalRevenue;
  final num avgDealSize;
  final int dealCount;
  final Map<String, num> revenueBySource;
  final ReferralStats referrals;

  RevenueSummary({
    required this.mrr,
    required this.arr,
    required this.projectRevenue,
    required this.totalRevenue,
    required this.avgDealSize,
    required this.dealCount,
    required this.revenueBySource,
    required this.referrals,
  });

  factory RevenueSummary.fromJson(Map<String, dynamic> json) => RevenueSummary(
        mrr: (json['mrr'] as num?) ?? 0,
        arr: (json['arr'] as num?) ?? 0,
        projectRevenue: (json['projectRevenue'] as num?) ?? 0,
        totalRevenue: (json['totalRevenue'] as num?) ?? 0,
        avgDealSize: (json['avgDealSize'] as num?) ?? 0,
        dealCount: (json['dealCount'] as num?)?.toInt() ?? 0,
        revenueBySource: (json['revenueBySource'] as Map?)?.map((k, v) => MapEntry(k.toString(), v as num)) ?? const {},
        referrals: ReferralStats.fromJson((json['referrals'] as Map?)?.cast<String, dynamic>() ?? const {}),
      );
}

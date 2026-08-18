/// Apollo email sequence tracking — GET /api/apollo/sequences.
class ApolloSequence {
  final String id;
  final String name;
  final num? openRate;
  final num? replyRate;
  final int bookedCalls;
  final bool sample;

  ApolloSequence({
    required this.id,
    required this.name,
    this.openRate,
    this.replyRate,
    this.bookedCalls = 0,
    this.sample = false,
  });

  factory ApolloSequence.fromJson(Map<String, dynamic> json) => ApolloSequence(
        id: (json['id'] ?? '').toString(),
        name: json['name']?.toString() ?? 'Untitled sequence',
        openRate: json['openRate'] as num? ?? json['open_rate'] as num?,
        replyRate: json['replyRate'] as num? ?? json['reply_rate'] as num?,
        bookedCalls: (json['bookedCalls'] as num? ?? json['booked_calls'] as num?)?.toInt() ?? 0,
        sample: json['sample'] == true,
      );
}

/// Saved Ideal Client Profile — GET/POST /api/apollo/icp.
class IcpProfile {
  final String id;
  final String name;
  final List<String> industries;
  final List<String> techStack;
  final List<String> regions;

  IcpProfile({required this.id, required this.name, this.industries = const [], this.techStack = const [], this.regions = const []});

  factory IcpProfile.fromJson(Map<String, dynamic> json) => IcpProfile(
        id: (json['id'] ?? '').toString(),
        name: json['name']?.toString() ?? 'Untitled ICP',
        industries: (json['industries'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        techStack: (json['tech_stack'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        regions: (json['regions'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      );
}

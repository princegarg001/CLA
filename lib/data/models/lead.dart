/// Mirrors the `leads` table (supabase_schema.sql) / JSON-fallback lead shape.
/// Used across War Room, Apollo Hunter, Freelance Radar and Outreach Composer —
/// one model for "a person or opportunity CLA is tracking," regardless of source.
class Lead {
  final String id;
  final String source;
  final String? name;
  final String? email;
  final String? role;
  final String? company;
  final int? companySize;
  final String? region;
  final String? linkedinUrl;
  final List<String> techStack;
  final String? fundingRound;
  final num? fundingAmount;
  final String? intentSignal;
  final String? urgency;
  final int score;
  final String status;
  final bool locked;
  final String? aiBrief;
  final Map<String, dynamic> raw;
  final DateTime? createdAt;
  final bool sample;

  Lead({
    required this.id,
    required this.source,
    this.name,
    this.email,
    this.role,
    this.company,
    this.companySize,
    this.region,
    this.linkedinUrl,
    this.techStack = const [],
    this.fundingRound,
    this.fundingAmount,
    this.intentSignal,
    this.urgency,
    this.score = 1,
    this.status = 'new',
    this.locked = false,
    this.aiBrief,
    this.raw = const {},
    this.createdAt,
    this.sample = false,
  });

  String get displayName => name?.trim().isNotEmpty == true
      ? name!
      : (company?.trim().isNotEmpty == true ? company! : 'Unknown lead');

  String get displayTitle {
    if (role != null && company != null) return '$role at $company';
    if (role != null) return role!;
    if (company != null) return company!;
    return intentSignal ?? source;
  }

  factory Lead.fromJson(Map<String, dynamic> json) {
    return Lead(
      id: (json['id'] ?? '').toString(),
      source: json['source']?.toString() ?? 'manual',
      name: json['name'] as String?,
      email: json['email'] as String?,
      role: json['role'] as String?,
      company: json['company'] as String?,
      companySize: (json['company_size'] as num?)?.toInt(),
      region: json['region'] as String?,
      linkedinUrl: json['linkedin_url'] as String?,
      techStack: (json['tech_stack'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      fundingRound: json['funding_round'] as String?,
      fundingAmount: json['funding_amount'] as num?,
      intentSignal: json['intent_signal'] as String?,
      urgency: json['urgency'] as String?,
      score: (json['score'] as num?)?.round() ?? 1,
      status: json['status']?.toString() ?? 'new',
      locked: json['locked'] == true,
      aiBrief: json['ai_brief'] as String?,
      raw: (json['raw'] as Map?)?.cast<String, dynamic>() ?? const {},
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
      sample: json['sample'] == true,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'source': source,
        if (name != null) 'name': name,
        if (email != null) 'email': email,
        if (role != null) 'role': role,
        if (company != null) 'company': company,
        if (companySize != null) 'company_size': companySize,
        if (region != null) 'region': region,
      };
}

/// Pipeline stage → count, as returned by GET /api/leads/pipeline and
/// /api/warroom/summary. Order matches the visual funnel on War Room.
class PipelineCounts {
  final int newCount;
  final int contacted;
  final int replied;
  final int callBooked;
  final int proposalSent;
  final int closedWon;
  final int closedLost;

  PipelineCounts({
    this.newCount = 0,
    this.contacted = 0,
    this.replied = 0,
    this.callBooked = 0,
    this.proposalSent = 0,
    this.closedWon = 0,
    this.closedLost = 0,
  });

  factory PipelineCounts.fromJson(Map<String, dynamic> json) => PipelineCounts(
        newCount: (json['new'] as num?)?.toInt() ?? 0,
        contacted: (json['contacted'] as num?)?.toInt() ?? 0,
        replied: (json['replied'] as num?)?.toInt() ?? 0,
        callBooked: (json['call_booked'] as num?)?.toInt() ?? 0,
        proposalSent: (json['proposal_sent'] as num?)?.toInt() ?? 0,
        closedWon: (json['closed_won'] as num?)?.toInt() ?? 0,
        closedLost: (json['closed_lost'] as num?)?.toInt() ?? 0,
      );

  int get total => newCount + contacted + replied + callBooked + proposalSent + closedWon + closedLost;
}

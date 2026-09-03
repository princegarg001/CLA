/// Mirrors the `upwork_jobs` table — a job post monitored via a third-party
/// watcher (Vollna webhook), forwarded email, or manual paste.
class UpworkJob {
  final String id;
  final String title;
  final String? description;
  final String? clientName;
  final num? budgetMin;
  final num? budgetMax;
  final String budgetType; // fixed | hourly
  final List<String> skills;
  final String? country;
  final Map<String, dynamic> clientHistory;
  final String? upworkUrl;
  final num aiScore;
  final String? aiScoreReason;
  final String? aiProposal;
  final String status; // new | applied | interviewing | hired | rejected | expired
  final DateTime? appliedAt;
  final String? proposalText;
  final num? outcomeValue;
  final String source; // vollna | email | manual
  final DateTime? createdAt;
  final bool sample;

  UpworkJob({
    required this.id,
    required this.title,
    this.description,
    this.clientName,
    this.budgetMin,
    this.budgetMax,
    this.budgetType = 'fixed',
    this.skills = const [],
    this.country,
    this.clientHistory = const {},
    this.upworkUrl,
    this.aiScore = 1,
    this.aiScoreReason,
    this.aiProposal,
    this.status = 'new',
    this.appliedAt,
    this.proposalText,
    this.outcomeValue,
    this.source = 'manual',
    this.createdAt,
    this.sample = false,
  });

  factory UpworkJob.fromJson(Map<String, dynamic> json) => UpworkJob(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? 'Untitled job',
        description: json['description'] as String?,
        clientName: json['client_name'] as String?,
        budgetMin: json['budget_min'] as num?,
        budgetMax: json['budget_max'] as num?,
        budgetType: json['budget_type']?.toString() ?? 'fixed',
        skills: (json['skills'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        country: json['country'] as String?,
        clientHistory: (json['client_history'] as Map?)?.cast<String, dynamic>() ?? const {},
        upworkUrl: json['upwork_url'] as String?,
        aiScore: (json['ai_score'] as num?) ?? 1,
        aiScoreReason: json['ai_score_reason'] as String?,
        aiProposal: json['ai_proposal'] as String?,
        status: json['status']?.toString() ?? 'new',
        appliedAt: DateTime.tryParse(json['applied_at']?.toString() ?? ''),
        proposalText: json['proposal_text'] as String?,
        outcomeValue: json['outcome_value'] as num?,
        source: json['source']?.toString() ?? 'manual',
        createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
        sample: json['sample'] == true,
      );

  String get budgetLabel {
    if (budgetType == 'hourly') {
      if (budgetMin != null && budgetMax != null) return '\$${budgetMin!.round()}-\$${budgetMax!.round()}/hr';
      return 'Hourly';
    }
    if (budgetMin != null && budgetMax != null) return '\$${budgetMin!.round()}-\$${budgetMax!.round()}';
    if (budgetMax != null) return 'Up to \$${budgetMax!.round()}';
    if (budgetMin != null) return 'From \$${budgetMin!.round()}';
    return 'Budget not specified';
  }
}

/// GET /api/upwork/stats
class UpworkStats {
  final num winRate;
  final num avgDealSize;
  final num avgApplyDelayHours;
  final Map<String, int> pipeline;
  final bool sample;

  UpworkStats({this.winRate = 0, this.avgDealSize = 0, this.avgApplyDelayHours = 0, this.pipeline = const {}, this.sample = false});

  factory UpworkStats.fromJson(Map<String, dynamic> json) => UpworkStats(
        winRate: (json['winRate'] as num?) ?? 0,
        avgDealSize: (json['avgDealSize'] as num?) ?? 0,
        avgApplyDelayHours: (json['avgApplyDelayHours'] as num?) ?? 0,
        pipeline: (json['pipeline'] as Map?)?.map((k, v) => MapEntry(k.toString(), (v as num).toInt())) ?? const {},
        sample: json['sample'] == true,
      );
}

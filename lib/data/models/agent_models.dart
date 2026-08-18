/// One of the three AgentScope agents — parsed out of GET /api/agents/status.
class AgentInfo {
  final String name; // prospector | publisher | researcher
  final String status; // running | idle
  final DateTime? lastRun;

  AgentInfo({required this.name, required this.status, this.lastRun});

  factory AgentInfo.fromJson(Map<String, dynamic> json) => AgentInfo(
        name: json['name']?.toString() ?? '',
        status: json['status']?.toString() ?? 'idle',
        lastRun: DateTime.tryParse(json['lastRun']?.toString() ?? ''),
      );
}

class AgentStatusSummary {
  final int running;
  final int queued;
  final List<AgentInfo> agents;

  AgentStatusSummary({this.running = 0, this.queued = 0, this.agents = const []});

  factory AgentStatusSummary.fromJson(Map<String, dynamic> json) => AgentStatusSummary(
        running: (json['running'] as num?)?.toInt() ?? 0,
        queued: (json['queued'] as num?)?.toInt() ?? 0,
        agents: (json['agents'] as List?)?.map((e) => AgentInfo.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      );
}

/// GET /api/agents/runs — execution log for prospector/publisher/researcher/gro_flow.
class AgentRun {
  final String id;
  final String agent;
  final String trigger;
  final String status;
  final Map<String, dynamic> output;
  final String? error;
  final DateTime? startedAt;

  AgentRun({
    required this.id,
    required this.agent,
    required this.trigger,
    required this.status,
    this.output = const {},
    this.error,
    this.startedAt,
  });

  factory AgentRun.fromJson(Map<String, dynamic> json) => AgentRun(
        id: (json['id'] ?? '').toString(),
        agent: json['agent']?.toString() ?? '',
        trigger: json['trigger']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        output: (json['output'] as Map?)?.cast<String, dynamic>() ?? const {},
        error: json['error'] as String?,
        startedAt: DateTime.tryParse(json['started_at']?.toString() ?? ''),
      );
}

/// GET /api/agents/verdent/insights
class VerdentInsight {
  final String text;
  VerdentInsight({required this.text});
  factory VerdentInsight.fromJson(Map<String, dynamic> json) => VerdentInsight(text: json['text']?.toString() ?? '');
}

/// GET /api/agents/headai/signals
class HiringSignal {
  final String company;
  final int hires;
  final List<String> roles;
  final String? region;

  HiringSignal({required this.company, this.hires = 0, this.roles = const [], this.region});

  factory HiringSignal.fromJson(Map<String, dynamic> json) => HiringSignal(
        company: json['company']?.toString() ?? '',
        hires: (json['hires'] as num?)?.toInt() ?? 0,
        roles: (json['roles'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        region: json['region'] as String?,
      );
}

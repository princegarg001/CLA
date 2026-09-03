/// Mirrors the `clients` table — a lead that converted to closed_won.
class Client {
  final String id;
  final String? leadId;
  final String name;
  final String? company;
  final String? email;
  final String? phone;
  final String? timezone;
  final String? region;
  final String? preferredChannel;
  final String? avatarUrl;
  final String status; // active | paused | completed | churned
  final int healthScore;
  final String? healthReason;
  final num totalRevenue;
  final int totalProjects;
  final String? notes;
  final List<String> tags;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Populated only by GET /api/clients/:id (the full-profile call).
  final List<Project> projects;
  final List<Invoice> invoices;
  final List<CommunicationLogEntry> recentTimeline;

  Client({
    required this.id,
    this.leadId,
    required this.name,
    this.company,
    this.email,
    this.phone,
    this.timezone,
    this.region,
    this.preferredChannel,
    this.avatarUrl,
    this.status = 'active',
    this.healthScore = 8,
    this.healthReason,
    this.totalRevenue = 0,
    this.totalProjects = 0,
    this.notes,
    this.tags = const [],
    this.createdAt,
    this.updatedAt,
    this.projects = const [],
    this.invoices = const [],
    this.recentTimeline = const [],
  });

  factory Client.fromJson(Map<String, dynamic> json) => Client(
        id: json['id']?.toString() ?? '',
        leadId: json['lead_id'] as String?,
        name: json['name']?.toString() ?? 'Unnamed client',
        company: json['company'] as String?,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        timezone: json['timezone'] as String?,
        region: json['region'] as String?,
        preferredChannel: json['preferred_channel'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        status: json['status']?.toString() ?? 'active',
        healthScore: (json['health_score'] as num?)?.toInt() ?? 8,
        healthReason: json['health_reason'] as String?,
        totalRevenue: (json['total_revenue'] as num?) ?? 0,
        totalProjects: (json['total_projects'] as num?)?.toInt() ?? 0,
        notes: json['notes'] as String?,
        tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
        updatedAt: DateTime.tryParse(json['updated_at']?.toString() ?? ''),
        projects: (json['projects'] as List?)?.map((e) => Project.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
        invoices: (json['invoices'] as List?)?.map((e) => Invoice.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
        recentTimeline: (json['recentTimeline'] as List?)?.map((e) => CommunicationLogEntry.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      );
}

/// Mirrors the `projects` table.
class Project {
  final String id;
  final String clientId;
  final String title;
  final String? description;
  final String status; // scoping | active | review | completed | cancelled
  final num? budget;
  final String currency;
  final String paymentType; // fixed | hourly | retainer
  final num? hourlyRate;
  final num hoursLogged;
  final DateTime? timerStartedAt;
  final DateTime? dueDate;
  final String? source;

  Project({
    required this.id,
    required this.clientId,
    required this.title,
    this.description,
    this.status = 'scoping',
    this.budget,
    this.currency = 'USD',
    this.paymentType = 'fixed',
    this.hourlyRate,
    this.hoursLogged = 0,
    this.timerStartedAt,
    this.dueDate,
    this.source,
  });

  factory Project.fromJson(Map<String, dynamic> json) => Project(
        id: json['id']?.toString() ?? '',
        clientId: json['client_id']?.toString() ?? '',
        title: json['title']?.toString() ?? 'Untitled project',
        description: json['description'] as String?,
        status: json['status']?.toString() ?? 'scoping',
        budget: json['budget'] as num?,
        currency: json['currency']?.toString() ?? 'USD',
        paymentType: json['payment_type']?.toString() ?? 'fixed',
        hourlyRate: json['hourly_rate'] as num?,
        hoursLogged: (json['hours_logged'] as num?) ?? 0,
        timerStartedAt: DateTime.tryParse(json['timer_started_at']?.toString() ?? ''),
        dueDate: DateTime.tryParse(json['due_date']?.toString() ?? ''),
        source: json['source'] as String?,
      );

  bool get isTimerRunning => timerStartedAt != null;
}

/// Mirrors the `milestones` table.
class Milestone {
  final String id;
  final String projectId;
  final String title;
  final String? description;
  final num? amount;
  final String status; // pending | in_progress | delivered | approved | paid
  final DateTime? dueDate;

  Milestone({required this.id, required this.projectId, required this.title, this.description, this.amount, this.status = 'pending', this.dueDate});

  factory Milestone.fromJson(Map<String, dynamic> json) => Milestone(
        id: json['id']?.toString() ?? '',
        projectId: json['project_id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        description: json['description'] as String?,
        amount: json['amount'] as num?,
        status: json['status']?.toString() ?? 'pending',
        dueDate: DateTime.tryParse(json['due_date']?.toString() ?? ''),
      );
}

/// Mirrors the `invoices` table.
class Invoice {
  final String id;
  final String clientId;
  final String? projectId;
  final num amount;
  final String currency;
  final String status; // pending | sent | paid | overdue
  final DateTime? dueDate;
  final DateTime? paidAt;

  Invoice({required this.id, required this.clientId, this.projectId, required this.amount, this.currency = 'USD', this.status = 'pending', this.dueDate, this.paidAt});

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        id: json['id']?.toString() ?? '',
        clientId: json['client_id']?.toString() ?? '',
        projectId: json['project_id'] as String?,
        amount: (json['amount'] as num?) ?? 0,
        currency: json['currency']?.toString() ?? 'USD',
        status: json['status']?.toString() ?? 'pending',
        dueDate: DateTime.tryParse(json['due_date']?.toString() ?? ''),
        paidAt: DateTime.tryParse(json['paid_at']?.toString() ?? ''),
      );
}

/// Mirrors the `communication_log` table.
class CommunicationLogEntry {
  final String id;
  final String clientId;
  final String channel;
  final String direction; // outbound | inbound
  final String summary;
  final String? fullContent;
  final String? sentiment; // positive | neutral | negative
  final DateTime? createdAt;

  CommunicationLogEntry({
    required this.id,
    required this.clientId,
    required this.channel,
    this.direction = 'outbound',
    required this.summary,
    this.fullContent,
    this.sentiment,
    this.createdAt,
  });

  factory CommunicationLogEntry.fromJson(Map<String, dynamic> json) => CommunicationLogEntry(
        id: json['id']?.toString() ?? '',
        clientId: json['client_id']?.toString() ?? '',
        channel: json['channel']?.toString() ?? 'email',
        direction: json['direction']?.toString() ?? 'outbound',
        summary: json['summary']?.toString() ?? '',
        fullContent: json['full_content'] as String?,
        sentiment: json['sentiment'] as String?,
        createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
      );
}

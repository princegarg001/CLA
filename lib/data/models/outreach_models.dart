/// GET /api/outreach/inbox, POST /api/outreach/generate, PATCH /messages/:id
class OutreachMessage {
  final String id;
  final String? leadId;
  final String channel;
  final String direction;
  final String? tone;
  final String? market;
  final String? subject;
  final String body;
  final bool aiGenerated;
  final String status;
  final DateTime? createdAt;

  OutreachMessage({
    required this.id,
    this.leadId,
    required this.channel,
    this.direction = 'outbound',
    this.tone,
    this.market,
    this.subject,
    this.body = '',
    this.aiGenerated = false,
    this.status = 'draft',
    this.createdAt,
  });

  factory OutreachMessage.fromJson(Map<String, dynamic> json) => OutreachMessage(
        id: (json['id'] ?? '').toString(),
        leadId: json['leadId']?.toString() ?? json['lead_id']?.toString(),
        channel: json['channel']?.toString() ?? 'apollo_email',
        direction: json['direction']?.toString() ?? 'outbound',
        tone: json['tone'] as String?,
        market: json['market'] as String?,
        subject: json['subject'] as String?,
        body: json['body']?.toString() ?? '',
        aiGenerated: json['aiGenerated'] == true || json['ai_generated'] == true,
        status: json['status']?.toString() ?? 'draft',
        createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
      );
}

/// GET/POST /api/outreach/templates
class MessageTemplate {
  final String id;
  final String name;
  final String? category;
  final String? tone;
  final String? market;
  final String body;

  MessageTemplate({required this.id, required this.name, this.category, this.tone, this.market, this.body = ''});

  factory MessageTemplate.fromJson(Map<String, dynamic> json) => MessageTemplate(
        id: (json['id'] ?? '').toString(),
        name: json['name']?.toString() ?? 'Untitled template',
        category: json['category'] as String?,
        tone: json['tone'] as String?,
        market: json['market'] as String?,
        body: json['body']?.toString() ?? '',
      );
}

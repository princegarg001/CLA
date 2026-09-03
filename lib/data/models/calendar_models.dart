import 'social_models.dart';

/// One row of the unified Social Command Center calendar
/// (GET/POST/PATCH /api/calendar).
class CalendarEntry {
  final String id;
  final String content;
  final List<String> mediaUrls;
  final List<String> platforms;
  final String postType; // post | thread | reel | story | carousel | comment
  final DateTime scheduledFor;
  final String timezone;
  final String status; // draft | scheduled | posted | failed | cancelled
  final bool aiGenerated;
  final List<PublishResult> results;

  CalendarEntry({
    required this.id,
    required this.content,
    this.mediaUrls = const [],
    required this.platforms,
    this.postType = 'post',
    required this.scheduledFor,
    this.timezone = 'America/New_York',
    this.status = 'scheduled',
    this.aiGenerated = false,
    this.results = const [],
  });

  factory CalendarEntry.fromJson(Map<String, dynamic> json) => CalendarEntry(
        id: json['id']?.toString() ?? '',
        content: json['content']?.toString() ?? '',
        mediaUrls: (json['media_urls'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        platforms: (json['platforms'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        postType: json['post_type']?.toString() ?? 'post',
        scheduledFor: DateTime.tryParse(json['scheduled_for']?.toString() ?? '') ?? DateTime.now(),
        timezone: json['timezone']?.toString() ?? 'America/New_York',
        status: json['status']?.toString() ?? 'scheduled',
        aiGenerated: json['ai_generated'] == true,
        results: (json['results'] as List?)
                ?.whereType<Map>()
                .map((e) => PublishResult.fromJson(e.cast<String, dynamic>()))
                .toList() ??
            const [],
      );

  bool get isDraft => status == 'draft';
  bool get isPosted => status == 'posted';
  bool get isFailed => status == 'failed';
}

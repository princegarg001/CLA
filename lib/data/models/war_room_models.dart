/// Today's 3 AI-ranked priorities — GET /api/warroom/missions.
class Mission {
  final String text;
  final int priority;
  Mission({required this.text, required this.priority});

  factory Mission.fromJson(Map<String, dynamic> json) => Mission(
        text: json['text']?.toString() ?? '',
        priority: (json['priority'] as num?)?.toInt() ?? 1,
      );
}

/// One row in the live feed — GET /api/warroom/feed.
class FeedAlert {
  final String type; // lead | alert | traffic
  final String text;
  final DateTime? timestamp;
  FeedAlert({required this.type, required this.text, this.timestamp});

  factory FeedAlert.fromJson(Map<String, dynamic> json) => FeedAlert(
        type: json['type']?.toString() ?? 'lead',
        text: json['text']?.toString() ?? '',
        timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? ''),
      );
}

/// GET /api/warroom/summary — pipeline + revenue meter for the home screen.
class WarRoomSummary {
  final Map<String, int> pipeline;
  final num mrr;
  final num arr;
  WarRoomSummary({required this.pipeline, required this.mrr, required this.arr});

  factory WarRoomSummary.fromJson(Map<String, dynamic> json) => WarRoomSummary(
        pipeline: (json['pipeline'] as Map?)?.map((k, v) => MapEntry(k.toString(), (v as num).toInt())) ?? {},
        mrr: (json['mrr'] as num?) ?? 0,
        arr: (json['arr'] as num?) ?? 0,
      );
}

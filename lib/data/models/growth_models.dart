/// GET /api/twitter/analytics
class TwitterAnalytics {
  final bool available;
  final String? unavailableReason;
  final int followers;
  final int followersDelta7d;
  final Map<String, int> geography;
  final List<Map<String, dynamic>> topTweets;

  TwitterAnalytics({
    this.available = true,
    this.unavailableReason,
    this.followers = 0,
    this.followersDelta7d = 0,
    this.geography = const {},
    this.topTweets = const [],
  });

  factory TwitterAnalytics.fromJson(Map<String, dynamic> json) => TwitterAnalytics(
        available: json['available'] != false,
        unavailableReason: json['message'] as String?,
        followers: (json['followers'] as num?)?.toInt() ?? 0,
        followersDelta7d: (json['followersDelta7d'] as num?)?.toInt() ?? 0,
        geography: (json['geography'] as Map?)?.map((k, v) => MapEntry(k.toString(), (v as num).toInt())) ?? const {},
        topTweets: (json['topTweets'] as List?)?.cast<Map<String, dynamic>>() ?? const [],
      );
}

/// GET/POST /api/twitter/scheduled
class ScheduledPost {
  final String id;
  final String content;
  final DateTime? scheduledFor;
  final String status;

  ScheduledPost({required this.id, required this.content, this.scheduledFor, this.status = 'scheduled'});

  factory ScheduledPost.fromJson(Map<String, dynamic> json) => ScheduledPost(
        id: (json['id'] ?? '').toString(),
        content: json['content']?.toString() ?? '',
        scheduledFor: DateTime.tryParse(json['scheduled_for']?.toString() ?? ''),
        status: json['status']?.toString() ?? 'scheduled',
      );
}

/// GET /api/twitter/dms
class TwitterDm {
  final String from;
  final String text;
  final String? time;
  TwitterDm({required this.from, required this.text, this.time});

  factory TwitterDm.fromJson(Map<String, dynamic> json) => TwitterDm(
        from: json['from']?.toString() ?? '',
        text: json['text']?.toString() ?? '',
        time: json['time']?.toString(),
      );
}

/// GET /api/gumroad/products
class GumroadProduct {
  final String name;
  final int downloads;
  final num price;
  GumroadProduct({required this.name, this.downloads = 0, this.price = 0});

  factory GumroadProduct.fromJson(Map<String, dynamic> json) => GumroadProduct(
        name: json['name']?.toString() ?? 'Untitled resource',
        downloads: (json['downloads'] as num?)?.toInt() ?? 0,
        price: (json['price'] as num?) ?? 0,
      );
}

/// GET /api/gumroad/stats
class GumroadStats {
  final int totalDownloads;
  final int salesCount;
  final String? topResource;
  final List<GumroadProduct> products;

  GumroadStats({this.totalDownloads = 0, this.salesCount = 0, this.topResource, this.products = const []});

  factory GumroadStats.fromJson(Map<String, dynamic> json) => GumroadStats(
        totalDownloads: (json['totalDownloads'] as num?)?.toInt() ?? 0,
        salesCount: (json['salesCount'] as num?)?.toInt() ?? 0,
        topResource: json['topResource'] as String?,
        products: (json['products'] as List?)?.map((e) => GumroadProduct.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      );
}

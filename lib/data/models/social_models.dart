/// One platform's connection state, as returned by GET /api/social/status.
class PlatformStatus {
  final bool appConfigured;
  final bool connected;
  final String? accountName;

  PlatformStatus({this.appConfigured = false, this.connected = false, this.accountName});

  factory PlatformStatus.fromJson(Map<String, dynamic> json) => PlatformStatus(
        appConfigured: json['appConfigured'] == true,
        connected: json['connected'] == true,
        accountName: json['accountName'] as String?,
      );

  static PlatformStatus empty = PlatformStatus();
}

class SocialStatus {
  final PlatformStatus twitter;
  final PlatformStatus linkedin;
  final PlatformStatus instagram;
  final PlatformStatus reddit;

  SocialStatus({required this.twitter, required this.linkedin, required this.instagram, PlatformStatus? reddit})
      : reddit = reddit ?? PlatformStatus.empty;

  factory SocialStatus.fromJson(Map<String, dynamic> json) => SocialStatus(
        twitter: PlatformStatus.fromJson((json['twitter'] as Map?)?.cast<String, dynamic>() ?? {}),
        linkedin: PlatformStatus.fromJson((json['linkedin'] as Map?)?.cast<String, dynamic>() ?? {}),
        instagram: PlatformStatus.fromJson((json['instagram'] as Map?)?.cast<String, dynamic>() ?? {}),
        reddit: PlatformStatus.fromJson((json['reddit'] as Map?)?.cast<String, dynamic>() ?? {}),
      );

  PlatformStatus forPlatform(String platform) {
    switch (platform) {
      case 'linkedin':
        return linkedin;
      case 'instagram':
        return instagram;
      case 'reddit':
        return reddit;
      default:
        return twitter;
    }
  }
}

/// One platform's outcome from a "Publish Everywhere" call.
class PublishResult {
  final String platform;
  final String status; // success | failed | skipped
  final String? externalPostId;
  final String? error;
  final String? reason;

  PublishResult({required this.platform, required this.status, this.externalPostId, this.error, this.reason});

  factory PublishResult.fromJson(Map<String, dynamic> json) => PublishResult(
        platform: json['platform']?.toString() ?? '',
        status: json['status']?.toString() ?? 'failed',
        externalPostId: json['externalPostId'] as String?,
        error: json['error'] as String?,
        reason: json['reason'] as String?,
      );

  bool get succeeded => status == 'success';
  String get message => error ?? reason ?? (succeeded ? 'Published' : status);
}

/// GET /api/social/instagram/insights — account-level reach/impressions/followers.
class InstagramInsights {
  final int reach;
  final int impressions;
  final int? followerCount;
  final int profileViews;
  final bool sample;

  InstagramInsights({this.reach = 0, this.impressions = 0, this.followerCount, this.profileViews = 0, this.sample = false});

  factory InstagramInsights.fromJson(Map<String, dynamic> json) => InstagramInsights(
        reach: (json['reach'] as num?)?.toInt() ?? 0,
        impressions: (json['impressions'] as num?)?.toInt() ?? 0,
        followerCount: (json['followerCount'] as num?)?.toInt(),
        profileViews: (json['profileViews'] as num?)?.toInt() ?? 0,
        sample: json['sample'] == true,
      );
}

/// GET /api/social/instagram/media — one recent post with engagement.
class InstagramMedia {
  final String id;
  final String caption;
  final String mediaType;
  final String? permalink;
  final DateTime? timestamp;
  final int likeCount;
  final int commentsCount;
  final String? thumbnailUrl;
  final bool sample;

  InstagramMedia({
    required this.id,
    this.caption = '',
    this.mediaType = 'IMAGE',
    this.permalink,
    this.timestamp,
    this.likeCount = 0,
    this.commentsCount = 0,
    this.thumbnailUrl,
    this.sample = false,
  });

  factory InstagramMedia.fromJson(Map<String, dynamic> json) => InstagramMedia(
        id: json['id']?.toString() ?? '',
        caption: json['caption']?.toString() ?? '',
        mediaType: json['mediaType']?.toString() ?? 'IMAGE',
        permalink: json['permalink'] as String?,
        timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? ''),
        likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
        commentsCount: (json['commentsCount'] as num?)?.toInt() ?? 0,
        thumbnailUrl: json['thumbnailUrl'] as String?,
        sample: json['sample'] == true,
      );
}

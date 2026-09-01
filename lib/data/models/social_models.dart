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

  SocialStatus({required this.twitter, required this.linkedin, required this.instagram});

  factory SocialStatus.fromJson(Map<String, dynamic> json) => SocialStatus(
        twitter: PlatformStatus.fromJson((json['twitter'] as Map?)?.cast<String, dynamic>() ?? {}),
        linkedin: PlatformStatus.fromJson((json['linkedin'] as Map?)?.cast<String, dynamic>() ?? {}),
        instagram: PlatformStatus.fromJson((json['instagram'] as Map?)?.cast<String, dynamic>() ?? {}),
      );

  PlatformStatus forPlatform(String platform) {
    switch (platform) {
      case 'linkedin':
        return linkedin;
      case 'instagram':
        return instagram;
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

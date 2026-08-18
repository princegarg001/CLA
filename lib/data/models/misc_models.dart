/// RSS feed item — GET /api/freelance/startupsrip.
class RssItem {
  final String title;
  final String? link;
  final DateTime? publishedAt;
  final String? summary;

  RssItem({required this.title, this.link, this.publishedAt, this.summary});

  factory RssItem.fromJson(Map<String, dynamic> json) => RssItem(
        title: json['title']?.toString() ?? '',
        link: json['link'] as String?,
        publishedAt: DateTime.tryParse(json['publishedAt']?.toString() ?? ''),
        summary: json['summary'] as String?,
      );
}

/// GET /api/settings/integrations — one row per one of the 17 platforms.
class IntegrationStatus {
  final String name;
  final bool connected;
  IntegrationStatus({required this.name, required this.connected});

  factory IntegrationStatus.fromJson(Map<String, dynamic> json) => IntegrationStatus(
        name: json['name']?.toString() ?? '',
        connected: json['connected'] == true,
      );
}

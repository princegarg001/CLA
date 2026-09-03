/// A Reddit post as returned by /api/reddit/feed, /opportunities and /search.
class RedditPost {
  final String id;
  final String fullname; // t3_xxxxx — required as the reply target
  final String subreddit;
  final String title;
  final String body;
  final String author;
  final String url;
  final int score;
  final int numComments;
  final DateTime? createdAt;
  final bool isSelf;
  final int keywordScore; // 0 outside /opportunities
  final bool sample;

  RedditPost({
    required this.id,
    required this.fullname,
    required this.subreddit,
    required this.title,
    this.body = '',
    this.author = '',
    this.url = '',
    this.score = 0,
    this.numComments = 0,
    this.createdAt,
    this.isSelf = false,
    this.keywordScore = 0,
    this.sample = false,
  });

  factory RedditPost.fromJson(Map<String, dynamic> json) => RedditPost(
        id: json['id']?.toString() ?? '',
        fullname: json['fullname']?.toString() ?? '',
        subreddit: json['subreddit']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        body: json['body']?.toString() ?? '',
        author: json['author']?.toString() ?? '',
        url: json['url']?.toString() ?? '',
        score: (json['score'] as num?)?.toInt() ?? 0,
        numComments: (json['numComments'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
        isSelf: json['isSelf'] == true,
        keywordScore: (json['keywordScore'] as num?)?.toInt() ?? 0,
        sample: json['sample'] == true,
      );
}

/// /api/reddit/analytics — account karma snapshot.
class RedditKarma {
  final int linkKarma;
  final int commentKarma;
  final int? accountAgeDays;
  final String? username;
  final bool sample;

  RedditKarma({this.linkKarma = 0, this.commentKarma = 0, this.accountAgeDays, this.username, this.sample = false});

  factory RedditKarma.fromJson(Map<String, dynamic> json) => RedditKarma(
        linkKarma: (json['linkKarma'] as num?)?.toInt() ?? 0,
        commentKarma: (json['commentKarma'] as num?)?.toInt() ?? 0,
        accountAgeDays: (json['accountAgeDays'] as num?)?.toInt(),
        username: json['username'] as String?,
        sample: json['sample'] == true,
      );
}

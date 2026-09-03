import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/calendar_models.dart';
import '../../data/models/growth_models.dart';
import '../../data/models/lead.dart';
import '../../data/models/reddit_models.dart';
import '../../data/models/social_models.dart';
import '../../providers/calendar_provider.dart';
import '../../providers/growth_provider.dart';
import '../../providers/reddit_provider.dart';
import '../../providers/social_provider.dart';
import '../../widgets/shared_components.dart';

class GrowthStudioScreen extends StatefulWidget {
  const GrowthStudioScreen({super.key});

  @override
  State<GrowthStudioScreen> createState() => _GrowthStudioScreenState();
}

class _GrowthStudioScreenState extends State<GrowthStudioScreen> {
  int _selectedTab = 0;
  final _topicController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<GrowthProvider>().load());
  }

  @override
  void dispose() {
    _topicController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GrowthProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(provider),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Auto-Post', 'Calendar', 'Reddit', 'Instagram', 'Twitter/X', 'Gumroad', 'BetaList'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: switch (_selectedTab) {
              0 => const _AutoPostTab(),
              1 => const _CalendarTab(),
              2 => const _RedditTab(),
              3 => const _InstagramTab(),
              _ => provider.isLoading && provider.analytics == null
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: () => context.read<GrowthProvider>().load(),
                      child: IndexedStack(
                        index: _selectedTab - 4,
                        children: [
                          _buildTwitterTab(provider),
                          _buildGumroadTab(provider),
                          _buildBetaListTab(provider),
                        ],
                      ),
                    ),
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(GrowthProvider provider) {
    final analytics = provider.analytics;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Growth Studio', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  GestureDetector(onTap: () => context.read<GrowthProvider>().load(), child: _headerAction(Icons.refresh_rounded)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Followers', '${analytics?.followers ?? 0}'),
                  _quickStat('Downloads', '${provider.gumroadStats?.totalDownloads ?? 0}'),
                  _quickStat('Scheduled', '${provider.scheduledPosts.length}'),
                  _quickStat('Signups', '${provider.betalistSignups.length}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerAction(IconData icon) => Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: Colors.white, size: 20),
      );

  Widget _quickStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 10, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildTwitterTab(GrowthProvider provider) {
    final posts = provider.scheduledPosts;
    final topTweets = provider.analytics?.topTweets ?? const [];

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'Scheduled Posts'),
          if (posts.isEmpty)
            Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Nothing scheduled yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
          ...posts.map((p) => _buildScheduledPost(p)),
          const SizedBox(height: 8),
          const SectionHeader(title: 'Thread Builder'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Generate a Thread', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('AI writes a full thread in your voice', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
                  child: TextField(
                    controller: _topicController,
                    style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Topic: e.g. "Cost of bad backend architecture"',
                      hintStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textTertiary),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                AccentButton(
                  label: 'Generate Thread',
                  icon: Icons.auto_awesome_rounded,
                  isLoading: provider.isLoading,
                  onPressed: () async {
                    if (_topicController.text.trim().isEmpty) return;
                    await context.read<GrowthProvider>().generateThread(_topicController.text.trim());
                  },
                ),
                if (provider.generatedThread != null) ...[
                  const SizedBox(height: 14),
                  ...provider.generatedThread!.map((t) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(8)),
                          child: Text(t, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary)),
                        ),
                      )),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
          const SectionHeader(title: "What's Working"),
          if (topTweets.isEmpty)
            Text('No tweet performance data yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            ...topTweets.map((t) => _buildPerformingTweet(t)),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildScheduledPost(ScheduledPost p) {
    final scheduled = p.status == 'scheduled';
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: (scheduled ? AppColors.success : AppColors.warning).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(scheduled ? Icons.schedule_rounded : Icons.edit_rounded, color: scheduled ? AppColors.success : AppColors.warning, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  p.scheduledFor != null ? _formatDate(p.scheduledFor!) : '',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                ),
              ),
              StatusBadge(
                label: p.status[0].toUpperCase() + p.status.substring(1),
                bgColor: scheduled ? AppColors.successLight : AppColors.warningLight,
                textColor: scheduled ? AppColors.success : AppColors.warning,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(p.content, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.month}/${d.day} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  Widget _buildPerformingTweet(Map<String, dynamic> t) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t['text']?.toString() ?? '', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary), maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 10),
          Row(
            children: [
              _tweetStat(Icons.visibility_rounded, '${t['impressions'] ?? 0}'),
              const SizedBox(width: 16),
              _tweetStat(Icons.favorite_rounded, '${t['engagements'] ?? 0}'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _tweetStat(IconData icon, String value) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.textTertiary),
          const SizedBox(width: 4),
          Text(value, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        ],
      );

  Widget _buildGumroadTab(GrowthProvider provider) {
    final stats = provider.gumroadStats;
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: StatCard(icon: Icons.download_rounded, label: 'Total Downloads', value: '${stats?.totalDownloads ?? 0}')),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.point_of_sale_rounded,
                  label: 'Sales',
                  value: '${stats?.salesCount ?? 0}',
                  iconBgColor: AppColors.accent.withValues(alpha: 0.12),
                  iconColor: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Resources'),
          if (stats == null || stats.products.isEmpty)
            Text('No resources yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            ...stats.products.map((p) => _buildGumroadResource(p)),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildGumroadResource(GumroadProduct p) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: AppListTile(
        icon: Icons.description_rounded,
        iconBgColor: const Color(0xFFFF90A4).withValues(alpha: 0.15),
        iconColor: const Color(0xFFFF6B8A),
        title: p.name,
        subtitle: '${p.downloads} downloads • ${p.price == 0 ? 'Free' : '\$${p.price}'}',
        showArrow: true,
      ),
    );
  }

  Widget _buildBetaListTab(GrowthProvider provider) {
    final signups = provider.betalistSignups;
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.rocket_rounded, color: AppColors.primary, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('AlphoTech SaaS Listing', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                      Text('${signups.length} signups captured', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                    ],
                  ),
                ),
                const StatusBadge(label: 'Live', bgColor: AppColors.successLight, textColor: AppColors.success),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const SectionHeader(title: 'Recent Signups'),
          if (signups.isEmpty)
            Text('No signups yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            ...signups.map((Lead s) => AppCard(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: AppListTile(
                    avatar: InitialsAvatar(name: s.displayName, size: 38),
                    title: s.displayName,
                    subtitle: s.email ?? s.intentSignal ?? '',
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text('Score ${s.score}', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accent)),
                    ),
                  ),
                )),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

/// The "Publish Everywhere" trigger — one compose box, fires to whichever of
/// Twitter/LinkedIn/Instagram are connected and selected, in parallel.
class _AutoPostTab extends StatefulWidget {
  const _AutoPostTab();

  @override
  State<_AutoPostTab> createState() => _AutoPostTabState();
}

class _AutoPostTabState extends State<_AutoPostTab> {
  final _textController = TextEditingController();
  final Set<String> _selectedPlatforms = {'twitter'};
  XFile? _image;
  bool _uploadingImage = false;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<SocialProvider>().load());
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, maxWidth: 1600);
    if (picked != null) setState(() => _image = picked);
  }

  Future<void> _publish() async {
    if (_selectedPlatforms.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick at least one platform to publish to')));
      return;
    }
    final provider = context.read<SocialProvider>();
    final text = _textController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Write something to publish first')));
      return;
    }
    if (_selectedPlatforms.contains('instagram') && _image == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Instagram needs an image — attach one or deselect it')));
      return;
    }

    String? imageUrl;
    if (_image != null) {
      setState(() => _uploadingImage = true);
      imageUrl = await provider.uploadImage(_image!.path);
      if (!mounted) return;
      setState(() => _uploadingImage = false);
      if (imageUrl == null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(provider.error ?? 'Image upload failed')));
        return;
      }
    }

    await provider.publish(text: text, imageUrl: imageUrl, platforms: _selectedPlatforms.toList());
  }

  @override
  Widget build(BuildContext context) {
    final social = context.watch<SocialProvider>();

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Publish Everywhere', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('One post, every platform you connect below.', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                const SizedBox(height: 14),
                Container(
                  height: 120,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                  child: TextField(
                    controller: _textController,
                    maxLines: null,
                    expands: true,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                    decoration: InputDecoration.collapsed(hintText: 'What do you want to announce?', hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary)),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: _pickImage,
                      icon: const Icon(Icons.image_outlined, size: 16),
                      label: Text(_image == null ? 'Add image' : 'Change image', style: GoogleFonts.inter(fontSize: 12)),
                      style: OutlinedButton.styleFrom(foregroundColor: AppColors.textSecondary, side: const BorderSide(color: AppColors.border)),
                    ),
                    if (_image != null) ...[
                      const SizedBox(width: 8),
                      Expanded(child: Text(_image!.name, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary), overflow: TextOverflow.ellipsis)),
                      IconButton(icon: const Icon(Icons.close_rounded, size: 16), onPressed: () => setState(() => _image = null)),
                    ],
                  ],
                ),
                const SizedBox(height: 14),
                Text('Publish to', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _platformChip('twitter', 'Twitter/X', Icons.alternate_email_rounded, social.status.twitter),
                    _platformChip('linkedin', 'LinkedIn', Icons.business_center_rounded, social.status.linkedin),
                    _platformChip('instagram', 'Instagram', Icons.camera_alt_rounded, social.status.instagram),
                  ],
                ),
                const SizedBox(height: 16),
                AccentButton(
                  label: 'Publish Now',
                  icon: Icons.send_rounded,
                  isLoading: social.isPublishing || _uploadingImage,
                  onPressed: () => _publish(),
                ),
              ],
            ),
          ),
          if (social.lastResults.isNotEmpty) ...[
            const SizedBox(height: 12),
            const SectionHeader(title: 'Last publish result'),
            ...social.lastResults.map((r) => AppCard(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Icon(
                        r.succeeded ? Icons.check_circle_rounded : Icons.error_rounded,
                        color: r.succeeded ? AppColors.success : (r.status == 'skipped' ? AppColors.warning : AppColors.error),
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(r.platform[0].toUpperCase() + r.platform.substring(1), style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                            Text(r.message, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _platformChip(String key, String label, IconData icon, PlatformStatus platformStatus) {
    final selected = _selectedPlatforms.contains(key);
    final connected = platformStatus.connected;
    return GestureDetector(
      onTap: () {
        if (!connected) {
          context.read<SocialProvider>().connect(key);
          return;
        }
        setState(() => selected ? _selectedPlatforms.remove(key) : _selectedPlatforms.add(key));
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected && connected ? AppColors.accent.withValues(alpha: 0.12) : AppColors.surfaceBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected && connected ? AppColors.accent : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: connected ? (selected ? AppColors.accent : AppColors.textSecondary) : AppColors.textTertiary),
            const SizedBox(width: 6),
            Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: connected ? AppColors.textPrimary : AppColors.textTertiary)),
            if (!connected) ...[
              const SizedBox(width: 4),
              Text('· connect', style: GoogleFonts.inter(fontSize: 11, color: AppColors.primary)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Reddit lead-gen tab — hot posts from monitored subreddits, pre-scored
/// against ICP keywords, with one-tap AI draft + approve-to-post.
class _RedditTab extends StatefulWidget {
  const _RedditTab();

  @override
  State<_RedditTab> createState() => _RedditTabState();
}

class _RedditTabState extends State<_RedditTab> {
  final Map<String, TextEditingController> _controllers = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<RedditProvider>().load());
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _controllerFor(String postId, String draft) {
    return _controllers.putIfAbsent(postId, () => TextEditingController(text: draft));
  }

  @override
  Widget build(BuildContext context) {
    final reddit = context.watch<RedditProvider>();

    if (reddit.isLoading && reddit.opportunities.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () => context.read<RedditProvider>().load(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (reddit.karma != null)
              Row(
                children: [
                  Expanded(child: StatCard(icon: Icons.forum_rounded, label: 'Comment Karma', value: '${reddit.karma!.commentKarma}')),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatCard(
                      icon: Icons.trending_up_rounded,
                      label: 'Link Karma',
                      value: '${reddit.karma!.linkKarma}',
                      iconBgColor: AppColors.accent.withValues(alpha: 0.12),
                      iconColor: AppColors.accent,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 12),
            SectionHeader(
              title: 'Lead Opportunities',
              trailing: reddit.karma?.sample == true
                  ? const StatusBadge(label: 'Sample data', bgColor: AppColors.warningLight, textColor: AppColors.warning)
                  : null,
            ),
            if (reddit.opportunities.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('No matching posts right now — pull to refresh.', style: GoogleFonts.inter(color: AppColors.textTertiary)),
              )
            else
              ...reddit.opportunities.map((post) => _buildOpportunityCard(context, reddit, post)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildOpportunityCard(BuildContext context, RedditProvider reddit, RedditPost post) {
    final isDrafting = reddit.draftingIds.contains(post.id);
    final draft = reddit.drafts[post.id];

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFFF4500).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                child: Text('r/${post.subreddit}', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFFF4500))),
              ),
              const Spacer(),
              if (post.keywordScore > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text('Fit ${post.keywordScore}/10', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accent)),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(post.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          if (post.body.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(post.body, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary), maxLines: 3, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.arrow_upward_rounded, size: 13, color: AppColors.textTertiary),
              Text(' ${post.score}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              const SizedBox(width: 12),
              const Icon(Icons.comment_rounded, size: 13, color: AppColors.textTertiary),
              Text(' ${post.numComments}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
            ],
          ),
          const SizedBox(height: 10),
          if (draft == null)
            OutlinedAccentButton(
              label: isDrafting ? 'Drafting…' : 'Generate AI Reply',
              icon: Icons.auto_awesome_rounded,
              onPressed: isDrafting ? () {} : () => context.read<RedditProvider>().generateDraft(post),
            )
          else ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
              child: TextField(
                controller: _controllerFor(post.id, draft),
                maxLines: null,
                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary),
                decoration: const InputDecoration.collapsed(hintText: 'Edit the reply before posting…'),
              ),
            ),
            const SizedBox(height: 8),
            AccentButton(
              label: 'Post Reply',
              icon: Icons.send_rounded,
              isLoading: reddit.isLoading,
              onPressed: () async {
                final text = _controllerFor(post.id, draft).text.trim();
                if (text.isEmpty) return;
                final ok = await context.read<RedditProvider>().sendReply(post, text);
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(ok ? 'Reply posted' : (context.read<RedditProvider>().error ?? 'Reply failed'))),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

/// Instagram advanced tab — account insights + recent post performance.
class _InstagramTab extends StatefulWidget {
  const _InstagramTab();

  @override
  State<_InstagramTab> createState() => _InstagramTabState();
}

class _InstagramTabState extends State<_InstagramTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<SocialProvider>().loadInstagram());
  }

  @override
  Widget build(BuildContext context) {
    final social = context.watch<SocialProvider>();

    if (social.isLoadingInstagram && social.instagramInsights == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final insights = social.instagramInsights;
    return RefreshIndicator(
      onRefresh: () => context.read<SocialProvider>().loadInstagram(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (insights != null) ...[
              Row(
                children: [
                  Expanded(child: StatCard(icon: Icons.visibility_rounded, label: 'Reach', value: '${insights.reach}')),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatCard(
                      icon: Icons.bar_chart_rounded,
                      label: 'Impressions',
                      value: '${insights.impressions}',
                      iconBgColor: AppColors.accent.withValues(alpha: 0.12),
                      iconColor: AppColors.accent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: StatCard(icon: Icons.people_rounded, label: 'Followers', value: '${insights.followerCount ?? '—'}')),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatCard(
                      icon: Icons.person_search_rounded,
                      label: 'Profile Views',
                      value: '${insights.profileViews}',
                      iconBgColor: AppColors.warning.withValues(alpha: 0.12),
                      iconColor: AppColors.warning,
                    ),
                  ),
                ],
              ),
              if (insights.sample) ...[
                const SizedBox(height: 10),
                const StatusBadge(label: 'Sample data — connect Instagram in Settings', bgColor: AppColors.warningLight, textColor: AppColors.warning),
              ],
            ],
            const SizedBox(height: 8),
            const SectionHeader(title: 'Recent Posts'),
            if (social.instagramMedia.isEmpty)
              Text('No posts yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
            else
              ...social.instagramMedia.map((m) => AppCard(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE1306C).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                            image: m.thumbnailUrl != null ? DecorationImage(image: NetworkImage(m.thumbnailUrl!), fit: BoxFit.cover) : null,
                          ),
                          child: m.thumbnailUrl == null ? const Icon(Icons.image_rounded, color: Color(0xFFE1306C), size: 20) : null,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m.caption.isEmpty ? '(no caption)' : m.caption, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary), maxLines: 2, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  const Icon(Icons.favorite_rounded, size: 12, color: AppColors.textTertiary),
                                  Text(' ${m.likeCount}  ', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                                  const Icon(Icons.comment_rounded, size: 12, color: AppColors.textTertiary),
                                  Text(' ${m.commentsCount}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

/// Unified content calendar — every scheduled post across every platform,
/// with a one-tap "Fill Week" AI auto-plan.
class _CalendarTab extends StatefulWidget {
  const _CalendarTab();

  @override
  State<_CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<_CalendarTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<CalendarProvider>().load());
  }

  static const Map<String, Color> _platformColors = {
    'twitter': Color(0xFF1DA1F2),
    'linkedin': Color(0xFF0077B5),
    'instagram': Color(0xFFE1306C),
    'reddit': Color(0xFFFF4500),
  };

  @override
  Widget build(BuildContext context) {
    final calendar = context.watch<CalendarProvider>();

    if (calendar.isLoading && calendar.entries.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () => context.read<CalendarProvider>().load(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AccentButton(
              label: 'Fill Week with AI',
              icon: Icons.auto_awesome_rounded,
              isLoading: calendar.isFillingWeek,
              onPressed: () async {
                final created = await context.read<CalendarProvider>().fillWeek();
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Drafted $created posts for the coming week')));
              },
            ),
            const SizedBox(height: 12),
            const SectionHeader(title: 'Scheduled & Drafts'),
            if (calendar.entries.isEmpty)
              Text('Nothing on the calendar yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
            else
              ...calendar.entries.map((e) => _buildEntryCard(context, e)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildEntryCard(BuildContext context, CalendarEntry entry) {
    final (bgColor, textColor) = switch (entry.status) {
      'posted' => (AppColors.successLight, AppColors.success),
      'failed' => (AppColors.errorLight, AppColors.error),
      'draft' => (AppColors.warningLight, AppColors.warning),
      'cancelled' => (AppColors.divider, AppColors.textTertiary),
      _ => (AppColors.infoLight, AppColors.info),
    };

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Wrap(
                spacing: 4,
                children: entry.platforms
                    .map((p) => Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(color: _platformColors[p] ?? AppColors.textTertiary, shape: BoxShape.circle),
                        ))
                    .toList(),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(_formatDate(entry.scheduledFor), style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              ),
              if (entry.aiGenerated)
                const Padding(padding: EdgeInsets.only(right: 6), child: Icon(Icons.auto_awesome_rounded, size: 13, color: AppColors.accent)),
              StatusBadge(label: entry.status[0].toUpperCase() + entry.status.substring(1), bgColor: bgColor, textColor: textColor),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            entry.content.isEmpty ? '(no text — media only)' : entry.content,
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          if (entry.results.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...entry.results.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text('${r.platform}: ${r.message}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                )),
          ],
          if (entry.status == 'draft' || entry.status == 'scheduled' || entry.status == 'failed') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (entry.status == 'draft')
                  Expanded(
                    child: OutlinedAccentButton(
                      label: 'Approve',
                      icon: Icons.check_rounded,
                      onPressed: () => context.read<CalendarProvider>().approve(entry.id),
                    ),
                  ),
                if (entry.status == 'draft') const SizedBox(width: 8),
                Expanded(
                  child: OutlinedAccentButton(
                    label: 'Publish Now',
                    icon: Icons.send_rounded,
                    onPressed: () => context.read<CalendarProvider>().publishNow(entry.id),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedAccentButton(
                    label: 'Cancel',
                    icon: Icons.close_rounded,
                    color: AppColors.error,
                    onPressed: () => context.read<CalendarProvider>().cancel(entry.id),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.month}/${d.day} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

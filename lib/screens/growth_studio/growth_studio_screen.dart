import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class GrowthStudioScreen extends StatefulWidget {
  const GrowthStudioScreen({super.key});

  @override
  State<GrowthStudioScreen> createState() => _GrowthStudioScreenState();
}

class _GrowthStudioScreenState extends State<GrowthStudioScreen> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Twitter/X', 'Gumroad', 'BetaList'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildTwitterTab(),
                _buildGumroadTab(),
                _buildBetaListTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.headerGradient,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
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
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Growth Studio', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                  _headerAction(Icons.add_rounded),
                  const SizedBox(width: 10),
                  _headerAction(Icons.calendar_month_rounded),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Followers', '1,247'),
                  _quickStat('Impressions', '12.4K'),
                  _quickStat('Engagements', '342'),
                  _quickStat('Profile Visits', '89'),
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

  Widget _buildTwitterTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Scheduled posts
          const SectionHeader(title: 'Scheduled Posts', actionLabel: 'New Post'),
          _buildScheduledPost(
            'The 3 backend patterns every startup needs before Series A:',
            'Thread • 8 tweets',
            'Today, 7:00 PM EST',
            'scheduled',
          ),
          _buildScheduledPost(
            'Deployed a microservice that handles 10K req/s on a \$20/mo server',
            'Single tweet',
            'Tomorrow, 9:00 AM EST',
            'draft',
          ),
          const SizedBox(height: 8),
          // Reply queue
          const SectionHeader(title: 'Reply Queue', actionLabel: 'Refresh'),
          _buildReplyTarget(
            '@IndieHackers',
            '"What\'s the hardest part of scaling your backend?"',
            '2.3K engagements',
            'Suggested reply ready',
          ),
          _buildReplyTarget(
            '@TechCrunch',
            '"Fintech funding hits new high in Q2 2025"',
            '8.1K engagements',
            'Draft a thought-leader reply',
          ),
          const SizedBox(height: 8),
          // Thread builder
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
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text('Topic: e.g. "Cost of bad backend architecture"', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textTertiary)),
                ),
                const SizedBox(height: 12),
                AccentButton(label: 'Generate Thread', onPressed: () {}, icon: Icons.auto_awesome_rounded),
              ],
            ),
          ),
          // Top performing
          const SizedBox(height: 8),
          const SectionHeader(title: 'What\'s Working'),
          _buildPerformingTweet('Backend architecture ≠ backend engineering. One is about knowing code. The other is about knowing systems.', '4,200', '126', '34'),
          _buildPerformingTweet('Automated a client\'s deployment pipeline. Saved them 20 hours/week. They didn\'t even know it was possible.', '2,800', '89', '22'),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildScheduledPost(String content, String type, String time, String status) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: status == 'scheduled' ? AppColors.success.withValues(alpha: 0.1) : AppColors.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  status == 'scheduled' ? Icons.schedule_rounded : Icons.edit_rounded,
                  color: status == 'scheduled' ? AppColors.success : AppColors.warning,
                  size: 16,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(type, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                    Text(time, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                  ],
                ),
              ),
              StatusBadge(
                label: status == 'scheduled' ? 'Scheduled' : 'Draft',
                bgColor: status == 'scheduled' ? AppColors.successLight : AppColors.warningLight,
                textColor: status == 'scheduled' ? AppColors.success : AppColors.warning,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(content, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  Widget _buildReplyTarget(String handle, String tweet, String engagement, String action) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(handle, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary)),
              const Spacer(),
              Text(engagement, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
            ],
          ),
          const SizedBox(height: 6),
          Text(tweet, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.accent),
              const SizedBox(width: 4),
              Text(action, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.accent)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPerformingTweet(String content, String impressions, String engagements, String profileVisits) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(content, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary), maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 10),
          Row(
            children: [
              _tweetStat(Icons.visibility_rounded, impressions),
              const SizedBox(width: 16),
              _tweetStat(Icons.favorite_rounded, engagements),
              const SizedBox(width: 16),
              _tweetStat(Icons.person_rounded, profileVisits),
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

  Widget _buildGumroadTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.download_rounded,
                  label: 'Downloads Today',
                  value: '14',
                  trend: '+40%',
                  trendUp: true,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.transform_rounded,
                  label: 'Conversion Rate',
                  value: '3.2%',
                  trend: '+0.4%',
                  trendUp: true,
                  iconBgColor: AppColors.accent.withValues(alpha: 0.12),
                  iconColor: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Resources', actionLabel: 'Add New'),
          _buildGumroadResource('Backend Architecture Blueprint', '342 downloads', '\$0 (lead magnet)', '12 leads captured'),
          _buildGumroadResource('Cost Calculator — Cloud vs On-Prem', '128 downloads', '\$0 (lead magnet)', '5 leads captured'),
          _buildGumroadResource('Microservices Starter Template', '89 downloads', '\$29', '\$2,581 revenue'),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildGumroadResource(String title, String downloads, String price, String metric) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: AppListTile(
        icon: Icons.description_rounded,
        iconBgColor: const Color(0xFFFF90A4).withValues(alpha: 0.15),
        iconColor: const Color(0xFFFF6B8A),
        title: title,
        subtitle: '$downloads • $price',
        trailing: Text(metric, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.success)),
        showArrow: true,
      ),
    );
  }

  Widget _buildBetaListTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.rocket_rounded, color: AppColors.primary, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('AlphoTech SaaS Listing', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                          Text('Listed 2 weeks ago', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                        ],
                      ),
                    ),
                    const StatusBadge(label: 'Live', bgColor: AppColors.successLight, textColor: AppColors.success),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _betaStat('Upvotes', '47'),
                    _betaStat('Signups', '23'),
                    _betaStat('Comments', '8'),
                    _betaStat('Warm Leads', '5'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const SectionHeader(title: 'Recent Signups'),
          ...[
            ['Alex Turner', 'CTO at FinScale', '2h ago'],
            ['Maria Santos', 'Founder at DataPipe', '5h ago'],
            ['Tom Davis', 'VP Eng at CloudRoute', '1d ago'],
          ].map((s) => AppCard(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: AppListTile(
                  avatar: InitialsAvatar(name: s[0], size: 38),
                  title: s[0],
                  subtitle: '${s[1]} • ${s[2]}',
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('Onboard', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accent)),
                  ),
                ),
              )),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _betaStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
          ],
        ),
      );
}

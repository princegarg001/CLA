import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../data/models/war_room_models.dart';
import '../../providers/war_room_provider.dart';
import '../../widgets/shared_components.dart';

class WarRoomScreen extends StatefulWidget {
  const WarRoomScreen({super.key});

  @override
  State<WarRoomScreen> createState() => _WarRoomScreenState();
}

class _WarRoomScreenState extends State<WarRoomScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<WarRoomProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<WarRoomProvider>();

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: RefreshIndicator(
        onRefresh: () => context.read<WarRoomProvider>().load(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context, provider),
              const SizedBox(height: 8),
              if (provider.isLoading && provider.summary == null)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (provider.hasError && provider.summary == null)
                _errorState(context, provider)
              else ...[
                _buildPipelineSection(provider),
                const SizedBox(height: 4),
                _buildStatsGrid(provider),
                const SizedBox(height: 4),
                _buildMissionsSection(provider),
                const SizedBox(height: 4),
                _buildAlertFeed(provider),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _errorState(BuildContext context, WarRoomProvider provider) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, color: AppColors.textTertiary, size: 40),
          const SizedBox(height: 12),
          Text(provider.error ?? 'Failed to load', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 12),
          TextButton(onPressed: () => context.read<WarRoomProvider>().load(), child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, WarRoomProvider provider) {
    final mrr = provider.summary?.mrr ?? 0;
    const target = 2000;
    final progress = (mrr / target).clamp(0.0, 1.0);
    final gapUnits = mrr >= target ? 0 : ((target - mrr) / 85).ceil();

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
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
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
                    child: const Icon(Icons.grid_view_rounded, color: Colors.white, size: 22),
                  ),
                  const Spacer(),
                  _headerAction(Icons.search_rounded),
                  const SizedBox(width: 10),
                  _headerAction(Icons.notifications_none_rounded),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'War Room',
                style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                'Good morning, Prince',
                style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.8)),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('MRR Target', style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.8))),
                        Text(
                          '\$${mrr.toStringAsFixed(0)} / \$$target',
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentLight),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${(progress * 100).toStringAsFixed(0)}% achieved', style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.6))),
                        Text(
                          gapUnits > 0 ? '$gapUnits subscribers needed' : 'Target reached',
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accentLight),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerAction(IconData icon) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }

  Widget _buildPipelineSection(WarRoomProvider provider) {
    final p = provider.summary?.pipeline ?? {};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Pipeline'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _pipelineStage('Leads', '${p['new'] ?? 0}', AppColors.info, true),
              _pipelineConnector(),
              _pipelineStage('Calls', '${p['call_booked'] ?? 0}', AppColors.primary, false),
              _pipelineConnector(),
              _pipelineStage('Proposals', '${p['proposal_sent'] ?? 0}', AppColors.warning, false),
              _pipelineConnector(),
              _pipelineStage('Closed', '${p['closed_won'] ?? 0}', AppColors.success, false),
            ],
          ),
        ),
      ],
    );
  }

  Widget _pipelineStage(String label, String count, Color color, bool isActive) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isActive ? color.withValues(alpha: 0.1) : AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isActive ? color.withValues(alpha: 0.3) : AppColors.border),
          boxShadow: isActive ? [] : AppShadows.cardShadow,
        ),
        child: Column(
          children: [
            Text(count, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: isActive ? color : AppColors.textPrimary)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: isActive ? color : AppColors.textTertiary)),
          ],
        ),
      ),
    );
  }

  Widget _pipelineConnector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 18),
    );
  }

  Widget _buildStatsGrid(WarRoomProvider provider) {
    final newLeads = provider.summary?.pipeline['new'] ?? 0;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.people_alt_rounded,
                  label: 'New Leads',
                  value: '$newLeads',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.bolt_rounded,
                  label: 'Live Visitors',
                  value: '${provider.liveVisitors}',
                  iconBgColor: AppColors.accent.withValues(alpha: 0.15),
                  iconColor: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.trending_up_rounded,
                  label: 'Twitter Followers',
                  value: '${provider.followers}',
                  trend: provider.followersDelta7d == 0 ? null : '${provider.followersDelta7d > 0 ? '+' : ''}${provider.followersDelta7d}',
                  trendUp: provider.followersDelta7d >= 0,
                  iconBgColor: const Color(0xFF7C4DFF).withValues(alpha: 0.12),
                  iconColor: const Color(0xFF7C4DFF),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.language_rounded,
                  label: 'Site Visitors',
                  value: '${provider.siteVisitors}',
                  iconBgColor: AppColors.warning.withValues(alpha: 0.12),
                  iconColor: AppColors.warning,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMissionsSection(WarRoomProvider provider) {
    final colors = [AppColors.error, AppColors.warning, AppColors.primary];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: "Today's Missions"),
        if (provider.missions.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text('No missions yet — pull to refresh.'),
          ),
        ...provider.missions.asMap().entries.map((entry) {
          final i = entry.key;
          final Mission m = entry.value;
          final color = colors[i % colors.length];
          return AppCard(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                  child: Center(
                    child: Text('#${m.priority}', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(m.text, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                ),
              ],
            ),
          );
        }),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: AccentButton(label: 'Enter Focus Mode', onPressed: () {}, icon: Icons.bolt_rounded),
        ),
      ],
    );
  }

  Widget _buildAlertFeed(WarRoomProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Live Feed'),
        if (provider.feed.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text('No activity yet.'),
          ),
        ...provider.feed.map((a) {
          final visual = _feedVisual(a.type);
          return AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(color: visual.$2.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                  child: Icon(visual.$1, color: visual.$2, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(a.text, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                      const SizedBox(height: 2),
                      Text(_relativeTime(a.timestamp), style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                    ],
                  ),
                ),
                Container(width: 8, height: 8, decoration: BoxDecoration(color: visual.$2, shape: BoxShape.circle)),
              ],
            ),
          );
        }),
      ],
    );
  }

  (IconData, Color) _feedVisual(String type) {
    switch (type) {
      case 'alert':
        return (Icons.error_outline_rounded, AppColors.error);
      case 'traffic':
        return (Icons.trending_up_rounded, const Color(0xFF7C4DFF));
      default:
        return (Icons.person_add_rounded, AppColors.primary);
    }
  }

  String _relativeTime(DateTime? time) {
    if (time == null) return '';
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

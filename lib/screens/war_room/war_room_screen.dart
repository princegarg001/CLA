import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class WarRoomScreen extends StatelessWidget {
  const WarRoomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gradient header
            _buildHeader(context),
            const SizedBox(height: 8),
            // Pipeline snapshot
            _buildPipelineSection(),
            const SizedBox(height: 4),
            // Stats grid
            _buildStatsGrid(),
            const SizedBox(height: 4),
            // Today's missions
            _buildMissionsSection(),
            const SizedBox(height: 4),
            // Live alert feed
            _buildAlertFeed(),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
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
              // Top row
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
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Friday, July 18 • Good morning, Prince',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ),
              const SizedBox(height: 16),
              // Revenue meter
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
                        Text(
                          'MRR Target',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                        Text(
                          '\$340 / \$2,000',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: 0.17,
                        minHeight: 8,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentLight),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '17% achieved',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.6),
                          ),
                        ),
                        Text(
                          '4 subscribers needed',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.accentLight,
                          ),
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
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }

  Widget _buildPipelineSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Pipeline', actionLabel: 'View All'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _pipelineStage('Leads', '24', AppColors.info, true),
              _pipelineConnector(),
              _pipelineStage('Calls', '5', AppColors.primary, false),
              _pipelineConnector(),
              _pipelineStage('Proposals', '3', AppColors.warning, false),
              _pipelineConnector(),
              _pipelineStage('Closed', '1', AppColors.success, false),
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
          border: Border.all(
            color: isActive ? color.withValues(alpha: 0.3) : AppColors.border,
          ),
          boxShadow: isActive ? [] : AppShadows.cardShadow,
        ),
        child: Column(
          children: [
            Text(
              count,
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: isActive ? color : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: isActive ? color : AppColors.textTertiary,
              ),
            ),
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

  Widget _buildStatsGrid() {
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
                  value: '12',
                  trend: '+33%',
                  trendUp: true,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.email_rounded,
                  label: 'Replies Today',
                  value: '3',
                  trend: '+2',
                  trendUp: true,
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
                  label: 'Twitter Impressions',
                  value: '2.4K',
                  trend: '+18%',
                  trendUp: true,
                  iconBgColor: const Color(0xFF7C4DFF).withValues(alpha: 0.12),
                  iconColor: const Color(0xFF7C4DFF),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.language_rounded,
                  label: 'Site Visitors',
                  value: '87',
                  trend: '-5%',
                  trendUp: false,
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

  Widget _buildMissionsSection() {
    final missions = [
      {
        'priority': 1,
        'title': 'Follow up with David Chen at Finova',
        'subtitle': 'Proposal sent 3 days ago • Score 9/10',
        'icon': Icons.local_fire_department_rounded,
        'color': AppColors.error,
      },
      {
        'priority': 2,
        'title': 'Reply to SolidGigs job: Backend API for HealthTech',
        'subtitle': 'Posted 2h ago • Fit score 8.5/10',
        'icon': Icons.work_rounded,
        'color': AppColors.warning,
      },
      {
        'priority': 3,
        'title': 'Publish thread: "5 backend patterns that scale"',
        'subtitle': 'AI draft ready • US prime time in 3h',
        'icon': Icons.edit_note_rounded,
        'color': AppColors.primary,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: "Today's Missions"),
        ...missions.map((m) => AppCard(
              onTap: () {},
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: (m['color'] as Color).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        '#${m['priority']}',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: m['color'] as Color,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m['title'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          m['subtitle'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded, color: AppColors.textTertiary, size: 14),
                ],
              ),
            )),
        // Focus Mode button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: AccentButton(
            label: 'Enter Focus Mode',
            onPressed: () {},
            icon: Icons.bolt_rounded,
          ),
        ),
      ],
    );
  }

  Widget _buildAlertFeed() {
    final alerts = [
      {
        'icon': Icons.reply_rounded,
        'title': 'Apollo reply from Sarah at Buildfast',
        'time': '12 min ago',
        'color': AppColors.success,
        'type': 'reply',
      },
      {
        'icon': Icons.person_add_rounded,
        'title': 'New lead from contact form — James (UK)',
        'time': '45 min ago',
        'color': AppColors.primary,
        'type': 'lead',
      },
      {
        'icon': Icons.work_outlined,
        'title': 'SolidGigs: 3 new backend jobs matched',
        'time': '1h ago',
        'color': AppColors.warning,
        'type': 'job',
      },
      {
        'icon': Icons.trending_up_rounded,
        'title': 'Traffic spike: 142 visitors from Hacker News',
        'time': '2h ago',
        'color': const Color(0xFF7C4DFF),
        'type': 'traffic',
      },
      {
        'icon': Icons.error_outline_rounded,
        'title': 'Sentry: Contact form error on Safari',
        'time': '3h ago',
        'color': AppColors.error,
        'type': 'error',
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Live Feed', actionLabel: 'See All'),
        ...alerts.map((a) => AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: (a['color'] as Color).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      a['icon'] as IconData,
                      color: a['color'] as Color,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          a['title'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          a['time'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppColors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: a['color'] as Color,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}

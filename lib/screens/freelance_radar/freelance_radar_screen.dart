import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class FreelanceRadarScreen extends StatefulWidget {
  const FreelanceRadarScreen({super.key});

  @override
  State<FreelanceRadarScreen> createState() => _FreelanceRadarScreenState();
}

class _FreelanceRadarScreenState extends State<FreelanceRadarScreen> {
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
            tabs: const ['SolidGigs', 'Contra', 'Startups.rip'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildSolidGigsList(),
                _buildContraList(),
                _buildStartupsRipFeed(),
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
                    child: const Icon(Icons.radar_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Freelance Radar',
                      style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                  _headerAction(Icons.refresh_rounded),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('New Jobs', '7'),
                  _quickStat('Applied', '12'),
                  _quickStat('Responses', '3'),
                  _quickStat('Fit Score', '8.2'),
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
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      );

  Widget _quickStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildSolidGigsList() {
    final jobs = [
      _JobData('Backend API Development for HealthTech', 'MedFlow Inc', '\$5K–\$8K', '2h ago', 8.5, ['Python', 'FastAPI', 'AWS'], false),
      _JobData('Microservices Migration', 'ShipQuick', '\$10K–\$15K', '4h ago', 9.0, ['Node.js', 'Docker', 'K8s'], false),
      _JobData('Fintech Payment Integration', 'PayBridge', '\$7K–\$12K', '6h ago', 8.8, ['Python', 'Stripe', 'PostgreSQL'], true),
      _JobData('DevOps & CI/CD Setup', 'CloudFirst', '\$3K–\$5K', '8h ago', 7.5, ['AWS', 'Terraform', 'GitHub Actions'], false),
      _JobData('Real-time Data Pipeline', 'DataSync', '\$8K–\$14K', '12h ago', 8.0, ['Python', 'Kafka', 'Redis'], false),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: jobs.length,
      itemBuilder: (context, index) => _buildJobCard(jobs[index]),
    );
  }

  Widget _buildJobCard(_JobData job) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      onTap: () {},
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(job.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 3),
                    Text(job.company, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: job.score >= 8.5
                      ? AppColors.successLight
                      : job.score >= 7
                          ? AppColors.warningLight
                          : AppColors.surfaceBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${job.score}/10',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: job.score >= 8.5 ? AppColors.success : job.score >= 7 ? AppColors.warning : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.attach_money_rounded, size: 14, color: AppColors.success),
              const SizedBox(width: 2),
              Text(job.budget, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success)),
              const SizedBox(width: 16),
              Icon(Icons.access_time_rounded, size: 14, color: AppColors.textTertiary),
              const SizedBox(width: 2),
              Text(job.posted, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
              if (job.applied) ...[
                const Spacer(),
                StatusBadge(label: 'Applied', bgColor: AppColors.infoLight, textColor: AppColors.info),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: job.tags.map((t) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(t, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary)),
                )).toList(),
          ),
          if (!job.applied) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.auto_awesome_rounded, size: 14),
                      label: Text('Generate Pitch', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 36,
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text('Skip', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContraList() {
    final projects = [
      _JobData('SaaS Backend Development', 'Contra Client', '\$6K', '3h ago', 8.2, ['Node.js', 'MongoDB'], false),
      _JobData('API Gateway & Auth System', 'Contra Client', '\$4K', '5h ago', 7.8, ['Python', 'OAuth'], false),
      _JobData('E-commerce Backend', 'Contra Client', '\$9K', '8h ago', 7.0, ['Django', 'PostgreSQL'], true),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: projects.length,
      itemBuilder: (context, index) => _buildJobCard(projects[index]),
    );
  }

  Widget _buildStartupsRipFeed() {
    final insights = [
      {
        'title': 'TechVault shut down — founder starting new company',
        'subtitle': 'CEO previously built backend infra. Could need AlphoTech.',
        'action': 'Find on Apollo',
        'icon': Icons.person_search_rounded,
        'color': AppColors.primary,
      },
      {
        'title': 'Common failure: Manual deployment causing downtime',
        'subtitle': '12 startups this quarter failed due to no CI/CD → content angle',
        'action': 'Generate Thread',
        'icon': Icons.edit_note_rounded,
        'color': AppColors.accent,
      },
      {
        'title': 'SnapData pivoting — needs backend rewrite',
        'subtitle': 'Series A company, 30 employees, switching from monolith',
        'action': 'Add to Pipeline',
        'icon': Icons.add_circle_outline_rounded,
        'color': AppColors.success,
      },
    ];

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                      color: AppColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.bug_report_rounded, color: AppColors.error, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Startups.rip Intelligence', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('Weekly digest • 3 opportunities found', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        ...insights.map((i) => AppCard(
              margin: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(i['title'] as String, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  Text(i['subtitle'] as String, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 34,
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: Icon(i['icon'] as IconData, size: 14),
                      label: Text(i['action'] as String, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: (i['color'] as Color).withValues(alpha: 0.1),
                        foregroundColor: i['color'] as Color,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}

class _JobData {
  final String title, company, budget, posted;
  final double score;
  final List<String> tags;
  final bool applied;
  _JobData(this.title, this.company, this.budget, this.posted, this.score, this.tags, this.applied);
}

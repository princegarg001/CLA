import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class AIAgentLabScreen extends StatelessWidget {
  const AIAgentLabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 8),
            // Agent cards
            _buildAgentCards(),
            const SizedBox(height: 4),
            // Verdent.ai recommendations
            _buildVerdentSection(),
            const SizedBox(height: 4),
            // HeadAI signals
            _buildHeadAISection(),
            const SizedBox(height: 4),
            // Gro.app automations
            _buildGroSection(),
            const SizedBox(height: 24),
          ],
        ),
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
                    child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('AI Agent Lab', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.accentLight.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 6),
                        Text('2 Running', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Three AI agents working autonomously.\nYou check results, not tasks.',
                style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.8)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAgentCards() {
    final agents = [
      _AgentData(
        'The Prospector',
        'Monitors Apollo sequences, flags replies, scores new leads, triggers follow-ups.',
        Icons.person_search_rounded,
        AppColors.primary,
        'running',
        '24/7',
        {'Leads Scored': '47', 'Sequences Triggered': '12', 'Replies Flagged': '7'},
      ),
      _AgentData(
        'The Publisher',
        'Drafts next week\'s Twitter threads, pulls trending topics, generates 5 post options/day.',
        Icons.create_rounded,
        AppColors.accent,
        'running',
        'Sundays',
        {'Drafts Ready': '5', 'Topics Sourced': '14', 'Approval Rate': '80%'},
      ),
      _AgentData(
        'The Researcher',
        'Researches new leads: funding, tech stack, news, LinkedIn, job openings. Full brief before calls.',
        Icons.biotech_rounded,
        const Color(0xFF7C4DFF),
        'idle',
        'On Trigger',
        {'Briefs Generated': '23', 'Data Sources': '5', 'Avg Time': '2 min'},
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: agents.map((a) => _buildAgentCard(a)).toList(),
      ),
    );
  }

  Widget _buildAgentCard(_AgentData agent) {
    final isRunning = agent.status == 'running';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.cardShadow,
        border: isRunning ? Border.all(color: agent.color.withValues(alpha: 0.3), width: 1.5) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: agent.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(agent.icon, color: agent.color, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(agent.name, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text('Schedule: ${agent.schedule}', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isRunning ? AppColors.successLight : AppColors.surfaceBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isRunning) ...[
                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      isRunning ? 'Running' : 'Idle',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isRunning ? AppColors.success : AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(agent.description, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 14),
          // Stats
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: agent.stats.entries.map((e) => Column(
                    children: [
                      Text(e.value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: agent.color)),
                      const SizedBox(height: 2),
                      Text(e.key, style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary)),
                    ],
                  )).toList(),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isRunning ? AppColors.error.withValues(alpha: 0.1) : agent.color.withValues(alpha: 0.1),
                      foregroundColor: isRunning ? AppColors.error : agent.color,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(isRunning ? 'Pause' : 'Run Now', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
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
                  child: Text('View Logs', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVerdentSection() {
    final recs = [
      'Your LinkedIn reply rate dropped 40% this week — switch to value-first replies for 5 days.',
      'Apollo sequence #3 has 0% reply rate. Replace subject line with: "Quick question about [company]\'s backend"',
      'You\'ve had 12 UK leads but 0 US leads. Adjust Twitter post times to 9am EST.',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Verdent.ai Insights'),
        ...recs.map((r) => AppCard(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.lightbulb_rounded, color: AppColors.warning, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(r, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary, height: 1.4)),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  Widget _buildHeadAISection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'HeadAI Signals', actionLabel: 'See All'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: AppListTile(
            icon: Icons.trending_up_rounded,
            iconBgColor: AppColors.success.withValues(alpha: 0.12),
            iconColor: AppColors.success,
            title: 'FinScale — 8 eng roles in 30 days',
            subtitle: 'Growing fast, needs automation infra',
            trailing: const StatusBadge(label: 'High Priority', bgColor: AppColors.errorLight, textColor: AppColors.error),
          ),
        ),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: AppListTile(
            icon: Icons.trending_up_rounded,
            iconBgColor: AppColors.success.withValues(alpha: 0.12),
            iconColor: AppColors.success,
            title: 'CloudBridge — 5 backend roles posted',
            subtitle: 'Series A, US-based, fintech',
            trailing: const StatusBadge(label: 'Add to Apollo', bgColor: AppColors.infoLight, textColor: AppColors.info),
          ),
        ),
      ],
    );
  }

  Widget _buildGroSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Gro.app Automations'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Active Flows', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              const SizedBox(height: 12),
              _buildFlowItem('Gumroad → Apollo Sequence', 'Running • 14 leads processed', AppColors.success),
              const SizedBox(height: 10),
              _buildFlowItem('Cold Lead Re-engage', 'Running • 6 in pipeline', AppColors.success),
              const SizedBox(height: 10),
              _buildFlowItem('BetaList → Onboarding Email', 'Paused', AppColors.warning),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFlowItem(String name, String status, Color statusColor) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.account_tree_rounded, color: AppColors.primary, size: 16),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              Text(status, style: GoogleFonts.inter(fontSize: 11, color: statusColor)),
            ],
          ),
        ),
        Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 18),
      ],
    );
  }
}

class _AgentData {
  final String name, description;
  final IconData icon;
  final Color color;
  final String status, schedule;
  final Map<String, String> stats;
  _AgentData(this.name, this.description, this.icon, this.color, this.status, this.schedule, this.stats);
}

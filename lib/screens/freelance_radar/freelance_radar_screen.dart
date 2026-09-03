import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/lead.dart';
import '../../data/models/misc_models.dart';
import '../../data/models/upwork_models.dart';
import '../../providers/freelance_provider.dart';
import '../../providers/upwork_provider.dart';
import '../../widgets/shared_components.dart';

class FreelanceRadarScreen extends StatefulWidget {
  const FreelanceRadarScreen({super.key});

  @override
  State<FreelanceRadarScreen> createState() => _FreelanceRadarScreenState();
}

class _FreelanceRadarScreenState extends State<FreelanceRadarScreen> {
  int _selectedTab = 0;
  final Set<String> _dismissed = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FreelanceProvider>().load();
      context.read<UpworkProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FreelanceProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(provider),
          const SizedBox(height: 4),
          AppTabBar(
            tabs: const ['Upwork', 'SolidGigs', 'Contra', 'Startups.rip'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _selectedTab == 0
                ? const _UpworkTab()
                : provider.isLoading && provider.solidGigs.isEmpty && provider.contra.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => context.read<FreelanceProvider>().load(),
                    child: IndexedStack(
                      index: _selectedTab - 1,
                      children: [
                        _buildJobList(provider.solidGigs.where((l) => !_dismissed.contains(l.id)).toList(), 'solidgigs'),
                        _buildJobList(provider.contra.where((l) => !_dismissed.contains(l.id)).toList(), 'contra'),
                        _buildStartupsRipFeed(provider.startupsRip),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(FreelanceProvider provider) {
    final total = provider.solidGigs.length + provider.contra.length;
    final applied = [...provider.solidGigs, ...provider.contra].where((l) => l.status != 'new').length;
    final avgScore = total == 0 ? 0 : [...provider.solidGigs, ...provider.contra].map((l) => l.score).reduce((a, b) => a + b) / total;

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
                    child: const Icon(Icons.radar_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Freelance Radar', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  GestureDetector(
                    onTap: () => context.read<FreelanceProvider>().load(),
                    child: _headerAction(Icons.refresh_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('New Jobs', '$total'),
                  _quickStat('Applied', '$applied'),
                  _quickStat('Insights', '${provider.startupsRip.length}'),
                  _quickStat('Avg Fit', avgScore == 0 ? '—' : avgScore.toStringAsFixed(1)),
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
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildJobList(List<Lead> jobs, String platform) {
    if (jobs.isEmpty) {
      return Center(child: Text('No jobs matched yet.', style: GoogleFonts.inter(color: AppColors.textTertiary)));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: jobs.length,
      itemBuilder: (context, index) => _buildJobCard(jobs[index], platform),
    );
  }

  Widget _buildJobCard(Lead job, String platform) {
    final budget = job.raw['budget']?.toString();
    final tags = (job.raw['tags'] as List?)?.map((e) => e.toString()).toList() ?? const <String>[];
    final applied = job.status != 'new';

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
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
                    Text(job.intentSignal ?? job.displayTitle, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    const SizedBox(height: 3),
                    Text(job.company ?? 'Unknown company', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  ],
                ),
              ),
              StatusBadge.score(job.score),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (budget != null) ...[
                Icon(Icons.attach_money_rounded, size: 14, color: AppColors.success),
                Text(budget, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success)),
                const SizedBox(width: 16),
              ],
              if (job.region != null) ...[
                Icon(Icons.flag_rounded, size: 14, color: AppColors.textTertiary),
                const SizedBox(width: 2),
                Text(job.region!, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
              ],
              if (applied) ...[
                const Spacer(),
                const StatusBadge(label: 'Applied', bgColor: AppColors.infoLight, textColor: AppColors.info),
              ],
            ],
          ),
          if (tags.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: tags
                  .map((t) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: AppColors.primaryLight.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                        child: Text(t, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary)),
                      ))
                  .toList(),
            ),
          ],
          if (!applied) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: ElevatedButton.icon(
                      onPressed: () => _generatePitch(job, platform),
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
                    onPressed: () => setState(() => _dismissed.add(job.id)),
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

  Future<void> _generatePitch(Lead job, String platform) async {
    final provider = context.read<FreelanceProvider>();
    final ok = await provider.generatePitch(job.id, platform);
    if (!mounted) return;
    if (!ok || provider.lastPitch == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(provider.error ?? 'Could not generate a pitch')));
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('AI-generated pitch', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            Text(provider.lastPitch!, style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary, height: 1.5)),
            const SizedBox(height: 16),
            AccentButton(label: 'Close', onPressed: () => Navigator.pop(context)),
          ],
        ),
      ),
    );
  }

  Widget _buildStartupsRipFeed(List<RssItem> items) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        AppCard(
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppColors.error.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.bug_report_rounded, color: AppColors.error, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Startups.rip Intelligence', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    Text('${items.length} items in the latest digest', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text('No digest items yet.', style: GoogleFonts.inter(color: AppColors.textTertiary), textAlign: TextAlign.center),
          ),
        ...items.map((i) => AppCard(
              margin: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(i.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  if (i.summary != null) ...[
                    const SizedBox(height: 4),
                    Text(i.summary!, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary), maxLines: 3, overflow: TextOverflow.ellipsis),
                  ],
                ],
              ),
            )),
      ],
    );
  }
}

/// Upwork Radar tab — real-time job monitoring (via webhook/email/manual
/// paste, since Upwork has no public feed API), AI fit-scoring, and
/// one-tap proposal drafts. Auto-apply is against Upwork ToS, so every
/// action here ends at "copy the proposal and paste it in the browser."
class _UpworkTab extends StatefulWidget {
  const _UpworkTab();

  @override
  State<_UpworkTab> createState() => _UpworkTabState();
}

class _UpworkTabState extends State<_UpworkTab> {
  final Set<String> _expandedProposals = {};

  @override
  Widget build(BuildContext context) {
    final upwork = context.watch<UpworkProvider>();

    if (upwork.isLoading && upwork.jobs.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () => context.read<UpworkProvider>().load(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (upwork.stats != null) _buildStatsDashboard(upwork.stats!),
            const SizedBox(height: 12),
            const SectionHeader(title: 'Job Matches'),
            if (upwork.jobs.isEmpty)
              Text('No jobs yet — connect a Vollna webhook or paste one manually.', style: GoogleFonts.inter(color: AppColors.textTertiary))
            else
              ...(upwork.jobs..sort((a, b) => b.aiScore.compareTo(a.aiScore))).map((job) => _buildJobCard(context, upwork, job)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsDashboard(UpworkStats stats) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: StatCard(icon: Icons.emoji_events_rounded, label: 'Win Rate', value: '${(stats.winRate * 100).round()}%')),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                icon: Icons.attach_money_rounded,
                label: 'Avg Deal',
                value: '\$${stats.avgDealSize.round()}',
                iconBgColor: AppColors.success.withValues(alpha: 0.12),
                iconColor: AppColors.success,
              ),
            ),
          ],
        ),
        if (stats.sample) ...[
          const SizedBox(height: 8),
          const StatusBadge(label: 'Sample data — connect a webhook to see real numbers', bgColor: AppColors.warningLight, textColor: AppColors.warning),
        ],
      ],
    );
  }

  Widget _buildJobCard(BuildContext context, UpworkProvider upwork, UpworkJob job) {
    final history = job.clientHistory;
    final hireRate = history['hireRate'];
    final totalSpent = history['totalSpent'];
    final expanded = _expandedProposals.contains(job.id);

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
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
                    Text(job.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    const SizedBox(height: 3),
                    Text(job.clientName ?? 'Unknown client', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                  ],
                ),
              ),
              StatusBadge.score(job.aiScore.round()),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.attach_money_rounded, size: 14, color: AppColors.success),
              Text(job.budgetLabel, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success)),
              if (job.country != null) ...[
                const SizedBox(width: 16),
                const Icon(Icons.flag_rounded, size: 14, color: AppColors.textTertiary),
                const SizedBox(width: 2),
                Text(job.country!, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
              ],
              const Spacer(),
              if (job.status != 'new') StatusBadge(label: job.status[0].toUpperCase() + job.status.substring(1), bgColor: AppColors.infoLight, textColor: AppColors.info),
            ],
          ),
          if (hireRate != null || totalSpent != null) ...[
            const SizedBox(height: 6),
            Text(
              [
                if (hireRate != null) '${((hireRate as num) * 100).round()}% hire rate',
                if (totalSpent != null) '\$${(totalSpent as num).round()} spent',
              ].join(' · '),
              style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
            ),
          ],
          if (job.skills.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: job.skills
                  .map((s) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: AppColors.primaryLight.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                        child: Text(s, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary)),
                      ))
                  .toList(),
            ),
          ],
          if (job.aiScoreReason != null) ...[
            const SizedBox(height: 8),
            Text(job.aiScoreReason!, style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textTertiary)),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: ElevatedButton.icon(
                    onPressed: () => setState(() => expanded ? _expandedProposals.remove(job.id) : _expandedProposals.add(job.id)),
                    icon: const Icon(Icons.auto_awesome_rounded, size: 14),
                    label: Text(expanded ? 'Hide Proposal' : 'View Proposal', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ),
              if (job.upworkUrl != null) ...[
                const SizedBox(width: 8),
                SizedBox(
                  height: 36,
                  child: OutlinedButton(
                    onPressed: () => launchUrl(Uri.parse(job.upworkUrl!), mode: LaunchMode.externalApplication),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text('Open', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
                  ),
                ),
              ],
            ],
          ),
          if (expanded) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
              child: Text(
                job.aiProposal?.isNotEmpty == true ? job.aiProposal! : 'No proposal drafted yet — tap Regenerate.',
                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary, height: 1.4),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedAccentButton(
                    label: 'Copy',
                    icon: Icons.copy_rounded,
                    onPressed: job.aiProposal == null
                        ? () {}
                        : () {
                            Clipboard.setData(ClipboardData(text: job.aiProposal!));
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Proposal copied')));
                          },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedAccentButton(
                    label: 'Regenerate',
                    icon: Icons.refresh_rounded,
                    onPressed: () => context.read<UpworkProvider>().regenerateProposal(job.id),
                  ),
                ),
              ],
            ),
          ],
          if (job.status == 'new' || job.status == 'applied' || job.status == 'interviewing') ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (job.status == 'new')
                  Expanded(
                    child: OutlinedAccentButton(
                      label: 'Mark Applied',
                      icon: Icons.check_rounded,
                      onPressed: () => context.read<UpworkProvider>().markStatus(job.id, 'applied'),
                    ),
                  ),
                if (job.status == 'applied')
                  Expanded(
                    child: OutlinedAccentButton(
                      label: 'Interviewing',
                      icon: Icons.chat_rounded,
                      onPressed: () => context.read<UpworkProvider>().markStatus(job.id, 'interviewing'),
                    ),
                  ),
                if (job.status == 'interviewing') ...[
                  Expanded(
                    child: OutlinedAccentButton(
                      label: 'Hired',
                      icon: Icons.celebration_rounded,
                      onPressed: () => _promptOutcome(context, job),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                if (job.status != 'new') ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedAccentButton(
                      label: 'Rejected',
                      icon: Icons.close_rounded,
                      color: AppColors.error,
                      onPressed: () => context.read<UpworkProvider>().markStatus(job.id, 'rejected'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _promptOutcome(BuildContext context, UpworkJob job) async {
    final controller = TextEditingController();
    final value = await showDialog<num>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Deal value', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: 'e.g. 5000'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, num.tryParse(controller.text)), child: const Text('Save')),
        ],
      ),
    );
    if (!context.mounted) return;
    await context.read<UpworkProvider>().markStatus(job.id, 'hired', outcomeValue: value);
  }
}

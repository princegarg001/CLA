import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/lead.dart';
import '../../data/models/misc_models.dart';
import '../../providers/freelance_provider.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<FreelanceProvider>().load());
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
            tabs: const ['SolidGigs', 'Contra', 'Startups.rip'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: provider.isLoading && provider.solidGigs.isEmpty && provider.contra.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => context.read<FreelanceProvider>().load(),
                    child: IndexedStack(
                      index: _selectedTab,
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

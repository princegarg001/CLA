import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../providers/analytics_provider.dart';
import '../../widgets/shared_components.dart';

class AnalyticsTowerScreen extends StatefulWidget {
  const AnalyticsTowerScreen({super.key});

  @override
  State<AnalyticsTowerScreen> createState() => _AnalyticsTowerScreenState();
}

class _AnalyticsTowerScreenState extends State<AnalyticsTowerScreen> {
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AnalyticsProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AnalyticsProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: Column(
        children: [
          _buildHeader(provider),
          const SizedBox(height: 4),
          AppTabBar(tabs: const ['Umami', 'Sentry', 'Combined'], selectedIndex: _selectedTab, onTap: (i) => setState(() => _selectedTab = i)),
          const SizedBox(height: 8),
          Expanded(
            child: provider.isLoading && provider.umami == null
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => context.read<AnalyticsProvider>().load(),
                    child: IndexedStack(
                      index: _selectedTab,
                      children: [
                        _buildUmamiTab(provider),
                        _buildSentryTab(provider),
                        _buildCombinedTab(provider),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(AnalyticsProvider provider) {
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
                    child: const Icon(Icons.analytics_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Analytics Tower', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Text('${provider.activeVisitors} live', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Pageviews', '${provider.umami?.pageviews ?? 0}'),
                  _quickStat('Visitors', '${provider.umami?.visitors ?? 0}'),
                  _quickStat('Errors', '${provider.sentry?.errorsToday ?? 0}'),
                  _quickStat('Critical', '${provider.sentry?.critical ?? 0}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quickStat(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
          ],
        ),
      );

  Widget _buildUmamiTab(AnalyticsProvider provider) {
    final umami = provider.umami;
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: StatCard(icon: Icons.visibility_rounded, label: 'Pageviews', value: '${umami?.pageviews ?? 0}')),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.people_alt_rounded,
                  label: 'Visitors',
                  value: '${umami?.visitors ?? 0}',
                  iconBgColor: AppColors.accent.withValues(alpha: 0.15),
                  iconColor: AppColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Traffic Sources'),
          if (umami == null || umami.topSources.isEmpty)
            Text('No source data yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            ...umami.topSources.map((s) => _buildSourceRow(s)),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Visitor Geography'),
          if (umami == null || umami.geography.isEmpty)
            Text('No geography data yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            AppCard(
              child: Column(
                children: umami.geography.entries.map((e) {
                  final isLast = e.key == umami.geography.keys.last;
                  return Column(
                    children: [
                      _geoRow(e.key, e.value, umami.visitors),
                      if (!isLast) const Divider(height: 16, color: AppColors.divider),
                    ],
                  );
                }).toList(),
              ),
            ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Top Pages'),
          if (umami == null || umami.topPages.isEmpty)
            Text('No page data yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            AppCard(
              child: Column(
                children: umami.topPages
                    .map((p) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              Expanded(child: Text(p['path']?.toString() ?? '/', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary))),
                              Text('${p['views'] ?? 0} views', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                            ],
                          ),
                        ))
                    .toList(),
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSourceRow(Map<String, dynamic> s) {
    final name = s['name']?.toString() ?? 'Unknown';
    final pct = (s['pct'] as num?) ?? 0;
    return AppCard(
      margin: const EdgeInsets.symmetric(vertical: 3),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.link_rounded, color: AppColors.primary, size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(name, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
          Text('$pct%', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
        ],
      ),
    );
  }

  Widget _geoRow(String country, int count, int totalVisitors) {
    final pct = totalVisitors == 0 ? 0 : (count / totalVisitors * 100).round();
    return Row(
      children: [
        Expanded(child: Text(country, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary))),
        Text('$count ($pct%)', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      ],
    );
  }

  Widget _buildSentryTab(AnalyticsProvider provider) {
    final sentry = provider.sentry;
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _healthCard('Critical', '${sentry?.critical ?? 0}', (sentry?.critical ?? 0) > 0 ? AppColors.error : AppColors.success, Icons.error_rounded)),
              const SizedBox(width: 12),
              Expanded(child: _healthCard('Warnings', '${sentry?.warnings ?? 0}', AppColors.warning, Icons.warning_amber_rounded)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _healthCard('Errors Today', '${sentry?.errorsToday ?? 0}', AppColors.error, Icons.bug_report_rounded)),
              const SizedBox(width: 12),
              Expanded(child: _healthCard('Resolved', '${sentry?.resolved ?? 0}', AppColors.success, Icons.task_alt_rounded)),
            ],
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Active Issues'),
          if (sentry == null || sentry.recent.isEmpty)
            Text('No issues detected.', style: GoogleFonts.inter(color: AppColors.textTertiary))
          else
            ...sentry.recent.map((i) => _buildIssueCard(i)),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _healthCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.cardBg, borderRadius: BorderRadius.circular(16), boxShadow: AppShadows.cardShadow),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: color)),
              Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildIssueCard(Map<String, dynamic> issue) {
    final level = issue['level']?.toString() ?? 'info';
    final color = level == 'error' || level == 'fatal'
        ? AppColors.error
        : level == 'warning'
            ? AppColors.warning
            : AppColors.info;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Expanded(child: Text(issue['title']?.toString() ?? '', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
              StatusBadge(label: level[0].toUpperCase() + level.substring(1), bgColor: color.withValues(alpha: 0.12), textColor: color),
            ],
          ),
          if (issue['time'] != null) ...[
            const SizedBox(height: 6),
            Text(issue['time'].toString(), style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
          ],
        ],
      ),
    );
  }

  Widget _buildCombinedTab(AnalyticsProvider provider) {
    final sentry = provider.sentry;
    final report = provider.weeklyReport;
    final hasCritical = (sentry?.critical ?? 0) > 0;
    final highTraffic = provider.activeVisitors >= 20;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasCritical)
            _alertBanner(
              color: AppColors.error,
              icon: Icons.warning_rounded,
              title: 'Critical site errors detected',
              body: '${sentry!.critical} critical issue(s) affecting the site right now — check Sentry before anything else.',
            ),
          if (hasCritical && highTraffic) const SizedBox(height: 12),
          if (highTraffic)
            _alertBanner(
              color: AppColors.warning,
              icon: Icons.info_rounded,
              title: 'Traffic spike',
              body: '${provider.activeVisitors} live visitors right now — a good moment to check the contact form is working.',
            ),
          if (!hasCritical && !highTraffic)
            AppCard(
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                  const SizedBox(width: 10),
                  Expanded(child: Text('No active alerts — traffic and error rates are normal.', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary))),
                ],
              ),
            ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Weekly Report'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Performance Summary', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                _reportRow('New Leads', '${report?.newLeads ?? 0}'),
                _reportRow('Calls Booked', '${report?.callsBooked ?? 0}'),
                _reportRow('Deals Closed', '${report?.dealsClosed ?? 0}'),
                _reportRow('Revenue Closed', '\$${(report?.revenueClosed ?? 0).toStringAsFixed(0)}'),
                if (report?.insight.isNotEmpty == true) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.infoLight, borderRadius: BorderRadius.circular(10)),
                    child: Text(report!.insight, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.info, height: 1.4)),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _alertBanner({required Color color, required IconData icon, required String title, required String body}) {
    return AppCard(
      color: color.withValues(alpha: 0.08),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: color)),
                const SizedBox(height: 4),
                Text(body, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _reportRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Expanded(child: Text(label, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary))),
            Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          ],
        ),
      );
}

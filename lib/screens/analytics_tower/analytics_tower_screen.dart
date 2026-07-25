import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class AnalyticsTowerScreen extends StatefulWidget {
  const AnalyticsTowerScreen({super.key});

  @override
  State<AnalyticsTowerScreen> createState() => _AnalyticsTowerScreenState();
}

class _AnalyticsTowerScreenState extends State<AnalyticsTowerScreen> {
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
            tabs: const ['Umami', 'Sentry', 'Combined'],
            selectedIndex: _selectedTab,
            onTap: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: IndexedStack(
              index: _selectedTab,
              children: [
                _buildUmamiTab(),
                _buildSentryTab(),
                _buildCombinedTab(),
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
                    child: const Icon(Icons.analytics_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Analytics Tower', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                  // Live indicator
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Text('4 live', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _quickStat('Today', '87'),
                  _quickStat('Yesterday', '92'),
                  _quickStat('This Week', '543'),
                  _quickStat('Errors', '2'),
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

  Widget _buildUmamiTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Traffic chart
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Pageviews', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                SizedBox(
                  height: 160,
                  child: BarChart(
                    BarChartData(
                      barGroups: List.generate(
                        7,
                        (i) => BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: [65, 78, 92, 54, 120, 87, 43][i].toDouble(),
                              color: i == 4 ? AppColors.primary : AppColors.primaryLight.withValues(alpha: 0.4),
                              width: 24,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ],
                        ),
                      ),
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(days[value.toInt()], style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary)),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Top sources
          const SectionHeader(title: 'Traffic Sources'),
          _buildSourceRow('Google', '34%', 187, AppColors.primary),
          _buildSourceRow('Twitter/X', '28%', 154, const Color(0xFF1DA1F2)),
          _buildSourceRow('Direct', '18%', 99, AppColors.accent),
          _buildSourceRow('Hacker News', '12%', 66, const Color(0xFFFF6600)),
          _buildSourceRow('LinkedIn', '8%', 44, const Color(0xFF0077B5)),
          const SizedBox(height: 12),
          // Geography
          const SectionHeader(title: 'Visitor Geography'),
          AppCard(
            child: Column(
              children: [
                _geoRow('🇺🇸', 'United States', '42%', 231),
                const Divider(height: 16, color: AppColors.divider),
                _geoRow('🇬🇧', 'United Kingdom', '24%', 132),
                const Divider(height: 16, color: AppColors.divider),
                _geoRow('🇩🇪', 'Germany', '14%', 77),
                const Divider(height: 16, color: AppColors.divider),
                _geoRow('🇫🇷', 'France', '8%', 44),
                const Divider(height: 16, color: AppColors.divider),
                _geoRow('🌍', 'Other', '12%', 66),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Conversion funnel
          const SectionHeader(title: 'Conversion Funnel'),
          AppCard(
            child: Column(
              children: [
                _funnelStep('Visitors', '543', 1.0, AppColors.primaryLight),
                const SizedBox(height: 8),
                _funnelStep('Contact Page Views', '87', 0.16, AppColors.primary),
                const SizedBox(height: 8),
                _funnelStep('Form Submissions', '12', 0.022, AppColors.accent),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSourceRow(String name, String pct, int count, Color color) {
    return AppCard(
      margin: const EdgeInsets.symmetric(vertical: 3),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
            child: Icon(Icons.link_rounded, color: color, size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text('$count visitors', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              ],
            ),
          ),
          Text(pct, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Widget _geoRow(String flag, String country, String pct, int count) => Row(
        children: [
          Text(flag, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(country, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                Text('$count visitors', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
              ],
            ),
          ),
          Text(pct, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        ],
      );

  Widget _funnelStep(String label, String value, double ratio, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
            const Spacer(),
            Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 6,
            backgroundColor: AppColors.surfaceBg,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildSentryTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Health overview
          Row(
            children: [
              Expanded(
                child: _healthCard('Critical', '0', AppColors.success, Icons.check_circle_rounded),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _healthCard('Warnings', '2', AppColors.warning, Icons.warning_amber_rounded),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _healthCard('Errors Today', '3', AppColors.error, Icons.error_rounded),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _healthCard('Resolved', '5', AppColors.success, Icons.task_alt_rounded),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const SectionHeader(title: 'Active Issues'),
          _buildIssueCard(
            'Contact form failing for Safari users',
            'TypeError: Cannot read property \'submit\' of null',
            'critical',
            '3 events • Last 1h',
          ),
          _buildIssueCard(
            'Slow API response on /pricing page',
            'Response time > 3s on 12% of requests',
            'warning',
            '8 events • Last 6h',
          ),
          _buildIssueCard(
            'Missing favicon causing 404',
            'GET /favicon.ico returned 404',
            'info',
            '45 events • Last 24h',
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _healthCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.cardShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
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

  Widget _buildIssueCard(String title, String detail, String severity, String meta) {
    final color = severity == 'critical'
        ? AppColors.error
        : severity == 'warning'
            ? AppColors.warning
            : AppColors.info;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10, height: 10,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              ),
              StatusBadge(
                label: severity[0].toUpperCase() + severity.substring(1),
                bgColor: color.withValues(alpha: 0.12),
                textColor: color,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.surfaceBg, borderRadius: BorderRadius.circular(6)),
            child: Text(detail, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'monospace')),
          ),
          const SizedBox(height: 6),
          Text(meta, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
        ],
      ),
    );
  }

  Widget _buildCombinedTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Intelligence alerts
          AppCard(
            color: AppColors.errorLight,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.error.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.warning_rounded, color: AppColors.error, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('High traffic + form errors', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.error)),
                      const SizedBox(height: 4),
                      Text(
                        'Traffic is 40% above average but contact form has 3 errors in the last hour. You may be losing leads.',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary, height: 1.4),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 32,
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.error,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text('Investigate Now', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AppCard(
            color: AppColors.warningLight,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.info_rounded, color: AppColors.warning, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('No form submissions in 24h', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.warning)),
                      const SizedBox(height: 4),
                      Text(
                        'Traffic is normal (87 visitors) but no contact form submissions in the last 24 hours. Conversion path may need attention.',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary, height: 1.4),
                      ),
                    ],
                  ),
                ),
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
                _reportRow('Twitter Impressions', '2,400', '+18%', true),
                _reportRow('New Followers', '12', '+3', true),
                _reportRow('Site Visitors', '543', '-5%', false),
                _reportRow('New Leads', '12', '+33%', true),
                _reportRow('Discovery Calls', '2', '+1', true),
                _reportRow('Closed Deals', '1', '—', true),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.infoLight, borderRadius: BorderRadius.circular(10)),
                  child: Text(
                    'Verdict: Lead flow is healthy. Focus on converting the 3 proposals sent last week.',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.info, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _reportRow(String label, String value, String trend, bool positive) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Expanded(child: Text(label, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary))),
            Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
            const SizedBox(width: 8),
            SizedBox(
              width: 48,
              child: Text(
                trend,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: trend == '—' ? AppColors.textTertiary : (positive ? AppColors.success : AppColors.error),
                ),
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
      );
}

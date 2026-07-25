import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../widgets/shared_components.dart';

class RevenueCommandScreen extends StatelessWidget {
  const RevenueCommandScreen({super.key});

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
            _buildMRRChart(),
            const SizedBox(height: 4),
            _buildRevenueBreakdown(),
            const SizedBox(height: 4),
            _buildSourceBreakdown(),
            const SizedBox(height: 4),
            _buildRunwayCalculator(),
            const SizedBox(height: 4),
            _buildRecentDeals(),
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
                    child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Revenue Command', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                  _headerAction(Icons.add_rounded),
                ],
              ),
              const SizedBox(height: 20),
              // Total revenue
              Center(
                child: Column(
                  children: [
                    Text('Total Revenue', style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.7))),
                    const SizedBox(height: 4),
                    Text(
                      '\$4,840',
                      style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -1),
                    ),
                    const SizedBox(height: 2),
                    Text('This quarter', style: GoogleFonts.inter(fontSize: 12, color: Colors.white.withValues(alpha: 0.6))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Quick metrics
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    _headerMetric('MRR', '\$340'),
                    _headerDivider(),
                    _headerMetric('ARR', '\$4,080'),
                    _headerDivider(),
                    _headerMetric('Churn', '2.1%'),
                    _headerDivider(),
                    _headerMetric('New MRR', '+\$85'),
                  ],
                ),
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

  Widget _headerMetric(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(value, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
            const SizedBox(height: 2),
            Text(label, style: GoogleFonts.inter(fontSize: 10, color: Colors.white.withValues(alpha: 0.6))),
          ],
        ),
      );

  Widget _headerDivider() => Container(
        width: 1,
        height: 30,
        color: Colors.white.withValues(alpha: 0.15),
      );

  Widget _buildMRRChart() {
    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('MRR Trend', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              const Spacer(),
              Text('12 weeks', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 100,
                  getDrawingHorizontalLine: (value) => FlLine(
                    color: AppColors.border,
                    strokeWidth: 1,
                  ),
                ),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      interval: 100,
                      getTitlesWidget: (value, meta) => Text(
                        '\$${value.toInt()}',
                        style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      interval: 3,
                      getTitlesWidget: (value, meta) {
                        final labels = ['W1', '', '', 'W4', '', '', 'W7', '', '', 'W10', '', 'W12'];
                        if (value.toInt() < labels.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              labels[value.toInt()],
                              style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: const [
                      FlSpot(0, 120),
                      FlSpot(1, 135),
                      FlSpot(2, 150),
                      FlSpot(3, 145),
                      FlSpot(4, 170),
                      FlSpot(5, 195),
                      FlSpot(6, 210),
                      FlSpot(7, 235),
                      FlSpot(8, 260),
                      FlSpot(9, 285),
                      FlSpot(10, 310),
                      FlSpot(11, 340),
                    ],
                    isCurved: true,
                    color: AppColors.primary,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: AppColors.primary.withValues(alpha: 0.08),
                    ),
                  ),
                ],
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (spot) => AppColors.primaryDark,
                    getTooltipItems: (spots) => spots
                        .map((spot) => LineTooltipItem(
                              '\$${spot.y.toInt()}',
                              GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                            ))
                        .toList(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueBreakdown() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: StatCard(
              icon: Icons.autorenew_rounded,
              label: 'SaaS MRR',
              value: '\$340',
              trend: '+33%',
              trendUp: true,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: StatCard(
              icon: Icons.work_rounded,
              label: 'Project Revenue',
              value: '\$4,500',
              trend: '+\$2K',
              trendUp: true,
              iconBgColor: AppColors.accent.withValues(alpha: 0.12),
              iconColor: AppColors.accent,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSourceBreakdown() {
    final sources = [
      {'name': 'Apollo', 'amount': '\$2,100', 'pct': 43, 'color': AppColors.primary},
      {'name': 'Contra', 'amount': '\$1,200', 'pct': 25, 'color': AppColors.accent},
      {'name': 'SolidGigs', 'amount': '\$800', 'pct': 17, 'color': const Color(0xFF7C4DFF)},
      {'name': 'Twitter', 'amount': '\$500', 'pct': 10, 'color': AppColors.warning},
      {'name': 'Direct', 'amount': '\$240', 'pct': 5, 'color': AppColors.textTertiary},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Revenue by Source'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: sources.map((s) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: s['color'] as Color,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(s['name'] as String, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                        const Spacer(),
                        Text(s['amount'] as String, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 36,
                          child: Text('${s['pct']}%', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary), textAlign: TextAlign.end),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: (s['pct'] as int) / 100,
                        minHeight: 4,
                        backgroundColor: AppColors.surfaceBg,
                        valueColor: AlwaysStoppedAnimation<Color>(s['color'] as Color),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildRunwayCalculator() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Runway'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(child: _runwayStat('Monthly Burn', '\$1,200', AppColors.error)),
                  Expanded(child: _runwayStat('Net Monthly', '+\$460', AppColors.success)),
                  Expanded(child: _runwayStat('Runway', '∞', AppColors.primary)),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Revenue exceeds burn rate. AlphoTech is self-sustaining.',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.success),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _runwayStat(String label, String value, Color color) => Column(
        children: [
          Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
        ],
      );

  Widget _buildRecentDeals() {
    final deals = [
      {'client': 'Finova Technologies', 'amount': '+\$2,500', 'date': 'Jul 12', 'source': 'Apollo', 'positive': true},
      {'client': 'BuildFast SaaS', 'amount': '+\$85/mo', 'date': 'Jul 10', 'source': 'BetaList', 'positive': true},
      {'client': 'MedFlow API Project', 'amount': '+\$1,200', 'date': 'Jul 5', 'source': 'SolidGigs', 'positive': true},
      {'client': 'CloudScale Subscriber', 'amount': '+\$45/mo', 'date': 'Jul 2', 'source': 'Twitter', 'positive': true},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Recent Deals', actionLabel: 'Add Deal'),
        ...deals.map((d) => AppCard(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.successLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.arrow_downward_rounded, color: AppColors.success, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d['client'] as String, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('${d['date']} • via ${d['source']}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                      ],
                    ),
                  ),
                  Text(
                    d['amount'] as String,
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.success),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}

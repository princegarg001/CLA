import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/revenue_models.dart';
import '../../providers/revenue_provider.dart';
import '../../widgets/shared_components.dart';

class RevenueCommandScreen extends StatefulWidget {
  const RevenueCommandScreen({super.key});

  @override
  State<RevenueCommandScreen> createState() => _RevenueCommandScreenState();
}

class _RevenueCommandScreenState extends State<RevenueCommandScreen> {
  static const _sourceColors = {
    'apollo': AppColors.primary,
    'contra': AppColors.accent,
    'solidgigs': Color(0xFF7C4DFF),
    'twitter': AppColors.warning,
    'gumroad': Color(0xFFFF6B8A),
    'direct': AppColors.textTertiary,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<RevenueProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<RevenueProvider>();
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: RefreshIndicator(
        onRefresh: () => context.read<RevenueProvider>().load(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(provider),
              const SizedBox(height: 8),
              if (provider.isLoading && provider.summary == null)
                const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: CircularProgressIndicator()))
              else ...[
                _buildMRRChart(provider),
                const SizedBox(height: 4),
                _buildRevenueBreakdown(provider),
                const SizedBox(height: 4),
                _buildSourceBreakdown(provider),
                const SizedBox(height: 4),
                _buildMrrHealth(provider),
                const SizedBox(height: 4),
                _buildRecentDeals(provider),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(RevenueProvider provider) {
    final total = provider.summary?.totalRevenue ?? 0;
    final mrr = provider.mrr;
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
                    child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Revenue Command', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white))),
                  GestureDetector(onTap: () => _showAddDealDialog(context), child: _headerAction(Icons.add_rounded)),
                ],
              ),
              const SizedBox(height: 20),
              Center(
                child: Column(
                  children: [
                    Text('Total Revenue', style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.7))),
                    const SizedBox(height: 4),
                    Text('\$${total.toStringAsFixed(0)}', style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -1)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: [
                    _headerMetric('MRR', '\$${(mrr?.mrr ?? 0).toStringAsFixed(0)}'),
                    _headerDivider(),
                    _headerMetric('ARR', '\$${(mrr?.arr ?? 0).toStringAsFixed(0)}'),
                    _headerDivider(),
                    _headerMetric('Churn', mrr?.churnRate != null ? '${(mrr!.churnRate! * 100).toStringAsFixed(1)}%' : '—'),
                    _headerDivider(),
                    _headerMetric('New MRR', mrr?.newMrr != null ? '+\$${mrr!.newMrr!.toStringAsFixed(0)}' : '—'),
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

  Widget _headerDivider() => Container(width: 1, height: 30, color: Colors.white.withValues(alpha: 0.15));

  Widget _buildMRRChart(RevenueProvider provider) {
    final trend = provider.trend;
    if (trend.isEmpty) return const SizedBox.shrink();
    final maxY = trend.map((t) => t.mrr).fold<num>(0, (a, b) => a > b ? a : b);

    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('MRR Trend', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              const Spacer(),
              Text('${trend.length} weeks', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (v) => FlLine(color: AppColors.border, strokeWidth: 1)),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (value, meta) => Text('\$${value.toInt()}', style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary)))),
                  bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (value, meta) => Padding(padding: const EdgeInsets.only(top: 4), child: Text('W${value.toInt() + 1}', style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary))))),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                maxY: maxY == 0 ? 100 : maxY.toDouble() * 1.15,
                lineBarsData: [
                  LineChartBarData(
                    spots: trend.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.mrr.toDouble())).toList(),
                    isCurved: true,
                    color: AppColors.primary,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(show: true, color: AppColors.primary.withValues(alpha: 0.08)),
                  ),
                ],
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (spot) => AppColors.primaryDark,
                    getTooltipItems: (spots) => spots.map((spot) => LineTooltipItem('\$${spot.y.toInt()}', GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white))).toList(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueBreakdown(RevenueProvider provider) {
    final summary = provider.summary;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(child: StatCard(icon: Icons.autorenew_rounded, label: 'SaaS MRR', value: '\$${(summary?.mrr ?? 0).toStringAsFixed(0)}')),
          const SizedBox(width: 12),
          Expanded(
            child: StatCard(
              icon: Icons.work_rounded,
              label: 'Project Revenue',
              value: '\$${(summary?.projectRevenue ?? 0).toStringAsFixed(0)}',
              iconBgColor: AppColors.accent.withValues(alpha: 0.12),
              iconColor: AppColors.accent,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSourceBreakdown(RevenueProvider provider) {
    final bySource = provider.summary?.revenueBySource ?? {};
    final total = bySource.values.fold<num>(0, (a, b) => a + b);
    if (bySource.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Revenue by Source'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: bySource.entries.map((e) {
              final pct = total == 0 ? 0.0 : e.value / total;
              final color = _sourceColors[e.key] ?? AppColors.textTertiary;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
                        const SizedBox(width: 8),
                        Text(e.key[0].toUpperCase() + e.key.substring(1), style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                        const Spacer(),
                        Text('\$${e.value.toStringAsFixed(0)}', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        const SizedBox(width: 8),
                        SizedBox(width: 40, child: Text('${(pct * 100).toStringAsFixed(0)}%', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary), textAlign: TextAlign.end)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(value: pct, minHeight: 4, backgroundColor: AppColors.surfaceBg, valueColor: AlwaysStoppedAnimation<Color>(color)),
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

  Widget _buildMrrHealth(RevenueProvider provider) {
    final mrr = provider.mrr;
    if (mrr == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'MRR Health'),
        AppCard(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(child: _healthStat('Expansion MRR', mrr.expansionMrr != null ? '+\$${mrr.expansionMrr!.toStringAsFixed(0)}' : '—', AppColors.success)),
              Expanded(child: _healthStat('Net Retention', mrr.netRevenueRetention != null ? '${(mrr.netRevenueRetention! * 100).toStringAsFixed(0)}%' : '—', AppColors.primary)),
              Expanded(child: _healthStat('Churn Rate', mrr.churnRate != null ? '${(mrr.churnRate! * 100).toStringAsFixed(1)}%' : '—', AppColors.error)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _healthStat(String label, String value, Color color) => Column(
        children: [
          Text(value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary), textAlign: TextAlign.center),
        ],
      );

  Widget _buildRecentDeals(RevenueProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: 'Recent Deals', actionLabel: 'Add Deal', onAction: () => _showAddDealDialog(context)),
        if (provider.deals.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('No deals recorded yet.', style: GoogleFonts.inter(color: AppColors.textTertiary))),
        ...provider.deals.map((d) => AppCard(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(color: AppColors.successLight, borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.arrow_downward_rounded, color: AppColors.success, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d.title, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('${d.closedAt != null ? _formatDate(d.closedAt!) : ''}${d.source != null ? ' • via ${d.source}' : ''}', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary)),
                      ],
                    ),
                  ),
                  Text('+\$${d.value.toStringAsFixed(0)}', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.success)),
                ],
              ),
            )),
      ],
    );
  }

  String _formatDate(DateTime d) => '${d.month}/${d.day}';

  void _showAddDealDialog(BuildContext context) {
    final titleController = TextEditingController();
    final valueController = TextEditingController();
    final sourceController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Add Deal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Client / project title')),
            TextField(controller: valueController, decoration: const InputDecoration(labelText: 'Value (USD)'), keyboardType: TextInputType.number),
            TextField(controller: sourceController, decoration: const InputDecoration(labelText: 'Source (apollo, contra, direct...)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final value = num.tryParse(valueController.text) ?? 0;
              if (titleController.text.trim().isEmpty) return;
              final ok = await context.read<RevenueProvider>().addDeal(Deal(
                    id: '',
                    title: titleController.text.trim(),
                    value: value,
                    source: sourceController.text.trim().isEmpty ? null : sourceController.text.trim(),
                  ));
              if (dialogContext.mounted) Navigator.pop(dialogContext);
              if (!ok && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.read<RevenueProvider>().error ?? 'Failed to add deal')));
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

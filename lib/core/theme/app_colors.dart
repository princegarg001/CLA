import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary gradient colors (header)
  static const Color primaryLight = Color(0xFF4FC3F7);
  static const Color primary = Color(0xFF29B6F6);
  static const Color primaryMedium = Color(0xFF039BE5);
  static const Color primaryDark = Color(0xFF0277BD);
  static const Color primaryDeep = Color(0xFF01579B);

  // Accent / Teal
  static const Color accent = Color(0xFF00BFA5);
  static const Color accentLight = Color(0xFF1DE9B6);
  static const Color accentDark = Color(0xFF00897B);

  // Background
  static const Color scaffoldBg = Color(0xFFF0F6FF);
  static const Color cardBg = Colors.white;
  static const Color surfaceBg = Color(0xFFF5F9FF);

  // Text
  static const Color textPrimary = Color(0xFF1A1D2E);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textTertiary = Color(0xFF9CA3AF);
  static const Color textOnPrimary = Colors.white;
  static const Color textOnAccent = Colors.white;

  // Status
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

  // Scores (lead scoring)
  static const Color scoreHot = Color(0xFFEF4444);
  static const Color scoreWarm = Color(0xFFF59E0B);
  static const Color scoreCold = Color(0xFF6B7280);

  // Bottom nav
  static const Color navActive = Color(0xFF039BE5);
  static const Color navInactive = Color(0xFF9CA3AF);
  static const Color navBg = Colors.white;

  // Borders & Dividers
  static const Color border = Color(0xFFE5E7EB);
  static const Color divider = Color(0xFFF3F4F6);

  // Shadows
  static const Color shadowLight = Color(0x0D000000);
  static const Color shadowMedium = Color(0x1A000000);

  // Gradients
  static const LinearGradient headerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryLight, primary, primaryMedium, primaryDark],
    stops: [0.0, 0.3, 0.7, 1.0],
  );

  static const LinearGradient headerGradientVertical = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [primaryLight, primaryDark],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [accent, accentLight],
  );

  static const LinearGradient cardGradientBlue = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF42A5F5), Color(0xFF1565C0)],
  );
}

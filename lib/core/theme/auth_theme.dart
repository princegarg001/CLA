import 'package:flutter/material.dart';

/// Design tokens for the new auth/onboarding experience — deep navy +
/// amber, illustrated, rounded. Deliberately separate from [AppColors]
/// (used by the existing 9 screens) so this can ship now without touching
/// the rest of the app; the plan is to fold this into the shared theme once
/// it propagates to the other screens.
class AuthColors {
  AuthColors._();

  static const Color bgDark = Color(0xFF122436);
  static const Color bgDarker = Color(0xFF0B1826);
  static const Color cardNavy = Color(0xFF1C3B4C);
  static const Color cardNavyLight = Color(0xFF234658);

  static const Color amber = Color(0xFFF5A623);
  static const Color amberLight = Color(0xFFFFC670);
  static const Color amberDark = Color(0xFFDB8B12);

  static const Color cream = Color(0xFFFCF7EE);
  static const Color peach = Color(0xFFF7D9B6);

  static const Color textOnDark = Color(0xFFF8F4EC);
  static const Color textMutedOnDark = Color(0xB3F8F4EC);
  static const Color textFaintOnDark = Color(0x66F8F4EC);

  static const Color success = Color(0xFF34D399);
  static const Color error = Color(0xFFEF6461);

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [bgDark, bgDarker],
  );

  static const LinearGradient amberGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [amber, amberLight],
  );

  static const RadialGradient orbGlow = RadialGradient(
    colors: [Color(0x55F5A623), Color(0x00F5A623)],
  );
}

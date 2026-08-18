import 'dart:math';
import 'package:flutter/material.dart';
import '../core/theme/auth_theme.dart';
import '../providers/voice_auth_controller.dart';

/// The big circular mic control on the voice login/setup screens. Pulses
/// with ambient rings while idle, expands rings in sync with live mic
/// volume while listening, and morphs into a check/cross for the result —
/// all driven off [status] and [soundLevel] rather than being told "play
/// animation X", so it stays in sync with the controller by construction.
class VoiceOrb extends StatefulWidget {
  final VoiceAuthStatus status;
  final double soundLevel;
  final VoidCallback? onTap;
  final double size;

  const VoiceOrb({
    super.key,
    required this.status,
    required this.soundLevel,
    this.onTap,
    this.size = 176,
  });

  @override
  State<VoiceOrb> createState() => _VoiceOrbState();
}

class _VoiceOrbState extends State<VoiceOrb> with TickerProviderStateMixin {
  late final AnimationController _pulseController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  )..repeat();

  late final AnimationController _resultController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );

  @override
  void didUpdateWidget(covariant VoiceOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.status != widget.status &&
        (widget.status == VoiceAuthStatus.matched || widget.status == VoiceAuthStatus.denied)) {
      _resultController.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _resultController.dispose();
    super.dispose();
  }

  bool get _isListening => widget.status == VoiceAuthStatus.listening;
  bool get _isMatched => widget.status == VoiceAuthStatus.matched;
  bool get _isDenied => widget.status == VoiceAuthStatus.denied;
  bool get _isUnavailable => widget.status == VoiceAuthStatus.micUnavailable;

  Color get _tint {
    if (_isMatched) return AuthColors.success;
    if (_isDenied) return AuthColors.error;
    if (_isUnavailable) return AuthColors.textFaintOnDark;
    return AuthColors.amber;
  }

  IconData get _icon {
    if (_isMatched) return Icons.check_rounded;
    if (_isDenied) return Icons.close_rounded;
    if (_isUnavailable) return Icons.mic_off_rounded;
    if (_isListening) return Icons.mic_rounded;
    return Icons.mic_none_rounded;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: AnimatedBuilder(
          animation: Listenable.merge([_pulseController, _resultController]),
          builder: (context, _) {
            return Stack(
              alignment: Alignment.center,
              children: [
                if (_isListening) ..._ambientRings(),
                if (_isListening) _soundRing(),
                _shakeOrStatic(
                  child: _core(),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Widget> _ambientRings() {
    return List.generate(2, (i) {
      final t = (_pulseController.value + (i * 0.5)) % 1.0;
      final scale = 0.7 + t * 0.6;
      final opacity = (1 - t).clamp(0.0, 1.0) * 0.35;
      return Transform.scale(
        scale: scale,
        child: Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: _tint.withValues(alpha: opacity), width: 2),
          ),
        ),
      );
    });
  }

  Widget _soundRing() {
    final level = widget.soundLevel.clamp(0.0, 1.0);
    return Transform.scale(
      scale: 0.72 + level * 0.22,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [_tint.withValues(alpha: 0.25 + level * 0.25), Colors.transparent],
          ),
        ),
      ),
    );
  }

  Widget _shakeOrStatic({required Widget child}) {
    if (!_isDenied) return child;
    final t = _resultController.value;
    final dx = sin(t * pi * 6) * (1 - t) * 10;
    return Transform.translate(offset: Offset(dx, 0), child: child);
  }

  Widget _core() {
    final scale = _isMatched || _isDenied
        ? 0.85 + (_resultController.value * 0.15)
        : 1.0;
    return Transform.scale(
      scale: scale,
      child: Container(
        width: widget.size * 0.62,
        height: widget.size * 0.62,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AuthColors.cardNavy,
          border: Border.all(color: _tint.withValues(alpha: 0.6), width: 2),
          boxShadow: [
            BoxShadow(color: _tint.withValues(alpha: 0.35), blurRadius: 28, spreadRadius: 2),
          ],
        ),
        child: Icon(_icon, color: _tint, size: widget.size * 0.26),
      ),
    );
  }
}

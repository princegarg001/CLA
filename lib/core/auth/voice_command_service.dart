import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';

/// Thin wrapper around `speech_to_text` — on-device speech recognition used
/// both for the voice-passphrase login and for in-app hands-free navigation.
/// Handles the "not supported on this platform/device" case explicitly
/// (Windows support is beta; desktops without a mic exist) instead of
/// letting callers crash on it.
class VoiceCommandService {
  final SpeechToText _speech = SpeechToText();
  bool _available = false;
  bool _initAttempted = false;

  bool get isAvailable => _available;
  bool get isListening => _speech.isListening;

  Future<bool> init({void Function(String message)? onError}) async {
    if (_initAttempted) return _available;
    _initAttempted = true;
    try {
      _available = await _speech.initialize(
        onError: (e) => onError?.call(e.errorMsg),
        onStatus: (_) {},
      );
    } catch (e) {
      _available = false;
      onError?.call('$e');
    }
    return _available;
  }

  /// Starts listening; [onResult] fires on every partial + final transcript,
  /// [onFinal] fires once when speech_to_text considers the utterance done.
  Future<bool> startListening({
    required void Function(String words) onResult,
    void Function(String words)? onFinal,
    void Function(double level)? onSoundLevel,
  }) async {
    if (!_available) return false;
    try {
      await _speech.listen(
        onResult: (SpeechRecognitionResult r) {
          onResult(r.recognizedWords);
          if (r.finalResult) onFinal?.call(r.recognizedWords);
        },
        onSoundLevelChange: onSoundLevel,
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.confirmation,
          listenFor: const Duration(seconds: 12),
          pauseFor: const Duration(seconds: 3),
        ),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> stopListening() async {
    if (_speech.isListening) await _speech.stop();
  }

  Future<void> cancel() async {
    if (_speech.isListening) await _speech.cancel();
  }
}

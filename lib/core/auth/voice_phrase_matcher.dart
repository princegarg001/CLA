/// Speech-to-text transcription is noisy — the same spoken phrase rarely
/// comes back as the exact same string twice. This does normalized,
/// similarity-based comparison instead of exact matching so a voice
/// passphrase login is actually usable.
///
/// Security note: this is a spoken-passphrase gate, not true voiceprint
/// biometrics — it checks *what* was said, not *who* said it. Appropriate
/// for a single-user founder tool's convenience lock, not for verifying
/// identity against an attacker who knows the phrase.
class VoicePhraseMatcher {
  VoicePhraseMatcher._();

  static String normalize(String input) {
    return input
        .toLowerCase()
        .replaceAll(RegExp(r"[^a-z0-9\s]"), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// 0.0 (no relation) .. 1.0 (identical after normalization), based on
  /// word-level overlap plus a Levenshtein-distance ratio on the full
  /// normalized string, so both a word getting dropped and a word getting
  /// mis-transcribed still score sensibly.
  static double similarity(String a, String b) {
    final na = normalize(a);
    final nb = normalize(b);
    if (na.isEmpty || nb.isEmpty) return 0;
    if (na == nb) return 1;

    final wordsA = na.split(' ').toSet();
    final wordsB = nb.split(' ').toSet();
    final overlap = wordsA.intersection(wordsB).length;
    final union = wordsA.union(wordsB).length;
    final wordScore = union == 0 ? 0.0 : overlap / union;

    final distance = _levenshtein(na, nb);
    final maxLen = na.length > nb.length ? na.length : nb.length;
    final charScore = maxLen == 0 ? 0.0 : 1 - (distance / maxLen);

    return (wordScore * 0.6) + (charScore * 0.4);
  }

  static bool matches(String spoken, String target, {double threshold = 0.72}) {
    return similarity(spoken, target) >= threshold;
  }

  static int _levenshtein(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    var previousRow = List<int>.generate(b.length + 1, (i) => i);
    for (var i = 0; i < a.length; i++) {
      final currentRow = List<int>.filled(b.length + 1, 0);
      currentRow[0] = i + 1;
      for (var j = 0; j < b.length; j++) {
        final deletionCost = previousRow[j + 1] + 1;
        final insertionCost = currentRow[j] + 1;
        final substitutionCost = previousRow[j] + (a[i] == b[j] ? 0 : 1);
        currentRow[j + 1] = [deletionCost, insertionCost, substitutionCost].reduce((v, e) => v < e ? v : e);
      }
      previousRow = currentRow;
    }
    return previousRow[b.length];
  }
}

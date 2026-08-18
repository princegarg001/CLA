import 'package:flutter/foundation.dart';
import 'api_exception.dart';

/// Loading/data/error state shared by every screen provider. Screens branch
/// on [isLoading]/[error]/[hasData] instead of each provider reinventing it.
mixin ViewStateMixin on ChangeNotifier {
  bool isLoading = false;
  String? error;

  bool get hasError => error != null;

  Future<void> runLoad(Future<void> Function() body) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      await body();
    } catch (e) {
      error = e is ApiException ? e.message : 'Something went wrong: $e';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// For actions (create/update/delete) that shouldn't toggle the full-screen
  /// loading state but still need error surfacing — returns success/failure.
  Future<bool> runAction(Future<void> Function() body) async {
    try {
      await body();
      return true;
    } catch (e) {
      error = e is ApiException ? e.message : 'Something went wrong: $e';
      notifyListeners();
      return false;
    }
  }
}

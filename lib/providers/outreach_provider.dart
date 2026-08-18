import 'package:flutter/foundation.dart';
import '../core/network/view_state.dart';
import '../data/models/outreach_models.dart';
import '../data/repositories/outreach_repository.dart';

class OutreachProvider extends ChangeNotifier with ViewStateMixin {
  final OutreachRepository _repo;
  OutreachProvider(this._repo);

  List<OutreachMessage> inbox = [];
  List<MessageTemplate> templates = [];
  OutreachMessage? draft;

  Future<void> load() => runLoad(() async {
        final results = await Future.wait<Object>([_repo.inbox(), _repo.templates()]);
        inbox = results[0] as List<OutreachMessage>;
        templates = results[1] as List<MessageTemplate>;
      });

  Future<bool> generate({required String leadId, String? tone, String? market, required String channel}) => runAction(() async {
        draft = await _repo.generate(leadId: leadId, tone: tone, market: market, channel: channel);
        notifyListeners();
      });

  Future<bool> send(String messageId) => runAction(() async {
        final sent = await _repo.updateMessage(messageId, {'status': 'sent'});
        inbox = [sent, ...inbox.where((m) => m.id != messageId)];
        if (draft?.id == messageId) draft = sent;
        notifyListeners();
      });
}

import '../../core/network/api_client.dart';
import '../models/client_models.dart';

class ClientRepository {
  final ApiClient _client;
  ClientRepository(this._client);

  Future<List<Client>> list({String? status, String? search}) async {
    final data = await _client.get('/clients', query: {
      if (status != null) 'status': status,
      if (search != null && search.isNotEmpty) 'search': search,
    });
    return (data as List).map((e) => Client.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Client> get(String id) async {
    final data = await _client.get('/clients/$id');
    return Client.fromJson(data as Map<String, dynamic>);
  }

  Future<Client> convertLead(String leadId) async {
    final data = await _client.post('/clients/convert/$leadId');
    return Client.fromJson(data as Map<String, dynamic>);
  }

  Future<Client> create(Map<String, dynamic> body) async {
    final data = await _client.post('/clients', body: body);
    return Client.fromJson(data as Map<String, dynamic>);
  }

  Future<Client> update(String id, Map<String, dynamic> patch) async {
    final data = await _client.patch('/clients/$id', body: patch);
    return Client.fromJson(data as Map<String, dynamic>);
  }

  Future<List<Client>> rescoreHealth() async {
    final data = await _client.get('/clients/health');
    return (data as List).map((e) => Client.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> reengageDraft(String clientId) async {
    final data = await _client.post('/clients/$clientId/reengage-draft');
    return (data as Map)['draft']?.toString() ?? '';
  }

  Future<Project> addProject(String clientId, Map<String, dynamic> body) async {
    final data = await _client.post('/clients/$clientId/projects', body: body);
    return Project.fromJson(data as Map<String, dynamic>);
  }

  Future<Project> updateProject(String clientId, String projectId, Map<String, dynamic> patch) async {
    final data = await _client.patch('/clients/$clientId/projects/$projectId', body: patch);
    return Project.fromJson(data as Map<String, dynamic>);
  }

  Future<Project> startTimer(String clientId, String projectId) async {
    final data = await _client.post('/clients/$clientId/projects/$projectId/timer/start');
    return Project.fromJson(data as Map<String, dynamic>);
  }

  Future<Project> stopTimer(String clientId, String projectId) async {
    final data = await _client.post('/clients/$clientId/projects/$projectId/timer/stop');
    return Project.fromJson(data as Map<String, dynamic>);
  }

  Future<Milestone> addMilestone(String clientId, {required String projectId, required String title, num? amount, DateTime? dueDate}) async {
    final data = await _client.post('/clients/$clientId/milestones', body: {
      'projectId': projectId,
      'title': title,
      'amount': amount,
      'dueDate': dueDate?.toIso8601String().substring(0, 10),
    });
    return Milestone.fromJson(data as Map<String, dynamic>);
  }

  Future<Milestone> updateMilestone(String clientId, String milestoneId, Map<String, dynamic> patch) async {
    final data = await _client.patch('/clients/$clientId/milestones/$milestoneId', body: patch);
    return Milestone.fromJson(data as Map<String, dynamic>);
  }

  Future<Invoice> addInvoice(String clientId, {required num amount, String? projectId, DateTime? dueDate}) async {
    final data = await _client.post('/clients/$clientId/invoices', body: {
      'amount': amount,
      'projectId': projectId,
      'dueDate': dueDate?.toIso8601String().substring(0, 10),
    });
    return Invoice.fromJson(data as Map<String, dynamic>);
  }

  Future<Invoice> updateInvoiceStatus(String clientId, String invoiceId, String status) async {
    final data = await _client.patch('/clients/$clientId/invoices/$invoiceId', body: {'status': status});
    return Invoice.fromJson(data as Map<String, dynamic>);
  }

  Future<List<CommunicationLogEntry>> timeline(String clientId) async {
    final data = await _client.get('/clients/$clientId/timeline');
    return (data as List).map((e) => CommunicationLogEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CommunicationLogEntry> logCommunication(String clientId, {required String channel, String direction = 'outbound', String? fullContent, String? summary}) async {
    final data = await _client.post('/clients/$clientId/log', body: {
      'channel': channel,
      'direction': direction,
      'fullContent': fullContent,
      'summary': summary,
    });
    return CommunicationLogEntry.fromJson(data as Map<String, dynamic>);
  }

  Future<Testimonial> addTestimonial(String clientId, {required String quote, String? authorName, String? authorTitle, List<String>? tags}) async {
    final data = await _client.post('/clients/$clientId/testimonials', body: {
      'quote': quote,
      'authorName': authorName,
      'authorTitle': authorTitle,
      'tags': tags,
    });
    return Testimonial.fromJson(data as Map<String, dynamic>);
  }
}

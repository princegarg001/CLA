import 'package:flutter_test/flutter_test.dart';
import 'package:cla_v2/main.dart';

void main() {
  testWidgets('CLA app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const CLAApp());
    expect(find.text('War Room'), findsWidgets);
  });
}

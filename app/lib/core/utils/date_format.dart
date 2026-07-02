import 'package:intl/intl.dart';

/// Định dạng ngày giờ tập trung một chỗ (dùng intl) thay cho padLeft thủ công
/// rải rác khắp các màn hình.
class AppDate {
  AppDate._();

  static final DateFormat _dateTime = DateFormat('HH:mm dd/MM/yyyy');
  static final DateFormat _date     = DateFormat('dd/MM/yyyy');
  static final DateFormat _time     = DateFormat('HH:mm');
  static final DateFormat _dayMonth = DateFormat('dd/MM');

  static String dateTime(DateTime d) => _dateTime.format(d.toLocal());
  static String date(DateTime d)     => _date.format(d.toLocal());
  static String time(DateTime d)     => _time.format(d.toLocal());
  static String dayMonth(DateTime d) => _dayMonth.format(d.toLocal());

  /// "vừa xong", "5 phút trước", "2 giờ trước"… — cho thời điểm cập nhật vị trí.
  static String relative(DateTime d) {
    final diff = DateTime.now().difference(d.toLocal());
    if (diff.inSeconds < 60) return 'vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours   < 24) return '${diff.inHours} giờ trước';
    return '${diff.inDays} ngày trước';
  }
}

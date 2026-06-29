import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/services/geocoding_service.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../features/shared/widgets/status_badge.dart';
import '../providers/booking_provider.dart';

final _vnd = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

class BookingScreen extends ConsumerStatefulWidget {
  const BookingScreen({super.key});

  @override
  ConsumerState<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends ConsumerState<BookingScreen> {
  final _pickupCtrl  = TextEditingController();
  final _dropoffCtrl = TextEditingController();

  @override
  void dispose() {
    _pickupCtrl.dispose();
    _dropoffCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(hours: 1))),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (time == null || !mounted) return;

    final dt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    ref.read(bookingProvider.notifier).setDepartureTime(dt);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingProvider);

    // Navigate to trips when booked successfully
    ref.listen(bookingProvider, (prev, next) {
      if (next.booked != null && prev?.booked == null) {
        context.go('/customer/trips');
        ref.read(bookingProvider.notifier).reset();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Đặt chuyến thành công! Đang tìm tài xế phù hợp...'),
          backgroundColor: AppColors.success,
        ));
      }
    });

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(title: const Text('Đặt chuyến')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Pickup
          _LocationField(
            controller: _pickupCtrl,
            label: 'Điểm đón',
            icon: Icons.trip_origin,
            color: AppColors.info,
            onSelect: (lat, lng, name) {
              _pickupCtrl.text = name;
              ref.read(bookingProvider.notifier).setPickup(name, lat, lng);
            },
          ),
          const SizedBox(height: 12),

          // Dropoff
          _LocationField(
            controller: _dropoffCtrl,
            label: 'Điểm trả',
            icon: Icons.location_on_rounded,
            color: AppColors.danger,
            onSelect: (lat, lng, name) {
              _dropoffCtrl.text = name;
              ref.read(bookingProvider.notifier).setDropoff(name, lat, lng);
            },
          ),
          const SizedBox(height: 16),

          // Date/time + seats row
          Row(children: [
            Expanded(
              child: _Tile(
                icon: Icons.access_time_rounded,
                label: 'Thời gian',
                value: state.departureTime != null
                    ? DateFormat('HH:mm dd/MM').format(state.departureTime!)
                    : 'Chọn giờ',
                onTap: _pickDateTime,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Tile(
                icon: Icons.people_outline_rounded,
                label: 'Số ghế',
                value: '${state.seats} ghế',
                onTap: () => _pickSeats(context, state.seats),
              ),
            ),
          ]),
          const SizedBox(height: 20),

          // Get quote button
          if (state.quote == null)
            GradientButton(
              label: 'Xem giá',
              icon: Icons.calculate_outlined,
              loading: state.loading,
              onPressed: state.canQuote ? () => ref.read(bookingProvider.notifier).getQuote() : null,
            ),

          // Quote result
          if (state.quote != null) ...[
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.monetization_on_outlined, color: AppColors.success, size: 18),
                  SizedBox(width: 8),
                  Text('Báo giá chuyến đi',
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
                ]),
                const SizedBox(height: 16),
                _QuoteRow(label: 'Giá ước tính', value: _vnd.format(state.quote!.quotedPrice),
                  valueColor: AppColors.success, bold: true),
                const SizedBox(height: 8),
                _QuoteRow(label: 'Khoảng cách',
                  value: '${state.quote!.distanceKm.toStringAsFixed(1)} km'),
                const SizedBox(height: 8),
                _QuoteRow(label: 'Thời gian dự kiến',
                  value: '~${state.quote!.durationMin} phút'),
                const SizedBox(height: 8),
                _QuoteRow(label: 'Số ghế', value: '${state.seats} ghế'),
              ]),
            ),
            const SizedBox(height: 12),

            if (state.error.isNotEmpty) _ErrorBox(state.error),

            const SizedBox(height: 4),
            GradientButton(
              label: 'Xác nhận đặt chuyến',
              icon: Icons.check_circle_outline_rounded,
              loading: state.loading,
              onPressed: () => ref.read(bookingProvider.notifier).confirmBooking(),
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: () {
                  ref.read(bookingProvider.notifier).reset();
                  _pickupCtrl.clear();
                  _dropoffCtrl.clear();
                },
                child: const Text('Đặt lại', style: TextStyle(color: AppColors.textMuted)),
              ),
            ),
          ],

          if (state.error.isNotEmpty && state.quote == null) ...[
            const SizedBox(height: 12),
            _ErrorBox(state.error),
          ],
        ]),
      ),
    );
  }

  void _pickSeats(BuildContext context, int current) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Số ghế', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(6, (i) {
              final n = i + 1;
              return GestureDetector(
                onTap: () {
                  ref.read(bookingProvider.notifier).setSeats(n);
                  Navigator.pop(context);
                },
                child: Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    color: n == current ? AppColors.primary.withValues(alpha: 0.2) : AppColors.bgOverlay,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: n == current ? AppColors.primary : AppColors.borderSubtle,
                      width: n == current ? 1.5 : 1,
                    ),
                  ),
                  child: Center(child: Text('$n',
                    style: TextStyle(
                      color: n == current ? AppColors.primary : AppColors.textSecondary,
                      fontWeight: FontWeight.w700, fontSize: 16,
                    ))),
                ),
              );
            }),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

// ── Location field with Nominatim autocomplete ────────────────────────────────

class _LocationField extends StatefulWidget {
  const _LocationField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.color,
    required this.onSelect,
  });
  final TextEditingController controller;
  final String   label;
  final IconData icon;
  final Color    color;
  final void Function(double lat, double lng, String name) onSelect;

  @override
  State<_LocationField> createState() => _LocationFieldState();
}

class _LocationFieldState extends State<_LocationField> {
  List<PlaceSuggestion> _suggestions = [];
  bool _searching = false;

  Future<void> _search(String q) async {
    if (q.length < 3) { setState(() => _suggestions = []); return; }
    setState(() => _searching = true);
    final results = await GeocodingService.instance.search(q);
    if (mounted) setState(() { _suggestions = results; _searching = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      TextField(
        controller: widget.controller,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        decoration: InputDecoration(
          labelText: widget.label,
          prefixIcon: Icon(widget.icon, color: widget.color, size: 18),
          suffixIcon: _searching
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                )
              : widget.controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18, color: AppColors.textMuted),
                      onPressed: () { widget.controller.clear(); setState(() => _suggestions = []); },
                    )
                  : null,
        ),
        onChanged: _search,
      ),
      if (_suggestions.isNotEmpty)
        Container(
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            color: AppColors.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            children: _suggestions.map((s) => ListTile(
              dense: true,
              leading: Icon(Icons.place_outlined, size: 16, color: widget.color),
              title: Text(s.name,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              onTap: () {
                widget.onSelect(s.lat, s.lng, s.name);
                setState(() => _suggestions = []);
              },
            )).toList(),
          ),
        ),
    ]);
  }
}

// ── Helper widgets ────────────────────────────────────────────────────────────

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, required this.value, required this.onTap});
  final IconData icon;
  final String   label;
  final String   value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(children: [
          Icon(icon, color: AppColors.primary, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            const SizedBox(height: 2),
            Text(value,
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ])),
        ]),
      ),
    );
  }
}

class _QuoteRow extends StatelessWidget {
  const _QuoteRow({required this.label, required this.value, this.valueColor, this.bold = false});
  final String label;
  final String value;
  final Color? valueColor;
  final bool   bold;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
      const Spacer(),
      Text(value, style: TextStyle(
        color: valueColor ?? AppColors.textPrimary,
        fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
        fontSize: bold ? 16 : 13,
      )),
    ]);
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        const Icon(Icons.error_outline, color: AppColors.danger, size: 15),
        const SizedBox(width: 8),
        Expanded(child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 12))),
      ]),
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/match.dart';
import '../../../../data/repositories/driver_repository.dart';
import '../../../../features/shared/widgets/status_badge.dart';
import '../../dashboard/screens/driver_dashboard_screen.dart';

final _vnd = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

// ── State ─────────────────────────────────────────────────────────────────────

class _MatchesState {
  const _MatchesState({this.items = const [], this.loading = true, this.error = ''});
  final List<TripMatch> items;
  final bool   loading;
  final String error;

  _MatchesState copyWith({List<TripMatch>? items, bool? loading, String? error}) =>
      _MatchesState(
        items:   items   ?? this.items,
        loading: loading ?? this.loading,
        error:   error   ?? this.error,
      );
}

class _MatchesNotifier extends StateNotifier<_MatchesState> {
  _MatchesNotifier(this._repo) : super(const _MatchesState()) { load(); }
  final DriverRepository _repo;

  Future<void> load() async {
    state = state.copyWith(loading: true, error: '');
    try {
      final all = await _repo.getMatches();
      state = state.copyWith(items: all.where((m) => m.isOffered).toList(), loading: false);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Không tải được danh sách yêu cầu');
    }
  }

  Future<void> accept(String matchId) async {
    try {
      await _repo.acceptMatch(matchId);
      state = state.copyWith(items: state.items.where((m) => m.id != matchId).toList());
    } on ApiException catch (e) {
      state = state.copyWith(error: e.message);
    } catch (_) {
      state = state.copyWith(error: 'Không thể chấp nhận. Thử lại.');
    }
  }

  Future<void> reject(String matchId) async {
    try {
      await _repo.rejectMatch(matchId);
      state = state.copyWith(items: state.items.where((m) => m.id != matchId).toList());
    } on ApiException catch (e) {
      state = state.copyWith(error: e.message);
    } catch (_) {
      state = state.copyWith(error: 'Không thể từ chối. Thử lại.');
    }
  }
}

final _matchesProvider = StateNotifierProvider.autoDispose<_MatchesNotifier, _MatchesState>(
  (ref) => _MatchesNotifier(ref.read(driverRepositoryProvider)),
);

// ── Screen ────────────────────────────────────────────────────────────────────

class DriverMatchesScreen extends ConsumerWidget {
  const DriverMatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_matchesProvider);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Yêu cầu ghép chuyến'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(_matchesProvider.notifier).load(),
          ),
        ],
      ),
      body: Column(children: [
        if (state.error.isNotEmpty)
          _ErrBanner(state.error, onRetry: () => ref.read(_matchesProvider.notifier).load()),

        Expanded(
          child: state.loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
              : state.items.isEmpty
                  ? const _Empty()
                  : RefreshIndicator(
                      color: AppColors.primary,
                      backgroundColor: AppColors.bgSurface,
                      onRefresh: () => ref.read(_matchesProvider.notifier).load(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: state.items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _MatchCard(
                          match: state.items[i],
                          onAccept: () => ref.read(_matchesProvider.notifier).accept(state.items[i].id),
                          onReject: () => ref.read(_matchesProvider.notifier).reject(state.items[i].id),
                        ),
                      ),
                    ),
        ),
      ]),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.inbox_outlined, color: AppColors.textMuted, size: 48),
      SizedBox(height: 12),
      Text('Không có yêu cầu nào', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
      SizedBox(height: 6),
      Text('Bật trạng thái online để nhận chuyến', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
    ]),
  );
}

// ── Match card with countdown ─────────────────────────────────────────────────

class _MatchCard extends StatefulWidget {
  const _MatchCard({required this.match, required this.onAccept, required this.onReject});
  final TripMatch    match;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  @override
  State<_MatchCard> createState() => _MatchCardState();
}

class _MatchCardState extends State<_MatchCard> {
  late Duration _timeLeft;
  Timer? _timer;
  bool _accepting = false;
  bool _rejecting = false;

  @override
  void initState() {
    super.initState();
    _timeLeft = widget.match.timeLeft;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _timeLeft = widget.match.timeLeft);
    });
  }

  @override
  void dispose() { _timer?.cancel(); super.dispose(); }

  String _fmtDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Color get _timerColor {
    if (_timeLeft.inSeconds > 60) return AppColors.success;
    if (_timeLeft.inSeconds > 20) return AppColors.warning;
    return AppColors.danger;
  }

  @override
  Widget build(BuildContext context) {
    final m   = widget.match;
    final req = m.request;

    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Timer + fare
        Row(children: [
          _TimerBadge(label: _fmtDuration(_timeLeft), color: _timerColor),
          const Spacer(),
          Text(_vnd.format(m.fareShare),
            style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w800, fontSize: 18)),
        ]),
        const SizedBox(height: 12),
        const Divider(color: AppColors.borderSubtle, height: 1),
        const SizedBox(height: 12),

        // Route
        if (req != null) ...[
          _RouteRow(pickup: req.pickupAddress, dropoff: req.dropoffAddress),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 4, children: [
            _InfoTag(Icons.people_outline_rounded, '${req.seats} ghế', AppColors.info),
            _InfoTag(Icons.access_time_rounded,
              '${req.departureTime.hour.toString().padLeft(2,'0')}:${req.departureTime.minute.toString().padLeft(2,'0')} '
              '${req.departureTime.day}/${req.departureTime.month}',
              AppColors.textMuted),
            _InfoTag(Icons.alt_route_rounded, 'Đường vòng ${m.detourKm.toStringAsFixed(1)} km', AppColors.warning),
          ]),
          const SizedBox(height: 14),
        ],

        // Buttons
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: (_accepting || _rejecting) ? null : () async {
                setState(() => _rejecting = true);
                widget.onReject();
                if (mounted) setState(() => _rejecting = false);
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
              ),
              child: _rejecting
                  ? const SizedBox(width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.danger))
                  : const Text('Từ chối'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: (_accepting || _rejecting) ? null : () async {
                setState(() => _accepting = true);
                widget.onAccept();
                if (mounted) setState(() => _accepting = false);
              },
              child: _accepting
                  ? const SizedBox(width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Chấp nhận'),
            ),
          ),
        ]),
      ]),
    );
  }
}

class _TimerBadge extends StatelessWidget {
  const _TimerBadge({required this.label, required this.color});
  final String label;
  final Color  color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: color.withValues(alpha: 0.3)),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.timer_outlined, color: color, size: 14),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
    ]),
  );
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.pickup, required this.dropoff});
  final String pickup;
  final String dropoff;

  @override
  Widget build(BuildContext context) => Row(children: [
    Column(children: [
      Container(width: 10, height: 10,
        decoration: const BoxDecoration(color: AppColors.info, shape: BoxShape.circle)),
      Container(width: 2, height: 28, color: AppColors.borderMedium),
      Container(width: 10, height: 10,
        decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle)),
    ]),
    const SizedBox(width: 10),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(pickup,  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
        maxLines: 1, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 14),
      Text(dropoff, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
        maxLines: 1, overflow: TextOverflow.ellipsis),
    ])),
  ]);
}

class _InfoTag extends StatelessWidget {
  const _InfoTag(this.icon, this.label, this.color);
  final IconData icon;
  final String   label;
  final Color    color;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 13, color: color),
    const SizedBox(width: 4),
    Text(label, style: TextStyle(color: color, fontSize: 12)),
  ]);
}

class _ErrBanner extends StatelessWidget {
  const _ErrBanner(this.msg, {required this.onRetry});
  final String msg;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.all(16),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.danger.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
    ),
    child: Row(children: [
      const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(msg, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
      TextButton(onPressed: onRetry,
        child: const Text('Thử lại', style: TextStyle(color: AppColors.danger, fontSize: 12))),
    ]),
  );
}

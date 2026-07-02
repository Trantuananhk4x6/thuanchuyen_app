import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/geocoding_service.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/api/api_client.dart';
import '../../../auth/providers/auth_provider.dart';

// ── Models ────────────────────────────────────────────────────────────────────

class DriverRoute {
  const DriverRoute({
    required this.id,
    required this.originName,
    required this.destName,
    required this.originLat,
    required this.originLng,
    required this.destLat,
    required this.destLng,
    required this.status,
    required this.acceptsCargo,
  });

  final String id;
  final String originName;
  final String destName;
  final double originLat;
  final double originLng;
  final double destLat;
  final double destLng;
  final String status;
  final bool   acceptsCargo;

  factory DriverRoute.fromJson(Map<String, dynamic> j) => DriverRoute(
    id:           j['id'],
    originName:   j['originName'] ?? '',
    destName:     j['destName']   ?? '',
    originLat:    (j['originLat'] as num).toDouble(),
    originLng:    (j['originLng'] as num).toDouble(),
    destLat:      (j['destLat']   as num).toDouble(),
    destLng:      (j['destLng']   as num).toDouble(),
    status:       j['status']    ?? 'PAUSED',
    acceptsCargo: j['acceptsCargo'] ?? false,
  );

  bool get isActive => status == 'ACTIVE';
}

// PlaceSuggestion is defined in geocoding_service.dart

// ── Provider ─────────────────────────────────────────────────────────────────

class _RoutesState {
  const _RoutesState({this.routes = const [], this.loading = true, this.error = ''});
  final List<DriverRoute> routes;
  final bool   loading;
  final String error;
  _RoutesState copyWith({List<DriverRoute>? routes, bool? loading, String? error}) =>
    _RoutesState(routes: routes ?? this.routes, loading: loading ?? this.loading, error: error ?? this.error);
}

class _RoutesNotifier extends StateNotifier<_RoutesState> {
  _RoutesNotifier(this._api) : super(const _RoutesState()) { _load(); }
  final ApiClient _api;

  Future<void> _load() async {
    state = state.copyWith(loading: true, error: '');
    try {
      final res = await _api.get<List<DriverRoute>>(
        '/driver/routes',
        fromJson: (d) => (d as List).map((e) => DriverRoute.fromJson(e as Map<String, dynamic>)).toList(),
      );
      state = state.copyWith(routes: res, loading: false);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Không tải được tuyến đường');
    }
  }

  Future<void> toggle(String id, bool active) async {
    try {
      await _api.patch('/driver/routes/$id', data: {'status': active ? 'ACTIVE' : 'PAUSED'});
      _load();
    } catch (_) {
      state = state.copyWith(error: 'Không thể thay đổi trạng thái tuyến');
    }
  }

  Future<void> addRoute({
    required String originName, required double originLat, required double originLng,
    required String destName,   required double destLat,   required double destLng,
    required bool acceptsCargo,
  }) async {
    try {
      await _api.post('/driver/routes', data: {
        'originName': originName, 'originLat': originLat, 'originLng': originLng,
        'destName':   destName,   'destLat':   destLat,   'destLng':   destLng,
        'acceptsCargo': acceptsCargo,
      });
      _load();
    } catch (e) {
      state = state.copyWith(error: 'Không thêm được tuyến. Thử lại sau.');
    }
  }

  void reload() => _load();
}

final _routesProvider = StateNotifierProvider.autoDispose<_RoutesNotifier, _RoutesState>(
  (ref) => _RoutesNotifier(ref.read(apiClientProvider)),
);

// ── Screen ────────────────────────────────────────────────────────────────────

class DriverRoutesScreen extends ConsumerStatefulWidget {
  const DriverRoutesScreen({super.key});

  @override
  ConsumerState<DriverRoutesScreen> createState() => _DriverRoutesScreenState();
}

class _DriverRoutesScreenState extends ConsumerState<DriverRoutesScreen> {
  bool _showForm = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(_routesProvider);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Tuyến đường'),
        actions: [
          IconButton(
            icon: Icon(_showForm ? Icons.close : Icons.add_rounded, color: AppColors.primary),
            onPressed: () => setState(() => _showForm = !_showForm),
          ),
        ],
      ),
      body: Column(children: [
        if (state.error.isNotEmpty)
          _ErrBanner(state.error, onRetry: () => ref.read(_routesProvider.notifier).reload()),

        if (_showForm)
          _AddRouteForm(onSubmit: (o, oLat, oLng, d, dLat, dLng, cargo) async {
            await ref.read(_routesProvider.notifier).addRoute(
              originName: o, originLat: oLat, originLng: oLng,
              destName: d, destLat: dLat, destLng: dLng,
              acceptsCargo: cargo,
            );
            setState(() => _showForm = false);
          }),

        Expanded(
          child: state.loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
              : state.routes.isEmpty
                  ? _emptyState()
                  : RefreshIndicator(
                      color: AppColors.primary,
                      backgroundColor: AppColors.bgSurface,
                      onRefresh: () async => ref.read(_routesProvider.notifier).reload(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: state.routes.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => _RouteCard(
                          route: state.routes[i],
                          onToggle: (v) => ref.read(_routesProvider.notifier).toggle(state.routes[i].id, v),
                        ),
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _emptyState() => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.route_rounded, color: AppColors.textMuted, size: 48),
      const SizedBox(height: 12),
      const Text('Chưa có tuyến đường nào', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      ElevatedButton.icon(
        onPressed: () => setState(() => _showForm = true),
        icon: const Icon(Icons.add_rounded, size: 18),
        label: const Text('Thêm tuyến đầu tiên'),
      ),
    ]),
  );
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({required this.route, required this.onToggle});
  final DriverRoute route;
  final void Function(bool) onToggle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: route.isActive ? AppColors.primary.withValues(alpha: 0.3) : AppColors.borderSubtle),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.trip_origin, size: 12, color: AppColors.info),
            const SizedBox(width: 6),
            Expanded(child: Text(route.originName, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 14), overflow: TextOverflow.ellipsis)),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.location_on_rounded, size: 12, color: AppColors.danger),
            const SizedBox(width: 6),
            Expanded(child: Text(route.destName, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 14), overflow: TextOverflow.ellipsis)),
          ]),
          if (route.acceptsCargo) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
              ),
              child: const Text('Nhận hàng', style: TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
          ],
        ])),
        const SizedBox(width: 12),
        Switch.adaptive(
          value: route.isActive,
          onChanged: onToggle,
          activeThumbColor: AppColors.primary,
        ),
      ]),
    );
  }
}

// ── Add route form ─────────────────────────────────────────────────────────────

typedef _SubmitRoute = Future<void> Function(
  String originName, double originLat, double originLng,
  String destName,   double destLat,   double destLng,
  bool acceptsCargo,
);

class _AddRouteForm extends StatefulWidget {
  const _AddRouteForm({required this.onSubmit});
  final _SubmitRoute onSubmit;

  @override
  State<_AddRouteForm> createState() => _AddRouteFormState();
}

class _AddRouteFormState extends State<_AddRouteForm> {
  final _originCtrl = TextEditingController();
  final _destCtrl   = TextEditingController();

  double? _oLat, _oLng, _dLat, _dLng;
  bool _cargo = false;
  bool _loading = false;
  String _error = '';

  @override
  void dispose() { _originCtrl.dispose(); _destCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_oLat == null || _dLat == null) {
      setState(() => _error = 'Chọn địa điểm từ gợi ý bên dưới');
      return;
    }
    setState(() { _loading = true; _error = ''; });
    try {
      await widget.onSubmit(
        _originCtrl.text, _oLat!, _oLng!,
        _destCtrl.text,   _dLat!, _dLng!,
        _cargo,
      );
    } catch (_) {
      setState(() { _error = 'Không lưu được tuyến đường.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderMedium),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Thêm tuyến mới', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 16),

        _PlaceField(
          controller: _originCtrl,
          label: 'Điểm xuất phát',
          icon: Icons.trip_origin,
          color: AppColors.info,
          onSelect: (lat, lng, name) => setState(() { _oLat = lat; _oLng = lng; _originCtrl.text = name; }),
        ),
        const SizedBox(height: 12),
        _PlaceField(
          controller: _destCtrl,
          label: 'Điểm đến',
          icon: Icons.location_on_rounded,
          color: AppColors.danger,
          onSelect: (lat, lng, name) => setState(() { _dLat = lat; _dLng = lng; _destCtrl.text = name; }),
        ),
        const SizedBox(height: 12),

        Row(children: [
          Switch.adaptive(value: _cargo, onChanged: (v) => setState(() => _cargo = v), activeThumbColor: AppColors.primary),
          const SizedBox(width: 8),
          const Text('Nhận vận chuyển hàng hóa', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        ]),

        if (_error.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
        ],

        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Lưu tuyến đường'),
          ),
        ),
      ]),
    );
  }
}

class _PlaceField extends StatefulWidget {
  const _PlaceField({required this.controller, required this.label, required this.icon, required this.color, required this.onSelect});
  final TextEditingController controller;
  final String   label;
  final IconData icon;
  final Color    color;
  final void Function(double lat, double lng, String name) onSelect;

  @override
  State<_PlaceField> createState() => _PlaceFieldState();
}

class _PlaceFieldState extends State<_PlaceField> {
  List<PlaceSuggestion> _suggestions = [];

  Future<void> _search(String q) async {
    if (q.length < 3) { setState(() => _suggestions = []); return; }
    final results = await GeocodingService.instance.search(q);
    if (mounted) setState(() => _suggestions = results);
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
          suffixIcon: widget.controller.text.isNotEmpty
              ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () {
                  widget.controller.clear(); setState(() => _suggestions = []);
                })
              : null,
        ),
        onChanged: _search,
      ),
      if (_suggestions.isNotEmpty)
        Container(
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            color: AppColors.bgOverlay,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            children: _suggestions.map((s) => ListTile(
              dense: true,
              leading: Icon(Icons.place_outlined, size: 16, color: widget.color),
              title: Text(s.name, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
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

class _ErrBanner extends StatelessWidget {
  const _ErrBanner(this.msg, {required this.onRetry});
  final String msg;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.all(16),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.danger.withValues(alpha: 0.3))),
    child: Row(children: [
      const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(msg, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
      TextButton(onPressed: onRetry, child: const Text('Thử lại', style: TextStyle(color: AppColors.danger, fontSize: 12))),
    ]),
  );
}

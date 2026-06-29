import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/trip.dart';
import '../../../../data/repositories/trip_repository.dart';
import '../../../auth/providers/auth_provider.dart';

final tripRepositoryProvider = Provider<TripRepository>(
  (ref) => TripRepository(ref.read(apiClientProvider)),
);

// ── Trip list provider ────────────────────────────────────────────────────────

class TripsState {
  const TripsState({
    this.items  = const [],
    this.total  = 0,
    this.status = '',
    this.loading = true,
    this.error  = '',
  });

  final List<Trip> items;
  final int        total;
  final String     status;
  final bool       loading;
  final String     error;

  TripsState copyWith({
    List<Trip>? items,
    int?        total,
    String?     status,
    bool?       loading,
    String?     error,
  }) => TripsState(
    items:   items   ?? this.items,
    total:   total   ?? this.total,
    status:  status  ?? this.status,
    loading: loading ?? this.loading,
    error:   error   ?? this.error,
  );
}

class CustomerTripsNotifier extends StateNotifier<TripsState> {
  CustomerTripsNotifier(this._repo) : super(const TripsState()) {
    load();
  }

  final TripRepository _repo;

  Future<void> load({String? status}) async {
    state = state.copyWith(loading: true, error: '', status: status ?? state.status);
    try {
      final res = await _repo.getCustomerTrips(status: state.status);
      state = state.copyWith(items: res.items, total: res.total, loading: false);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Không tải được danh sách chuyến');
    }
  }

  void setStatus(String s) => load(status: s);
}

final customerTripsProvider = StateNotifierProvider.autoDispose<CustomerTripsNotifier, TripsState>(
  (ref) => CustomerTripsNotifier(ref.read(tripRepositoryProvider)),
);

// ── Single trip provider ──────────────────────────────────────────────────────

final tripDetailProvider = FutureProvider.autoDispose.family<Trip, String>(
  (ref, id) => ref.read(tripRepositoryProvider).getTrip(id),
);

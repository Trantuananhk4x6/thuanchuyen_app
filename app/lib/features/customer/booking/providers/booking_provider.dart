import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../data/api/api_client.dart';
import '../../../../data/models/trip_request.dart';
import '../../../../data/repositories/customer_repository.dart';
import '../../../auth/providers/auth_provider.dart';

final customerRepositoryProvider = Provider<CustomerRepository>(
  (ref) => CustomerRepository(ref.read(apiClientProvider)),
);

// ── Booking state ──────────────────────────────────────────────────────────────

class BookingState {
  const BookingState({
    this.pickupAddress  = '',
    this.pickupLat      = 0,
    this.pickupLng      = 0,
    this.dropoffAddress = '',
    this.dropoffLat     = 0,
    this.dropoffLng     = 0,
    this.seats          = 1,
    this.departureTime,
    this.quote,
    this.loading        = false,
    this.error          = '',
    this.booked,
  });

  final String         pickupAddress;
  final double         pickupLat;
  final double         pickupLng;
  final String         dropoffAddress;
  final double         dropoffLat;
  final double         dropoffLng;
  final int            seats;
  final DateTime?      departureTime;
  final QuoteResponse? quote;
  final bool           loading;
  final String         error;
  final TripRequest?   booked;

  bool get hasPickup  => pickupAddress.isNotEmpty && pickupLat != 0;
  bool get hasDropoff => dropoffAddress.isNotEmpty && dropoffLat != 0;
  bool get canQuote   => hasPickup && hasDropoff && departureTime != null;

  BookingState copyWith({
    String?         pickupAddress,
    double?         pickupLat,
    double?         pickupLng,
    String?         dropoffAddress,
    double?         dropoffLat,
    double?         dropoffLng,
    int?            seats,
    DateTime?       departureTime,
    QuoteResponse?  quote,
    bool?           loading,
    String?         error,
    TripRequest?    booked,
    bool            clearQuote = false,
    bool            clearBooked = false,
  }) => BookingState(
    pickupAddress:  pickupAddress  ?? this.pickupAddress,
    pickupLat:      pickupLat      ?? this.pickupLat,
    pickupLng:      pickupLng      ?? this.pickupLng,
    dropoffAddress: dropoffAddress ?? this.dropoffAddress,
    dropoffLat:     dropoffLat     ?? this.dropoffLat,
    dropoffLng:     dropoffLng     ?? this.dropoffLng,
    seats:          seats          ?? this.seats,
    departureTime:  departureTime  ?? this.departureTime,
    quote:          clearQuote  ? null : (quote ?? this.quote),
    loading:        loading        ?? this.loading,
    error:          error          ?? this.error,
    booked:         clearBooked ? null : (booked ?? this.booked),
  );
}

class BookingNotifier extends StateNotifier<BookingState> {
  BookingNotifier(this._repo) : super(const BookingState());
  final CustomerRepository _repo;

  void setPickup(String address, double lat, double lng) =>
      state = state.copyWith(pickupAddress: address, pickupLat: lat, pickupLng: lng, clearQuote: true);

  void setDropoff(String address, double lat, double lng) =>
      state = state.copyWith(dropoffAddress: address, dropoffLat: lat, dropoffLng: lng, clearQuote: true);

  void setSeats(int seats) =>
      state = state.copyWith(seats: seats, clearQuote: true);

  void setDepartureTime(DateTime dt) =>
      state = state.copyWith(departureTime: dt, clearQuote: true);

  Future<void> getQuote() async {
    if (!state.canQuote) return;
    state = state.copyWith(loading: true, error: '', clearQuote: true);
    try {
      final q = await _repo.getQuote(
        pickupLat:     state.pickupLat,
        pickupLng:     state.pickupLng,
        dropoffLat:    state.dropoffLat,
        dropoffLng:    state.dropoffLng,
        departureTime: state.departureTime!,
        seats:         state.seats,
      );
      state = state.copyWith(quote: q, loading: false);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Không lấy được báo giá. Thử lại sau.');
    }
  }

  Future<void> confirmBooking() async {
    final q = state.quote;
    if (q == null) return;
    state = state.copyWith(loading: true, error: '');
    try {
      final req = await _repo.createTripRequest(
        pickupAddress:  state.pickupAddress,
        pickupLat:      state.pickupLat,
        pickupLng:      state.pickupLng,
        dropoffAddress: state.dropoffAddress,
        dropoffLat:     state.dropoffLat,
        dropoffLng:     state.dropoffLng,
        departureTime:  state.departureTime!,
        seats:          state.seats,
        quotedPrice:    q.quotedPrice,
        distanceKm:     q.distanceKm,
        durationMin:    q.durationMin,
      );
      state = state.copyWith(booked: req, loading: false);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Đặt chuyến thất bại. Thử lại sau.');
    }
  }

  void reset() => state = const BookingState();
}

final bookingProvider = StateNotifierProvider.autoDispose<BookingNotifier, BookingState>(
  (ref) => BookingNotifier(ref.read(customerRepositoryProvider)),
);

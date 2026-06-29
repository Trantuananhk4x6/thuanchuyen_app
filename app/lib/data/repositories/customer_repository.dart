import '../api/api_client.dart';
import '../models/trip_request.dart';
import '../models/payment.dart';

class CustomerRepository {
  CustomerRepository(this._api);
  final ApiClient _api;

  Future<QuoteResponse> getQuote({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required DateTime departureTime,
    required int seats,
    double? cargoWeightKg,
  }) {
    return _api.post(
      '/customer/quote',
      data: {
        'pickupLat':    pickupLat,
        'pickupLng':    pickupLng,
        'dropoffLat':   dropoffLat,
        'dropoffLng':   dropoffLng,
        'departureTime': departureTime.toIso8601String(),
        'seats':        seats,
        if (cargoWeightKg != null) 'cargoWeightKg': cargoWeightKg,
      },
      fromJson: (d) => QuoteResponse.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<TripRequest> createTripRequest({
    required String   pickupAddress,
    required double   pickupLat,
    required double   pickupLng,
    required String   dropoffAddress,
    required double   dropoffLat,
    required double   dropoffLng,
    required DateTime departureTime,
    required int      seats,
    required int      quotedPrice,
    required double   distanceKm,
    required int      durationMin,
    String?  note,
    double?  cargoWeightKg,
  }) {
    return _api.post(
      '/customer/trip-requests',
      data: {
        'pickupAddress':  pickupAddress,
        'pickupLat':      pickupLat,
        'pickupLng':      pickupLng,
        'dropoffAddress': dropoffAddress,
        'dropoffLat':     dropoffLat,
        'dropoffLng':     dropoffLng,
        'departureTime':  departureTime.toIso8601String(),
        'seats':          seats,
        'quotedPrice':    quotedPrice,
        'distanceKm':     distanceKm,
        'durationMin':    durationMin,
        if (note != null)          'note':          note,
        if (cargoWeightKg != null) 'cargoWeightKg': cargoWeightKg,
      },
      fromJson: (d) => TripRequest.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<TripRequest> getTripRequest(String id) {
    return _api.get(
      '/customer/trip-requests/$id',
      fromJson: (d) => TripRequest.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<void> confirmComplete(String tripId) {
    return _api.post('/customer/trips/$tripId/confirm-complete', data: {});
  }

  Future<Payment> getPayment(String id) {
    return _api.get(
      '/customer/payments/$id',
      fromJson: (d) => Payment.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<void> submitRating({
    required String tripId,
    required int    stars,
    String? comment,
  }) {
    return _api.post('/customer/ratings', data: {
      'tripId':  tripId,
      'stars':   stars,
      if (comment != null) 'comment': comment,
    });
  }

  Future<void> report({
    required String reportedUserId,
    required String reason,
    required String description,
    String? tripId,
  }) {
    return _api.post('/customer/reports', data: {
      'reportedUserId': reportedUserId,
      'reason':         reason,
      'description':    description,
      if (tripId != null) 'tripId': tripId,
    });
  }
}

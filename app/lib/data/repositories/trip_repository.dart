import '../api/api_client.dart';
import '../models/trip.dart';
import '../models/trip_detail.dart';
import '../../core/constants/api.dart';

class TripRepository {
  TripRepository(this._api);
  final ApiClient _api;

  Future<TripListResponse> getCustomerTrips({String? status, int page = 1}) {
    return _api.get(
      ApiConstants.customerTrips,
      queryParameters: {
        'page': page,
        'limit': 20,
        if (status != null && status.isNotEmpty) 'status': status,
      },
      fromJson: (d) => TripListResponse.fromJson(d as Map<String, dynamic>),
    );
  }

  /// GET /customer/trips/{id} → {trip, stops, driverProfile, ...}
  Future<TripDetail> getCustomerTripDetail(String id) {
    return _api.get(
      ApiConstants.path(ApiConstants.customerTripDetail, {'id': id}),
      fromJson: (d) => TripDetail.fromJson(d as Map<String, dynamic>),
    );
  }

  /// GET /customer/trips/{id}/driver-location → {status, location:{lat,lng,updatedAt}|null}
  Future<DriverLocation> getDriverLocation(String tripId) {
    return _api.get(
      ApiConstants.path(ApiConstants.customerDriverLocation, {'id': tripId}),
      fromJson: (d) => DriverLocation.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<void> cancelTrip(String id) {
    return _api.post(
      ApiConstants.path(ApiConstants.customerTripCancel, {'id': id}),
      data: {},
    );
  }

  Future<void> rateTrip(String id, {required int stars, String? comment}) {
    return _api.post(
      ApiConstants.path(ApiConstants.customerRating, {'id': id}),
      data: {'stars': stars, if (comment != null) 'comment': comment},
    );
  }

  Future<TripListResponse> getDriverTrips({String? status, int page = 1}) {
    return _api.get(
      ApiConstants.driverTrips,
      queryParameters: {
        'page': page,
        'limit': 20,
        if (status != null && status.isNotEmpty) 'status': status,
      },
      fromJson: (d) => TripListResponse.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<Trip> startTrip(String id) {
    return _api.post(
      '/driver/trips/$id/start',
      data: {},
      fromJson: (d) => Trip.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<Trip> completeTrip(String id) {
    return _api.post(
      '/driver/trips/$id/complete',
      data: {},
      fromJson: (d) => Trip.fromJson(d as Map<String, dynamic>),
    );
  }
}

import 'package:dio/dio.dart';
import '../api/api_client.dart';
import '../../core/constants/api.dart';
import '../models/driver_profile.dart';
import '../models/kyc_status.dart';
import '../models/match.dart';
import '../models/trip.dart';
import '../models/trip_stop.dart';
import '../models/wallet.dart';

class DriverRepository {
  DriverRepository(this._api);
  final ApiClient _api;

  // ── Profile & Availability ─────────────────────────────────────────────────

  Future<DriverProfileFull> getProfile() {
    return _api.get(
      '/driver/profile',
      fromJson: (d) => DriverProfileFull.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<void> setAvailability(bool isOnline) {
    return _api.patch('/driver/availability', data: {'isOnline': isOnline});
  }

  // ── Matches ────────────────────────────────────────────────────────────────

  Future<List<TripMatch>> getMatches() {
    return _api.get(
      '/driver/matches',
      fromJson: (d) => (d as List)
          .map((e) => TripMatch.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<void> acceptMatch(String matchId) {
    return _api.post('/driver/matches/$matchId/accept', data: {});
  }

  Future<void> rejectMatch(String matchId) {
    return _api.post('/driver/matches/$matchId/reject', data: {});
  }

  // ── Active Trip ────────────────────────────────────────────────────────────

  Future<Trip?> getActiveTrip() async {
    try {
      return await _api.get(
        '/driver/trips/active',
        fromJson: (d) => Trip.fromJson(d as Map<String, dynamic>),
      );
    } on ApiException catch (e) {
      if (e.isNotFound) return null;
      rethrow;
    }
  }

  Future<List<TripStop>> getTripStops(String tripId) {
    return _api.get(
      '/driver/trips/$tripId',
      fromJson: (d) {
        final stops = (d as Map<String, dynamic>)['stops'] as List? ?? [];
        return stops
            .map((e) => TripStop.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }

  Future<void> updateLocation(String tripId, {required double lat, required double lng}) {
    return _api.patch(ApiConstants.driverLocation, data: {'lat': lat, 'lng': lng});
  }

  Future<void> startTrip(String tripId) {
    return _api.post('/driver/trips/$tripId/start', data: {});
  }

  Future<void> completeTrip(String tripId) {
    return _api.post('/driver/trips/$tripId/complete', data: {});
  }

  Future<void> optimizeRoute(String tripId) {
    return _api.post('/driver/trips/$tripId/optimize', data: {});
  }

  Future<void> completeStop(String tripId, String stopId) {
    return _api.post('/driver/trips/$tripId/stops/$stopId/complete', data: {});
  }

  Future<void> noShowStop(String tripId, String stopId) {
    return _api.post('/driver/trips/$tripId/stops/$stopId/no-show', data: {});
  }

  // ── Wallet ─────────────────────────────────────────────────────────────────

  Future<DriverWallet> getWallet() {
    return _api.get(
      '/driver/wallet',
      fromJson: (d) => DriverWallet.fromJson(d as Map<String, dynamic>),
    );
  }

  Future<List<WalletTransaction>> getEarnings({int page = 1}) {
    return _api.get(
      '/driver/earnings',
      queryParameters: {'page': page, 'limit': 30},
      fromJson: (d) {
        final list = d is List ? d : (d as Map<String, dynamic>)['items'] as List? ?? [];
        return (list)
            .map((e) => WalletTransaction.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }

  Future<List<WithdrawalRequest>> getWithdrawals() {
    return _api.get(
      '/driver/withdrawals',
      fromJson: (d) => (d as List)
          .map((e) => WithdrawalRequest.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<WithdrawalRequest> requestWithdrawal({
    required int    amount,
    required String bankName,
    required String bankAccountNo,
    required String bankAccountName,
  }) {
    return _api.post(
      '/driver/withdrawals',
      data: {
        'amount':          amount,
        'bankName':        bankName,
        'bankAccountNo':   bankAccountNo,
        'bankAccountName': bankAccountName,
      },
      fromJson: (d) => WithdrawalRequest.fromJson(d as Map<String, dynamic>),
    );
  }

  // ── KYC ───────────────────────────────────────────────────────────────────

  /// Trạng thái hồ sơ hiện tại — trả null nếu tài xế chưa có hồ sơ (404).
  Future<KycStatus?> getKyc() async {
    try {
      return await _api.get(
        ApiConstants.driverKyc,
        fromJson: (d) => KycStatus.fromJson(d as Map<String, dynamic>),
      );
    } on ApiException catch (e) {
      if (e.isNotFound) return null;
      rethrow;
    }
  }

  /// Upload 1 ảnh giấy tờ (multipart) → trả về { path, url(signed) }.
  Future<KycUploadResult> uploadKycImage({
    required String filePath,
    required String docType,
  }) async {
    final form = FormData.fromMap({
      'type': docType,
      'file': await MultipartFile.fromFile(
        filePath,
        filename: '$docType.jpg',
      ),
    });
    // BaseOptions ép Content-Type: application/json nên Dio không tự gắn
    // multipart boundary — phải set thủ công kèm boundary của FormData.
    return _api.post(
      '/driver/kyc/upload',
      data: form,
      options: Options(contentType: 'multipart/form-data; boundary=${form.boundary}'),
      fromJson: (d) => KycUploadResult.fromJson(d as Map<String, dynamic>),
    );
  }

  /// Nộp hồ sơ KYC kèm danh sách giấy tờ đã upload ([{type, url}]).
  Future<void> submitKyc({
    required String vehicleType,
    required String vehiclePlate,
    required int    seats,
    required String cccdNumber,
    required String address,
    bool    allowCargo = false,
    double? cargoCapacityKg,
    List<Map<String, String>> documents = const [],
  }) {
    return _api.post('/driver/kyc', data: {
      'vehicleType':  vehicleType,
      'vehiclePlate': vehiclePlate,
      'seats':        seats,
      'cccdNumber':   cccdNumber,
      'address':      address,
      'allowCargo':   allowCargo,
      if (cargoCapacityKg != null) 'cargoCapacityKg': cargoCapacityKg,
      if (documents.isNotEmpty) 'documents': documents,
    });
  }
}

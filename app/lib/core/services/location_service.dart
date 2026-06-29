import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:thuanduong_app/data/api/api_client.dart';
import 'package:thuanduong_app/core/constants/api.dart';

/// Sends driver GPS coordinates to the backend on a fixed interval while active.
class DriverLocationService {
  DriverLocationService({required ApiClient api}) : _api = api;

  final ApiClient _api;
  Timer? _timer;
  bool _running = false;

  Future<void> start() async {
    if (_running) return;

    // Request permission once
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever ||
        perm == LocationPermission.denied) {
      return;
    }

    _running = true;
    _sendLocation(); // immediate first push
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _sendLocation());
  }

  void stop() {
    _running = false;
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _sendLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      await _api.patch(
        ApiConstants.driverLocation,
        data: {'lat': pos.latitude, 'lng': pos.longitude},
        fromJson: (_) {},
      );
    } catch (_) {
      // Silently ignore — GPS or network failures are transient
    }
  }
}

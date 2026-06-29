import 'package:dio/dio.dart';

class PlaceSuggestion {
  const PlaceSuggestion({required this.name, required this.lat, required this.lng});
  final String name;
  final double lat;
  final double lng;
}

class GeocodingService {
  GeocodingService._();
  static final GeocodingService instance = GeocodingService._();

  final _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'User-Agent': 'ThuanDuong/1.0 Flutter'},
  ));

  Future<List<PlaceSuggestion>> search(String query) async {
    if (query.trim().length < 3) return [];
    try {
      final res = await _dio.get<List<dynamic>>(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {
          'q': '$query, Việt Nam',
          'format': 'json',
          'limit': '5',
          'accept-language': 'vi',
        },
      );
      return (res.data ?? []).map((e) {
        final m = e as Map<String, dynamic>;
        return PlaceSuggestion(
          name: m['display_name'] as String? ?? '',
          lat: double.parse(m['lat'] as String),
          lng: double.parse(m['lon'] as String),
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }
}

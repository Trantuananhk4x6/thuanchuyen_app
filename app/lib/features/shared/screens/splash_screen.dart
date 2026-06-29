import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.bgDark,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Logo(),
            SizedBox(height: 24),
            SizedBox(
              width: 24, height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 72, height: 72,
        decoration: BoxDecoration(
          gradient: AppColors.gradPrimary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(Icons.directions_car_rounded, color: Colors.white, size: 36),
      ),
      const SizedBox(height: 16),
      const Text(
        'Thuận Đường',
        style: TextStyle(
          fontSize: 26, fontWeight: FontWeight.w800,
          color: AppColors.textPrimary, letterSpacing: -0.5,
        ),
      ),
      const SizedBox(height: 4),
      const Text(
        'Ghép chuyến xe liên tỉnh',
        style: TextStyle(fontSize: 14, color: AppColors.textMuted),
      ),
    ]);
  }
}

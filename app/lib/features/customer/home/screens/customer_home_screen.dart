import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/top_nav_bar.dart';

class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  static const _tabs = [
    TopNavItem(
      icon: Icons.search_rounded,
      selectedIcon: Icons.search_rounded,
      label: 'Đặt chuyến',
    ),
    TopNavItem(
      icon: Icons.directions_car_outlined,
      selectedIcon: Icons.directions_car_rounded,
      label: 'Chuyến đi',
    ),
    TopNavItem(
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
      label: 'Cá nhân',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: Column(
        children: [
          // Điều hướng ở TRÊN (thay cho bottom nav)
          TopNavBar(
            items: _tabs,
            currentIndex: navigationShell.currentIndex,
            onSelect: (i) => navigationShell.goBranch(
              i,
              initialLocation: i == navigationShell.currentIndex,
            ),
          ),
          // Bỏ inset top thừa để AppBar màn con không bị đẩy xuống
          Expanded(
            child: MediaQuery.removePadding(
              context: context,
              removeTop: true,
              child: navigationShell,
            ),
          ),
        ],
      ),
    );
  }
}

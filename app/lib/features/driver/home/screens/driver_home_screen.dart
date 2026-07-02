import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/top_nav_bar.dart';

class DriverHomeScreen extends StatelessWidget {
  const DriverHomeScreen({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  static const _tabs = [
    TopNavItem(
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard_rounded,
      label: 'Trang chủ',
    ),
    TopNavItem(
      icon: Icons.history_rounded,
      selectedIcon: Icons.history_rounded,
      label: 'Chuyến đi',
    ),
    TopNavItem(
      icon: Icons.route_outlined,
      selectedIcon: Icons.route_rounded,
      label: 'Tuyến đường',
    ),
    TopNavItem(
      icon: Icons.account_balance_wallet_outlined,
      selectedIcon: Icons.account_balance_wallet_rounded,
      label: 'Ví',
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

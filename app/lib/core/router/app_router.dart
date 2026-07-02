import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/shared/screens/splash_screen.dart';
import '../../features/shared/screens/profile_screen.dart';

// Customer
import '../../features/customer/home/screens/customer_home_screen.dart';
import '../../features/customer/booking/screens/booking_screen.dart';
import '../../features/customer/trips/screens/customer_trips_screen.dart';
import '../../features/customer/trips/screens/trip_detail_screen.dart';
import '../../features/customer/trips/screens/live_tracking_screen.dart';

// Driver
import '../../features/driver/home/screens/driver_home_screen.dart';
import '../../features/driver/dashboard/screens/driver_dashboard_screen.dart';
import '../../features/driver/matches/screens/driver_matches_screen.dart';
import '../../features/driver/active_trip/screens/active_trip_screen.dart';
import '../../features/driver/trips/screens/driver_trips_screen.dart';
import '../../features/driver/routes/screens/driver_routes_screen.dart';
import '../../features/driver/wallet/screens/driver_wallet_screen.dart';
import '../../features/driver/kyc/screens/kyc_screen.dart';

// ── Route paths ───────────────────────────────────────────────────────────────

abstract class Routes {
  // Auth
  static const splash  = '/';
  static const login   = '/login';

  // Customer branches (StatefulShellRoute)
  static const customerHome    = '/customer/home';
  static const customerTrips   = '/customer/trips';
  static const customerProfile = '/customer/profile';

  // Customer standalone (push on top of shell)
  static const tripDetail = '/customer/trips/:id';

  // Driver branches (StatefulShellRoute)
  static const driverDashboard = '/driver/home';
  static const driverTrips     = '/driver/trips';
  static const driverRoutes    = '/driver/routes';
  static const driverWallet    = '/driver/wallet';

  // Driver standalone
  static const driverMatches   = '/driver/matches';
  static const driverActive    = '/driver/active';
  static const driverKyc       = '/driver/kyc';
}

// ── Router provider ───────────────────────────────────────────────────────────

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: Routes.splash,
    redirect: (context, state) {
      final loc = state.matchedLocation;

      // Still checking auth — stay on splash
      if (auth is AuthLoading) {
        return loc == Routes.splash ? null : Routes.splash;
      }

      // Auth check done, not logged in — go to login
      if (auth is AuthInitial) {
        return loc == Routes.login ? null : Routes.login;
      }

      // Authenticated — redirect away from login/splash
      if (auth is AuthAuthenticated) {
        if (loc == Routes.splash || loc == Routes.login || loc == '/') {
          return auth.user.isDriver ? Routes.driverDashboard : Routes.customerHome;
        }
        // Block driver from customer routes and vice versa
        if (auth.user.isDriver && loc.startsWith('/customer/')) {
          return Routes.driverDashboard;
        }
        if (auth.user.isCustomer && loc.startsWith('/driver/')) {
          return Routes.customerHome;
        }
        return null;
      }

      // OTP step or error — stay on login
      if (loc != Routes.login) return Routes.login;
      return null;
    },
    routes: [
      // ── Splash ─────────────────────────────────────────────────────────────
      GoRoute(
        path: Routes.splash,
        builder: (_, __) => const SplashScreen(),
      ),

      // ── Login ──────────────────────────────────────────────────────────────
      GoRoute(
        path: Routes.login,
        builder: (_, __) => const LoginScreen(),
      ),

      // ── Customer shell ─────────────────────────────────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => CustomerHomeScreen(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.customerHome,
              builder: (_, __) => const BookingScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.customerTrips,
              builder: (_, __) => const CustomerTripsScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.customerProfile,
              builder: (_, __) => const ProfileScreen(),
            ),
          ]),
        ],
      ),

      // Customer standalone (full-page, pushes on top of shell)
      GoRoute(
        path: '/customer/trips/:id/track',
        builder: (_, state) => LiveTrackingScreen(tripId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/customer/trips/:id',
        builder: (_, state) => TripDetailScreen(tripId: state.pathParameters['id']!),
      ),

      // ── Driver shell ───────────────────────────────────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => DriverHomeScreen(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.driverDashboard,
              builder: (_, __) => const DriverDashboardScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.driverTrips,
              builder: (_, __) => const DriverTripsScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.driverRoutes,
              builder: (_, __) => const DriverRoutesScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.driverWallet,
              builder: (_, __) => const DriverWalletScreen(),
            ),
          ]),
        ],
      ),

      // Driver standalone screens
      GoRoute(
        path: Routes.driverMatches,
        builder: (_, __) => const DriverMatchesScreen(),
      ),
      GoRoute(
        path: Routes.driverActive,
        builder: (_, __) => const ActiveTripScreen(),
      ),
      GoRoute(
        path: Routes.driverKyc,
        builder: (_, __) => const KycScreen(),
      ),
    ],
  );
});

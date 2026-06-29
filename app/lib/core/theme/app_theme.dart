import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  AppColors._();

  // Brand
  static const primary    = Color(0xFF6366F1); // indigo
  static const secondary  = Color(0xFF22D3EE); // cyan
  static const accent     = Color(0xFF34D399); // emerald

  // Background
  static const bgDark     = Color(0xFF0A0A0F);
  static const bgSurface  = Color(0xFF12121A);
  static const bgOverlay  = Color(0xFF1A1A24);
  static const bgCard     = Color(0xFF16161F);

  // Text
  static const textPrimary   = Color(0xFFF1F5F9);
  static const textSecondary = Color(0xFFCBD5E1);
  static const textMuted     = Color(0xFF64748B);

  // Border
  static const borderSubtle = Color(0xFF1E2030);
  static const borderMedium = Color(0xFF2A2D45);

  // Status
  static const success = Color(0xFF34D399);
  static const warning = Color(0xFFFBBF24);
  static const danger  = Color(0xFFF472B6);
  static const info    = Color(0xFF22D3EE);

  // Gradient
  static const gradPrimary = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bgDark,
    colorScheme: const ColorScheme.dark(
      primary:   AppColors.primary,
      secondary: AppColors.secondary,
      surface:   AppColors.bgSurface,
      error:     AppColors.danger,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
      headlineLarge: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
      headlineMedium: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
      titleLarge: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      titleMedium: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      bodyLarge: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary),
      bodyMedium: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
      bodySmall: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
      labelLarge: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.bgSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
      iconTheme: const IconThemeData(color: AppColors.textSecondary),
    ),
    cardTheme: CardThemeData(
      color: AppColors.bgCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.borderSubtle),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgOverlay,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderSubtle),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger),
      ),
      hintStyle: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
      labelStyle: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.textSecondary,
        side: const BorderSide(color: AppColors.borderMedium),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.bgSurface,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    dividerTheme: const DividerThemeData(color: AppColors.borderSubtle, thickness: 1),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.bgOverlay,
      selectedColor: AppColors.primary.withValues(alpha: 0.2),
      labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
      side: const BorderSide(color: AppColors.borderSubtle),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),
  );
}

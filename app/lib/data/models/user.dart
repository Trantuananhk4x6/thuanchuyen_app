class UserProfile {
  const UserProfile({
    required this.id,
    required this.phone,
    required this.role,
    this.fullName,
    this.email,
    this.avatarUrl,
    this.isVerified = false,
  });

  final String  id;
  final String  phone;
  final String  role;       // CUSTOMER | DRIVER | ADMIN
  final String? fullName;
  final String? email;
  final String? avatarUrl;
  final bool    isVerified;

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
    id:         j['id'],
    phone:      j['phone'],
    role:       j['role'],
    fullName:   j['fullName'],
    email:      j['email'],
    avatarUrl:  j['avatarUrl'],
    isVerified: j['isVerified'] ?? false,
  );

  bool get isDriver   => role == 'DRIVER';
  bool get isCustomer => role == 'CUSTOMER';
  bool get isAdmin    => role == 'ADMIN';
}

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken, required this.user});
  final String      accessToken;
  final String      refreshToken;
  final UserProfile user;

  factory AuthTokens.fromJson(Map<String, dynamic> j) => AuthTokens(
    accessToken:  j['accessToken'],
    refreshToken: j['refreshToken'],
    user: UserProfile.fromJson(j['user'] as Map<String, dynamic>),
  );
}

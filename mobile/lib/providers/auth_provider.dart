import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isInitialized = false;
  String? _token;
  bool _isBiometricsEnabled = false;
  String? _userName;
  String? _orgName;
  String? _licenseKey;
  String? _organizationId;
  bool _isSuperAdmin = false;

  bool get isAuthenticated => _isAuthenticated;
  bool get isInitialized => _isInitialized;
  String? get token => _token;
  bool get isBiometricsEnabled => _isBiometricsEnabled;
  String? get userName => _userName;
  String? get orgName => _orgName;
  String? get licenseKey => _licenseKey;
  String? get organizationId => _organizationId;
  bool get isSuperAdmin => _isSuperAdmin;

  AuthProvider() {
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('token');
      _isBiometricsEnabled = prefs.getBool('biometrics_enabled') ?? false;
      _userName = prefs.getString('user_name');
      _orgName = prefs.getString('org_name');
      _licenseKey = prefs.getString('saved_license_key');
      _organizationId = prefs.getString('organization_id');
      _isSuperAdmin = prefs.getBool('is_super_admin') ?? false;
      final loginTimeStr = prefs.getString('login_time');

      if (_token != null && loginTimeStr != null) {
        final loginTime = DateTime.parse(loginTimeStr);
        final now = DateTime.now();
        
        // Check if more than 24 hours have passed
        if (now.difference(loginTime).inHours >= 24) {
          await logout();
          return;
        }
        _isAuthenticated = true;
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      print('Initialization Error: $e');
      _isAuthenticated = false;
    } finally {
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    final data = await ApiService.login(email, password);
    if (data != null && data['access_token'] != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['access_token']);
      await prefs.setString('login_time', DateTime.now().toIso8601String());
      await prefs.setString('auth_type', 'password');
      await prefs.setString('saved_email', email);
      await prefs.setString('saved_password', password);

      final user = data['user'];
      if (user != null) {
        final firstName = user['firstName'] ?? '';
        final lastName = user['lastName'] ?? '';
        final fullName = '$firstName $lastName'.trim();
        final nameToSave = fullName.isNotEmpty ? fullName : email.split('@')[0];
        final orgName = user['organization']?['name'] ?? '';
        final licenseKey = user['licenseKey'] ?? '';
        final orgId = user['organizationId'] ?? '';
        final isSuper = user['isSuperAdmin'] == true;

        await prefs.setString('user_name', nameToSave);
        await prefs.setString('org_name', orgName);
        await prefs.setString('organization_id', orgId);
        await prefs.setBool('is_super_admin', isSuper);
        _organizationId = orgId;
        _isSuperAdmin = isSuper;

        _licenseKey = licenseKey.isNotEmpty ? licenseKey : null;
        if (licenseKey.isNotEmpty) {
          await prefs.setString('saved_license_key', licenseKey);
        } else {
          await prefs.remove('saved_license_key');
        }
        _userName = nameToSave;
        _orgName = orgName;
      }

      _token = data['access_token'];
      _isAuthenticated = true;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> loginDevice({String? licenseKey, String? orgId, String? email}) async {
    final data = await ApiService.loginDevice(licenseKey: licenseKey, orgId: orgId, email: email);
    if (data != null && data['access_token'] != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['access_token']);
      await prefs.setString('login_time', DateTime.now().toIso8601String());
      await prefs.setString('auth_type', 'device');
      
      // Clear password auth fields so refreshProfile won't revert to old saved account
      await prefs.remove('saved_password');
      await prefs.remove('saved_email');

      if (orgId != null && orgId.isNotEmpty) {
        await prefs.setString('saved_org_id', orgId);
      }
      if (email != null && email.isNotEmpty) {
        await prefs.setString('saved_device_email', email);
      }

      final user = data['user'];
      if (user != null) {
        final firstName = user['firstName'] ?? '';
        final lastName = user['lastName'] ?? '';
        final fullName = '$firstName $lastName'.trim();
        final nameToSave = fullName.isNotEmpty ? fullName : (user['organization']?['name'] ?? 'Organization Device');
        final orgName = user['organization']?['name'] ?? '';
        final orgIdVal = user['organizationId'] ?? orgId ?? '';
        final licKey = user['licenseKey'] ?? licenseKey ?? '';

        await prefs.setString('user_name', nameToSave);
        await prefs.setString('org_name', orgName);
        await prefs.setString('organization_id', orgIdVal);
        _organizationId = orgIdVal;

        if (licKey.toString().isNotEmpty && licKey != 'PENDING') {
          await prefs.setString('saved_license_key', licKey.toString());
          _licenseKey = licKey.toString();
        }

        _userName = nameToSave;
        _orgName = orgName;
      }

      _token = data['access_token'];
      _isAuthenticated = true;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> loginWithOtp(String mobile, String otp) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 2));
    if (otp == "123456") {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', 'fake-jwt-token-otp');
      await prefs.setString('login_time', DateTime.now().toIso8601String());
      _token = 'fake-jwt-token-otp';
      _isAuthenticated = true;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('login_time');
    await prefs.remove('user_name');
    await prefs.remove('org_name');
    await prefs.remove('organization_id');
    await prefs.remove('auth_type');
    
    final biometricsEnabled = prefs.getBool('biometrics_enabled') ?? false;
    if (!biometricsEnabled) {
      await prefs.remove('saved_email');
      await prefs.remove('saved_password');
      await prefs.remove('saved_license_key');
      await prefs.remove('saved_org_id');
      await prefs.remove('saved_device_email');
    }
    
    _userName = null;
    _orgName = null;
    _licenseKey = null;
    _organizationId = null;
    _token = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  Future<bool> enableBiometrics(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    if (enabled) {
      final LocalAuthentication localAuth = LocalAuthentication();
      final bool canAuthenticateWithBiometrics = await localAuth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await localAuth.isDeviceSupported();
      
      if (!canAuthenticate) return false;

      final bool verified = await localAuth.authenticate(
        localizedReason: 'Confirm device lock (Biometric, PIN, or Pattern) to enable fast login',
      );

      if (verified && _token != null) {
        await prefs.setBool('biometrics_enabled', true);
        await prefs.setString('biometric_token', _token!);
        _isBiometricsEnabled = true;
        notifyListeners();
        return true;
      }
      return false;
    } else {
      await prefs.remove('biometrics_enabled');
      await prefs.remove('biometric_token');
      await prefs.remove('saved_email');
      await prefs.remove('saved_password');
      await prefs.remove('saved_license_key');
      await prefs.remove('saved_org_id');
      await prefs.remove('saved_device_email');
      _isBiometricsEnabled = false;
      notifyListeners();
      return true;
    }
  }

  Future<bool> loginWithBiometrics() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isEnabled = prefs.getBool('biometrics_enabled') ?? false;
      final storedToken = prefs.getString('biometric_token');

      if (!isEnabled || storedToken == null) return false;

      final LocalAuthentication localAuth = LocalAuthentication();
      final bool canAuthenticateWithBiometrics = await localAuth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await localAuth.isDeviceSupported();
      
      if (!canAuthenticate) return false;

      final bool verified = await localAuth.authenticate(
        localizedReason: 'Verify your fingerprint, face, PIN, or pattern to sign in',
      );

      if (verified) {
        _token = storedToken;
        // 1. Try to fetch profile with the stored token
        final profileSuccess = await refreshProfile();
        if (profileSuccess) {
          _isAuthenticated = true;
          notifyListeners();
          return true;
        }

        // 2. Fallback: Re-authenticate with stored credentials based on auth_type
        final authType = prefs.getString('auth_type');
        final email = prefs.getString('saved_email');
        final password = prefs.getString('saved_password');
        final licenseKey = prefs.getString('saved_license_key');
        final orgId = prefs.getString('saved_org_id');
        final deviceEmail = prefs.getString('saved_device_email');

        if (authType == 'password' && email != null && password != null) {
          final loggedIn = await login(email, password);
          if (loggedIn && _token != null) {
            await prefs.setString('biometric_token', _token!);
            return true;
          }
        } else if (licenseKey != null || orgId != null || deviceEmail != null) {
          final loggedIn = await loginDevice(licenseKey: licenseKey, orgId: orgId, email: deviceEmail);
          if (loggedIn && _token != null) {
            await prefs.setString('biometric_token', _token!);
            return true;
          }
        }

        // Offline fallback to stored token
        await prefs.setString('token', storedToken);
        await prefs.setString('login_time', DateTime.now().toIso8601String());
        _token = storedToken;
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      print('Biometric authentication error: $e');
      return false;
    }
  }

  Future<bool> refreshProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Try live API call to GET /auth/me with existing token
      if (_token != null && _token!.isNotEmpty) {
        final profile = await ApiService.getProfile();
        if (profile != null) {
          final firstName = profile['firstName'] ?? '';
          final lastName = profile['lastName'] ?? '';
          final fullName = '$firstName $lastName'.trim();
          final orgName = profile['organization']?['name'] ?? '';
          final licenseKey = profile['licenseKey'] ?? '';
          final orgId = profile['organizationId'] ?? '';
          final isSuper = profile['isSuperAdmin'] == true;
          final nameToSave = fullName.isNotEmpty ? fullName : (orgName.isNotEmpty ? orgName : 'User');

          _userName = nameToSave;
          _orgName = orgName.isNotEmpty ? orgName : _orgName;
          _organizationId = orgId.isNotEmpty ? orgId : _organizationId;
          _isSuperAdmin = isSuper;
          await prefs.setBool('is_super_admin', isSuper);
          
          if (licenseKey != null && licenseKey.toString().isNotEmpty && licenseKey != 'PENDING') {
            _licenseKey = licenseKey.toString();
            await prefs.setString('saved_license_key', _licenseKey!);
          }
          
          if (_orgName != null && _orgName!.isNotEmpty) {
            await prefs.setString('org_name', _orgName!);
          }
          if (_organizationId != null && _organizationId!.isNotEmpty) {
            await prefs.setString('organization_id', _organizationId!);
          }
          await prefs.setString('user_name', nameToSave);

          notifyListeners();
          return true;
        }
      }

      // 2. Fallback: Re-authenticate if token is expired
      final authType = prefs.getString('auth_type');
      final email = prefs.getString('saved_email');
      final password = prefs.getString('saved_password');
      final licenseKey = prefs.getString('saved_license_key');
      final orgId = prefs.getString('saved_org_id');
      final deviceEmail = prefs.getString('saved_device_email');

      if (authType == 'device' || (licenseKey != null && password == null)) {
        return await loginDevice(licenseKey: licenseKey, orgId: orgId, email: deviceEmail);
      } else if (email != null && password != null) {
        return await login(email, password);
      }
    } catch (e) {
      print('Failed to refresh profile: $e');
    }
    return false;
  }
}

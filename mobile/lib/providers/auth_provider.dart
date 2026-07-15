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

  bool get isAuthenticated => _isAuthenticated;
  bool get isInitialized => _isInitialized;
  String? get token => _token;
  bool get isBiometricsEnabled => _isBiometricsEnabled;
  String? get userName => _userName;
  String? get orgName => _orgName;
  String? get licenseKey => _licenseKey;
  String? get organizationId => _organizationId;

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

        await prefs.setString('user_name', nameToSave);
        await prefs.setString('org_name', orgName);
        await prefs.setString('organization_id', orgId);
        _organizationId = orgId;

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

  Future<bool> loginDevice(String licenseKey) async {
    final data = await ApiService.loginDevice(licenseKey);
    if (data != null && data['access_token'] != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['access_token']);
      await prefs.setString('login_time', DateTime.now().toIso8601String());
      await prefs.setString('saved_license_key', licenseKey);

      final user = data['user'];
      if (user != null) {
        final firstName = user['firstName'] ?? '';
        final lastName = user['lastName'] ?? '';
        final fullName = '$firstName $lastName'.trim();
        final nameToSave = fullName.isNotEmpty ? fullName : 'Device';
        final orgName = user['organization']?['name'] ?? '';
        final orgId = user['organizationId'] ?? '';

        await prefs.setString('user_name', nameToSave);
        await prefs.setString('org_name', orgName);
        await prefs.setString('organization_id', orgId);
        _organizationId = orgId;

        _userName = nameToSave;
        _orgName = orgName;
      }

      _licenseKey = licenseKey;
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
    
    final biometricsEnabled = prefs.getBool('biometrics_enabled') ?? false;
    if (!biometricsEnabled) {
      await prefs.remove('saved_email');
      await prefs.remove('saved_password');
      await prefs.remove('saved_license_key');
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
        localizedReason: 'Confirm biometrics to enable Biometric Login',
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
        localizedReason: 'Please authenticate to sign in',
      );

      if (verified) {
        final email = prefs.getString('saved_email');
        final password = prefs.getString('saved_password');
        final licenseKey = prefs.getString('saved_license_key');

        if (email != null && password != null) {
          try {
            final data = await ApiService.login(email, password);
            if (data != null && data['access_token'] != null) {
              final newToken = data['access_token'];
              await prefs.setString('token', newToken);
              await prefs.setString('biometric_token', newToken);
              await prefs.setString('login_time', DateTime.now().toIso8601String());

              final user = data['user'];
              if (user != null) {
                final firstName = user['firstName'] ?? '';
                final lastName = user['lastName'] ?? '';
                final fullName = '$firstName $lastName'.trim();
                final nameToSave = fullName.isNotEmpty ? fullName : email.split('@')[0];
                final orgName = user['organization']?['name'] ?? '';
                final licenseKey = user['licenseKey'] ?? '';
                final orgId = user['organizationId'] ?? '';

                await prefs.setString('user_name', nameToSave);
                await prefs.setString('org_name', orgName);
                await prefs.setString('organization_id', orgId);
                _userName = nameToSave;
                _orgName = orgName;
                _organizationId = orgId;

                _licenseKey = licenseKey.isNotEmpty ? licenseKey : null;
                if (licenseKey.isNotEmpty) {
                  await prefs.setString('saved_license_key', licenseKey);
                } else {
                  await prefs.remove('saved_license_key');
                }
              }

              _token = newToken;
              _isAuthenticated = true;
              notifyListeners();
              return true;
            }
          } catch (e) {
            print('Biometric background refresh failed: $e');
          }
        } else if (licenseKey != null) {
          try {
            final data = await ApiService.loginDevice(licenseKey);
            if (data != null && data['access_token'] != null) {
              final newToken = data['access_token'];
              await prefs.setString('token', newToken);
              await prefs.setString('biometric_token', newToken);
              await prefs.setString('login_time', DateTime.now().toIso8601String());

              final user = data['user'];
              if (user != null) {
                final firstName = user['firstName'] ?? '';
                final lastName = user['lastName'] ?? '';
                final fullName = '$firstName $lastName'.trim();
                final nameToSave = fullName.isNotEmpty ? fullName : 'Device';
                final orgName = user['organization']?['name'] ?? '';

                await prefs.setString('user_name', nameToSave);
                await prefs.setString('org_name', orgName);
                _userName = nameToSave;
                _orgName = orgName;
              }

              _licenseKey = licenseKey;
              _token = newToken;
              _isAuthenticated = true;
              notifyListeners();
              return true;
            }
          } catch (e) {
            print('Biometric background device refresh failed: $e');
          }
        }

        // Fallback to local stored token (offline mode or API failure)
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
      final email = prefs.getString('saved_email');
      final password = prefs.getString('saved_password');
      final licenseKey = prefs.getString('saved_license_key');

      if (email != null && password != null) {
        return await login(email, password);
      } else if (licenseKey != null && licenseKey.isNotEmpty) {
        return await loginDevice(licenseKey);
      }
    } catch (e) {
      print('Failed to refresh profile: $e');
    }
    return false;
  }
}

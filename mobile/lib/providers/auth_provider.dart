import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isInitialized = false;
  String? _token;

  bool get isAuthenticated => _isAuthenticated;
  bool get isInitialized => _isInitialized;
  String? get token => _token;

  AuthProvider() {
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('token');
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
    _token = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}

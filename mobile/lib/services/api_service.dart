import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Preset Server Environments
  static const String liveBaseUrl = 'https://proapi.flashgard.in/api';
  static const String defaultLocalBaseUrl = 'http://192.168.1.2:3000/api';
  static const String emulatorBaseUrl = 'http://10.0.2.2:3000/api';

  static const String defaultBaseUrl = liveBaseUrl; 
  static String _baseUrl = defaultBaseUrl;

  static String get baseUrl => _baseUrl;

  static bool get isLive => _baseUrl.contains('proapi.flashgard.in');

  static String get environmentLabel {
    if (_baseUrl.contains('proapi.flashgard.in')) return 'Live AWS';
    if (_baseUrl.contains('192.168.1.2') || _baseUrl.contains('127.0.0.1')) return 'Local Wi-Fi';
    if (_baseUrl.contains('10.0.2.2')) return 'Emulator';
    return 'Custom';
  }

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final autoDetect = prefs.getBool('auto_detect_server') ?? false;
      if (autoDetect) {
        final localTarget = prefs.getString('local_base_url') ?? defaultLocalBaseUrl;
        final isLocalReachable = await pingUrl(localTarget);
        if (isLocalReachable) {
          _baseUrl = localTarget;
          return;
        }
      }

      final saved = prefs.getString('custom_base_url');
      if (saved != null && saved.trim().isNotEmpty) {
        _baseUrl = saved.trim();
      } else {
        _baseUrl = defaultBaseUrl;
      }
    } catch (_) {}
  }

  static Future<void> setBaseUrl(String url, {bool autoDetect = false}) async {
    _baseUrl = url.trim();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('custom_base_url', _baseUrl);
      await prefs.setBool('auto_detect_server', autoDetect);
    } catch (_) {}
  }

  static Future<bool> pingUrl(String url) async {
    try {
      final clean = url.trim().endsWith('/') ? url.trim().substring(0, url.trim().length - 1) : url.trim();
      final uri = Uri.parse('$clean/model-categories?onlyWithModels=true&take=1');
      final res = await http.get(uri).timeout(const Duration(milliseconds: 2000));
      return res.statusCode >= 200 && res.statusCode < 500;
    } catch (_) {
      return false;
    }
  }

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Login Error: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> loginDevice({
    String? licenseKey,
    String? orgId,
    String? email,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/device-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          if (licenseKey != null && licenseKey.trim().isNotEmpty) 'licenseKey': licenseKey.trim(),
          if (orgId != null && orgId.trim().isNotEmpty) 'orgId': orgId.trim(),
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Device Login Error: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getProfile() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Error fetching profile: $e');
    }
    return null;
  }

  static Future<List<dynamic>> getModelCategories({String? parentId}) async {
    try {
      String url = '$baseUrl/model-categories?onlyWithModels=true';
      if (parentId != null) url += '&parentId=$parentId';
      
      final response = await http.get(
        Uri.parse(url),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) { print('Error fetching categories: $e'); }
    return [];
  }

  static Future<List<dynamic>> getBrands(String categoryId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/brands?categoryId=$categoryId&onlyWithModels=true'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) { print('Error fetching brands: $e'); }
    return [];
  }

  static Future<List<dynamic>> getModels(String brandId, {String? categoryId}) async {
    try {
      String url = '$baseUrl/models?brandId=$brandId';
      if (categoryId != null) url += '&categoryId=$categoryId';
      
      final response = await http.get(
        Uri.parse(url),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded is Map ? (decoded['items'] ?? []) : decoded;
      }
    } catch (e) { print('Error fetching models: $e'); }
    return [];
  }

  static Future<List<dynamic>> getModelCutFiles(String modelId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/model-cut-files?modelId=$modelId'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded is Map ? (decoded['items'] ?? []) : decoded;
      }
    } catch (e) { print('Error fetching cut files: $e'); }
    return [];
  }

  static Future<Map<String, dynamic>?> getCutFileDetails(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/model-cut-files/$id'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('Error fetching cut file details: $e');
    }
    return null;
  }

  static Future<List<dynamic>> searchModelCategories(String query) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/model-categories?search=${Uri.encodeComponent(query)}&onlyWithModels=true'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('Error searching categories: $e');
    }
    return [];
  }

  static Future<List<dynamic>> searchBrands(String query) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/brands?search=${Uri.encodeComponent(query)}&onlyWithModels=true'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('Error searching brands: $e');
    }
    return [];
  }

  static Future<List<dynamic>> searchModels(String query) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/models?search=${Uri.encodeComponent(query)}&take=20'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded is Map ? (decoded['items'] ?? []) : decoded;
      }
    } catch (e) {
      print('Error searching models: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>?> fetchMobileHomeContent() async {
    try {
      final url = '$baseUrl/mobile-home/content';
      var headers = await _getHeaders();
      debugPrint('[ApiService] Fetching mobile home content from $url');

      var response = await http.get(
        Uri.parse(url),
        headers: headers,
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 401 && headers.containsKey('Authorization')) {
        debugPrint('[ApiService] Received 401 with token, retrying unauthenticated...');
        headers = {'Content-Type': 'application/json'};
        response = await http.get(
          Uri.parse(url),
          headers: headers,
        ).timeout(const Duration(seconds: 8));
      }

      debugPrint('[ApiService] Mobile home response code: ${response.statusCode}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        debugPrint('[ApiService] Mobile home failed (${response.statusCode}): ${response.body}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error fetching mobile home content: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> checkOrRegisterPlotter({
    required String name,
    required String macAddress,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/plotter-devices/check-or-register'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'name': name,
          'macAddress': macAddress,
        }),
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Error checking/registering plotter: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> bindPlotterDevice({
    required String licenseKey,
    String? serialNumber,
    String? macAddress,
    String? deviceHash,
    String? organizationId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/plotter-devices/bind'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'licenseKey': licenseKey,
          'serialNumber': serialNumber,
          'macAddress': macAddress,
          'deviceHash': deviceHash,
          'organizationId': organizationId,
        }),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Error binding plotter device: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/change-password'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        }),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Error changing password: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> validateCut({
    required String? licenseKey,
    required String? organizationId,
    required String modelId,
    bool isCalibrationCut = false,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/cuts/validate'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'licenseKey': licenseKey,
          'organizationId': organizationId,
          'modelId': modelId,
          'isCalibrationCut': isCalibrationCut,
        }),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        try {
          final decoded = jsonDecode(response.body);
          return {
            'valid': false,
            'error': decoded['message'] ?? 'Validation failed'
          };
        } catch (_) {
          return {
            'valid': false,
            'error': 'Validation failed: ${response.statusCode}'
          };
        }
      }
    } catch (e) {
      print('Error validating cut: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> logCut({
    required String cutToken,
    String? plotterId,
    bool isPositiveCut = true,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/cuts/log'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'cutToken': cutToken,
          'plotterId': plotterId,
          'isPositiveCut': isPositiveCut,
          'latitude': latitude,
          'longitude': longitude,
        }),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        try {
          final decoded = jsonDecode(response.body);
          return {
            'success': false,
            'error': decoded['message'] ?? 'Logging failed'
          };
        } catch (_) {
          return {
            'success': false,
            'error': 'Logging failed: ${response.statusCode}'
          };
        }
      }
    } catch (e) {
      print('Error logging cut: $e');
    }
    return null;
  }

  static Future<List<dynamic>?> fetchRechargePackages() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/recharge/packages'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Error fetching recharge packages: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> createRechargeOrder(String packageId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/recharge/create-order'),
        headers: await _getHeaders(),
        body: jsonEncode({'packageId': packageId}),
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        try {
          final decoded = jsonDecode(response.body);
          return {
            'error': decoded['message'] ?? 'Order creation failed'
          };
        } catch (_) {
          return {
            'error': 'Order creation failed: ${response.statusCode}'
          };
        }
      }
    } catch (e) {
      print('Error creating recharge order: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> verifyRechargePayment({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/recharge/verify'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'razorpayOrderId': razorpayOrderId,
          'razorpayPaymentId': razorpayPaymentId,
          'razorpaySignature': razorpaySignature,
        }),
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        try {
          final decoded = jsonDecode(response.body);
          return {
            'error': decoded['message'] ?? 'Payment verification failed'
          };
        } catch (_) {
          return {
            'error': 'Payment verification failed: ${response.statusCode}'
          };
        }
      }
    } catch (e) {
      print('Error verifying recharge payment: $e');
    }
    return null;
  }

  static Future<List<dynamic>> getModelsByCategoryName(String categoryName) async {
    try {
      final categories = await getModelCategories();
      final decalCat = categories.firstWhere(
        (c) => c['name'].toString().toLowerCase().contains(categoryName.toLowerCase()),
        orElse: () => null,
      );
      if (decalCat == null) return [];
      
      final categoryId = decalCat['id'];
      final response = await http.get(
        Uri.parse('$baseUrl/models?categoryId=$categoryId&take=100'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded is Map ? (decoded['items'] ?? []) : decoded;
      }
    } catch (e) {
      print('Error fetching models by category name: $e');
    }
    return [];
  }

  static Future<Map<String, List<dynamic>>> getDecalsCategoryWise() async {
    try {
      final categories = await getModelCategories();
      final parentCat = categories.firstWhere(
        (c) => c['name'].toString().toLowerCase().contains('mobile decals') || 
               c['name'].toString().toLowerCase() == 'decals',
        orElse: () => null,
      );
      if (parentCat == null) return {};

      final parentId = parentCat['id'];
      final subCategories = await getModelCategories(parentId: parentId);
      final Map<String, List<dynamic>> result = {};
      
      for (final subCat in subCategories) {
        final subCatId = subCat['id'];
        final subCatName = subCat['name'] as String;
        
        final response = await http.get(
          Uri.parse('$baseUrl/models?categoryId=$subCatId&take=100'),
          headers: await _getHeaders(),
        );
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          final items = decoded is Map ? (decoded['items'] ?? []) : decoded;
          if (items.isNotEmpty) {
            result[subCatName] = List<dynamic>.from(items);
          }
        }
      }
      
      if (result.isEmpty) {
        final response = await http.get(
          Uri.parse('$baseUrl/models?categoryId=$parentId&take=100'),
          headers: await _getHeaders(),
        );
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          final items = decoded is Map ? (decoded['items'] ?? []) : decoded;
          if (items.isNotEmpty) {
            result['Decals'] = List<dynamic>.from(items);
          }
        }
      }
      
      return result;
    } catch (e) {
      print('Error fetching category-wise decals: $e');
    }
    return {};
  }
}

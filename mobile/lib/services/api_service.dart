import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator, localhost for Windows/Web, or your machine IP for physical devices
  static const String baseUrl = 'http://192.168.1.6:3000/api'; 

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

  static Future<Map<String, dynamic>?> loginDevice(String licenseKey) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/device-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'licenseKey': licenseKey,
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
      final response = await http.get(
        Uri.parse('$baseUrl/mobile-home/content'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      print('Error fetching mobile home content: $e');
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

  static Future<Map<String, dynamic>?> validateCut({
    required String? licenseKey,
    required String? organizationId,
    required String modelId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/cuts/validate'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'licenseKey': licenseKey,
          'organizationId': organizationId,
          'modelId': modelId,
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
}

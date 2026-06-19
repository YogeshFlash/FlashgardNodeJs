import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator, localhost for Windows/Web, or your machine IP for physical devices
  static const String baseUrl = 'http://192.168.1.3:3000/api'; 

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
}

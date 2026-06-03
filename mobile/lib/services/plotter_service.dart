import 'package:flutter/services.dart';

class PlotterDevice {
  final String name;
  final String address;
  final int rssi;
  final String type; // "sdk" or "classic"

  PlotterDevice({
    required this.name,
    required this.address,
    required this.rssi,
    this.type = 'sdk',
  });

  factory PlotterDevice.fromMap(Map<dynamic, dynamic> map) {
    return PlotterDevice(
      name: map['name'] ?? 'Unknown',
      address: map['address'] ?? '',
      rssi: map['rssi'] ?? 0,
      type: map['type'] ?? 'sdk',
    );
  }

  /// True if this device was found via standard Bluetooth (not SDK)
  bool get isClassic => type == 'classic';
}

class PlotterService {
  static const MethodChannel _channel = MethodChannel('com.flashgard.plotter/api');
  static const EventChannel _eventChannel = EventChannel('com.flashgard.plotter/progress');

  /// The type of the currently connected plotter ("sdk", "classic", or null)
  String? _connectedAddress;
  String? _connectedName;
  String? _connectionType;
  String? get connectionType => _connectionType;
  bool get isClassicPlotter => _connectionType == 'classic';
  bool get isSdkPlotter => _connectionType == 'sdk';
  String? get connectedName => _connectedName;

  /// Stream of cutting progress (0-100)
  Stream<int> get progressStream => _eventChannel.receiveBroadcastStream().map((event) => event as int);

  /// Searches for nearby Bluetooth plotter devices (both BLE and Classic).
  Future<List<PlotterDevice>> search({int timeout = 5000}) async {
    try {
      final List<dynamic> result = await _channel.invokeMethod('search', {
        'timeout': timeout,
      });
      return result.map((e) => PlotterDevice.fromMap(e as Map<dynamic, dynamic>)).toList();
    } on PlatformException catch (e) {
      print('Failed to search for devices: ${e.message}');
      return [];
    }
  }

  /// Stops an ongoing search for Bluetooth devices.
  Future<void> stopSearch() async {
    try {
      await _channel.invokeMethod('stopSearch');
    } on PlatformException catch (e) {
      print('Failed to stop search: ${e.message}');
    }
  }

  /// Connects to a device via its MAC [address].
  /// Auto-detects: tries SDK first, falls back to Classic SPP.
  /// Returns a map with 'success' and 'type' fields.
  Future<Map<String, dynamic>> connect(PlotterDevice device) async {
    try {
      final Map<dynamic, dynamic> result = await _channel.invokeMethod('connect', {
        'address': device.address,
      });
      final success = result['success'] == true;
      if (success) {
        _connectedAddress = device.address;
        _connectedName = device.name;
        _connectionType = result['type'] as String?;
      }
      return {
        'success': success,
        'type': _connectionType ?? 'unknown',
      };
    } on PlatformException catch (e) {
      print('Failed to connect to ${device.address}: ${e.message}');
      _connectionType = null;
      return {'success': false, 'type': 'none', 'error': e.message};
    }
  }

  /// Disconnects from the current device.
  Future<void> disconnect() async {
    try {
      await _channel.invokeMethod('disconnect');
      _connectionType = null;
      _connectedName = null;
    } on PlatformException catch (e) {
      print('Failed to disconnect: ${e.message}');
    }
  }

  /// Checks if the plotter is currently connected.
  Future<bool> isConnected() async {
    try {
      final bool result = await _channel.invokeMethod('isConnected');
      if (!result) {
        _connectionType = null;
        _connectedName = null;
      }
      return result;
    } on PlatformException catch (e) {
      print('Failed to check connection: ${e.message}');
      return false;
    }
  }

  /// Gets the active connection type from the native layer.
  Future<String?> getConnectionType() async {
    try {
      final String? result = await _channel.invokeMethod('getConnectionType');
      _connectionType = result;
      return result;
    } on PlatformException catch (e) {
      print('Failed to get connection type: ${e.message}');
      return null;
    }
  }

  /// Gets the current page size of the connected plotter.
  Future<Map<String, double>?> getPageSize() async {
    try {
      final Map<dynamic, dynamic>? result = await _channel.invokeMethod('getPageSize');
      if (result != null) {
        return {
          'width': (result['width'] as num).toDouble(),
          'height': (result['height'] as num).toDouble(),
        };
      }
    } on PlatformException catch (e) {
      print('Failed to get page size: ${e.message}');
    }
    return null;
  }

  /// Gets the current parameters (speed, pressure, width) of the connected plotter.
  Future<String?> getConnectedAddress() async => _connectedAddress;
  Future<String?> getConnectedName() async => _connectedName;
  
  Future<Map<String, int>?> getMachineParameters() async {
    try {
      final Map<dynamic, dynamic>? result = await _channel.invokeMethod('getMachineParameters');
      if (result != null) {
        return {
          'speed': (result['speed'] as num?)?.toInt() ?? 0,
          'pressure': (result['pressure'] as num?)?.toInt() ?? 0,
          'width': (result['width'] as num?)?.toInt() ?? 0,
        };
      }
    } on PlatformException catch (e) {
      print('Failed to get machine parameters: ${e.message}');
    }
    return null;
  }

  /// Sends file content to the plotter to be cut.
  /// Automatically uses the correct method based on connection type.
  Future<bool> cutFile({
    required String content,
    required String name,
    int speed = 300,
    int force = 300,
    double? width,
    double? height,
  }) async {
    try {
      final bool result = await _channel.invokeMethod('cutFile', {
        'content': content,
        'name': name,
        'speed': speed,
        'force': force,
        'width': width,
        'height': height,
      });
      return result;
    } on PlatformException catch (e) {
      print('Failed to cut file: ${e.message}');
      return false;
    }
  }
}

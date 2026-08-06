import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

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

class PlotterService extends ChangeNotifier {
  static final PlotterService _instance = PlotterService._internal();
  factory PlotterService() => _instance;
  PlotterService._internal() {
    // Forward native progress to our custom stream controller
    _nativeProgressSub = _eventChannel.receiveBroadcastStream().listen((event) {
      if (_connectionType == 'sdk') {
        _progressController.add(event as int);
      }
    });
  }

  static const MethodChannel _channel = MethodChannel('com.flashgard.plotter/api');
  static const EventChannel _eventChannel = EventChannel('com.flashgard.plotter/progress');

  final StreamController<int> _progressController = StreamController<int>.broadcast();
  late final StreamSubscription<dynamic> _nativeProgressSub;
  Timer? _classicCutTimer;
  bool _isCutCancelled = false;

  /// The type of the currently connected plotter ("sdk", "classic", or null)
  String? _connectedAddress;
  String? _connectedName;
  String? _connectionType;
  String? get connectionType => _connectionType;
  bool get isClassicPlotter => _connectionType == 'classic';
  bool get isSdkPlotter => _connectionType == 'sdk';
  String? get connectedName => _connectedName;
  String? get connectedAddress => _connectedAddress;

  /// Stream of cutting progress (0-100)
  Stream<int> get progressStream => _progressController.stream;

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
        
        String startString = device.name.toLowerCase().contains('portrait') || device.name.toLowerCase().contains('cameo') ? 'IN;PA;SP1;' : 'IN;PA;';
        String endString = 'IN;PU0,0;\u0003';
        String xySeparator = ',';
        bool splitCommands = device.name.toLowerCase().contains('portrait') || device.name.toLowerCase().contains('cameo');
        bool mirrorX = device.name.toLowerCase().contains('portrait') || device.name.toLowerCase().contains('cameo');
        bool mirrorY = false;

        try {
          final profile = await ApiService.checkOrRegisterPlotter(name: device.name, macAddress: device.address);
          if (profile != null && profile['plotterMaster'] != null) {
            final master = profile['plotterMaster'];
            splitCommands = master['splitCommands'] ?? splitCommands;
            startString = master['startString'] ?? startString;
            endString = master['endString'] ?? endString;
            xySeparator = master['xySeparator'] ?? xySeparator;
            mirrorX = master['mirrorX'] ?? mirrorX;
            mirrorY = master['mirrorY'] ?? mirrorY;
          }
        } catch (e) {
          print('[PlotterService] Failed to fetch server profile, using default rules: $e');
        }

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('last_connected_plotter_address', device.address);
        await prefs.setString('last_connected_plotter_name', device.name);
        await prefs.setString('last_connected_plotter_type', device.type);

        await prefs.setString('plotter_start_string', startString);
        await prefs.setString('plotter_end_string', endString);
        await prefs.setString('plotter_xy_separator', xySeparator);
        await prefs.setBool('plotter_split_commands', splitCommands);
        await prefs.setBool('plotter_mirror_x', mirrorX);
        await prefs.setBool('plotter_mirror_y', mirrorY);

        notifyListeners();
      }
      return {
        'success': success,
        'type': _connectionType ?? 'unknown',
      };
    } on PlatformException catch (e) {
      print('Failed to connect to ${device.address}: ${e.message}');
      _connectionType = null;
      notifyListeners();
      return {'success': false, 'type': 'none', 'error': e.message};
    }
  }

  /// Disconnects from the current device.
  Future<void> disconnect() async {
    try {
      await _channel.invokeMethod('disconnect');
      _connectionType = null;
      _connectedName = null;
      _connectedAddress = null;
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('last_connected_plotter_address');
      await prefs.remove('last_connected_plotter_name');
      await prefs.remove('last_connected_plotter_type');
      notifyListeners();
    } on PlatformException catch (e) {
      print('Failed to disconnect: ${e.message}');
    }
  }

  /// Checks if the plotter is currently connected.
  Future<bool> isConnected() async {
    try {
      final bool result = await _channel.invokeMethod('isConnected');
      if (!result) {
        if (_connectionType != null) {
          _connectionType = null;
          notifyListeners();
        }
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

  /// Parses the PLT/HPGL commands to estimate the physical cutting time.
  /// Coordinates are in 40 units = 1 mm.
  /// [speed] is in mm/s (usually between 10 and 1000).
  static double estimateCutDuration(String content, int speed, {bool isClassic = false}) {
    if (content.trim().isEmpty) return 5.0;
    
    // Map selected speed (10..1000) to Portrait's peak speed (10..100 mm/s)
    final double portraitPeakSpeed = (speed / 10.0).clamp(1.0, 10.0) * 10.0;
    
    // Calculate a realistic average cutting speed accounting for acceleration/deceleration.
    // Classic plotters (Portrait 2 in GPGL mode) average ~50% of their peak speed.
    // SDK BLE plotters average ~25% of their selected peak speed, capped at a realistic 150 mm/s.
    final double activeSpeed = isClassic 
        ? (portraitPeakSpeed * 0.5) 
        : (speed.toDouble() * 0.25).clamp(10.0, 150.0);
        
    const double travelSpeed = 150.0; // Travel speed when pen is up (mm/s)
    final double penOverhead = isClassic ? 0.08 : 0.15;  // Carriage lift/drop and blade rotation delay per PU command
    
    final regex = RegExp(r'(PU|PD)\s*(-?\d+(?:\.\d+)?)[\s,]+\s*(-?\d+(?:\.\d+)?)', caseSensitive: false);
    final matches = regex.allMatches(content);
    
    double cutDistanceUnits = 0.0;
    double travelDistanceUnits = 0.0;
    int puCount = 0;
    
    double? lastX;
    double? lastY;
    
    for (final match in matches) {
      final cmd = match.group(1)!.toUpperCase();
      final double x = double.tryParse(match.group(2) ?? '0') ?? 0.0;
      final double y = double.tryParse(match.group(3) ?? '0') ?? 0.0;
      
      if (lastX != null && lastY != null) {
        // Calculate distance
        final dx = x - lastX;
        final dy = y - lastY;
        final distance = math.sqrt(dx * dx + dy * dy);
        
        if (cmd == 'PD') {
          cutDistanceUnits += distance;
        } else {
          travelDistanceUnits += distance;
        }
      }
      
      if (cmd == 'PU') {
        puCount++;
      }
      
      lastX = x;
      lastY = y;
    }
    
    final double cutMm = cutDistanceUnits / 40.0;
    final double travelMm = travelDistanceUnits / 40.0;
    
    final double time = (cutMm / activeSpeed) + (travelMm / travelSpeed) + (puCount * penOverhead);
    // Return estimated time in seconds, minimum 3.0 seconds
    return time.clamp(3.0, 600.0);
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
      final prefs = await SharedPreferences.getInstance();
      final startString = prefs.getString('plotter_start_string') ?? 'IN;PA;';
      final endString = prefs.getString('plotter_end_string') ?? '\u0003';
      final xySeparator = prefs.getString('plotter_xy_separator') ?? ',';
      final splitCommands = prefs.getBool('plotter_split_commands') ?? false;
      final mirrorX = prefs.getBool('plotter_mirror_x') ?? false;
      final mirrorY = prefs.getBool('plotter_mirror_y') ?? false;

      _isCutCancelled = false;
      _classicCutTimer?.cancel();
      _classicCutTimer = null;

      final double estimatedSeconds = estimateCutDuration(content, speed, isClassic: isClassicPlotter);
      print('[PlotterService] Starting cut. Estimated physical cutting duration: ${estimatedSeconds.toStringAsFixed(1)} seconds');

      if (isClassicPlotter) {
        _progressController.add(0);
      }

      final DateTime startTime = DateTime.now();

      final bool result = await _channel.invokeMethod('cutFile', {
        'content': content,
        'name': name,
        'speed': speed,
        'force': force,
        'width': width,
        'height': height,
        'startString': startString,
        'endString': endString,
        'xySeparator': xySeparator,
        'splitCommands': splitCommands,
        'mirrorX': mirrorX,
        'mirrorY': mirrorY,
      });

      if (!result) return false;

      if (isClassicPlotter) {
        // Measure exact transmission time (time taken by native BLE socket write loop to finish sending data)
        final double transmissionSeconds = DateTime.now().difference(startTime).inMilliseconds / 1000.0;
        
        // The remaining duration represents the physical cutting time left after transmission is complete.
        // We set a minimum safety floor of 2.0 seconds to allow progress to transition smoothly to 100%.
        final double remainingSeconds = math.max(2.0, estimatedSeconds - transmissionSeconds);
        print('[PlotterService] Data transmission took ${transmissionSeconds.toStringAsFixed(1)}s. Running physical cut countdown for remaining ${remainingSeconds.toStringAsFixed(1)}s.');

        final completer = Completer<bool>();
        final int totalDurationMs = (remainingSeconds * 1000).toInt();
        const int tickIntervalMs = 200;
        int elapsedMs = 0;

        _classicCutTimer = Timer.periodic(const Duration(milliseconds: tickIntervalMs), (timer) {
          if (_isCutCancelled) {
            timer.cancel();
            completer.complete(false);
            return;
          }

          elapsedMs += tickIntervalMs;
          final int progress = ((elapsedMs / totalDurationMs) * 100).toInt().clamp(0, 100);
          _progressController.add(progress);

          if (progress >= 100) {
            timer.cancel();
            completer.complete(true);
          }
        });

        return await completer.future;
      }

      return result;
    } on PlatformException catch (e) {
      print('Failed to cut file: ${e.message}');
      return false;
    }
  }

  Future<bool> reset() async {
    try {
      _isCutCancelled = true;
      _classicCutTimer?.cancel();
      _classicCutTimer = null;
      _progressController.add(0);
      
      final bool result = await _channel.invokeMethod('reset');
      return result;
    } on PlatformException catch (e) {
      print('Failed to reset plotter: ${e.message}');
      return false;
    }
  }

  Future<bool> tryAutoConnect() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final address = prefs.getString('last_connected_plotter_address');
      final name = prefs.getString('last_connected_plotter_name');
      final type = prefs.getString('last_connected_plotter_type');
      if (address != null && name != null) {
        print('[PlotterService] Attempting background auto-connect to $name ($address)');
        final device = PlotterDevice(
          name: name,
          address: address,
          rssi: 0,
          type: type ?? 'classic',
        );
        final result = await connect(device);
        return result['success'] == true;
      }
    } catch (e) {
      print('[PlotterService] Auto-connect failed: $e');
    }
    return false;
  }
}

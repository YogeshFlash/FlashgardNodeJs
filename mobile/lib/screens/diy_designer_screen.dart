import 'dart:math';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:async';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter/material.dart';
import '../services/api_service.dart';

enum CutoutType {
  circle,
  pill,
  slit,
  rect,
}

class CutoutShape {
  final String id;
  final CutoutType type;
  double x; // X position relative to top-left of the base shape in mm
  double y; // Y position relative to top-left of the base shape in mm
  double width; // in mm
  double height; // in mm
  double cornerRadius; // in mm (for rect type)

  CutoutShape({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    this.cornerRadius = 2.0,
  });

  CutoutShape copyWith({
    double? x,
    double? y,
    double? width,
    double? height,
    double? cornerRadius,
  }) {
    return CutoutShape(
      id: id,
      type: type,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
      cornerRadius: cornerRadius ?? this.cornerRadius,
    );
  }
}

class DesignerStateHistory {
  final double baseWidth;
  final double baseHeight;
  final double baseCornerRadius;
  final List<Offset> customBaseOutline;
  final List<CutoutShape> cutouts;
  final String? selectedCutoutId;
  final bool isBaseSelected;

  DesignerStateHistory({
    required this.baseWidth,
    required this.baseHeight,
    required this.baseCornerRadius,
    required this.customBaseOutline,
    required this.cutouts,
    required this.selectedCutoutId,
    required this.isBaseSelected,
  });

  DesignerStateHistory.clone({
    required double baseWidth,
    required double baseHeight,
    required double baseCornerRadius,
    required List<Offset> customBaseOutline,
    required List<CutoutShape> cutouts,
    required String? selectedCutoutId,
    required bool isBaseSelected,
  }) : 
    baseWidth = baseWidth,
    baseHeight = baseHeight,
    baseCornerRadius = baseCornerRadius,
    customBaseOutline = List<Offset>.from(customBaseOutline),
    cutouts = cutouts.map((c) => c.copyWith()).toList(),
    selectedCutoutId = selectedCutoutId,
    isBaseSelected = isBaseSelected;
}

class DiyDesignerScreen extends StatefulWidget {
  const DiyDesignerScreen({super.key});

  @override
  State<DiyDesignerScreen> createState() => _DiyDesignerScreenState();
}

class _DiyDesignerScreenState extends State<DiyDesignerScreen> {
  // Base protector dimensions in mm
  double _baseWidth = 300.0; 
  double _baseHeight = 200.0;
  double _baseCornerRadius = 8.0;

  // Custom PLT parsed shape points
  List<Offset> _customBaseOutline = [];

  // Selected cutout elements
  final List<CutoutShape> _cutouts = [];
  CutoutShape? _selectedCutout;
  bool _isBaseSelected = true;

  // Bottom tab switcher: 0 = Properties, 1 = Components Layer List
  int _bottomTabIndex = 0;

  // Drag interaction states
  String? _activeDragType; // 'move', 'resize-base-w', 'resize-base-h', 'resize-cutout'
  Offset _dragStartOffset = Offset.zero;
  double _dragStartValX = 0.0;
  double _dragStartValY = 0.0;
  double _dragStartWidth = 0.0;
  double _dragStartHeight = 0.0;

  // Helper variables for layout scale mapping
  double _scale = 1.0; // mm to logical pixels
  double _canvasLeft = 0.0;
  double _canvasTop = 0.0;

  // Undo / Redo Stacks
  final List<DesignerStateHistory> _undoStack = [];
  final List<DesignerStateHistory> _redoStack = [];

  void _saveToHistory() {
    _undoStack.add(
      DesignerStateHistory.clone(
        baseWidth: _baseWidth,
        baseHeight: _baseHeight,
        baseCornerRadius: _baseCornerRadius,
        customBaseOutline: _customBaseOutline,
        cutouts: _cutouts,
        selectedCutoutId: _selectedCutout?.id,
        isBaseSelected: _isBaseSelected,
      ),
    );
    _redoStack.clear();
  }

  void _undo() {
    if (_undoStack.isEmpty) return;
    setState(() {
      _redoStack.add(
        DesignerStateHistory.clone(
          baseWidth: _baseWidth,
          baseHeight: _baseHeight,
          baseCornerRadius: _baseCornerRadius,
          customBaseOutline: _customBaseOutline,
          cutouts: _cutouts,
          selectedCutoutId: _selectedCutout?.id,
          isBaseSelected: _isBaseSelected,
        ),
      );

      final previous = _undoStack.removeLast();
      _baseWidth = previous.baseWidth;
      _baseHeight = previous.baseHeight;
      _baseCornerRadius = previous.baseCornerRadius;
      _customBaseOutline = previous.customBaseOutline;
      _cutouts.clear();
      _cutouts.addAll(previous.cutouts);
      _isBaseSelected = previous.isBaseSelected;
      if (previous.selectedCutoutId != null) {
        _selectedCutout = _cutouts.firstWhere(
          (c) => c.id == previous.selectedCutoutId,
          orElse: () => _cutouts.first,
        );
      } else {
        _selectedCutout = null;
      }
    });
  }

  void _redo() {
    if (_redoStack.isEmpty) return;
    setState(() {
      _undoStack.add(
        DesignerStateHistory.clone(
          baseWidth: _baseWidth,
          baseHeight: _baseHeight,
          baseCornerRadius: _baseCornerRadius,
          customBaseOutline: _customBaseOutline,
          cutouts: _cutouts,
          selectedCutoutId: _selectedCutout?.id,
          isBaseSelected: _isBaseSelected,
        ),
      );

      final next = _redoStack.removeLast();
      _baseWidth = next.baseWidth;
      _baseHeight = next.baseHeight;
      _baseCornerRadius = next.baseCornerRadius;
      _customBaseOutline = next.customBaseOutline;
      _cutouts.clear();
      _cutouts.addAll(next.cutouts);
      _isBaseSelected = next.isBaseSelected;
      if (next.selectedCutoutId != null) {
        _selectedCutout = _cutouts.firstWhere(
          (c) => c.id == next.selectedCutoutId,
          orElse: () => _cutouts.first,
        );
      } else {
        _selectedCutout = null;
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _addCutout(CutoutType.circle);
  }

  void _addCutout(CutoutType type) {
    _saveToHistory();
    setState(() {
      final String id = DateTime.now().millisecondsSinceEpoch.toString();
      double w = 8.0;
      double h = 8.0;
      if (type == CutoutType.pill) {
        w = 18.0;
        h = 8.0;
      } else if (type == CutoutType.slit) {
        w = 24.0;
        h = 2.5;
      } else if (type == CutoutType.rect) {
        w = 12.0;
        h = 12.0;
      }

      final newCutout = CutoutShape(
        id: id,
        type: type,
        x: (_baseWidth - w) / 2, // Centered
        y: 10.0, // 10mm from top
        width: w,
        height: h,
      );

      _cutouts.add(newCutout);
      _selectedCutout = newCutout;
      _isBaseSelected = false;
    });
  }

  void _deleteSelectedCutout() {
    if (_selectedCutout != null) {
      _saveToHistory();
      setState(() {
        _cutouts.removeWhere((c) => c.id == _selectedCutout!.id);
        _selectedCutout = null;
        _isBaseSelected = true;
      });
    }
  }

  // HP-GL PLT Parser
  void _importPltData(String content) {
    if (content.trim().isEmpty) return;
    _saveToHistory();

    // Regex matches PU/PD coordinate pairs
    final regex = RegExp(r'(PU|PD)\s*(-?\d+)[\s,]+\s*(-?\d+)');
    final matches = regex.allMatches(content);
    
    List<List<Offset>> rawPaths = [];
    List<Offset> currentPath = [];

    for (final match in matches) {
      final cmd = match.group(1);
      final double xVal = double.tryParse(match.group(2) ?? '0') ?? 0.0;
      final double yVal = double.tryParse(match.group(3) ?? '0') ?? 0.0;
      
      // Plotter units: 1mm = 40 units
      final double xMm = xVal / 40.0;
      final double yMm = yVal / 40.0;

      if (cmd == 'PU') {
        if (currentPath.isNotEmpty) {
          rawPaths.add(currentPath);
          currentPath = [];
        }
      }
      currentPath.add(Offset(xMm, yMm));
    }
    if (currentPath.isNotEmpty) {
      rawPaths.add(currentPath);
    }

    if (rawPaths.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No valid HP-GL PU/PD coordinates found in PLT input.')),
      );
      return;
    }

    // Flip Y-axis coordinates because HP-GL Y increases upwards but screen Y increases downwards.
    double globalMaxY = -double.infinity;
    for (final path in rawPaths) {
      for (final pt in path) {
        if (pt.dy > globalMaxY) globalMaxY = pt.dy;
      }
    }

    final List<List<Offset>> flippedPaths = [];
    for (final path in rawPaths) {
      final List<Offset> flippedPath = [];
      for (final pt in path) {
        flippedPath.add(Offset(pt.dx, globalMaxY - pt.dy));
      }
      flippedPaths.add(flippedPath);
    }
    rawPaths = flippedPaths;

    // Find the largest path by bounding box area (this will be the base screen protector template)
    List<Offset>? baseRawPath;
    double maxArea = -1.0;
    
    double minX = double.infinity;
    double minY = double.infinity;
    double maxX = -double.infinity;
    double maxY = -double.infinity;

    for (final path in rawPaths) {
      double pMinX = double.infinity;
      double pMinY = double.infinity;
      double pMaxX = -double.infinity;
      double pMaxY = -double.infinity;

      for (final pt in path) {
        if (pt.dx < pMinX) pMinX = pt.dx;
        if (pt.dy < pMinY) pMinY = pt.dy;
        if (pt.dx > pMaxX) pMaxX = pt.dx;
        if (pt.dy > pMaxY) pMaxY = pt.dy;
      }

      final double pW = pMaxX - pMinX;
      final double pH = pMaxY - pMinY;
      final double area = pW * pH;

      if (area > maxArea) {
        maxArea = area;
        baseRawPath = path;
        minX = pMinX;
        minY = pMinY;
        maxX = pMaxX;
        maxY = pMaxY;
      }
    }

    if (baseRawPath == null) return;

    // Normalize coordinates of the base path relative to its own minX and minY
    final List<Offset> normalizedBaseOutline = baseRawPath.map((pt) => Offset(pt.dx - minX, pt.dy - minY)).toList();
    final double computedBaseWidth = (maxX - minX).clamp(40.0, 500.0);
    final double computedBaseHeight = (maxY - minY).clamp(40.0, 350.0);

    // Identify all other sub-paths as cutouts relative to the base template bounds
    final List<CutoutShape> importedCutouts = [];
    for (final path in rawPaths) {
      if (path == baseRawPath) continue;

      double cMinX = double.infinity;
      double cMinY = double.infinity;
      double cMaxX = -double.infinity;
      double cMaxY = -double.infinity;

      for (final pt in path) {
        if (pt.dx < cMinX) cMinX = pt.dx;
        if (pt.dy < cMinY) cMinY = pt.dy;
        if (pt.dx > cMaxX) cMaxX = pt.dx;
        if (pt.dy > cMaxY) cMaxY = pt.dy;
      }

      final double cW = cMaxX - cMinX;
      final double cH = cMaxY - cMinY;

      // Skip noise shapes
      if (cW < 1.0 || cH < 1.0) continue;

      // Translate coordinates relative to the top-left of the base outline
      final double relativeX = cMinX - minX;
      final double relativeY = cMinY - minY;

      // Classify the cutout type based on geometric proportions
      CutoutType detectedType = CutoutType.rect;
      if ((cW - cH).abs() < 2.0 && cW < 15.0) {
        detectedType = CutoutType.circle;
      } else if (cH < 3.0 || cW < 3.0) {
        detectedType = CutoutType.slit;
      } else if (cW > cH * 1.5 && cH < 10.0) {
        detectedType = CutoutType.pill;
      }

      importedCutouts.add(CutoutShape(
        id: 'imported_${DateTime.now().millisecondsSinceEpoch}_${cMinX.toInt()}_${cMinY.toInt()}',
        type: detectedType,
        x: _snap(relativeX).clamp(0.0, computedBaseWidth - cW),
        y: _snap(relativeY).clamp(0.0, computedBaseHeight - cH),
        width: _snap(cW),
        height: _snap(cH),
      ));
    }

    setState(() {
      _customBaseOutline = normalizedBaseOutline;
      _baseWidth = computedBaseWidth;
      _baseHeight = computedBaseHeight;
      
      _cutouts.clear();
      _cutouts.addAll(importedCutouts);
      
      _isBaseSelected = true;
      _selectedCutout = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Imported design successfully! Found ${importedCutouts.length} editable cutouts.',
        ),
      ),
    );
  }

  Future<void> _fetchAndDecryptPlt(String cutFileId) async {
    try {
      final details = await ApiService.getCutFileDetails(cutFileId);
      if (details == null || details['encryptedPltData'] == null) {
        throw Exception('Could not fetch cut file data.');
      }

      List<int> encryptedBytes = [];
      final rawData = details['encryptedPltData'];
      
      if (rawData is String) {
        encryptedBytes = base64Decode(rawData);
      } else if (rawData is Map && rawData['data'] != null) {
        encryptedBytes = List<int>.from(rawData['data']);
      } else if (rawData is List) {
        encryptedBytes = List<int>.from(rawData);
      }

      if (encryptedBytes.length < 16) {
        throw Exception('Invalid or corrupted encrypted data');
      }

      final key = encrypt.Key.fromUtf8('flashgard-secure-plt-data-key-32');
      final iv = encrypt.IV(Uint8List.fromList(encryptedBytes.sublist(0, 16)));
      final ciphertext = encryptedBytes.sublist(16);
      
      final encrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.cbc));
      final decrypted = encrypter.decryptBytes(encrypt.Encrypted(Uint8List.fromList(ciphertext)), iv: iv);
      
      String pltContent = utf8.decode(decrypted);

      if (pltContent.isEmpty) {
        throw Exception('The decrypted design file is empty.');
      }

      _importPltData(pltContent);
    } catch (e) {
      print('Error fetching design: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load design: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showImportDesignDialog() {
    showDialog(
      context: context,
      builder: (context) {
        final searchController = TextEditingController();
        List<dynamic> searchResults = [];
        bool isSearching = false;
        
        Map<String, dynamic>? selectedModel;
        List<dynamic> cutFiles = [];
        bool isLoadingCutFiles = false;
        Timer? debounceTimer;

        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Import Design Base Outline'),
              content: SizedBox(
                width: double.maxFinite,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (selectedModel == null) ...[
                        TextField(
                          controller: searchController,
                          decoration: InputDecoration(
                            hintText: 'Search model (e.g. iPhone 15)',
                            prefixIcon: const Icon(Icons.search, size: 20),
                            suffixIcon: isSearching ? const SizedBox(width: 20, height: 20, child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2))) : null,
                          ),
                          onChanged: (val) {
                            if (debounceTimer?.isActive ?? false) {
                              debounceTimer!.cancel();
                            }
                            
                            if (val.trim().isEmpty) {
                              setDialogState(() {
                                searchResults = [];
                                isSearching = false;
                              });
                              return;
                            }
                            
                            setDialogState(() {
                              isSearching = true;
                            });

                            debounceTimer = Timer(const Duration(milliseconds: 300), () async {
                              try {
                                final res = await ApiService.searchModels(val);
                                if (!context.mounted) return;
                                setDialogState(() {
                                  searchResults = res;
                                  isSearching = false;
                                });
                              } catch (_) {
                                if (context.mounted) {
                                  setDialogState(() => isSearching = false);
                                }
                              }
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        Container(
                          height: 200,
                          child: searchResults.isEmpty
                              ? const Center(child: Text('Type to search catalog designs...', style: TextStyle(color: Colors.grey, fontSize: 12)))
                              : ListView.builder(
                                  itemCount: searchResults.length,
                                  itemBuilder: (context, index) {
                                    final m = searchResults[index];
                                    return ListTile(
                                      title: Text(m['name']),
                                      subtitle: Text(m['brand']?['name'] ?? 'Model'),
                                      trailing: const Icon(Icons.chevron_right, size: 16),
                                      onTap: () async {
                                        setDialogState(() {
                                          selectedModel = m;
                                          isLoadingCutFiles = true;
                                        });
                                        try {
                                          final cuts = await ApiService.getModelCutFiles(m['id']);
                                          setDialogState(() {
                                            cutFiles = cuts;
                                            isLoadingCutFiles = false;
                                          });
                                        } catch (_) {
                                          setDialogState(() => isLoadingCutFiles = false);
                                        }
                                      },
                                    );
                                  },
                                ),
                        ),
                      ] else ...[
                        // Selected Model - Show Cut Files List
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back, size: 18),
                              onPressed: () {
                                setDialogState(() {
                                  selectedModel = null;
                                  cutFiles = [];
                                });
                              },
                            ),
                            Expanded(
                              child: Text(
                                selectedModel!['name'],
                                style: const TextStyle(fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          height: 200,
                          child: isLoadingCutFiles
                              ? const Center(child: CircularProgressIndicator())
                              : cutFiles.isEmpty
                                  ? const Center(child: Text('No cut templates available for this model.', style: TextStyle(fontSize: 12)))
                                  : ListView.builder(
                                      itemCount: cutFiles.length,
                                      itemBuilder: (context, index) {
                                        final c = cutFiles[index];
                                        return ListTile(
                                          title: Text(c['cutPattern']?['name'] ?? 'Cut Design'),
                                          subtitle: Text(c['cutPattern']?['description'] ?? 'Vector Outline'),
                                          leading: const Icon(Icons.architecture, color: Colors.blue),
                                          onTap: () {
                                            Navigator.pop(context);
                                            _fetchAndDecryptPlt(c['id']);
                                          },
                                        );
                                      },
                                    ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // Snapping math: round to nearest 1mm
  double _snap(double val) {
    return val.roundToDouble();
  }

  void _handlePointerDown(Offset localPosition) {
    final double baseRightPixel = _canvasLeft + _baseWidth * _scale;
    final double baseBottomPixel = _canvasTop + _baseHeight * _scale;
    final double centerYPixel = _canvasTop + (_baseHeight / 2) * _scale;
    final double centerXPixel = _canvasLeft + (_baseWidth / 2) * _scale;

    final baseWHandle = Offset(baseRightPixel, centerYPixel);
    final baseHHandle = Offset(centerXPixel, baseBottomPixel);

    // 1. Check if hit resize handles for the base screen protector (only if using default RRect base)
    if (_customBaseOutline.isEmpty) {
      if ((localPosition - baseWHandle).distance < 20) {
        _saveToHistory();
        _activeDragType = 'resize-base-w';
        _dragStartOffset = localPosition;
        _dragStartWidth = _baseWidth;
        return;
      }

      if ((localPosition - baseHHandle).distance < 20) {
        _saveToHistory();
        _activeDragType = 'resize-base-h';
        _dragStartOffset = localPosition;
        _dragStartHeight = _baseHeight;
        return;
      }
    }

    // 2. Check if clicked a cutout's resize handle
    if (_selectedCutout != null) {
      final double cutoutRight = _canvasLeft + (_selectedCutout!.x + _selectedCutout!.width) * _scale;
      final double cutoutBottom = _canvasTop + (_selectedCutout!.y + _selectedCutout!.height) * _scale;
      final cutoutHandle = Offset(cutoutRight, cutoutBottom);

      if ((localPosition - cutoutHandle).distance < 20) {
        _saveToHistory();
        _activeDragType = 'resize-cutout';
        _dragStartOffset = localPosition;
        _dragStartWidth = _selectedCutout!.width;
        _dragStartHeight = _selectedCutout!.height;
        return;
      }
    }

    // 3. Check if clicked inside a cutout
    for (int i = _cutouts.length - 1; i >= 0; i--) {
      final cutout = _cutouts[i];
      final double cLeft = _canvasLeft + cutout.x * _scale;
      final double cTop = _canvasTop + cutout.y * _scale;
      final double cRight = cLeft + cutout.width * _scale;
      final double cBottom = cTop + cutout.height * _scale;

      if (localPosition.dx >= cLeft - 6 &&
          localPosition.dx <= cRight + 6 &&
          localPosition.dy >= cTop - 6 &&
          localPosition.dy <= cBottom + 6) {
        _saveToHistory();
        setState(() {
          _selectedCutout = cutout;
          _isBaseSelected = false;
        });

        _activeDragType = 'move';
        _dragStartOffset = localPosition;
        _dragStartValX = cutout.x;
        _dragStartValY = cutout.y;
        return;
      }
    }

    // 4. Check if hit base shape itself
    final double bLeft = _canvasLeft;
    final double bTop = _canvasTop;
    final double bRight = bLeft + _baseWidth * _scale;
    final double bBottom = bTop + _baseHeight * _scale;

    if (localPosition.dx >= bLeft &&
        localPosition.dx <= bRight &&
        localPosition.dy >= bTop &&
        localPosition.dy <= bBottom) {
      setState(() {
        _isBaseSelected = true;
        _selectedCutout = null;
      });
    }
  }

  void _handlePointerMove(Offset localPosition) {
    if (_activeDragType == null) return;

    final double dxPixels = localPosition.dx - _dragStartOffset.dx;
    final double dyPixels = localPosition.dy - _dragStartOffset.dy;

    final double dxMm = dxPixels / _scale;
    final double dyMm = dyPixels / _scale;

    setState(() {
      if (_activeDragType == 'move' && _selectedCutout != null) {
        double newX = _snap(_dragStartValX + dxMm);
        double newY = _snap(_dragStartValY + dyMm);

        newX = newX.clamp(0.0, _baseWidth - _selectedCutout!.width);
        newY = newY.clamp(0.0, _baseHeight - _selectedCutout!.height);

        final idx = _cutouts.indexWhere((c) => c.id == _selectedCutout!.id);
        if (idx != -1) {
          _cutouts[idx] = _selectedCutout!.copyWith(x: newX, y: newY);
          _selectedCutout = _cutouts[idx];
        }
      } else if (_activeDragType == 'resize-base-w') {
        _baseWidth = _snap(_dragStartWidth + dxMm).clamp(40.0, 500.0);
      } else if (_activeDragType == 'resize-base-h') {
        _baseHeight = _snap(_dragStartHeight + dyMm).clamp(40.0, 350.0);
      } else if (_activeDragType == 'resize-cutout' && _selectedCutout != null) {
        double newW = _snap(_dragStartWidth + dxMm).clamp(2.0, 100.0);
        double newH = _snap(_dragStartHeight + dyMm).clamp(2.0, 100.0);

        if (_selectedCutout!.x + newW > _baseWidth) {
          newW = _baseWidth - _selectedCutout!.x;
        }
        if (_selectedCutout!.y + newH > _baseHeight) {
          newH = _baseHeight - _selectedCutout!.y;
        }

        final idx = _cutouts.indexWhere((c) => c.id == _selectedCutout!.id);
        if (idx != -1) {
          _cutouts[idx] = _selectedCutout!.copyWith(width: newW, height: newH);
          _selectedCutout = _cutouts[idx];
        }
      }
    });
  }

  void _handlePointerUp() {
    _activeDragType = null;
  }

  void _exportSvg() {
    final buffer = StringBuffer();
    buffer.writeln('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
    buffer.writeln('<svg width="${_baseWidth}mm" height="${_baseHeight}mm" viewBox="0 0 $_baseWidth $_baseHeight" xmlns="http://www.w3.org/2000/svg">');
    
    buffer.writeln('  <!-- Outer Cut Outline -->');
    if (_customBaseOutline.isNotEmpty) {
      buffer.write('  <path d="');
      final start = _customBaseOutline.first;
      buffer.write('M ${start.dx} ${start.dy} ');
      for (int i = 1; i < _customBaseOutline.length; i++) {
        final pt = _customBaseOutline[i];
        buffer.write('L ${pt.dx} ${pt.dy} ');
      }
      buffer.writeln('Z" fill="none" stroke="#FF0000" stroke-width="0.2mm" />');
    } else {
      final r = _baseCornerRadius;
      final w = _baseWidth;
      final h = _baseHeight;
      buffer.write('  <path d="M $r 0 L ${w - r} 0 ');
      buffer.write('A $r $r 0 0 1 $w $r ');
      buffer.write('L $w ${h - r} ');
      buffer.write('A $r $r 0 0 1 ${w - r} $h ');
      buffer.write('L $r $h ');
      buffer.write('A $r $r 0 0 1 0 ${h - r} ');
      buffer.write('L 0 $r ');
      buffer.writeln('A $r $r 0 0 1 $r 0 Z" fill="none" stroke="#FF0000" stroke-width="0.2mm" />');
    }

    buffer.writeln('  <!-- Inner Cutouts -->');
    for (final c in _cutouts) {
      if (c.type == CutoutType.circle) {
        final double rX = c.x + c.width / 2;
        final double rY = c.y + c.height / 2;
        final double radius = c.width / 2;
        buffer.writeln('  <circle cx="$rX" cy="$rY" r="$radius" fill="none" stroke="#0000FF" stroke-width="0.2mm" />');
      } else if (c.type == CutoutType.rect) {
        buffer.writeln('  <rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="${c.cornerRadius}" ry="${c.cornerRadius}" fill="none" stroke="#0000FF" stroke-width="0.2mm" />');
      } else if (c.type == CutoutType.slit || c.type == CutoutType.pill) {
        final rx = c.height / 2;
        buffer.writeln('  <rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="$rx" ry="$rx" fill="none" stroke="#0000FF" stroke-width="0.2mm" />');
      }
    }
    buffer.writeln('</svg>');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Export Vector Cut Path'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'This SVG is compatible with standard screen protector cutters and laser plotters.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Text(
                  buffer.toString(),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 10),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('SVG Vector copied to clipboard (Simulated)')),
              );
            },
            child: const Text('Send to Plotter'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('DIY Vector Designer', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.file_upload_outlined, size: 18),
            label: const Text('Import Design'),
            onPressed: _showImportDesignDialog,
          ),
          IconButton(
            icon: const Icon(Icons.undo),
            onPressed: _undoStack.isNotEmpty ? _undo : null,
            tooltip: 'Undo',
          ),
          IconButton(
            icon: const Icon(Icons.redo),
            onPressed: _redoStack.isNotEmpty ? _redo : null,
            tooltip: 'Redo',
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.red),
            onPressed: _selectedCutout != null ? _deleteSelectedCutout : null,
            tooltip: 'Delete Selected Cutout',
          ),
          IconButton(
            icon: const Icon(Icons.download, color: Colors.blue),
            onPressed: _exportSvg,
            tooltip: 'Export SVG Cut File',
          ),
        ],
      ),
      body: Column(
        children: [
          // Tool Drawer (Add blocks)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Add Building Blocks',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blueGrey),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildAddBlockBtn(CutoutType.circle, 'Camera Hole', Icons.circle_outlined),
                    const SizedBox(width: 8),
                    _buildAddBlockBtn(CutoutType.pill, 'Pill Island', Icons.brightness_1_outlined),
                    const SizedBox(width: 8),
                    _buildAddBlockBtn(CutoutType.slit, 'Speaker Slit', Icons.remove),
                    const SizedBox(width: 8),
                    _buildAddBlockBtn(CutoutType.rect, 'Notch / Rect', Icons.crop_square_outlined),
                  ],
                ),
              ],
            ),
          ),

          // Scaling Canvas Area
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final double requiredW = _baseWidth + 40.0;
                final double requiredH = _baseHeight + 40.0;

                final double scaleW = constraints.maxWidth / requiredW;
                final double scaleH = constraints.maxHeight / requiredH;
                _scale = min(scaleW, scaleH);

                _canvasLeft = (constraints.maxWidth - _baseWidth * _scale) / 2;
                _canvasTop = (constraints.maxHeight - _baseHeight * _scale) / 2;

                return GestureDetector(
                  onPanDown: (details) => _handlePointerDown(details.localPosition),
                  onPanUpdate: (details) => _handlePointerMove(details.localPosition),
                  onPanEnd: (_) => _handlePointerUp(),
                  child: Container(
                    color: Colors.grey[200],
                    child: CustomPaint(
                      size: Size(constraints.maxWidth, constraints.maxHeight),
                      painter: CanvasGridPainter(
                        baseWidth: _baseWidth,
                        baseHeight: _baseHeight,
                        baseCornerRadius: _baseCornerRadius,
                        customBaseOutline: _customBaseOutline,
                        cutouts: _cutouts,
                        selectedCutout: _selectedCutout,
                        isBaseSelected: _isBaseSelected,
                        scale: _scale,
                        canvasLeft: _canvasLeft,
                        canvasTop: _canvasTop,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Active Components Row (similar to Add Building Blocks)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Active Components',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blueGrey),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildActiveComponentBtn(
                        icon: _customBaseOutline.isNotEmpty ? Icons.architecture : Icons.crop_free,
                        isSelected: _isBaseSelected,
                        onTap: () {
                          setState(() {
                            _isBaseSelected = true;
                            _selectedCutout = null;
                          });
                        },
                      ),
                      ..._cutouts.map((cutout) {
                        final isSelected = _selectedCutout?.id == cutout.id;
                        IconData icon;
                        if (cutout.type == CutoutType.circle) {
                          icon = Icons.circle_outlined;
                        } else if (cutout.type == CutoutType.pill) {
                          icon = Icons.brightness_1_outlined;
                        } else if (cutout.type == CutoutType.slit) {
                          icon = Icons.remove;
                        } else {
                          icon = Icons.crop_square_outlined;
                        }
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(width: 8),
                            _buildActiveComponentBtn(
                              icon: icon,
                              isSelected: isSelected,
                              onTap: () {
                                setState(() {
                                  _selectedCutout = cutout;
                                  _isBaseSelected = false;
                                });
                              },
                            ),
                          ],
                        );
                      }).toList(),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Colors.grey),

          // Properties Inspector Panel (No Tabs)
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2)),
              ],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 12, left: 16, right: 16),
                    child: Row(
                      children: [
                        const Icon(Icons.tune, size: 16, color: Colors.blueGrey),
                        const SizedBox(width: 8),
                        Text(
                          _isBaseSelected ? 'Base Shape Properties' : 'Cutout Properties',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 12, color: Colors.grey),
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                    child: _isBaseSelected ? _buildBaseInspector() : _buildCutoutInspector(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBtn(int index, String label, IconData icon) {
    final isSelected = _bottomTabIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _bottomTabIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isSelected ? Theme.of(context).colorScheme.primary : Colors.transparent,
                width: 2.0,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: isSelected ? Theme.of(context).colorScheme.primary : Colors.blueGrey),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? Theme.of(context).colorScheme.primary : Colors.blueGrey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildComponentsLayerList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Interactive Layer Manager',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey),
            ),
            if (_customBaseOutline.isNotEmpty)
              TextButton.icon(
                onPressed: () => setState(() => _customBaseOutline = []),
                icon: const Icon(Icons.refresh, size: 14),
                label: const Text('Reset Outline', style: TextStyle(fontSize: 10)),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          height: 150,
          child: ListView.separated(
            itemCount: _cutouts.length + 1,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              if (index == 0) {
                // The Base template layer
                final isSelected = _isBaseSelected;
                return ListTile(
                  dense: true,
                  selected: isSelected,
                  leading: Icon(
                    _customBaseOutline.isNotEmpty ? Icons.architecture : Icons.crop_free,
                    color: Colors.black87,
                  ),
                  title: Text(
                    _customBaseOutline.isNotEmpty ? 'Custom PLT Vector Base' : 'Rectangular Base Outline',
                    style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
                  ),
                  subtitle: Text('${_baseWidth.toInt()}mm x ${_baseHeight.toInt()}mm'),
                  onTap: () {
                    setState(() {
                      _isBaseSelected = true;
                      _selectedCutout = null;
                      _bottomTabIndex = 0; // jump back to editor properties
                    });
                  },
                );
              }

              final cutout = _cutouts[index - 1];
              final isSelected = _selectedCutout?.id == cutout.id;

              return ListTile(
                dense: true,
                selected: isSelected,
                leading: Icon(
                  cutout.type == CutoutType.circle
                      ? Icons.circle_outlined
                      : cutout.type == CutoutType.pill
                          ? Icons.brightness_1_outlined
                          : cutout.type == CutoutType.slit
                              ? Icons.remove
                              : Icons.crop_square_outlined,
                  color: Colors.red,
                ),
                title: Text(
                  '${cutout.type.name.toUpperCase()} Cutout',
                  style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
                ),
                subtitle: Text('Size: ${cutout.width.toInt()}x${cutout.height.toInt()}mm, Pos: X:${cutout.x.toInt()}, Y:${cutout.y.toInt()}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Rearrange order button
                    IconButton(
                      icon: const Icon(Icons.arrow_upward, size: 16),
                      onPressed: index > 1
                          ? () {
                              _saveToHistory();
                              setState(() {
                                final temp = _cutouts[index - 1];
                                _cutouts[index - 1] = _cutouts[index - 2];
                                _cutouts[index - 2] = temp;
                              });
                            }
                          : null,
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                      onPressed: () {
                        _saveToHistory();
                        setState(() {
                          _cutouts.removeAt(index - 1);
                          if (_selectedCutout?.id == cutout.id) {
                            _selectedCutout = null;
                            _isBaseSelected = true;
                          }
                        });
                      },
                    ),
                  ],
                ),
                onTap: () {
                  setState(() {
                    _selectedCutout = cutout;
                    _isBaseSelected = false;
                    _bottomTabIndex = 0; // jump back to editor properties
                  });
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAddBlockBtn(CutoutType type, String label, IconData icon) {
    return Expanded(
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          side: BorderSide(color: Colors.grey[300]!),
        ),
        onPressed: () => _addCutout(type),
        child: Column(
          children: [
            Icon(icon, size: 18, color: Colors.black87),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 9, color: Colors.black87)),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveComponentBtn({
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: BorderSide(
          color: isSelected ? Theme.of(context).colorScheme.primary : Colors.grey[300]!,
          width: isSelected ? 2.0 : 1.0,
        ),
        backgroundColor: isSelected ? Theme.of(context).colorScheme.primary.withOpacity(0.05) : Colors.transparent,
      ),
      onPressed: onTap,
      child: Icon(
        icon,
        size: 20,
        color: isSelected ? Theme.of(context).colorScheme.primary : Colors.black87,
      ),
    );
  }

  Widget _buildBaseInspector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Base Shape Properties (Snaps to 1mm)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            if (_customBaseOutline.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: const BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.all(Radius.circular(8))),
                child: const Text('PLT Vector Active', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Width (mm)',
                _baseWidth,
                40.0,
                450.0,
                _customBaseOutline.isNotEmpty
                    ? null
                    : (val) => setState(() => _baseWidth = _snap(val)),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Height (mm)',
                _baseHeight,
                40.0,
                350.0,
                _customBaseOutline.isNotEmpty
                    ? null
                    : (val) => setState(() => _baseHeight = _snap(val)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _buildInspectorSlider(
          'Corner Radius (mm)',
          _baseCornerRadius,
          0.0,
          30.0,
          _customBaseOutline.isNotEmpty
              ? null
              : (val) => setState(() => _baseCornerRadius = _snap(val)),
        ),
      ],
    );
  }

  Widget _buildCutoutInspector() {
    if (_selectedCutout == null) return const SizedBox.shrink();
    final c = _selectedCutout!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${c.type.name.toUpperCase()} Cutout Properties',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            Text(
              'Pos: X:${c.x.toInt()}mm, Y:${c.y.toInt()}mm',
              style: const TextStyle(color: Colors.blueGrey, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Width (mm)',
                c.width,
                2.0,
                120.0,
                (val) {
                  setState(() {
                    final double newW = _snap(val);
                    final idx = _cutouts.indexWhere((item) => item.id == c.id);
                    if (idx != -1) {
                      _cutouts[idx] = c.copyWith(width: newW);
                      _selectedCutout = _cutouts[idx];
                    }
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Height (mm)',
                c.height,
                2.0,
                120.0,
                (val) {
                  setState(() {
                    final double newH = _snap(val);
                    final idx = _cutouts.indexWhere((item) => item.id == c.id);
                    if (idx != -1) {
                      _cutouts[idx] = c.copyWith(height: newH);
                      _selectedCutout = _cutouts[idx];
                    }
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Align X Offset (mm)',
                c.x,
                0.0,
                _baseWidth - c.width,
                (val) {
                  setState(() {
                    final double newX = _snap(val);
                    final idx = _cutouts.indexWhere((item) => item.id == c.id);
                    if (idx != -1) {
                      _cutouts[idx] = c.copyWith(x: newX);
                      _selectedCutout = _cutouts[idx];
                    }
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Align Y Offset (mm)',
                c.y,
                0.0,
                _baseHeight - c.height,
                (val) {
                  setState(() {
                    final double newY = _snap(val);
                    final idx = _cutouts.indexWhere((item) => item.id == c.id);
                    if (idx != -1) {
                      _cutouts[idx] = c.copyWith(y: newY);
                      _selectedCutout = _cutouts[idx];
                    }
                  });
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInspectorSlider(String label, double val, double minVal, double maxVal, ValueChanged<double>? onChanged) {
    final isEnabled = onChanged != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.blueGrey)),
            Text('${val.toInt()} mm', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isEnabled ? Colors.black87 : Colors.grey)),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 2,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
          ),
          child: Slider(
            value: val.clamp(minVal, maxVal),
            min: minVal,
            max: maxVal,
            onChangeStart: isEnabled ? (v) => _saveToHistory() : null,
            onChanged: isEnabled ? onChanged : null,
          ),
        ),
      ],
    );
  }
}

class CanvasGridPainter extends CustomPainter {
  final double baseWidth;
  final double baseHeight;
  final double baseCornerRadius;
  final List<Offset> customBaseOutline;
  final List<CutoutShape> cutouts;
  final CutoutShape? selectedCutout;
  final bool isBaseSelected;
  final double scale;
  final double canvasLeft;
  final double canvasTop;

  CanvasGridPainter({
    required this.baseWidth,
    required this.baseHeight,
    required this.baseCornerRadius,
    required this.customBaseOutline,
    required this.cutouts,
    required this.selectedCutout,
    required this.isBaseSelected,
    required this.scale,
    required this.canvasLeft,
    required this.canvasTop,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw 1mm scale Grid
    final gridPaint = Paint()
      ..color = Colors.grey[300]!
      ..strokeWidth = 0.5;

    final majorGridPaint = Paint()
      ..color = Colors.grey[400]!
      ..strokeWidth = 1.0;

    final double gridStepMm = scale < 1.2 ? 10.0 : 5.0;

    for (double x = 0; x < size.width; x += gridStepMm * scale) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), x % (gridStepMm * 2 * scale) == 0 ? majorGridPaint : gridPaint);
    }
    for (double y = 0; y < size.height; y += gridStepMm * scale) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), y % (gridStepMm * 2 * scale) == 0 ? majorGridPaint : gridPaint);
    }

    // 2. Draw Outer Screen Bounding Box Outline
    final basePaint = Paint()
      ..color = Colors.black87
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    final baseOutlinePath = Path();
    if (customBaseOutline.isNotEmpty) {
      final start = customBaseOutline.first;
      baseOutlinePath.moveTo(canvasLeft + start.dx * scale, canvasTop + start.dy * scale);
      for (int i = 1; i < customBaseOutline.length; i++) {
        final pt = customBaseOutline[i];
        baseOutlinePath.lineTo(canvasLeft + pt.dx * scale, canvasTop + pt.dy * scale);
      }
      baseOutlinePath.close();
      canvas.drawPath(baseOutlinePath, basePaint);
    } else {
      final baseRect = RRect.fromRectAndRadius(
        Rect.fromLTWH(canvasLeft, canvasTop, baseWidth * scale, baseHeight * scale),
        Radius.circular(baseCornerRadius * scale),
      );
      canvas.drawRRect(baseRect, basePaint);
    }

    // If Base Shape is selected, draw highlight outline
    if (isBaseSelected) {
      final selectPaint = Paint()
        ..color = Colors.blue.withOpacity(0.3)
        ..strokeWidth = 3.0
        ..style = PaintingStyle.stroke;

      if (customBaseOutline.isNotEmpty) {
        canvas.drawPath(baseOutlinePath, selectPaint);
      } else {
        final baseRect = RRect.fromRectAndRadius(
          Rect.fromLTWH(canvasLeft, canvasTop, baseWidth * scale, baseHeight * scale),
          Radius.circular(baseCornerRadius * scale),
        );
        canvas.drawRRect(baseRect, selectPaint);

        // Draw resize handles for Width and Height (only if standard rectangle outline is active)
        final handlePaint = Paint()
          ..color = Colors.blue
          ..style = PaintingStyle.fill;

        canvas.drawCircle(Offset(canvasLeft + baseWidth * scale, canvasTop + (baseHeight / 2) * scale), 8, handlePaint);
        canvas.drawCircle(Offset(canvasLeft + (baseWidth / 2) * scale, canvasTop + baseHeight * scale), 8, handlePaint);
      }
    }

    // 3. Draw Cutouts
    final cutoutPaint = Paint()
      ..color = Colors.red
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    for (final c in cutouts) {
      final double cLeft = canvasLeft + c.x * scale;
      final double cTop = canvasTop + c.y * scale;
      final double cW = c.width * scale;
      final double cH = c.height * scale;

      final isSelected = selectedCutout?.id == c.id;

      if (c.type == CutoutType.circle) {
        canvas.drawCircle(Offset(cLeft + cW / 2, cTop + cH / 2), cW / 2, cutoutPaint);
      } else if (c.type == CutoutType.rect) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(Rect.fromLTWH(cLeft, cTop, cW, cH), Radius.circular(c.cornerRadius * scale)),
          cutoutPaint,
        );
      } else if (c.type == CutoutType.slit || c.type == CutoutType.pill) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(Rect.fromLTWH(cLeft, cTop, cW, cH), Radius.circular(cH / 2)),
          cutoutPaint,
        );
      }

      // 4. Draw select highlights and guide rules if cutout is selected
      if (isSelected) {
        final highlightPaint = Paint()
          ..color = Colors.blue.withOpacity(0.2)
          ..strokeWidth = 1.5
          ..style = PaintingStyle.stroke;
        canvas.drawRect(Rect.fromLTWH(cLeft - 2, cTop - 2, cW + 4, cH + 4), highlightPaint);

        final handlePaint = Paint()
          ..color = Colors.blue
          ..style = PaintingStyle.fill;
        canvas.drawCircle(Offset(cLeft + cW, cTop + cH), 6, handlePaint);

        final rulerPaint = Paint()
          ..color = Colors.blueGrey
          ..strokeWidth = 1.0
          ..style = PaintingStyle.stroke;

        // Top edge guide line
        canvas.drawLine(Offset(cLeft + cW / 2, cTop), Offset(cLeft + cW / 2, canvasTop), rulerPaint);
        _drawText(canvas, '${c.y.toInt()} mm', Offset(cLeft + cW / 2 + 4, canvasTop + (c.y * scale) / 2));

        // Left edge guide line
        canvas.drawLine(Offset(cLeft, cTop + cH / 2), Offset(canvasLeft, cTop + cH / 2), rulerPaint);
        _drawText(canvas, '${c.x.toInt()} mm', Offset(canvasLeft + (c.x * scale) / 2 - 15, cTop + cH / 2 - 14));

        // Right edge guide line
        final double distRight = baseWidth - (c.x + c.width);
        canvas.drawLine(Offset(cLeft + cW, cTop + cH / 2), Offset(canvasLeft + baseWidth * scale, cTop + cH / 2), rulerPaint);
        _drawText(canvas, '${distRight.toInt()} mm', Offset(cLeft + cW + (distRight * scale) / 2 - 15, cTop + cH / 2 - 14));

        // Bottom edge guide line
        final double distBottom = baseHeight - (c.y + c.height);
        canvas.drawLine(Offset(cLeft + cW / 2, cTop + cH), Offset(cLeft + cW / 2, canvasTop + baseHeight * scale), rulerPaint);
        _drawText(canvas, '${distBottom.toInt()} mm', Offset(cLeft + cW / 2 + 4, cTop + cH + (distBottom * scale) / 2 - 6));
      }
    }
  }

  void _drawText(Canvas canvas, String text, Offset offset) {
    final textSpan = TextSpan(
      text: text,
      style: const TextStyle(color: Colors.blueGrey, fontSize: 9, fontWeight: FontWeight.bold),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant CanvasGridPainter oldDelegate) => true;
}

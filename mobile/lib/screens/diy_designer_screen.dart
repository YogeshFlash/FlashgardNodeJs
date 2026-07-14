import 'dart:math';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:async';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/plotter_service.dart';
import '../providers/auth_provider.dart';
import 'package:google_fonts/google_fonts.dart';

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

class DecalElement {
  final String id;
  final String imageUrl;
  final String name;
  final String? modelId;
  double x; // X position relative to top-left of base shape in mm
  double y; // Y position relative to top-left of base shape in mm
  double width; // in mm
  double height; // in mm

  DecalElement({
    required this.id,
    required this.imageUrl,
    required this.name,
    this.modelId,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  DecalElement copyWith({
    double? x,
    double? y,
    double? width,
    double? height,
  }) {
    return DecalElement(
      id: id,
      imageUrl: imageUrl,
      name: name,
      modelId: modelId,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
    );
  }
}

class TextElement {
  final String id;
  final String text;
  double x; // X position relative to top-left of base shape in mm
  double y; // Y position relative to top-left of base shape in mm
  double width; // in mm
  double height; // in mm
  final String fontFamily;
  final bool isBold;
  final bool isItalic;
  final bool isUnderline;

  TextElement({
    required this.id,
    required this.text,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    this.fontFamily = 'Roboto',
    this.isBold = false,
    this.isItalic = false,
    this.isUnderline = false,
  });

  TextElement copyWith({
    String? text,
    double? x,
    double? y,
    double? width,
    double? height,
    String? fontFamily,
    bool? isBold,
    bool? isItalic,
    bool? isUnderline,
  }) {
    return TextElement(
      id: id,
      text: text ?? this.text,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
      fontFamily: fontFamily ?? this.fontFamily,
      isBold: isBold ?? this.isBold,
      isItalic: isItalic ?? this.isItalic,
      isUnderline: isUnderline ?? this.isUnderline,
    );
  }
}

class DesignerStateHistory {
  final double baseWidth;
  final double baseHeight;
  final double baseCornerRadius;
  final List<Offset> customBaseOutline;
  final List<CutoutShape> cutouts;
  final List<DecalElement> decals;
  final List<TextElement> texts;
  final String? selectedCutoutId;
  final String? selectedDecalId;
  final String? selectedTextId;
  final bool isBaseSelected;

  DesignerStateHistory({
    required this.baseWidth,
    required this.baseHeight,
    required this.baseCornerRadius,
    required this.customBaseOutline,
    required this.cutouts,
    required this.decals,
    required this.texts,
    required this.selectedCutoutId,
    required this.selectedDecalId,
    required this.selectedTextId,
    required this.isBaseSelected,
  });

  DesignerStateHistory.clone({
    required double baseWidth,
    required double baseHeight,
    required double baseCornerRadius,
    required List<Offset> customBaseOutline,
    required List<CutoutShape> cutouts,
    required List<DecalElement> decals,
    required List<TextElement> texts,
    required String? selectedCutoutId,
    required String? selectedDecalId,
    required String? selectedTextId,
    required bool isBaseSelected,
  })  : baseWidth = baseWidth,
        baseHeight = baseHeight,
        baseCornerRadius = baseCornerRadius,
        customBaseOutline = List<Offset>.from(customBaseOutline),
        cutouts = cutouts.map((c) => c.copyWith()).toList(),
        decals = decals.map((d) => d.copyWith()).toList(),
        texts = texts.map((t) => t.copyWith()).toList(),
        selectedCutoutId = selectedCutoutId,
        selectedDecalId = selectedDecalId,
        selectedTextId = selectedTextId,
        isBaseSelected = isBaseSelected;
}

class DiyDesignerScreen extends StatefulWidget {
  final String? initialCutFileId;
  final String? modelId;
  final String? title;

  const DiyDesignerScreen({super.key, this.initialCutFileId, this.modelId, this.title});

  @override
  State<DiyDesignerScreen> createState() => _DiyDesignerScreenState();
}

class _DiyDesignerScreenState extends State<DiyDesignerScreen> {
  final PlotterService _plotterService = PlotterService();
  String? _originalPltContent;
  bool _diyModeEnabled = false;

  // PLT coordinate tracking for merging back to plotter
  double _originMinX = 0.0;
  double _originMinY = 0.0;
  double _originGlobalMaxY = 0.0;
  
  // Base dimensions in mm
  double _baseWidth = 300.0;
  double _baseHeight = 200.0;
  double _baseCornerRadius = 8.0;

  // Custom outline points parsed from PLT
  List<Offset> _customBaseOutline = [];
  List<List<Offset>> _normalizedCutoutPaths = [];

  // Cutouts, Decals and Text layers
  final List<CutoutShape> _cutouts = [];
  final List<DecalElement> _decals = [];
  final List<TextElement> _texts = [];
  
  CutoutShape? _selectedCutout;
  DecalElement? _selectedDecal;
  TextElement? _selectedText;
  bool _isBaseSelected = true;

  // Drag interaction states
  String? _activeDragType; // 'move', 'resize-base-w', 'resize-base-h', 'resize-cutout', 'move-decal', 'resize-decal', 'move-text', 'resize-text'
  Offset _dragStartOffset = Offset.zero;
  double _dragStartValX = 0.0;
  double _dragStartValY = 0.0;
  double _dragStartWidth = 0.0;
  double _dragStartHeight = 0.0;

  // Layout scale mapping
  double _scale = 1.0;
  double _canvasLeft = 0.0;
  double _canvasTop = 0.0;

  // Plotter settings
  int _selectedSpeed = 300;
  int _selectedForce = 300;

  // Undo / Redo Stacks
  final List<DesignerStateHistory> _undoStack = [];
  final List<DesignerStateHistory> _redoStack = [];

  // Loading state
  bool _isLoading = false;
  bool _isCutting = false;
  String _loadingMessage = 'Processing...';
  int _cutProgress = 0;
  StreamSubscription<int>? _progressSubscription;

  Map<String, List<dynamic>> _categoryWiseDecals = {};
  String? _selectedSubCategoryName;
  bool _isLoadingDbDecals = false;

  // In-memory secured PLT content (never written to disk)
  String? _savedPltContent;

  Future<void> _loadDbDecals() async {
    setState(() => _isLoadingDbDecals = true);
    try {
      final res = await ApiService.getDecalsCategoryWise();
      if (mounted) {
        setState(() {
          _categoryWiseDecals = res;
          if (res.isNotEmpty) {
            _selectedSubCategoryName = res.keys.first;
          }
          _isLoadingDbDecals = false;
        });
      }
    } catch (e) {
      print('Error loading DB decals: $e');
      if (mounted) {
        setState(() => _isLoadingDbDecals = false);
      }
    }
  }

  void _saveToHistory() {
    _undoStack.add(
      DesignerStateHistory.clone(
        baseWidth: _baseWidth,
        baseHeight: _baseHeight,
        baseCornerRadius: _baseCornerRadius,
        customBaseOutline: _customBaseOutline,
        cutouts: _cutouts,
        decals: _decals,
        texts: _texts,
        selectedCutoutId: _selectedCutout?.id,
        selectedDecalId: _selectedDecal?.id,
        selectedTextId: _selectedText?.id,
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
          decals: _decals,
          texts: _texts,
          selectedCutoutId: _selectedCutout?.id,
          selectedDecalId: _selectedDecal?.id,
          selectedTextId: _selectedText?.id,
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
      
      _decals.clear();
      _decals.addAll(previous.decals);

      _texts.clear();
      _texts.addAll(previous.texts);
      
      _isBaseSelected = previous.isBaseSelected;
      
      if (previous.selectedCutoutId != null) {
        _selectedCutout = _cutouts.firstWhere(
          (c) => c.id == previous.selectedCutoutId,
          orElse: () => _cutouts.first,
        );
        _selectedDecal = null;
        _selectedText = null;
      } else if (previous.selectedDecalId != null) {
        _selectedDecal = _decals.firstWhere(
          (d) => d.id == previous.selectedDecalId,
          orElse: () => _decals.first,
        );
        _selectedCutout = null;
        _selectedText = null;
      } else if (previous.selectedTextId != null) {
        _selectedText = _texts.firstWhere(
          (t) => t.id == previous.selectedTextId,
          orElse: () => _texts.first,
        );
        _selectedCutout = null;
        _selectedDecal = null;
      } else {
        _selectedCutout = null;
        _selectedDecal = null;
        _selectedText = null;
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
          decals: _decals,
          texts: _texts,
          selectedCutoutId: _selectedCutout?.id,
          selectedDecalId: _selectedDecal?.id,
          selectedTextId: _selectedText?.id,
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

      _decals.clear();
      _decals.addAll(next.decals);

      _texts.clear();
      _texts.addAll(next.texts);

      _isBaseSelected = next.isBaseSelected;

      if (next.selectedCutoutId != null) {
        _selectedCutout = _cutouts.firstWhere(
          (c) => c.id == next.selectedCutoutId,
          orElse: () => _cutouts.first,
        );
        _selectedDecal = null;
        _selectedText = null;
      } else if (next.selectedDecalId != null) {
        _selectedDecal = _decals.firstWhere(
          (d) => d.id == next.selectedDecalId,
          orElse: () => _decals.first,
        );
        _selectedCutout = null;
        _selectedText = null;
      } else if (next.selectedTextId != null) {
        _selectedText = _texts.firstWhere(
          (t) => t.id == next.selectedTextId,
          orElse: () => _texts.first,
        );
        _selectedCutout = null;
        _selectedDecal = null;
      } else {
        _selectedCutout = null;
        _selectedDecal = null;
        _selectedText = null;
      }
    });
  }

  @override
  void initState() {
    super.initState();
    if (widget.initialCutFileId != null) {
      _fetchAndDecryptPlt(widget.initialCutFileId!);
    } else {
      _addCutout(CutoutType.circle);
    }
    _initPlotterParams();
    _loadDbDecals();
  }

  @override
  void dispose() {
    _progressSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initPlotterParams() async {
    final params = await _plotterService.getMachineParameters();
    if (params != null && mounted) {
      setState(() {
        _selectedSpeed = (params['speed'] ?? 300).clamp(10, 1000);
        _selectedForce = (params['pressure'] ?? 300).clamp(10, 1000);
      });
    }
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
        x: (_baseWidth - w) / 2,
        y: 10.0,
        width: w,
        height: h,
      );

      _cutouts.add(newCutout);
      _selectedCutout = newCutout;
      _selectedDecal = null;
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
    _originalPltContent = content;

    final regex = RegExp(r'(PU|PD)\s*(-?\d+)[\s,]+\s*(-?\d+)');
    final matches = regex.allMatches(content);
    
    List<List<Offset>> rawPaths = [];
    List<Offset> currentPath = [];

    for (final match in matches) {
      final cmd = match.group(1);
      final double xVal = double.tryParse(match.group(2) ?? '0') ?? 0.0;
      final double yVal = double.tryParse(match.group(3) ?? '0') ?? 0.0;
      
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
        const SnackBar(content: Text('No valid HP-GL PU/PD coordinates found.')),
      );
      return;
    }

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

    final List<Offset> normalizedBaseOutline = baseRawPath.map((pt) => Offset(pt.dx - minX, pt.dy - minY)).toList();
    final double computedBaseWidth = (maxX - minX).clamp(40.0, 500.0);
    final double computedBaseHeight = (maxY - minY).clamp(40.0, 350.0);

    final List<List<Offset>> normalizedCutoutPaths = [];
    for (final path in rawPaths) {
      if (path == baseRawPath) continue;
      final List<Offset> normalizedPath = path.map((pt) => Offset(pt.dx - minX, pt.dy - minY)).toList();
      normalizedCutoutPaths.add(normalizedPath);
    }

    setState(() {
      _customBaseOutline = normalizedBaseOutline;
      _normalizedCutoutPaths = normalizedCutoutPaths;
      _baseWidth = computedBaseWidth;
      _baseHeight = computedBaseHeight;
      
      _originMinX = minX;
      _originMinY = minY;
      _originGlobalMaxY = globalMaxY;
      
      _cutouts.clear();
      _decals.clear();
      _texts.clear();
      _isBaseSelected = true;
      _selectedCutout = null;
      _selectedDecal = null;
      _selectedText = null;
    });
  }

  Future<void> _fetchAndDecryptPlt(String cutFileId) async {
    setState(() => _isLoading = true);
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
    } finally {
      setState(() => _isLoading = false);
    }
  }

  double _snap(double val) => (val * 2).roundToDouble() / 2; // snap to 0.5mm

  void _handlePointerDown(Offset localPosition) {
    if (_isLoading || _isCutting) return;

    // 1. Drag base scale handles (Width, Height resize handles)
    final baseWHandle = Offset(_canvasLeft + _baseWidth * _scale, _canvasTop + (_baseHeight / 2) * _scale);
    final baseHHandle = Offset(_canvasLeft + (_baseWidth / 2) * _scale, _canvasTop + _baseHeight * _scale);

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

    // 2. Check if clicked selected cutout's resize handle
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

    // 3. Check if clicked selected decal's resize handle
    if (_selectedDecal != null) {
      final double decalRight = _canvasLeft + (_selectedDecal!.x + _selectedDecal!.width) * _scale;
      final double decalBottom = _canvasTop + (_selectedDecal!.y + _selectedDecal!.height) * _scale;
      final decalHandle = Offset(decalRight, decalBottom);

      if ((localPosition - decalHandle).distance < 20) {
        _saveToHistory();
        _activeDragType = 'resize-decal';
        _dragStartOffset = localPosition;
        _dragStartWidth = _selectedDecal!.width;
        _dragStartHeight = _selectedDecal!.height;
        return;
      }
    }

    // 3.5. Check if clicked selected text's resize handle
    if (_selectedText != null) {
      final double textRight = _canvasLeft + (_selectedText!.x + _selectedText!.width) * _scale;
      final double textBottom = _canvasTop + (_selectedText!.y + _selectedText!.height) * _scale;
      final textHandle = Offset(textRight, textBottom);

      if ((localPosition - textHandle).distance < 20) {
        _saveToHistory();
        _activeDragType = 'resize-text';
        _dragStartOffset = localPosition;
        _dragStartWidth = _selectedText!.width;
        _dragStartHeight = _selectedText!.height;
        return;
      }
    }

    // 4. Clicked inside a cutout shape
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
          _selectedDecal = null;
          _selectedText = null;
          _isBaseSelected = false;
        });

        _activeDragType = 'move';
        _dragStartOffset = localPosition;
        _dragStartValX = cutout.x;
        _dragStartValY = cutout.y;
        return;
      }
    }

    // 5. Clicked inside a decal shape
    for (int i = _decals.length - 1; i >= 0; i--) {
      final decal = _decals[i];
      final double dLeft = _canvasLeft + decal.x * _scale;
      final double dTop = _canvasTop + decal.y * _scale;
      final double dRight = dLeft + decal.width * _scale;
      final double dBottom = dTop + decal.height * _scale;

      if (localPosition.dx >= dLeft &&
          localPosition.dx <= dRight &&
          localPosition.dy >= dTop &&
          localPosition.dy <= dBottom) {
        _saveToHistory();
        setState(() {
          _selectedDecal = decal;
          _selectedCutout = null;
          _selectedText = null;
          _isBaseSelected = false;
        });

        _activeDragType = 'move-decal';
        _dragStartOffset = localPosition;
        _dragStartValX = decal.x;
        _dragStartValY = decal.y;
        return;
      }
    }

    // 5.5. Clicked inside a text element
    for (int i = _texts.length - 1; i >= 0; i--) {
      final txt = _texts[i];
      final double tLeft = _canvasLeft + txt.x * _scale;
      final double tTop = _canvasTop + txt.y * _scale;
      final double tRight = tLeft + txt.width * _scale;
      final double tBottom = tTop + txt.height * _scale;

      if (localPosition.dx >= tLeft &&
          localPosition.dx <= tRight &&
          localPosition.dy >= tTop &&
          localPosition.dy <= tBottom) {
        _saveToHistory();
        setState(() {
          _selectedText = txt;
          _selectedCutout = null;
          _selectedDecal = null;
          _isBaseSelected = false;
        });

        _activeDragType = 'move-text';
        _dragStartOffset = localPosition;
        _dragStartValX = txt.x;
        _dragStartValY = txt.y;
        return;
      }
    }

    // 6. Hit base shape
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
        _selectedDecal = null;
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
      } else if (_activeDragType == 'move-decal' && _selectedDecal != null) {
        double newX = _snap(_dragStartValX + dxMm);
        double newY = _snap(_dragStartValY + dyMm);

        newX = newX.clamp(0.0, _baseWidth - _selectedDecal!.width);
        newY = newY.clamp(0.0, _baseHeight - _selectedDecal!.height);

        final idx = _decals.indexWhere((d) => d.id == _selectedDecal!.id);
        if (idx != -1) {
          _decals[idx] = _selectedDecal!.copyWith(x: newX, y: newY);
          _selectedDecal = _decals[idx];
        }
      } else if (_activeDragType == 'move-text' && _selectedText != null) {
        double newX = _snap(_dragStartValX + dxMm);
        double newY = _snap(_dragStartValY + dyMm);

        newX = newX.clamp(0.0, _baseWidth - _selectedText!.width);
        newY = newY.clamp(0.0, _baseHeight - _selectedText!.height);

        final idx = _texts.indexWhere((t) => t.id == _selectedText!.id);
        if (idx != -1) {
          _texts[idx] = _selectedText!.copyWith(x: newX, y: newY);
          _selectedText = _texts[idx];
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
      } else if (_activeDragType == 'resize-decal' && _selectedDecal != null) {
        final double ratio = _dragStartWidth / _dragStartHeight;
        double newW = _snap(_dragStartWidth + dxMm).clamp(5.0, _baseWidth);
        double newH = _snap(newW / ratio).clamp(5.0, _baseHeight);

        if (_selectedDecal!.x + newW > _baseWidth) {
          newW = _baseWidth - _selectedDecal!.x;
          newH = _snap(newW / ratio);
        }
        if (_selectedDecal!.y + newH > _baseHeight) {
          newH = _baseHeight - _selectedDecal!.y;
          newW = _snap(newH * ratio);
        }

        final idx = _decals.indexWhere((d) => d.id == _selectedDecal!.id);
        if (idx != -1) {
          _decals[idx] = _selectedDecal!.copyWith(width: newW, height: newH);
          _selectedDecal = _decals[idx];
        }
      } else if (_activeDragType == 'resize-text' && _selectedText != null) {
        final double ratio = _dragStartWidth / _dragStartHeight;
        double newW = _snap(_dragStartWidth + dxMm).clamp(5.0, _baseWidth);
        double newH = _snap(newW / ratio).clamp(5.0, _baseHeight);

        if (_selectedText!.x + newW > _baseWidth) {
          newW = _baseWidth - _selectedText!.x;
          newH = _snap(newW / ratio);
        }
        if (_selectedText!.y + newH > _baseHeight) {
          newH = _baseHeight - _selectedText!.y;
          newW = _snap(newH * ratio);
        }

        final idx = _texts.indexWhere((t) => t.id == _selectedText!.id);
        if (idx != -1) {
          _texts[idx] = _selectedText!.copyWith(width: newW, height: newH);
          _selectedText = _texts[idx];
        }
      }
    });
  }

  void _handlePointerUp() {
    _activeDragType = null;
  }

  void _showPresetDecalsSheet() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        List<dynamic> dbDecals = [];
        bool isLoadingDb = true;

        return StatefulBuilder(
          builder: (ctx, setStateSheet) {
            // Load db decals under category "Mobile Decals" dynamically
            if (isLoadingDb) {
              ApiService.getModelsByCategoryName('Mobile Decals').then((models) {
                if (ctx.mounted) {
                  setStateSheet(() {
                    dbDecals = models;
                    isLoadingDb = false;
                  });
                }
              }).catchError((err) {
                if (ctx.mounted) {
                  setStateSheet(() => isLoadingDb = false);
                }
              });
            }

            final presets = [
              {'name': 'Carbon Fiber', 'url': 'https://images.unsplash.com/photo-1501526029524-a8ea952b15be?q=80&w=400'},
              {'name': 'Camouflage', 'url': 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400'},
              {'name': 'Wood Grain', 'url': 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=400'},
              {'name': 'Brown Leather', 'url': 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=400'},
              {'name': 'Neon Cyber', 'url': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400'},
              {'name': 'Floral Art', 'url': 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=400'},
            ];

            return Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Select Decal Skin / Texture',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      if (isLoadingDb)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  const Text('DB CATEGORY: MOBILE DECALS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueGrey)),
                  const SizedBox(height: 8),
                  
                  if (!isLoadingDb && dbDecals.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('No decals found in DB. Try checking your category "Mobile Decals" inside CRM.', style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic)),
                    ),
                  
                  if (dbDecals.isNotEmpty)
                    SizedBox(
                      height: 110,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: dbDecals.length,
                        itemBuilder: (ctx, idx) {
                          final model = dbDecals[idx];
                          final name = model['name'] ?? 'Decal';
                          final imgUrl = _getImageUrl(model);

                          return GestureDetector(
                            onTap: () {
                              Navigator.pop(context);
                              _addDecal(name, imgUrl, model['id']?.toString());
                            },
                            child: Container(
                              margin: const EdgeInsets.only(right: 12),
                              width: 90,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.indigo.withOpacity(0.3), width: 1.5),
                              ),
                              child: Column(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                                      child: Image.network(
                                        imgUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (ctx, err, stack) => const Icon(Icons.broken_image, color: Colors.grey),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(6),
                                    child: Text(name, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  
                  const SizedBox(height: 16),
                  const Text('PRESET TEXTURES', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueGrey)),
                  const SizedBox(height: 8),
                  
                  SizedBox(
                    height: 110,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: presets.length,
                      itemBuilder: (ctx, idx) {
                        final p = presets[idx];
                        return GestureDetector(
                          onTap: () {
                            Navigator.pop(context);
                            _addDecal(p['name']!, p['url']!);
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 12),
                            width: 90,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Column(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                                    child: Image.network(p['url']!, fit: BoxFit.cover),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: Text(p['name']!, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _addDecal(String name, String url, [String? modelId]) {
    _saveToHistory();
    setState(() {
      final id = 'decal_${DateTime.now().millisecondsSinceEpoch}';
      // Default to 40% of canvas width, maintain 1:1 aspect ratio, centred
      final double defaultW = (_baseWidth * 0.40).clamp(20.0, _baseWidth);
      final double defaultH = defaultW.clamp(20.0, _baseHeight);
      final double defaultX = ((_baseWidth - defaultW) / 2);
      final double defaultY = ((_baseHeight - defaultH) / 2);
      final newDecal = DecalElement(
        id: id,
        name: name,
        imageUrl: url,
        modelId: modelId,
        x: defaultX,
        y: defaultY,
        width: defaultW,
        height: defaultH,
      );
      _decals.add(newDecal);
      _selectedDecal = newDecal;
      _selectedCutout = null;
      _isBaseSelected = false;
    });
  }

  void _deleteSelectedDecal() {
    if (_selectedDecal != null) {
      _saveToHistory();
      setState(() {
        _decals.removeWhere((d) => d.id == _selectedDecal!.id);
        _selectedDecal = null;
        _isBaseSelected = true;
      });
    }
  }

  void _addText(String text) {
    _saveToHistory();
    setState(() {
      final id = 'text_${DateTime.now().millisecondsSinceEpoch}';
      // Calculate sensible bounding box based on length: approx 8mm per character, height 12mm
      final double computedW = (text.length * 8.0).clamp(15.0, _baseWidth);
      final double computedH = 12.0;
      final double defaultX = ((_baseWidth - computedW) / 2);
      final double defaultY = ((_baseHeight - computedH) / 2);

      final newText = TextElement(
        id: id,
        text: text,
        x: defaultX,
        y: defaultY,
        width: computedW,
        height: computedH,
      );
      _texts.add(newText);
      _selectedText = newText;
      _selectedDecal = null;
      _selectedCutout = null;
      _isBaseSelected = false;
    });
  }

  void _deleteSelectedText() {
    if (_selectedText != null) {
      _saveToHistory();
      setState(() {
        _texts.removeWhere((t) => t.id == _selectedText!.id);
        _selectedText = null;
        _isBaseSelected = true;
      });
    }
  }

  void _showAddTextDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Text Decal'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter text (e.g. NAME)',
            border: OutlineInputBorder(),
          ),
          textCapitalization: TextCapitalization.characters,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                _addText(text);
              }
              Navigator.pop(context);
            },
            child: const Text('ADD'),
          ),
        ],
      ),
    );
  }

  // Plotter Cutting Workflow
  Future<void> _startCutting() async {
    if (widget.initialCutFileId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot cut a custom blank workspace. Select a device template first.')),
      );
      return;
    }

    final isConnected = await _plotterService.isConnected();
    if (!isConnected) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Plotter Not Connected'),
          content: const Text('Please connect to the plotter in settings before cutting.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          ],
        ),
      );
      return;
    }

    // Show cut parameters confirm
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Confirm Cut Output'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Send the final design vector lines to the plotter machine?'),
              const SizedBox(height: 16),
              const Text('Cutting Speed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Slider(
                value: _selectedSpeed.toDouble().clamp(10.0, 1000.0),
                min: 10,
                max: 1000,
                divisions: 99,
                label: '$_selectedSpeed',
                onChanged: (val) => setDialogState(() => _selectedSpeed = val.toInt()),
              ),
              const SizedBox(height: 8),
              const Text('Cutting Force / Pressure', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Slider(
                value: _selectedForce.toDouble().clamp(10.0, 1000.0),
                min: 10,
                max: 1000,
                divisions: 99,
                label: '$_selectedForce',
                onChanged: (val) => setDialogState(() => _selectedForce = val.toInt()),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _handlePlotterCut();
              },
              child: const Text('START CUT'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handlePlotterCut() async {
    setState(() {
      _isCutting = true;
      _loadingMessage = 'Validating Cut Token...';
      _cutProgress = 0;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final validation = await ApiService.validateCut(
        licenseKey: authProvider.licenseKey,
        organizationId: authProvider.organizationId,
        modelId: widget.modelId ?? '',
      );

      if (validation == null || validation['valid'] != true || validation['cutToken'] == null) {
        final reason = validation?['error'] ?? 'Insufficient credits or inactive license.';
        throw Exception('Cut validation failed: $reason');
      }

      final cutToken = validation['cutToken'] as String;

      setState(() {
        _loadingMessage = 'Sending Vector to Plotter...';
      });

      // Listen to progress
      _progressSubscription = _plotterService.progressStream.listen((progress) {
        if (mounted) {
          setState(() {
            _cutProgress = progress;
            _loadingMessage = 'Cutting: $progress%';
          });
        }
      });

      // Use already-saved in-memory PLT if available; otherwise rebuild it now
      final contentToCut = _savedPltContent?.isNotEmpty == true
          ? _savedPltContent!
          : await _getMergedPltContent();
      if (contentToCut.isEmpty) {
        throw Exception('Invalid vector cut data.');
      }

      final success = await _plotterService.cutFile(
        content: contentToCut,
        name: 'DecalSkin',
        speed: _selectedSpeed,
        force: _selectedForce,
        width: _baseWidth,
        height: _baseHeight,
      );

      if (success) {
        try {
          await ApiService.logCut(
            cutToken: cutToken,
            plotterId: _plotterService.connectedName ?? 'Plotter',
            isPositiveCut: true,
          );
        } catch (e) {
          print('Error logging cut on server: $e');
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Decal skin cut completed successfully!' : 'Plotter cut failed.'),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (e) {
      print('Cut failed: $e');
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Error Cutting'),
            content: Text(e.toString().replaceAll('Exception:', '')),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
            ],
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCutting = false;
        });
        _progressSubscription?.cancel();
        _progressSubscription = null;
      }
    }
  }

  TextStyle _getFontStyle(TextElement decalText) {
    final baseStyle = TextStyle(
      fontWeight: decalText.isBold ? FontWeight.bold : FontWeight.normal,
      fontStyle: decalText.isItalic ? FontStyle.italic : FontStyle.normal,
      decoration: decalText.isUnderline ? TextDecoration.underline : TextDecoration.none,
      color: Colors.black,
    );
    try {
      return GoogleFonts.getFont(decalText.fontFamily, textStyle: baseStyle);
    } catch (e) {
      return baseStyle.copyWith(fontFamily: decalText.fontFamily);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text(
          widget.title ?? 'Skin & Decal Canvas',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: _diyModeEnabled ? [
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
            onPressed: _selectedCutout != null
                ? _deleteSelectedCutout
                : (_selectedDecal != null
                    ? _deleteSelectedDecal
                    : (_selectedText != null ? _deleteSelectedText : null)),
            tooltip: 'Delete Selected',
          ),
        ] : null,
      ),
      body: Stack(
        children: [
          if (!_diyModeEnabled)
            Column(
              children: [
                Expanded(
                  child: Center(
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8)),
                        ],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: _isLoading
                          ? const Center(child: CircularProgressIndicator())
                          : LayoutBuilder(
                              builder: (context, constraints) {
                                final double requiredW = _baseWidth + 40.0;
                                final double requiredH = _baseHeight + 40.0;
                                final double scaleW = constraints.maxWidth / requiredW;
                                final double scaleH = constraints.maxHeight / requiredH;
                                final double previewScale = min(scaleW, scaleH);

                                final double previewLeft = (constraints.maxWidth - _baseWidth * previewScale) / 2;
                                final double previewTop = (constraints.maxHeight - _baseHeight * previewScale) / 2;

                                return CustomPaint(
                                  size: Size(constraints.maxWidth, constraints.maxHeight),
                                  painter: CanvasGridPainter(
                                    baseWidth: _baseWidth,
                                    baseHeight: _baseHeight,
                                    baseCornerRadius: _baseCornerRadius,
                                    customBaseOutline: _customBaseOutline,
                                    normalizedCutoutPaths: _normalizedCutoutPaths,
                                    isBaseSelected: false,
                                    scale: previewScale,
                                    canvasLeft: previewLeft,
                                    canvasTop: previewTop,
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    boxShadow: [
                      BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -2)),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _isLoading ? null : _startCutting,
                            icon: const Icon(Icons.bolt, size: 20),
                            label: const Text('CUT DESIGN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFCE1D19),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _isLoading ? null : () {
                              setState(() {
                                _diyModeEnabled = true;
                              });
                            },
                            icon: const Icon(Icons.palette_outlined, size: 20),
                            label: const Text('ADD DECALS (DIY)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.indigo,
                              side: const BorderSide(color: Colors.indigo, width: 2),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
          else
            Column(
              children: [
                // Tool Drawer (Add items)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  child: Column(
                    key: const ValueKey('decal_editor_drawer'),
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Decal Canvas Actions',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueGrey),
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              TextButton.icon(
                                onPressed: _showAddTextDialog,
                                icon: const Icon(Icons.title, size: 14, color: Colors.indigo),
                                label: const Text(
                                  'Add Text',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.indigo),
                                ),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                              ),
                              const SizedBox(width: 16),
                              TextButton.icon(
                                onPressed: _showPresetDecalsSheet,
                                icon: const Icon(Icons.brush, size: 14, color: Colors.indigo),
                                label: const Text(
                                  'Insert Mobile Decals',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.indigo),
                                ),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      if (_isLoadingDbDecals) ...[
                        const SizedBox(height: 12),
                        const Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))),
                      ] else if (_categoryWiseDecals.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: _categoryWiseDecals.keys.map((subCat) {
                              final isSelected = _selectedSubCategoryName == subCat;
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text(
                                    subCat,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected ? Colors.white : Colors.black87,
                                    ),
                                  ),
                                  selected: isSelected,
                                  selectedColor: Colors.indigo,
                                  backgroundColor: Colors.grey[100],
                                  visualDensity: VisualDensity.compact,
                                  onSelected: (val) {
                                    setState(() {
                                      _selectedSubCategoryName = subCat;
                                    });
                                  },
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (_selectedSubCategoryName != null && _categoryWiseDecals[_selectedSubCategoryName] != null)
                          SizedBox(
                            height: 80,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: _categoryWiseDecals[_selectedSubCategoryName]!.length,
                              itemBuilder: (ctx, idx) {
                                final model = _categoryWiseDecals[_selectedSubCategoryName]![idx];
                                final name = model['name'] ?? 'Decal';
                                final imgUrl = _getImageUrl(model);

                                return GestureDetector(
                                  onTap: () => _addDecal(name, imgUrl, model['id']?.toString()),
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 12),
                                    width: 70,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.grey[200]!),
                                    ),
                                    child: Column(
                                      children: [
                                        Expanded(
                                          child: ClipRRect(
                                            borderRadius: const BorderRadius.vertical(top: Radius.circular(7)),
                                            child: Image.network(
                                              imgUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (ctx, err, stack) => const Icon(Icons.broken_image, size: 20, color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                                          child: Text(
                                            name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                      ],
                    ],
                  ),
                ),

                // Canvas Frame
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : LayoutBuilder(
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
                                child: Stack(
                                  children: [
                                    // Grid & Base Canvas Lines
                                    CustomPaint(
                                      size: Size(constraints.maxWidth, constraints.maxHeight),
                                      painter: CanvasGridPainter(
                                        baseWidth: _baseWidth,
                                        baseHeight: _baseHeight,
                                        baseCornerRadius: _baseCornerRadius,
                                        customBaseOutline: _customBaseOutline,
                                        normalizedCutoutPaths: _normalizedCutoutPaths,
                                        isBaseSelected: _isBaseSelected,
                                        scale: _scale,
                                        canvasLeft: _canvasLeft,
                                        canvasTop: _canvasTop,
                                      ),
                                    ),

                                    // Clipped Decals Overlay (including Text elements)
                                    ClipPath(
                                      clipper: BaseOutlineClipper(
                                        outline: _customBaseOutline,
                                        baseWidth: _baseWidth,
                                        baseHeight: _baseHeight,
                                        baseCornerRadius: _baseCornerRadius,
                                        scale: _scale,
                                        canvasLeft: _canvasLeft,
                                        canvasTop: _canvasTop,
                                      ),
                                      child: SizedBox(
                                        width: constraints.maxWidth,
                                        height: constraints.maxHeight,
                                        child: Stack(
                                          children: [
                                            ..._decals.map((decal) {
                                              final double dLeft = _canvasLeft + decal.x * _scale;
                                              final double dTop = _canvasTop + decal.y * _scale;
                                              final double dW = decal.width * _scale;
                                              final double dH = decal.height * _scale;
                                              return Positioned(
                                                left: dLeft,
                                                top: dTop,
                                                width: dW,
                                                height: dH,
                                                child: Container(
                                                  color: Colors.transparent,
                                                  child: ColorFiltered(
                                                    colorFilter: const ColorFilter.matrix(<double>[
                                                      1, 0, 0, 0, 0,
                                                      0, 1, 0, 0, 0,
                                                      0, 0, 1, 0, 0,
                                                      -0.333, -0.333, -0.333, 1, 0,
                                                    ]),
                                                    child: Image.network(
                                                      decal.imageUrl,
                                                      fit: BoxFit.contain,
                                                      errorBuilder: (ctx, err, stack) =>
                                                          Container(color: Colors.blueGrey[100]),
                                                    ),
                                                  ),
                                                ),
                                              );
                                            }),
                                            ..._texts.map((decalText) {
                                              final double dLeft = _canvasLeft + decalText.x * _scale;
                                              final double dTop = _canvasTop + decalText.y * _scale;
                                              final double dW = decalText.width * _scale;
                                              final double dH = decalText.height * _scale;
                                              return Positioned(
                                                left: dLeft,
                                                top: dTop,
                                                width: dW,
                                                height: dH,
                                                child: Center(
                                                  child: FittedBox(
                                                    fit: BoxFit.contain,
                                                    child: Text(
                                                      decalText.text,
                                                      style: _getFontStyle(decalText),
                                                    ),
                                                  ),
                                                ),
                                              );
                                            }),
                                          ],
                                        ),
                                      ),
                                    ),

                                    // Interactive Highlight Boundaries (Visuals only, no tap block)
                                    if (_selectedDecal != null) ...[
                                      (() {
                                        final double dLeft = _canvasLeft + _selectedDecal!.x * _scale;
                                        final double dTop = _canvasTop + _selectedDecal!.y * _scale;
                                        final double dW = _selectedDecal!.width * _scale;
                                        final double dH = _selectedDecal!.height * _scale;
                                        return Positioned(
                                          left: dLeft - 2,
                                          top: dTop - 2,
                                          width: dW + 4,
                                          height: dH + 4,
                                          child: IgnorePointer(
                                            child: Container(
                                              decoration: BoxDecoration(
                                                border: Border.all(color: Colors.indigo, width: 2.0),
                                              ),
                                            ),
                                          ),
                                        );
                                      })(),
                                      (() {
                                        final double dRight = _canvasLeft + (_selectedDecal!.x + _selectedDecal!.width) * _scale;
                                        final double dBottom = _canvasTop + (_selectedDecal!.y + _selectedDecal!.height) * _scale;
                                        return Positioned(
                                          left: dRight - 8,
                                          top: dBottom - 8,
                                          width: 16,
                                          height: 16,
                                          child: IgnorePointer(
                                            child: Container(
                                              decoration: const BoxDecoration(
                                                color: Colors.indigo,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          ),
                                        );
                                      })(),
                                    ],

                                    if (_selectedText != null) ...[
                                      (() {
                                        final double dLeft = _canvasLeft + _selectedText!.x * _scale;
                                        final double dTop = _canvasTop + _selectedText!.y * _scale;
                                        final double dW = _selectedText!.width * _scale;
                                        final double dH = _selectedText!.height * _scale;
                                        return Positioned(
                                          left: dLeft - 2,
                                          top: dTop - 2,
                                          width: dW + 4,
                                          height: dH + 4,
                                          child: IgnorePointer(
                                            child: Container(
                                              decoration: BoxDecoration(
                                                border: Border.all(color: Colors.indigo, width: 2.0),
                                              ),
                                            ),
                                          ),
                                        );
                                      })(),
                                      (() {
                                        final double dRight = _canvasLeft + (_selectedText!.x + _selectedText!.width) * _scale;
                                        final double dBottom = _canvasTop + (_selectedText!.y + _selectedText!.height) * _scale;
                                        return Positioned(
                                          left: dRight - 8,
                                          top: dBottom - 8,
                                          width: 16,
                                          height: 16,
                                          child: IgnorePointer(
                                            child: Container(
                                              decoration: const BoxDecoration(
                                                color: Colors.indigo,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          ),
                                        );
                                      })(),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // Inspector Panel
                if (!_isLoading)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2)),
                      ],
                    ),
                    child: SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _selectedDecal != null
                                ? _buildDecalInspector()
                                : (_selectedText != null
                                    ? _buildTextInspector()
                                    : const Padding(
                                        padding: EdgeInsets.symmetric(vertical: 12),
                                        child: Text(
                                          'Select a decal or text to adjust its size and placement',
                                          style: TextStyle(fontSize: 11, color: Colors.blueGrey, fontStyle: FontStyle.italic),
                                          textAlign: TextAlign.center,
                                        ),
                                      )),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _isLoading ? null : _handleSaveDesign,
                                    icon: const Icon(Icons.save_alt, size: 18),
                                    label: const Text('SAVE DESIGN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.indigo,
                                      side: const BorderSide(color: Colors.indigo, width: 1.5),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: _isLoading ? null : _startCutting,
                                    icon: const Icon(Icons.bolt, size: 18),
                                    label: const Text('SEND TO PLOTTER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFCE1D19),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),

          // Cutting Overlay
          if (_isCutting)
            Container(
              color: Colors.black.withOpacity(0.6),
              child: Center(
                child: Card(
                  margin: const EdgeInsets.all(32),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircularProgressIndicator(color: Color(0xFFCE1D19)),
                        const SizedBox(height: 24),
                        Text(_loadingMessage, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 16),
                        if (_cutProgress > 0) ...[
                          LinearProgressIndicator(
                            value: _cutProgress / 100,
                            backgroundColor: Colors.grey[200],
                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFCE1D19)),
                          ),
                          const SizedBox(height: 8),
                          Text('$_cutProgress%', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAddBlockBtn(CutoutType type, String label, IconData icon) {
    return ElevatedButton.icon(
      onPressed: () => _addCutout(type),
      icon: Icon(icon, size: 14),
      label: Text(label, style: const TextStyle(fontSize: 10)),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.grey[100],
        foregroundColor: Colors.black87,
        minimumSize: const Size(0, 36),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildActiveComponentBtn({required IconData icon, required bool isSelected, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.indigo.withOpacity(0.1) : Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? Colors.indigo : Colors.transparent),
        ),
        child: Icon(icon, size: 16, color: isSelected ? Colors.indigo : Colors.grey[600]),
      ),
    );
  }

  Widget _buildBaseInspector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Base Shape Settings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Base Width (mm)',
                _baseWidth,
                40.0,
                500.0,
                _customBaseOutline.isNotEmpty
                    ? null
                    : (val) => setState(() => _baseWidth = _snap(val)),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Base Height (mm)',
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
      ],
    );
  }

  Widget _buildCutoutInspector() {
    final c = _selectedCutout;
    if (c == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Cutout: ${c.type.name.toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red, size: 18),
              onPressed: _deleteSelectedCutout,
            ),
          ],
        ),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Width (mm)',
                c.width,
                2.0,
                100.0,
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
                100.0,
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
      ],
    );
  }

  Widget _buildDecalInspector() {
    final d = _selectedDecal;
    if (d == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Decal: ${d.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red, size: 18),
              onPressed: _deleteSelectedDecal,
            ),
          ],
        ),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Width (mm)',
                d.width,
                10.0,
                _baseWidth,
                (val) {
                  setState(() {
                    final double ratio = d.width / d.height;
                    double newW = _snap(val);
                    double newH = _snap(newW / ratio);
                    
                    if (newH > _baseHeight) {
                      newH = _baseHeight;
                      newW = _snap(newH * ratio);
                    }
                    if (d.x + newW > _baseWidth) {
                      newW = _baseWidth - d.x;
                      newH = _snap(newW / ratio);
                    }
                    if (d.y + newH > _baseHeight) {
                      newH = _baseHeight - d.y;
                      newW = _snap(newH * ratio);
                    }

                    final idx = _decals.indexWhere((item) => item.id == d.id);
                    if (idx != -1) {
                      _decals[idx] = d.copyWith(width: newW, height: newH);
                      _selectedDecal = _decals[idx];
                    }
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Height (mm)',
                d.height,
                10.0,
                _baseHeight,
                (val) {
                  setState(() {
                    final double ratio = d.width / d.height;
                    double newH = _snap(val);
                    double newW = _snap(newH * ratio);

                    if (newW > _baseWidth) {
                      newW = _baseWidth;
                      newH = _snap(newW / ratio);
                    }
                    if (d.x + newW > _baseWidth) {
                      newW = _baseWidth - d.x;
                      newH = _snap(newW / ratio);
                    }
                    if (d.y + newH > _baseHeight) {
                      newH = _baseHeight - d.y;
                      newW = _snap(newH * ratio);
                    }

                    final idx = _decals.indexWhere((item) => item.id == d.id);
                    if (idx != -1) {
                      _decals[idx] = d.copyWith(width: newW, height: newH);
                      _selectedDecal = _decals[idx];
                    }
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Position X (mm)',
                d.x,
                0.0,
                _baseWidth - d.width,
                (val) {
                  setState(() {
                    final double newX = _snap(val);
                    final idx = _decals.indexWhere((item) => item.id == d.id);
                    if (idx != -1) {
                      _decals[idx] = d.copyWith(x: newX);
                      _selectedDecal = _decals[idx];
                    }
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Position Y (mm)',
                d.y,
                0.0,
                _baseHeight - d.height,
                (val) {
                  setState(() {
                    final double newY = _snap(val);
                    final idx = _decals.indexWhere((item) => item.id == d.id);
                    if (idx != -1) {
                      _decals[idx] = d.copyWith(y: newY);
                      _selectedDecal = _decals[idx];
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

  Widget _buildTextInspector() {
    final t = _selectedText;
    if (t == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text('Text: ${t.text}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey), maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, color: Colors.indigo, size: 18),
                  onPressed: () {
                    final controller = TextEditingController(text: t.text);
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Edit Text Decal'),
                        content: TextField(
                          controller: controller,
                          autofocus: true,
                          decoration: const InputDecoration(
                            hintText: 'Enter text',
                            border: OutlineInputBorder(),
                          ),
                          textCapitalization: TextCapitalization.characters,
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancel'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              final text = controller.text.trim();
                              if (text.isNotEmpty) {
                                _saveToHistory();
                                setState(() {
                                  final idx = _texts.indexWhere((item) => item.id == t.id);
                                  if (idx != -1) {
                                    _texts[idx] = t.copyWith(text: text);
                                    _selectedText = _texts[idx];
                                  }
                                });
                              }
                              Navigator.pop(context);
                            },
                            child: const Text('SAVE'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red, size: 18),
                  onPressed: _deleteSelectedText,
                ),
              ],
            ),
          ],
        ),
        // Styling options Row
        Row(
          children: [
            // Font Family selector dropdown
            Expanded(
              child: DropdownButtonHideUnderline(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: DropdownButton<String>(
                    value: t.fontFamily,
                    isExpanded: true,
                    style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.bold),
                    onChanged: (String? val) {
                      if (val != null) {
                        _saveToHistory();
                        setState(() {
                          final idx = _texts.indexWhere((item) => item.id == t.id);
                          if (idx != -1) {
                            _texts[idx] = t.copyWith(fontFamily: val);
                            _selectedText = _texts[idx];
                          }
                        });
                      }
                    },
                    items: const [
                      DropdownMenuItem(value: 'Roboto', child: Text('Roboto (Clean)')),
                      DropdownMenuItem(value: 'Pacifico', child: Text('Pacifico (Script)')),
                      DropdownMenuItem(value: 'Montserrat', child: Text('Montserrat (Slab)')),
                      DropdownMenuItem(value: 'Lobster', child: Text('Lobster (Bold Script)')),
                      DropdownMenuItem(value: 'Oswald', child: Text('Oswald (Condensed)')),
                      DropdownMenuItem(value: 'Playfair Display', child: Text('Playfair (Elegant)')),
                      DropdownMenuItem(value: 'Courier Prime', child: Text('Courier (Mono)')),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Bold Toggle
            IconButton(
              icon: Icon(Icons.format_bold, color: t.isBold ? Colors.indigo : Colors.grey, size: 20),
              style: IconButton.styleFrom(backgroundColor: t.isBold ? Colors.indigo.withOpacity(0.1) : Colors.transparent),
              onPressed: () {
                _saveToHistory();
                setState(() {
                  final idx = _texts.indexWhere((item) => item.id == t.id);
                  if (idx != -1) {
                    _texts[idx] = t.copyWith(isBold: !t.isBold);
                    _selectedText = _texts[idx];
                  }
                });
              },
            ),
            // Italic Toggle
            IconButton(
              icon: Icon(Icons.format_italic, color: t.isItalic ? Colors.indigo : Colors.grey, size: 20),
              style: IconButton.styleFrom(backgroundColor: t.isItalic ? Colors.indigo.withOpacity(0.1) : Colors.transparent),
              onPressed: () {
                _saveToHistory();
                setState(() {
                  final idx = _texts.indexWhere((item) => item.id == t.id);
                  if (idx != -1) {
                    _texts[idx] = t.copyWith(isItalic: !t.isItalic);
                    _selectedText = _texts[idx];
                  }
                });
              },
            ),
            // Underline Toggle
            IconButton(
              icon: Icon(Icons.format_underlined, color: t.isUnderline ? Colors.indigo : Colors.grey, size: 20),
              style: IconButton.styleFrom(backgroundColor: t.isUnderline ? Colors.indigo.withOpacity(0.1) : Colors.transparent),
              onPressed: () {
                _saveToHistory();
                setState(() {
                  final idx = _texts.indexWhere((item) => item.id == t.id);
                  if (idx != -1) {
                    _texts[idx] = t.copyWith(isUnderline: !t.isUnderline);
                    _selectedText = _texts[idx];
                  }
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Width (mm)',
                t.width,
                10.0,
                _baseWidth,
                (val) {
                  setState(() {
                    final double ratio = t.width / t.height;
                    double newW = _snap(val);
                    double newH = _snap(newW / ratio);
                    
                    if (newH > _baseHeight) {
                      newH = _baseHeight;
                      newW = _snap(newH * ratio);
                    }
                    if (t.x + newW > _baseWidth) {
                      newW = _baseWidth - t.x;
                      newH = _snap(newW / ratio);
                    }
                    if (t.y + newH > _baseHeight) {
                      newH = _baseHeight - t.y;
                      newW = _snap(newH * ratio);
                    }

                    final idx = _texts.indexWhere((item) => item.id == t.id);
                    if (idx != -1) {
                      _texts[idx] = t.copyWith(width: newW, height: newH);
                      _selectedText = _texts[idx];
                    }
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Height (mm)',
                t.height,
                5.0,
                _baseHeight,
                (val) {
                  setState(() {
                    final double ratio = t.width / t.height;
                    double newH = _snap(val);
                    double newW = _snap(newH * ratio);

                    if (newW > _baseWidth) {
                      newW = _baseWidth;
                      newH = _snap(newW / ratio);
                    }
                    if (t.x + newW > _baseWidth) {
                      newW = _baseWidth - t.x;
                      newH = _snap(newW / ratio);
                    }
                    if (t.y + newH > _baseHeight) {
                      newH = _baseHeight - t.y;
                      newW = _snap(newH * ratio);
                    }

                    final idx = _texts.indexWhere((item) => item.id == t.id);
                    if (idx != -1) {
                      _texts[idx] = t.copyWith(width: newW, height: newH);
                      _selectedText = _texts[idx];
                    }
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildInspectorSlider(
                'Position X (mm)',
                t.x,
                0.0,
                _baseWidth - t.width,
                (val) {
                  setState(() {
                    final double newX = _snap(val);
                    final idx = _texts.indexWhere((item) => item.id == t.id);
                    if (idx != -1) {
                      _texts[idx] = t.copyWith(x: newX);
                      _selectedText = _texts[idx];
                    }
                  });
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildInspectorSlider(
                'Position Y (mm)',
                t.y,
                0.0,
                _baseHeight - t.height,
                (val) {
                  setState(() {
                    final double newY = _snap(val);
                    final idx = _texts.indexWhere((item) => item.id == t.id);
                    if (idx != -1) {
                      _texts[idx] = t.copyWith(y: newY);
                      _selectedText = _texts[idx];
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
    final double safeMax = maxVal < minVal ? minVal + 1.0 : maxVal;
    final double safeVal = val.clamp(minVal, safeMax);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.blueGrey)),
            Text('${safeVal.toInt()} mm', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isEnabled ? Colors.black87 : Colors.grey)),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 2,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
          ),
          child: Slider(
            value: safeVal,
            min: minVal,
            max: safeMax,
            onChangeStart: isEnabled ? (v) => _saveToHistory() : null,
            onChanged: isEnabled ? onChanged : null,
          ),
        ),
      ],
    );
  }

  static const _s3CatalogBaseUrl = 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog';

  String _getImageUrl(dynamic item) {
    final path = item['imageUrl']?.toString() ?? '';
    if (path.isNotEmpty) {
      if (path.startsWith('http')) return path;
      if (!path.contains('/')) {
        return '$_s3CatalogBaseUrl/$path';
      }
      final cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return '${ApiService.baseUrl.replaceFirst('/api', '')}/$cleanPath';
    }
    return '';
  }

  Future<String?> _fetchDecalPltContent(String modelId) async {
    try {
      final cutFiles = await ApiService.getModelCutFiles(modelId);
      if (cutFiles.isEmpty) return null;
      final firstFileId = cutFiles.first['id']?.toString();
      if (firstFileId == null) return null;

      final details = await ApiService.getCutFileDetails(firstFileId);
      if (details == null || details['encryptedPltData'] == null) return null;

      List<int> encryptedBytes = [];
      final rawData = details['encryptedPltData'];
      if (rawData is String) {
        encryptedBytes = base64Decode(rawData);
      } else if (rawData is Map && rawData['data'] != null) {
        encryptedBytes = List<int>.from(rawData['data']);
      } else if (rawData is List) {
        encryptedBytes = List<int>.from(rawData);
      }

      if (encryptedBytes.length < 16) return null;

      final key = encrypt.Key.fromUtf8('flashgard-secure-plt-data-key-32');
      final iv = encrypt.IV(Uint8List.fromList(encryptedBytes.sublist(0, 16)));
      final ciphertext = encryptedBytes.sublist(16);
      
      final encrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.cbc));
      final decrypted = encrypter.decryptBytes(encrypt.Encrypted(Uint8List.fromList(ciphertext)), iv: iv);
      return utf8.decode(decrypted);
    } catch (e) {
      print('Error fetching/decrypting decal PLT: $e');
      return null;
    }
  }

  Future<String> _getMergedPltContent() async {
    String mergedPlt = _originalPltContent ?? '';
    if (mergedPlt.isEmpty) return '';

    if (!mergedPlt.endsWith(';')) {
      mergedPlt += ';';
    }

    for (final d in _decals) {
      // Canvas Y is screen-space (Y-down). Convert to PLT Y-up steps.
      // _originGlobalMaxY and _originMinY are in mm (post-divide-by-40 in _importPltData).
      final double leftMm   = d.x + _originMinX;
      final double rightMm  = d.x + d.width + _originMinX;
      // Distance from PLT bottom (Y-up): full height minus how far from canvas top the decal sits
      final double bottomMm = (_originGlobalMaxY - _originMinY) - (d.y + d.height);
      final double topMm    = (_originGlobalMaxY - _originMinY) - d.y;

      // Absolute PLT step coordinates
      final leftPlt   = (leftMm   * 40.0).round();
      final rightPlt  = (rightMm  * 40.0).round();
      final bottomPlt = (bottomMm * 40.0).round();
      final topPlt    = (topMm    * 40.0).round();

      if (d.modelId == null) {
        // Fallback to rectangular outline
        mergedPlt += 'PU$leftPlt,$bottomPlt;PD$rightPlt,$bottomPlt;PD$rightPlt,$topPlt;PD$leftPlt,$topPlt;PD$leftPlt,$bottomPlt;PU;';
        continue;
      }

      final decalPlt = await _fetchDecalPltContent(d.modelId!);
      if (decalPlt == null || decalPlt.trim().isEmpty) {
        // Fallback to rectangular outline if PLT fetch fails
        mergedPlt += 'PU$leftPlt,$bottomPlt;PD$rightPlt,$bottomPlt;PD$rightPlt,$topPlt;PD$leftPlt,$topPlt;PD$leftPlt,$bottomPlt;PU;';
        continue;
      }

      final regex = RegExp(r'(PU|PD|PA)\s*(-?\d+\.?\d*)[\s,]+\s*(-?\d+\.?\d*)');
      final matches = regex.allMatches(decalPlt);

      double decalMinX = double.infinity;
      double decalMinY = double.infinity;
      double decalMaxX = -double.infinity;
      double decalMaxY = -double.infinity;

      for (final match in matches) {
        final double x = double.tryParse(match.group(2) ?? '0') ?? 0.0;
        final double y = double.tryParse(match.group(3) ?? '0') ?? 0.0;
        if (x < decalMinX) decalMinX = x;
        if (x > decalMaxX) decalMaxX = x;
        if (y < decalMinY) decalMinY = y;
        if (y > decalMaxY) decalMaxY = y;
      }

      if (decalMinX == double.infinity || decalMaxX == decalMinX || decalMaxY == decalMinY) {
        // Fallback to rectangular outline
        mergedPlt += 'PU$leftPlt,$bottomPlt;PD$rightPlt,$bottomPlt;PD$rightPlt,$topPlt;PD$leftPlt,$topPlt;PD$leftPlt,$bottomPlt;PU;';
        continue;
      }

      final double decalW = decalMaxX - decalMinX;
      final double decalH = decalMaxY - decalMinY;

      // Target region in base PLT coordinate steps.
      // targetLeftSteps: leftMm includes _originMinX so leftMm*40 = absolute X PLT steps
      // targetBottomSteps: bottomMm includes absolute Y steps relative to top, representing absolute bottom Y PLT steps
      final double targetLeftSteps   = leftMm   * 40.0;
      final double targetBottomSteps = bottomMm * 40.0;

      // Target region dimensions in base PLT coordinate steps.
      final double targetW = d.width * 40.0;
      final double targetH = d.height * 40.0;

      // BoxFit.contain: scale down/up while preserving the aspect ratio
      final double scale = min(targetW / decalW, targetH / decalH);

      final double scaledW = decalW * scale;
      final double scaledH = decalH * scale;

      // Centering offset inside the target box
      final double fitOffsetX = (targetW - scaledW) / 2.0;
      final double fitOffsetY = (targetH - scaledH) / 2.0;

      for (final match in matches) {
        final cmd = match.group(1);
        final double x = double.tryParse(match.group(2) ?? '0') ?? 0.0;
        final double y = double.tryParse(match.group(3) ?? '0') ?? 0.0;

        // Normalise to [0 .. decalW/decalH]
        final double normX = x - decalMinX;
        // Both the decal PLT and the base PLT use the same Y-UP convention,
        // so a simple normalisation (no flip) is correct.
        final double normY = y - decalMinY;

        final int finalX = (targetLeftSteps + fitOffsetX + normX * scale).round();
        final int finalY = (targetBottomSteps + fitOffsetY + normY * scale).round();

        // Convert command to PU or PD to guarantee device compatibility
        final finalCmd = (cmd == 'PU' || cmd == 'M') ? 'PU' : 'PD';
        mergedPlt += '$finalCmd$finalX,$finalY;';
      }
    }

    for (final t in _texts) {
      final chars = t.text.toUpperCase().split('');
      if (chars.isEmpty) continue;

      final double charW = t.width / chars.length;
      final double charH = t.height;

      final alphabetModels = _categoryWiseDecals['Alphabets'] ?? [];

      for (int i = 0; i < chars.length; i++) {
        final char = chars[i];
        if (char.trim().isEmpty) continue; // Skip spaces

        final double charX = t.x + i * charW;
        final double charY = t.y;

        final double leftMm   = charX + _originMinX;
        final double rightMm  = charX + charW + _originMinX;
        final double bottomMm = (_originGlobalMaxY - _originMinY) - (charY + charH);
        final double topMm    = (_originGlobalMaxY - _originMinY) - charY;

        final leftPlt   = (leftMm   * 40.0).round();
        final rightPlt  = (rightMm  * 40.0).round();
        final bottomPlt = (bottomMm * 40.0).round();
        final topPlt    = (topMm    * 40.0).round();

        // Search for matching decal model in the loaded Alphabets category
        final charModel = alphabetModels.firstWhere(
          (m) => m['name']?.toString().toUpperCase() == char,
          orElse: () => null,
        );

        if (charModel == null) {
          // Fallback to rectangular outline if letter not found in database
          mergedPlt += 'PU$leftPlt,$bottomPlt;PD$rightPlt,$bottomPlt;PD$rightPlt,$topPlt;PD$leftPlt,$topPlt;PD$leftPlt,$bottomPlt;PU;';
          continue;
        }

        final decalPlt = await _fetchDecalPltContent(charModel['id'].toString());
        if (decalPlt == null || decalPlt.trim().isEmpty) {
          // Fallback to rectangular outline if fetch fails
          mergedPlt += 'PU$leftPlt,$bottomPlt;PD$rightPlt,$bottomPlt;PD$rightPlt,$topPlt;PD$leftPlt,$topPlt;PD$leftPlt,$bottomPlt;PU;';
          continue;
        }

        final regex = RegExp(r'(PU|PD|PA)\s*(-?\d+\.?\d*)[\s,]+\s*(-?\d+\.?\d*)');
        final matches = regex.allMatches(decalPlt);

        double decalMinX = double.infinity;
        double decalMinY = double.infinity;
        double decalMaxX = -double.infinity;
        double decalMaxY = -double.infinity;

        for (final match in matches) {
          final double x = double.tryParse(match.group(2) ?? '0') ?? 0.0;
          final double y = double.tryParse(match.group(3) ?? '0') ?? 0.0;
          if (x < decalMinX) decalMinX = x;
          if (x > decalMaxX) decalMaxX = x;
          if (y < decalMinY) decalMinY = y;
          if (y > decalMaxY) decalMaxY = y;
        }

        if (decalMinX == double.infinity || decalMaxX == decalMinX || decalMaxY == decalMinY) {
          mergedPlt += 'PU$leftPlt,$bottomPlt;PD$rightPlt,$bottomPlt;PD$rightPlt,$topPlt;PD$leftPlt,$topPlt;PD$leftPlt,$bottomPlt;PU;';
          continue;
        }

        final double decalW = decalMaxX - decalMinX;
        final double decalH = decalMaxY - decalMinY;

        final double targetLeftSteps   = leftMm   * 40.0;
        final double targetBottomSteps = bottomMm * 40.0;

        final double targetW = charW * 40.0;
        final double targetH = charH * 40.0;

        // BoxFit.contain scaling
        final double scale = min(targetW / decalW, targetH / decalH);
        final double scaledW = decalW * scale;
        final double scaledH = decalH * scale;

        final double fitOffsetX = (targetW - scaledW) / 2.0;
        final double fitOffsetY = (targetH - scaledH) / 2.0;

        for (final match in matches) {
          final cmd = match.group(1);
          final double x = double.tryParse(match.group(2) ?? '0') ?? 0.0;
          final double y = double.tryParse(match.group(3) ?? '0') ?? 0.0;

          final double normX = x - decalMinX;
          final double normY = y - decalMinY;

          // Shear X coordinate forward based on Y height to create slant (Italic)
          final double shearedNormX = t.isItalic ? (normX + normY * 0.17) : normX;

          final int finalX = (targetLeftSteps + fitOffsetX + shearedNormX * scale).round();
          final int finalY = (targetBottomSteps + fitOffsetY + normY * scale).round();

          final finalCmd = (cmd == 'PU' || cmd == 'M') ? 'PU' : 'PD';
          mergedPlt += '$finalCmd$finalX,$finalY;';
        }
      }
      
      if (t.isUnderline) {
        // Position underline 1.5mm below the text bottom boundary
        final double underlineYMm = (_originGlobalMaxY - _originMinY) - (t.y + t.height + 1.5);
        final int underlineYSteps = (underlineYMm * 40.0).round();
        final int startX = ((t.x + _originMinX) * 40.0).round();
        final int endX = ((t.x + t.width + _originMinX) * 40.0).round();
        
        mergedPlt += 'PU$startX,$underlineYSteps;PD$endX,$underlineYSteps;PU;';
      }
    }
    return mergedPlt;
  }

  Future<void> _handleSaveDesign() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final mergedPlt = await _getMergedPltContent();
      if (mergedPlt.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No design content to save.')),
          );
        }
        return;
      }

      // Store securely in memory — never written to disk
      _savedPltContent = mergedPlt;

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Design saved in memory (${_decals.length} decal${_decals.length != 1 ? 's' : ''} merged). Ready to send to plotter.')),
              ],
            ),
            backgroundColor: Colors.green[700],
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to prepare design: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}

class CanvasGridPainter extends CustomPainter {
  final double baseWidth;
  final double baseHeight;
  final double baseCornerRadius;
  final List<Offset> customBaseOutline;
  final List<List<Offset>> normalizedCutoutPaths;
  final bool isBaseSelected;
  final double scale;
  final double canvasLeft;
  final double canvasTop;

  CanvasGridPainter({
    required this.baseWidth,
    required this.baseHeight,
    required this.baseCornerRadius,
    required this.customBaseOutline,
    required this.normalizedCutoutPaths,
    required this.isBaseSelected,
    required this.scale,
    required this.canvasLeft,
    required this.canvasTop,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw Grid
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

    // 2. Draw Base Outline
    final basePaint = Paint()
      ..color = Colors.black87
      ..strokeWidth = 2.0
      ..strokeJoin = StrokeJoin.round
      ..strokeCap = StrokeCap.round
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

    if (isBaseSelected) {
      final selectPaint = Paint()
        ..color = Colors.blue.withOpacity(0.3)
        ..strokeWidth = 3.0
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;

      if (customBaseOutline.isNotEmpty) {
        canvas.drawPath(baseOutlinePath, selectPaint);
      } else {
        final baseRect = RRect.fromRectAndRadius(
          Rect.fromLTWH(canvasLeft, canvasTop, baseWidth * scale, baseHeight * scale),
          Radius.circular(baseCornerRadius * scale),
        );
        canvas.drawRRect(baseRect, selectPaint);

        final handlePaint = Paint()
          ..color = Colors.indigo
          ..style = PaintingStyle.fill;

        canvas.drawCircle(Offset(canvasLeft + baseWidth * scale, canvasTop + (baseHeight / 2) * scale), 8, handlePaint);
        canvas.drawCircle(Offset(canvasLeft + (baseWidth / 2) * scale, canvasTop + baseHeight * scale), 8, handlePaint);
      }
    }

    // 3. Draw Cutouts using exact vector lines
    final cutoutPaint = Paint()
      ..color = Colors.red
      ..strokeWidth = 1.5
      ..strokeJoin = StrokeJoin.round
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (final path in normalizedCutoutPaths) {
      if (path.isEmpty) continue;
      final cutoutPath = Path();
      final start = path.first;
      cutoutPath.moveTo(canvasLeft + start.dx * scale, canvasTop + start.dy * scale);
      for (int i = 1; i < path.length; i++) {
        final pt = path[i];
        cutoutPath.lineTo(canvasLeft + pt.dx * scale, canvasTop + pt.dy * scale);
      }
      // Note: We close the path since these represent closed cuts
      cutoutPath.close();
      canvas.drawPath(cutoutPath, cutoutPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CanvasGridPainter oldDelegate) => true;
}

class BaseOutlineClipper extends CustomClipper<Path> {
  final List<Offset> outline;
  final double baseWidth;
  final double baseHeight;
  final double baseCornerRadius;
  final double scale;
  final double canvasLeft;
  final double canvasTop;

  BaseOutlineClipper({
    required this.outline,
    required this.baseWidth,
    required this.baseHeight,
    required this.baseCornerRadius,
    required this.scale,
    required this.canvasLeft,
    required this.canvasTop,
  });

  @override
  Path getClip(Size size) {
    final path = Path();
    if (outline.isNotEmpty) {
      final start = outline.first;
      path.moveTo(canvasLeft + start.dx * scale, canvasTop + start.dy * scale);
      for (int i = 1; i < outline.length; i++) {
        final pt = outline[i];
        path.lineTo(canvasLeft + pt.dx * scale, canvasTop + pt.dy * scale);
      }
      path.close();
    } else {
      path.addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(canvasLeft, canvasTop, baseWidth * scale, baseHeight * scale),
        Radius.circular(baseCornerRadius * scale),
      ));
    }
    return path;
  }

  @override
  bool shouldReclip(covariant BaseOutlineClipper oldClipper) => true;
}

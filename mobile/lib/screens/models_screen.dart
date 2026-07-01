import 'dart:async';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'cut_selection_screen.dart';
import 'diy_designer_screen.dart';
import '../services/api_service.dart';

class ModelsScreen extends StatefulWidget {
  final String title;
  final String? categoryId;
  final String? brandId;
  final String? parentCategoryId;
  final bool isRoot;
  final List<String> breadcrumbs;

  const ModelsScreen({
    super.key,
    this.title = 'Select Model',
    this.categoryId,
    this.brandId,
    this.parentCategoryId,
    this.isRoot = true,
    this.breadcrumbs = const ['Home'],
  });

  @override
  State<ModelsScreen> createState() => _ModelsScreenState();
}

class _ModelsScreenState extends State<ModelsScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _items = [];
  List<dynamic> _filteredItems = [];
  bool _isLoading = true;
  late stt.SpeechToText _speech;

  Timer? _debounce;
  bool _isSearching = false;
  bool _isSearchLoading = false;
  List<dynamic> _searchedCategories = [];
  List<dynamic> _searchedBrands = [];
  List<dynamic> _searchedModels = [];

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _fetchData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    try {
      _speech.stop();
    } catch (_) {}
    super.dispose();
  }

  Future<void> _startVoiceSearch() async {
    try {
      bool available = await _speech.initialize(
        onStatus: (status) {
          print('Speech status: $status');
        },
        onError: (errorNotification) => print('Speech error: $errorNotification'),
      );
      
      if (available) {
        String recognizedWords = '';
        if (!mounted) return;
        showModalBottomSheet(
          context: context,
          isDismissible: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          builder: (context) {
            return StatefulBuilder(
              builder: (context, setModalState) {
                if (!_speech.isListening) {
                  _speech.listen(
                    onResult: (result) {
                      setModalState(() {
                        recognizedWords = result.recognizedWords;
                      });
                      if (result.finalResult) {
                        _searchController.text = result.recognizedWords;
                        _onSearch(result.recognizedWords);
                        Future.delayed(const Duration(milliseconds: 600), () {
                          if (Navigator.canPop(context)) {
                            Navigator.pop(context);
                          }
                        });
                      }
                    },
                  );
                }

                return Container(
                  padding: const EdgeInsets.all(24),
                  height: 250,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        _speech.isListening ? 'Listening...' : 'Tap Mic to Speak',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                      const SizedBox(height: 24),
                      GestureDetector(
                        onTap: () {
                          if (_speech.isListening) {
                            _speech.stop();
                            setModalState(() {});
                          } else {
                            recognizedWords = '';
                            _speech.listen(
                              onResult: (result) {
                                setModalState(() {
                                  recognizedWords = result.recognizedWords;
                                });
                                if (result.finalResult) {
                                  _searchController.text = result.recognizedWords;
                                  _onSearch(result.recognizedWords);
                                  Future.delayed(const Duration(milliseconds: 600), () {
                                    if (Navigator.canPop(context)) {
                                      Navigator.pop(context);
                                    }
                                  });
                                }
                              },
                            );
                            setModalState(() {});
                          }
                        },
                        child: CircleAvatar(
                          radius: 36,
                          backgroundColor: _speech.isListening 
                              ? Theme.of(context).colorScheme.primary.withOpacity(0.1) 
                              : Colors.grey[100],
                          child: Icon(
                            _speech.isListening ? Icons.mic : Icons.mic_none,
                            size: 36,
                            color: _speech.isListening 
                                ? Theme.of(context).colorScheme.primary 
                                : Colors.grey[600],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        recognizedWords.isEmpty 
                            ? 'Speak now' 
                            : recognizedWords,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: recognizedWords.isEmpty ? Colors.grey[400] : Colors.black87,
                          fontStyle: recognizedWords.isEmpty ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ).then((_) {
          if (_speech.isListening) {
            _speech.stop();
          }
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Speech recognition is not available on this device')),
        );
      }
    } catch (e) {
      print('Speech initialization error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to initialize speech recognition: $e')),
      );
    }
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    List<dynamic> data = [];
    
    try {
      if (widget.isRoot) {
        // Dynamically find the "Main Model" parent category
        final response = await ApiService.getModelCategories(parentId: 'null');
        
        // Strict client-side filter fallback in case backend ignores parentId
        final roots = response.where((cat) => cat['parentId'] == null).toList();
        final mainModel = roots.isNotEmpty ? roots.firstWhere((cat) => cat['name'] == 'Main Model', orElse: () => null) : null;
        
        if (mainModel != null) {
          final subResponse = await ApiService.getModelCategories(parentId: mainModel['id']);
          data = subResponse.where((cat) => cat['parentId'] == mainModel['id']).toList();
        } else {
          data = roots;
        }
      } else if (widget.categoryId != null) {
        // Fetch both subcategories and brands for this category level
        final subcatsResponse = await ApiService.getModelCategories(parentId: widget.categoryId!);
        final subcats = subcatsResponse.where((cat) => cat['parentId'] == widget.categoryId).toList();
        
        final brands = await ApiService.getBrands(widget.categoryId!);
        
        // Combine them so users see subcategories (e.g. 10.or) alongside regular brands (e.g. Apple)
        data = [...subcats, ...brands];
      } else if (widget.brandId != null) {
        // Find models for this brand AND the category we came from
        data = await ApiService.getModels(widget.brandId!, categoryId: widget.parentCategoryId);
      }
    } catch (e) {
      print('Error loading data: $e');
    }

    if (mounted) {
      setState(() {
        _items = data;
        _filteredItems = data;
        _isLoading = false;
      });
    }
  }

  void _onSearch(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();

    if (query.isEmpty) {
      setState(() {
        _isSearching = false;
        _filteredItems = _items;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 300), () async {
      if (!mounted) return;
      setState(() {
        _isSearching = true;
        _isSearchLoading = true;
      });

      try {
        final results = await Future.wait([
          ApiService.searchModelCategories(query),
          ApiService.searchBrands(query),
          ApiService.searchModels(query),
        ]);

        if (mounted) {
          setState(() {
            _searchedCategories = results[0];
            _searchedBrands = results[1];
            _searchedModels = results[2];
            _isSearchLoading = false;
          });
        }
      } catch (e) {
        print('Error searching: $e');
        if (mounted) {
          setState(() {
            _isSearchLoading = false;
          });
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bgGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        const Color(0xFFF8FAFC),
        const Color(0xFFF1F5F9),
      ],
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text(
          widget.title, 
          style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 0.5),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFF0F172A),
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        leading: !widget.isRoot ? IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.pop(context),
        ) : null,
      ),
      body: Container(
        decoration: BoxDecoration(gradient: bgGradient),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Breadcrumbs
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: widget.breadcrumbs.length,
              separatorBuilder: (context, index) => const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
              itemBuilder: (context, index) => Text(
                widget.breadcrumbs[index],
                style: TextStyle(
                  fontSize: 12,
                  color: index == widget.breadcrumbs.length - 1 ? Theme.of(context).colorScheme.primary : Colors.grey,
                  fontWeight: index == widget.breadcrumbs.length - 1 ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Search in ${widget.title}...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_searchController.text.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.clear, size: 18, color: Colors.grey),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      ),
                    IconButton(
                      icon: const Icon(Icons.mic, size: 20, color: Colors.grey),
                      onPressed: _startVoiceSearch,
                    ),
                  ],
                ),
                filled: true,
                fillColor: Colors.white,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: const Color(0xFF0F172A).withOpacity(0.05), width: 1.5),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFCE1D19), width: 1.5),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: const Color(0xFF0F172A).withOpacity(0.05), width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
              ),
            ),
          ),

          Expanded(
            child: _isSearching
                ? _buildSearchResults()
                : (_isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _filteredItems.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.search_off_outlined, size: 48, color: Colors.grey[300]),
                                const SizedBox(height: 16),
                                Text('No results found', style: TextStyle(color: Colors.grey[500])),
                              ],
                            ),
                          )
                        : GridView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 0.8,
                            ),
                            itemCount: _filteredItems.length,
                            itemBuilder: (context, index) {
                              final item = _filteredItems[index];
                              return _buildGridItem(item);
                            },
                          )),
          ),
        ],
      ),
    ),
  );
  }

  Widget _buildGridItem(dynamic item) {
    return GestureDetector(
      onTap: () async {
        final List<String> nextBreadcrumbs = [...widget.breadcrumbs, item['name']];
        
        final isCategory = item.containsKey('parentId');
        final isModel = item.containsKey('brandId');
        final isBrand = !isCategory && !isModel;

        if (isCategory) {
          // It's a category
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ModelsScreen(
                title: item['name'],
                categoryId: item['id'].toString(),
                isRoot: false,
                breadcrumbs: nextBreadcrumbs,
              ),
            ),
          );
        } else if (isBrand) {
          // It's a brand, show models
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ModelsScreen(
                title: item['name'],
                brandId: item['id'].toString(),
                parentCategoryId: widget.categoryId, // Pass the category ID down
                isRoot: false,
                breadcrumbs: nextBreadcrumbs,
              ),
            ),
          );
        } else {
           // Showing models, pick a cut file
           Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => CutSelectionScreen(item: item),
            ),
          );
        }
      },
      child: Column(
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF0F172A).withOpacity(0.05), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.network(
                  _getImageUrl(item),
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Icon(
                      _getIconForItem(item['name'], item['iconUrl']),
                      color: const Color(0xFFCE1D19),
                      size: 32,
                    );
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item['name'],
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Color(0xFF0F172A)),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  String _getImageUrl(dynamic item) {
    final path = item['imageUrl']?.toString() ?? '';
    if (path.isNotEmpty) {
      if (path.startsWith('http')) return path;
      if (!path.contains('/')) {
        return 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog/$path';
      }
      final cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return '${ApiService.baseUrl.replaceFirst('/api', '')}/$cleanPath';
    }
    
    // Construct default category image based on name from S3
    final name = item['name']?.toString() ?? '';
    if (name.isEmpty) return 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog/Phone.jpg';
    
    // Format name (Capitalize first letter, lower case the rest)
    final formattedName = name[0].toUpperCase() + name.substring(1).toLowerCase();
    return 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog/$formattedName.jpg';
  }

  IconData _getIconForItem(String name, [String? iconUrl]) {
    final n = (iconUrl ?? name).toLowerCase();
    if (n.contains('phone')) return Icons.smartphone;
    if (n.contains('tab') || n.contains('pad')) return Icons.tablet_mac;
    if (n.contains('watch')) return Icons.watch;
    if (n.contains('laptop') || n.contains('macbook')) return Icons.laptop_mac;
    if (n.contains('apple')) return Icons.apple;
    if (n.contains('samsung')) return Icons.android;
    if (n.contains('tv')) return Icons.tv;
    if (n.contains('audio') || n.contains('headphone')) return Icons.headphones;
    return Icons.devices_other;
  }

  Widget _buildSearchResults() {
    if (_isSearchLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_searchedCategories.isEmpty && _searchedBrands.isEmpty && _searchedModels.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off_outlined, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('No results found', style: TextStyle(color: Colors.grey[500])),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        if (_searchedCategories.isNotEmpty) ...[
          _buildSearchSectionHeader('Categories'),
          ..._searchedCategories.map((cat) => _buildSearchRowItem(cat, 'category')),
          const SizedBox(height: 16),
        ],
        if (_searchedBrands.isNotEmpty) ...[
          _buildSearchSectionHeader('Brands'),
          ..._searchedBrands.map((brand) => _buildSearchRowItem(brand, 'brand')),
          const SizedBox(height: 16),
        ],
        if (_searchedModels.isNotEmpty) ...[
          _buildSearchSectionHeader('Models'),
          ..._searchedModels.map((model) => _buildSearchRowItem(model, 'model')),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildSearchSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.primary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildSearchRowItem(dynamic item, String type) {
    final hasImage = item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty;
    final imageUrl = hasImage
        ? (item['imageUrl'].toString().startsWith('http')
            ? item['imageUrl'].toString()
            : '${ApiService.baseUrl.replaceFirst('/api', '')}${item['imageUrl']}')
        : null;

    IconData fallbackIcon = Icons.devices_other;
    if (type == 'category') {
      fallbackIcon = _getIconForItem(item['name'], item['iconUrl']);
    } else if (type == 'brand') {
      fallbackIcon = Icons.branding_watermark;
    } else {
      fallbackIcon = Icons.smartphone;
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(8),
            image: imageUrl != null
                ? DecorationImage(
                    image: NetworkImage(imageUrl),
                    fit: BoxFit.contain,
                  )
                : null,
          ),
          child: imageUrl == null
              ? Icon(fallbackIcon, color: Theme.of(context).colorScheme.primary.withOpacity(0.8), size: 24)
              : null,
        ),
        title: Text(
          item['name'],
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          type == 'model'
              ? '${item['brand']?['name'] ?? 'Model'} in ${item['category']?['name'] ?? ''}'
              : type[0].toUpperCase() + type.substring(1),
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
        trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
        onTap: () {
          final List<String> nextBreadcrumbs = [...widget.breadcrumbs, item['name']];
          if (type == 'category') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ModelsScreen(
                  title: item['name'],
                  categoryId: item['id'].toString(),
                  isRoot: false,
                  breadcrumbs: nextBreadcrumbs,
                ),
              ),
            );
          } else if (type == 'brand') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ModelsScreen(
                  title: item['name'],
                  brandId: item['id'].toString(),
                  isRoot: false,
                  breadcrumbs: nextBreadcrumbs,
                ),
              ),
            );
          } else {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CutSelectionScreen(item: item),
              ),
            );
          }
        },
      ),
    );
  }
}

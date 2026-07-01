import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoading = true;
  List<dynamic> _promotions = [];
  List<dynamic> _actions = [];
  List<dynamic> _infocards = [];

  @override
  void initState() {
    super.initState();
    _loadHomeContent();
  }

  Future<void> _loadHomeContent() async {
    setState(() {
      _isLoading = true;
    });

    final data = await ApiService.fetchMobileHomeContent();
    if (data != null && mounted) {
      setState(() {
        _promotions = data['promotions'] ?? [];
        _actions = data['actions'] ?? [];
        _infocards = data['infocards'] ?? [];
        _isLoading = false;
      });
    } else if (mounted) {
      // Fallback/Default static values if offline or error
      setState(() {
        _promotions = [
          {
            'title': 'Exclusive iPhone 17 Launch',
            'subtitle': 'Get 20% off on all iPhone 17 Pro designs!',
            'backgroundColor': '#CE1D19',
            'iconName': 'phone_iphone',
          },
          {
            'title': 'New Galaxy S25 Skins',
            'subtitle': 'Explore the latest styles for Samsung S25.',
            'backgroundColor': '#E6B82C',
            'iconName': 'smartphone',
          }
        ];
        _actions = [
          {'label': 'Scan', 'iconName': 'qr_code_scanner', 'action': 'scan'},
          {'label': 'History', 'iconName': 'history', 'action': 'history'},
          {'label': 'Stock', 'iconName': 'inventory_2_outlined', 'action': 'stock'},
          {'label': 'Help', 'iconName': 'support_agent', 'action': 'help'},
        ];
        _infocards = [
          {
            'title': 'How to apply Flashgard Skins',
            'excerpt': 'Learn the best techniques for a perfect application every time.',
            'timeText': '5 min read',
          },
          {
            'title': 'New Machine Firmware v2.1',
            'excerpt': 'Stability improvements and 15% faster cutting speeds.',
            'timeText': 'Yesterday',
          },
          {
            'title': 'System Maintenance',
            'excerpt': 'The CRM will be undergoing maintenance on Sunday at 2 AM GMT.',
            'timeText': '2 days ago',
          }
        ];
        _isLoading = false;
      });
    }
  }

  IconData _getIconData(String name) {
    switch (name) {
      case 'phone_iphone': return Icons.phone_iphone;
      case 'smartphone': return Icons.smartphone;
      case 'qr_code_scanner': return Icons.qr_code_scanner;
      case 'history': return Icons.history;
      case 'inventory_2_outlined': return Icons.inventory_2_outlined;
      case 'support_agent': return Icons.support_agent;
      case 'info_outline': return Icons.info_outline;
      default: return Icons.info_outline;
    }
  }

  Color _parseColor(String hexColor) {
    try {
      hexColor = hexColor.replaceAll('#', '');
      if (hexColor.length == 6) {
        hexColor = 'FF$hexColor';
      }
      return Color(int.parse(hexColor, radix: 16));
    } catch (_) {
      return const Color(0xFFCE1D19);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Flashgard', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh), 
            onPressed: _loadHomeContent,
          ),
          IconButton(icon: const Icon(Icons.notifications_none), onPressed: () {}),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _loadHomeContent,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Promotions Carousel
                  if (_promotions.isNotEmpty)
                    SizedBox(
                      height: 200,
                      child: PageView.builder(
                        itemCount: _promotions.length,
                        itemBuilder: (context, index) {
                          final promo = _promotions[index];
                          return _buildPromotionCard(
                            promo['title'] ?? '',
                            promo['subtitle'] ?? '',
                            _parseColor(promo['backgroundColor'] ?? '#CE1D19'),
                            _getIconData(promo['iconName'] ?? 'phone_iphone'),
                          );
                        },
                      ),
                    ),
                  
                  if (_actions.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.fromLTRB(20, 24, 20, 12),
                      child: Text(
                        'Quick Actions',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
                    
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _actions.length,
                      itemBuilder: (context, index) {
                        final act = _actions[index];
                        return _buildActionItem(
                          _getIconData(act['iconName'] ?? 'info_outline'),
                          act['label'] ?? '',
                        );
                      },
                    ),
                  ],

                  if (_infocards.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.fromLTRB(20, 32, 20, 12),
                      child: Text(
                        'Information & Updates',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),

                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _infocards.length,
                      itemBuilder: (context, index) {
                        final card = _infocards[index];
                        return _buildInfoCard(
                          context,
                          card['title'] ?? '',
                          card['excerpt'] ?? '',
                          card['timeText'] ?? card['timeLabel'] ?? '5 min read',
                        );
                      },
                    ),
                  ],
                  
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
    );
  }

  Widget _buildPromotionCard(String title, String subtitle, Color color, IconData icon) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            bottom: -20,
            child: Icon(icon, size: 150, color: Colors.white.withOpacity(0.1)),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    'Explore Now',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blueGrey[50],
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.blueGrey[200]!),
          ),
          child: Icon(icon, color: Colors.blueGrey[700]),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildInfoCard(BuildContext context, String title, String excerpt, String time) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blueGrey[100]!),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(excerpt, style: TextStyle(color: Colors.blueGrey[500], fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
                Text(time, style: TextStyle(color: Colors.blueGrey[400], fontSize: 10, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

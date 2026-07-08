import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/plotter_status_action.dart';
import 'cut_selection_screen.dart';
import 'diy_designer_screen.dart';
import 'recharge_screen.dart';

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
  List<dynamic> _recentCuts = [];
  List<dynamic> _topCuts = [];
  int _activePage = 0;
  int? _walletBalance;
  bool _hasUnlimited = false;
  String? _unlimitedPlanType;
  String? _unlimitedEndDate;

  @override
  void initState() {
    super.initState();
    _loadHomeContent();
  }

  Future<void> _loadHomeContent() async {
    setState(() {
      _isLoading = true;
      _activePage = 0;
    });

    final data = await ApiService.fetchMobileHomeContent();
    if (data != null && mounted) {
      setState(() {
        _promotions = data['promotions'] ?? [];
        _actions = data['actions'] ?? [];
        _infocards = data['infocards'] ?? [];
        _recentCuts = data['recentCuts'] ?? [];
        _topCuts = data['topCuts'] ?? [];
        
        final walletData = data['wallet'];
        if (walletData != null) {
          _walletBalance = walletData['balance'];
          _hasUnlimited = walletData['hasUnlimited'] ?? false;
          _unlimitedPlanType = walletData['unlimitedPlanType'];
          _unlimitedEndDate = walletData['unlimitedEndDate'];
        } else {
          _walletBalance = null;
          _hasUnlimited = false;
          _unlimitedPlanType = null;
          _unlimitedEndDate = null;
        }
        _isLoading = false;
      });
    } else if (mounted) {
      // Fallback/Default static values if offline or error
      setState(() {
        _recentCuts = [];
        _topCuts = [];
        _promotions = [
          {
            'title': 'Exclusive iPhone 17 Launch',
            'subtitle': 'Get 20% off on all iPhone 17 Pro designs!',
            'backgroundColor': '#FF2D55', // Vibrant Hot Pink
            'iconName': 'phone_iphone',
          },
          {
            'title': 'New Galaxy S25 Skins',
            'subtitle': 'Explore the latest styles for Samsung S25.',
            'backgroundColor': '#FF9500', // Vibrant Neon Orange
            'iconName': 'smartphone',
          }
        ];
        _actions = [
          {'label': 'Scan QR', 'iconName': 'qr_code_scanner', 'action': 'scan'},
          {'label': 'DIY Custom', 'iconName': 'brush', 'action': 'diy'},
          {'label': 'Stock', 'iconName': 'inventory_2_outlined', 'action': 'stock'},
          {'label': 'Help Support', 'iconName': 'support_agent', 'action': 'help'},
        ];
        _infocards = [
          {
            'title': 'How to apply Flashgard Skins',
            'excerpt': 'Learn the best techniques for a perfect application every time.',
            'timeText': '💡 TIPS • 5 min read',
          },
          {
            'title': 'New Machine Firmware v2.1',
            'excerpt': 'Stability improvements and 15% faster cutting speeds.',
            'timeText': '⚙️ UPDATE • Yesterday',
          },
          {
            'title': 'System Maintenance Info',
            'excerpt': 'The CRM will be undergoing maintenance on Sunday at 2 AM GMT.',
            'timeText': '⚠️ NOTICE • 2 days ago',
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
      case 'brush': return Icons.brush;
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

  // Neon Gradient list helper for action cards
  List<Color> _getActionGradients(int index) {
    final gradients = [
      [const Color(0xFF00F2FE), const Color(0xFF4FACFE)], // Cyan to Blue
      [const Color(0xFFFF0844), const Color(0xFFFFB199)], // Red/Pink to Peach
      [const Color(0xFFF12711), const Color(0xFFF5AF19)], // Orange to Yellow
      [const Color(0xFFB1F91A), const Color(0xFF23D5AB)], // Neon Green
    ];
    return gradients[index % gradients.length];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bgGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: isDark
          ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
          : [const Color(0xFFF8FAFC), const Color(0xFFF1F5F9)],
    );

    final authProvider = Provider.of<AuthProvider>(context);
    final userName = authProvider.userName ?? 'Flashgarder';

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      body: Container(
        decoration: BoxDecoration(gradient: bgGradient),
        child: SafeArea(
          child: _isLoading 
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFCE1D19)),
                ),
              )
            : RefreshIndicator(
                color: const Color(0xFFCE1D19),
                backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                onRefresh: _loadHomeContent,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Beautiful Custom Header (Light Theme)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        'Yo! ',
                                        style: TextStyle(
                                          color: theme.colorScheme.onSurface,
                                          fontSize: 28,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      Expanded(
                                        child: Text(
                                          '$userName ⚡',
                                          overflow: TextOverflow.ellipsis,
                                          maxLines: 1,
                                          style: TextStyle(
                                            fontSize: 28,
                                            fontWeight: FontWeight.w900,
                                            foreground: Paint()..shader = const LinearGradient(
                                              colors: [Color(0xFFCE1D19), Color(0xFFFF9500)],
                                            ).createShader(const Rect.fromLTWH(0.0, 0.0, 200.0, 70.0)),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Ready to cut some awesome protector?',
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                    style: TextStyle(
                                      color: theme.colorScheme.onSurface.withOpacity(0.7),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            const PlotterStatusAction(),
                          ],
                        ),
                      ),

                      // Wallet Balance Card
                      if (_walletBalance != null)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: isDark
                                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                                    : [Colors.white, const Color(0xFFF1F5F9)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                                width: 1.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.03),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.account_balance_wallet_rounded,
                                  color: Color(0xFF4F46E5),
                                  size: 32,
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _hasUnlimited
                                            ? (_unlimitedPlanType == 'LIFETIME' ? 'Lifetime Sub' : 'Unlimited cuts')
                                            : 'Wallet Balance',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _hasUnlimited
                                            ? 'Active'
                                            : '$_walletBalance Credits',
                                        style: TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w900,
                                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                                        ),
                                      ),
                                      if (_hasUnlimited && _unlimitedEndDate != null) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          'Expires: ${DateTime.tryParse(_unlimitedEndDate!)?.toLocal().toString().split(' ')[0] ?? _unlimitedEndDate}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.orange.shade600,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                ElevatedButton.icon(
                                  onPressed: () async {
                                    final result = await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (context) => const RechargeScreen()),
                                    );
                                    if (result == true) {
                                      _loadHomeContent();
                                    }
                                  },
                                  icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                                  label: const Text('Recharge'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF4F46E5),
                                    foregroundColor: Colors.white,
                                    minimumSize: const Size(0, 40),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    elevation: 0,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      const SizedBox(height: 8),

                      // Promotions Carousel
                      if (_promotions.isNotEmpty) ...[
                        SizedBox(
                          height: 210,
                          child: PageView.builder(
                            itemCount: _promotions.length,
                            onPageChanged: (int page) {
                              setState(() {
                                _activePage = page;
                              });
                            },
                            itemBuilder: (context, index) {
                              final promo = _promotions[index];
                              return _buildPromotionCard(
                                promo['title'] ?? '',
                                promo['subtitle'] ?? '',
                                _parseColor(promo['backgroundColor'] ?? '#FF2D55'),
                                _getIconData(promo['iconName'] ?? 'phone_iphone'),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List<Widget>.generate(
                            _promotions.length,
                            (index) => AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: _activePage == index ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                color: _activePage == index
                                    ? const Color(0xFFCE1D19)
                                    : const Color(0xFF0F172A).withOpacity(0.12),
                              ),
                            ),
                          ),
                        ),
                      ],
                      
                      // Quick Actions Grid
                      if (_actions.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 32, 20, 16),
                          child: Text(
                            'Quick Actions',
                            style: TextStyle(
                              fontSize: 20, 
                              fontWeight: FontWeight.w900,
                              color: theme.colorScheme.onSurface,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: List<Widget>.generate(
                              _actions.length,
                              (index) {
                                final act = _actions[index];
                                return _buildActionItem(
                                  _getIconData(act['iconName'] ?? 'info_outline'),
                                  act['label'] ?? '',
                                  _getActionGradients(index),
                                  () {
                                    if (act['action'] == 'diy' || act['action'] == 'history' || act['label'] == 'DIY Custom') {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (context) => const DiyDesignerScreen()),
                                      );
                                    }
                                  },
                                );
                              },
                            ),
                          ),
                        ),
                      ],

                      // R                      // Recent Cuts Section
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Recent Cuts',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: theme.colorScheme.onSurface,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              'Tap to Re-cut ⚡',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        height: 105,
                        child: _recentCuts.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                              child: _buildEmptyStateCard(
                                context,
                                icon: Icons.history_toggle_off_rounded,
                                message: "No recent cuts. Start cutting to see them here!",
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              scrollDirection: Axis.horizontal,
                              itemCount: _recentCuts.length,
                              itemBuilder: (context, index) {
                                final cut = _recentCuts[index];
                                return _buildRecentCutCard(context, cut);
                              },
                            ),
                      ),

                      // Top Cuts Section
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Top Cuts',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: theme.colorScheme.onSurface,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              'Most Popular 🔥',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.amber[700],
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        height: 105,
                        child: _topCuts.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                              child: _buildEmptyStateCard(
                                context,
                                icon: Icons.local_fire_department_rounded,
                                message: "No top cuts yet. Keep cutting to populate this list!",
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              scrollDirection: Axis.horizontal,
                              itemCount: _topCuts.length,
                              itemBuilder: (context, index) {
                                final item = _topCuts[index];
                                return _buildTopCutCard(context, item);
                              },
                            ),
                      ),

                      // Information & Updates
                      if (_infocards.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 36, 20, 16),
                          child: Text(
                            'What\'s New?',
                            style: TextStyle(
                              fontSize: 20, 
                              fontWeight: FontWeight.w900,
                              color: theme.colorScheme.onSurface,
                              letterSpacing: 0.5,
                            ),
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
                              card['timeText'] ?? card['timeLabel'] ?? '💡 TIPS',
                              index,
                            );
                          },
                        ),
                      ],
                      
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
        ),
      ),
    );
  }

  Widget _buildPromotionCard(String title, String subtitle, Color color, IconData icon) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color,
            color.withOpacity(0.85),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.35), 
            blurRadius: 15, 
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.2), width: 1.5),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            Positioned(
              right: -30,
              bottom: -30,
              child: Icon(
                icon, 
                size: 180, 
                color: Colors.white.withOpacity(0.15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white, 
                      fontSize: 22, 
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9), 
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 3),
                        )
                      ],
                    ),
                    child: Text(
                      'Explore Now 🔥',
                      style: TextStyle(
                        color: color, 
                        fontWeight: FontWeight.w900, 
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label, List<Color> gradientColors, VoidCallback onTap) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.05),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            )
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: gradientColors,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: gradientColors[0].withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        )
                      ],
                    ),
                    child: Icon(icon, color: Colors.white, size: 20),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    label, 
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11, 
                      fontWeight: FontWeight.w800,
                      color: theme.colorScheme.onSurface,
                      letterSpacing: 0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, String title, String excerpt, String tagLabel, int index) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Determine dynamic accent color based on index to look rich and playful
    final accentColors = [
      const Color(0xFFCE1D19), // Gold
      const Color(0xFF5856D6), // Purple
      const Color(0xFFFF9500), // Orange
      const Color(0xFF4CD964), // Green
    ];
    final colorAccent = accentColors[index % accentColors.length];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.05),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: colorAccent.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colorAccent.withOpacity(0.15), width: 1.5),
            ),
            child: Icon(Icons.bolt_rounded, color: colorAccent, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tag line
                Text(
                  tagLabel.toUpperCase(), 
                  style: TextStyle(
                    color: colorAccent, 
                    fontSize: 10, 
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  title, 
                  style: TextStyle(
                    fontWeight: FontWeight.w900, 
                    fontSize: 16,
                    color: theme.colorScheme.onSurface,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  excerpt, 
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.6), 
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ), 
                  maxLines: 2, 
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentCutCard(BuildContext context, dynamic cut) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final model = cut['model'];
    
    // Fallback if model relation doesn't exist
    if (model == null) return const SizedBox.shrink();

    final modelName = cut['modelName'] ?? model['name'] ?? 'Unknown Model';
    final brandName = cut['brandName'] ?? 'Device';
    final patternName = cut['patternName'] ?? 'Custom Cut';
    
    // Parse time
    String timeAgo = '';
    try {
      final createdAt = DateTime.parse(cut['createdAt']);
      final diff = DateTime.now().difference(createdAt);
      if (diff.inMinutes < 60) {
        timeAgo = '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        timeAgo = '${diff.inHours}h ago';
      } else {
        timeAgo = '${diff.inDays}d ago';
      }
    } catch (_) {
      timeAgo = 'Recent';
    }

    return Container(
      width: 270,
      margin: const EdgeInsets.fromLTRB(6, 4, 6, 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.05),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            final modelItem = {
              'id': model['id'],
              'name': model['name'],
              'imageUrl': model['imageUrl'],
            };
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CutSelectionScreen(item: modelItem),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                // Icon / Thumbnail Container
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.history_toggle_off_rounded,
                    color: theme.colorScheme.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                
                // Text details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              modelName,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.onSurface,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            timeAgo,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: theme.colorScheme.onSurface.withOpacity(0.4),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$brandName • $patternName',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopCutCard(BuildContext context, dynamic item) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final model = item['model'];
    final cutCount = item['cutCount'] ?? 0;
    
    if (model == null) return const SizedBox.shrink();

    final modelName = model['name'] ?? 'Unknown Model';
    final brandName = model['brand']?['name'] ?? 'Device';

    return Container(
      width: 270,
      margin: const EdgeInsets.fromLTRB(6, 4, 6, 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.05),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            final modelItem = {
              'id': model['id'],
              'name': model['name'],
              'imageUrl': model['imageUrl'],
            };
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CutSelectionScreen(item: modelItem),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                // Star/Flame Icon Container
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.local_fire_department_rounded,
                    color: Colors.amber,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                
                // Text details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        modelName,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              brandName,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: theme.colorScheme.onSurface.withOpacity(0.6),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$cutCount cuts',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyStateCard(BuildContext context, {required IconData icon, required String message}) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFF0F172A).withOpacity(0.05),
          width: 1.5,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: theme.colorScheme.primary.withOpacity(0.5), size: 30),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface.withOpacity(0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';

import 'adaptive.dart';
import 'chat_list_page.dart';
import 'chat_routes.dart';
import 'profile_page.dart';
import 'settings_page.dart';
import '../../core/router/navigator_keys.dart';
import '../../core/services/sync_service.dart';

class HomeTabControllerScope extends InheritedWidget {
  const HomeTabControllerScope({
    super.key,
    required this.controller,
    required super.child,
  });

  final TabController controller;

  static TabController? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<HomeTabControllerScope>()
        ?.controller;
  }

  static TabController of(BuildContext context) {
    final controller = maybeOf(context);
    assert(controller != null, 'HomeTabControllerScope not found');
    return controller!;
  }

  @override
  bool updateShouldNotify(HomeTabControllerScope oldWidget) {
    return controller != oldWidget.controller;
  }
}

class HomeTabBarView extends StatelessWidget {
  const HomeTabBarView({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return TabBarView(
      controller: HomeTabControllerScope.of(context),
      children: children,
    );
  }
}

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.detailNavigator});

  final Widget detailNavigator;

  static bool isWide(BuildContext context) => isMasterDetailLayout(context);

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _chatTabNavKey = GlobalKey<NavigatorState>();
  final _settingsTabNavKey = GlobalKey<NavigatorState>();
  final _profileTabNavKey = GlobalKey<NavigatorState>();
  double _masterPaneWidth = kMasterPaneWidth;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_syncUrlWhenNoChat);

    // Trigger account initialization / delta sync
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(syncServiceProvider).ensureInitialized();
    });
  }

  String get _path => GoRouterState.of(context).uri.path;

  String? get _chatUUID => chatUUIDFromPath(_path);

  void _syncUrlWhenNoChat() {
    if (!mounted || _tabController.indexIsChanging) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _tabController.indexIsChanging) return;
      if (_chatUUID != null) return;
      final target = pathForTab(_tabController.index);
      if (_path != target) {
        context.go(target);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final fromUrl = tabIndexFromPath(_path);
    if (fromUrl == null ||
        fromUrl == _tabController.index ||
        _tabController.indexIsChanging) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (fromUrl != _tabController.index) {
        _tabController.index = fromUrl;
      }
    });
  }

  @override
  void dispose() {
    _tabController.removeListener(_syncUrlWhenNoChat);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabPressed(int index) {
    if (_tabController.index != index) {
      _tabController.animateTo(index);
    }
    if (_chatUUID == null) {
      context.go(pathForTab(index));
    }
  }

  Widget _masterPane({required Widget tabBar}) {
    return Stack(
      children: [
        HomeTabBarView(
          children: [
            _TabNavigator(
              navigatorKey: _chatTabNavKey,
              root: const ChatListPage(),
            ),
            _TabNavigator(
              navigatorKey: _settingsTabNavKey,
              root: const SettingsPage(),
            ),
            _TabNavigator(
              navigatorKey: _profileTabNavKey,
              root: const ProfilePage(),
            ),
          ],
        ),
        Positioned(left: 0, right: 0, bottom: 0, child: tabBar),
      ],
    );
  }

  void _resizeMasterPane(double delta, double screenWidth) {
    setState(() {
      _masterPaneWidth = clampMasterPaneWidth(
        _masterPaneWidth + delta,
        screenWidth,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final wide = isMasterDetailLayout(context);
    final chatOpen = _chatUUID != null;
    final shellCanPop = shellNavigatorKey.currentState?.canPop() ?? false;
    final masterPaneWidth = wide
        ? clampMasterPaneWidth(_masterPaneWidth, screenWidth)
        : screenWidth;
    final tabBar = _FloatingTabBar(
      controller: _tabController,
      onTabPressed: _onTabPressed,
      masterPaneWidth: masterPaneWidth,
    );
    final master = _masterPane(tabBar: tabBar);
    final detail = widget.detailNavigator;

    final Widget body;
    if (wide) {
      body = Stack(
        children: [
          // Layout principale senza spaziatura aggiuntiva per il resizer
          Row(
            children: [
              SizedBox(width: masterPaneWidth, child: master),
              Expanded(child: detail),
            ],
          ),
          // Resizer trasparente e invisibile posizionato esattamente sul bordo
          Positioned(
            left:
                masterPaneWidth -
                8, // Shift a sinistra per centrare la hit area
            top: 0,
            bottom: 0,
            width: 16, // Ampia hit area per un drag/hover agevole (16px)
            child: _MasterPaneResizer(
              onDrag: (delta) => _resizeMasterPane(delta, screenWidth),
            ),
          ),
        ],
      );
    } else {
      final overlayOpen = chatOpen || shellCanPop;
      body = Stack(
        children: [
          ExcludeFocus(excluding: overlayOpen, child: master),
          IgnorePointer(ignoring: !overlayOpen, child: detail),
        ],
      );
    }

    return HomeTabControllerScope(
      controller: _tabController,
      child: Scaffold(body: body),
    );
  }
}

class _TabNavigator extends StatelessWidget {
  const _TabNavigator({required this.navigatorKey, required this.root});

  final GlobalKey<NavigatorState> navigatorKey;
  final Widget root;

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      requestFocus: false,
      onGenerateInitialRoutes: (navigator, initialRoute) {
        return [MaterialPageRoute(builder: (_) => root)];
      },
      onGenerateRoute: (settings) {
        return MaterialPageRoute(builder: (_) => root, settings: settings);
      },
    );
  }
}

class EmptyDetailPane extends StatelessWidget {
  const EmptyDetailPane({super.key});

  @override
  Widget build(BuildContext context) {
    if (!isMasterDetailLayout(context)) {
      return const SizedBox.shrink();
    }
    return const ColoredBox(
      color: Colors.transparent,
      child: Center(
        child: Text(
          'Seleziona una chat dalla lista',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      ),
    );
  }
}

class _MasterPaneResizer extends StatefulWidget {
  const _MasterPaneResizer({required this.onDrag});

  final ValueChanged<double> onDrag;

  @override
  State<_MasterPaneResizer> createState() => _MasterPaneResizerState();
}

class _MasterPaneResizerState extends State<_MasterPaneResizer> {
  bool _hovered = false;
  bool _dragging = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final active = _hovered || _dragging;
    final dividerColor = active
        ? scheme.primary.withValues(alpha: 0.55)
        : scheme.outlineVariant.withValues(alpha: 0.65);

    return MouseRegion(
      cursor: SystemMouseCursors.resizeColumn,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onHorizontalDragStart: (_) => setState(() => _dragging = true),
        onHorizontalDragUpdate: (details) => widget.onDrag(details.delta.dx),
        onHorizontalDragEnd: (_) => setState(() => _dragging = false),
        onHorizontalDragCancel: () => setState(() => _dragging = false),
        child: SizedBox.expand(
          child: Center(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              width: active
                  ? 3
                  : 1, // Cambia solo l'aspetto visivo, non la Hit Area
              color: dividerColor,
            ),
          ),
        ),
      ),
    );
  }
}

class _FloatingTabBar extends StatelessWidget {
  const _FloatingTabBar({
    required this.controller,
    required this.onTabPressed,
    required this.masterPaneWidth,
  });

  final TabController controller;
  final ValueChanged<int> onTabPressed;
  final double masterPaneWidth;

  static const List<_TabSpec> _items = [
    _TabSpec(
      icon: HugeIcons.strokeRoundedChat01,
      activeIcon: HugeIcons.strokeRoundedChat01,
    ),
    _TabSpec(
      icon: HugeIcons.strokeRoundedSettings01,
      activeIcon: HugeIcons.strokeRoundedSettings01,
    ),
    _TabSpec(
      icon: HugeIcons.strokeRoundedUser,
      activeIcon: HugeIcons.strokeRoundedUser,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final paneWidth = isMasterDetailLayout(context)
        ? masterPaneWidth
        : MediaQuery.sizeOf(context).width;
    final barWidth = (paneWidth * 0.64).clamp(220.0, 420.0);
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      minimum: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                width: barWidth,
                height: 68,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                decoration: BoxDecoration(
                  color: scheme.surface.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(
                    color: scheme.outline.withValues(alpha: 0.25),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 100,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: AnimatedBuilder(
                  animation: controller.animation!,
                  builder: (context, child) {
                    return LayoutBuilder(
                      builder: (context, constraints) {
                        final slotWidth = constraints.maxWidth / _items.length;
                        final animValue = controller.animation!.value;

                        return Stack(
                          children: [
                            Positioned(
                              left: animValue * slotWidth,
                              top: 0,
                              bottom: 0,
                              width: slotWidth,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: scheme.primary.withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(100),
                                ),
                              ),
                            ),
                            Row(
                              children: List.generate(_items.length, (index) {
                                final item = _items[index];
                                final selectedAmount =
                                    (1.0 - (animValue - index).abs()).clamp(
                                      0.0,
                                      1.0,
                                    );
                                final iconColor = Color.lerp(
                                  scheme.onSurfaceVariant,
                                  scheme.primary,
                                  selectedAmount,
                                );
                                final scale = 0.92 + (0.08 * selectedAmount);

                                return Expanded(
                                  child: Transform.scale(
                                    scale: scale,
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(
                                          100,
                                        ),
                                        onTap: () => onTabPressed(index),
                                        child: Center(
                                          child: AppHugeIcon(
                                            icon: selectedAmount > 0.5
                                                ? item.activeIcon
                                                : item.icon,
                                            color: iconColor,
                                            size: 28,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ),
                          ],
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TabSpec {
  final List<List<dynamic>> icon;
  final List<List<dynamic>> activeIcon;

  const _TabSpec({required this.icon, required this.activeIcon});
}

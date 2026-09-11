import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_category.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_recents_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_repository.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:unicode_emojis/unicode_emojis.dart' as ue;

/// Single scrollable emoji list: recents + nine categories, with search.
///
/// Mirrors the legacy full-mode `EmojiPicker`: one list with section headers,
/// a search bar on top and a category toolbar (top on mobile, bottom on
/// desktop/web). Emits raw chars via [onSelect]; recents persistence and text
/// insertion are handled by the parent ([EmojiContent]).
class EmojiSectionList extends ConsumerStatefulWidget {
  const EmojiSectionList({super.key, required this.onSelect});

  final ValueChanged<String> onSelect;

  @override
  ConsumerState<EmojiSectionList> createState() => _EmojiSectionListState();
}

class _ViewSection {
  const _ViewSection({
    required this.title,
    required this.category,
    required this.emojis,
  });

  final String title;
  final EmojiCategory? category;
  final List<ue.Emoji> emojis;
}

class _EmojiSectionListState extends ConsumerState<EmojiSectionList> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  late final ValueNotifier<EmojiCategory> _active;
  String _query = '';
  bool _activeInitialized = false;

  /// Controls whether the search bar is visible (auto-hides on scroll down).
  final ValueNotifier<bool> _showSearchBar = ValueNotifier(true);
  double _lastScrollOffset = 0;

  List<_ViewSection>? _cachedSections;
  Object? _cacheKey;

  /// Header pixel offsets (content coordinates), measured once per layout.
  Map<EmojiCategory, double> _sectionOffsets = const {};
  bool _measureScheduled = false;

  final Map<EmojiCategory, GlobalKey> _headerKeys = {
    for (final c in EmojiCategory.values) c: GlobalKey(),
  };

  @override
  void initState() {
    super.initState();
    _active = ValueNotifier(EmojiCategory.smileys);
    _scrollController.addListener(_onListScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    _active.dispose();
    _showSearchBar.dispose();
    super.dispose();
  }

  List<_ViewSection> _sections(AppLocalizations l10n, List<String> recents) {
    final key = Object.hash(_query, Object.hashAll(recents));
    if (_cachedSections != null && _cacheKey == key) {
      return _cachedSections!;
    }
    final List<_ViewSection> sections;
    if (_query.isNotEmpty) {
      sections = [
        _ViewSection(
          title: l10n.emojiSearchResults,
          category: null,
          emojis: EmojiRepository.search(_query),
        ),
      ];
    } else {
      sections = EmojiRepository.buildSections(recents)
          .map(
            (s) => _ViewSection(
              title: s.category.label(l10n),
              category: s.category,
              emojis: s.emojis,
            ),
          )
          .toList();
    }
    _cachedSections = sections;
    _cacheKey = key;
    final hasRecents = sections.any((s) => s.category == EmojiCategory.recents);
    if (!_activeInitialized) {
      _activeInitialized = true;
      // Like legacy: start on recents when they exist.
      if (hasRecents) _active.value = EmojiCategory.recents;
    } else if (_active.value == EmojiCategory.recents && !hasRecents) {
      _active.value = EmojiCategory.smileys;
    }
    return sections;
  }

  void _scrollToCategory(EmojiCategory category) {
    _active.value = category;
    final context = _headerKeys[category]?.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 200),
      alignment: 0,
    );
  }

  /// Cheap per-frame check: compares the scroll offset against the measured
  /// section offsets instead of querying render objects every frame.
  /// Also tracks scroll direction to auto-show/hide the search bar.
  void _onListScroll() {
    if (!_scrollController.hasClients) return;
    final pixels = _scrollController.position.pixels;

    // Auto-show/hide search bar based on scroll direction.
    final delta = pixels - _lastScrollOffset;
    _lastScrollOffset = pixels;
    if (delta > 2) {
      // Scrolling down → hide search.
      if (_showSearchBar.value) _showSearchBar.value = false;
    } else if (delta < -1) {
      // Scrolling up even slightly → show search.
      if (!_showSearchBar.value) _showSearchBar.value = true;
    }
    // Also show when scrolled to the very top.
    if (pixels <= 0 && !_showSearchBar.value) {
      _showSearchBar.value = true;
    }

    // Update active category highlight.
    if (_query.isNotEmpty || _sectionOffsets.isEmpty) return;
    EmojiCategory? visible;
    for (final c in EmojiCategory.values) {
      final offset = _sectionOffsets[c];
      if (offset == null) continue;
      if (offset <= pixels + 1) {
        visible = c;
      } else {
        break;
      }
    }
    if (visible != null && visible != _active.value) {
      _active.value = visible;
    }
  }

  void _scheduleMeasure() {
    if (_measureScheduled) return;
    _measureScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _measureScheduled = false;
      if (!mounted || _query.isNotEmpty) return;
      try {
        GlobalKey? first;
        for (final c in EmojiCategory.values) {
          final k = _headerKeys[c]!;
          if (k.currentContext != null) {
            first = k;
            break;
          }
        }
        final ctx = first?.currentContext;
        if (ctx == null) return;
        final scrollable = Scrollable.of(ctx);
        final scrollBox = scrollable.context.findRenderObject() as RenderBox?;
        if (scrollBox == null || !_scrollController.hasClients) return;
        final pixels = _scrollController.position.pixels;
        final map = <EmojiCategory, double>{};
        for (final c in EmojiCategory.values) {
          final hctx = _headerKeys[c]!.currentContext;
          if (hctx == null) continue;
          try {
            final hbox = hctx.findRenderObject() as RenderBox?;
            if (hbox == null || !hbox.attached) continue;
            map[c] =
                hbox.localToGlobal(Offset.zero, ancestor: scrollBox).dy +
                pixels;
          } catch (_) {}
        }
        _sectionOffsets = map;
        _onListScroll();
      } catch (_) {}
    });
  }

  Future<void> _showSkinTonePicker(ue.Emoji base) async {
    final variants = [base, ...?base.skinVariations];
    final selected = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        final colorScheme = Theme.of(dialogContext).colorScheme;
        return Dialog(
          backgroundColor: colorScheme.surfaceContainerHighest,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 4,
              children: [
                for (final v in variants)
                  InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => Navigator.of(dialogContext).pop(v.emoji),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        v.emoji,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
    if (selected != null) widget.onSelect(selected);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final recents = ref.watch(emojiRecentsProvider);
    final isSearching = _query.isNotEmpty;
    final sections = _sections(l10n, recents);
    // Like legacy: the category toolbar is hidden while searching.
    final showToolbar = !isSearching;
    _scheduleMeasure();

    final toolbar = _CategoryToolbar(
      categories: [
        if (recents.isNotEmpty) EmojiCategory.recents,
        ...EmojiCategory.values.where((c) => c != EmojiCategory.recents),
      ],
      active: _active,
      onTap: _scrollToCategory,
    );

    final searchBar = Padding(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
      child: TextField(
        controller: _searchController,
        onChanged: (v) => setState(() => _query = v.trim()),
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: l10n.emojiSearchPlaceholder,
          hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
          prefixIcon: Icon(Icons.search, color: colorScheme.onSurfaceVariant),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _query = '');
                  },
                )
              : null,
          filled: true,
          fillColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 10,
          ),
          isDense: true,
        ),
      ),
    );

    final list = Expanded(
      child: isSearching && sections.first.emojis.isEmpty
          ? Center(
              child: Text(
                l10n.emojiNoResults,
                style: TextStyle(color: colorScheme.onSurfaceVariant),
              ),
            )
          : LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth < 200 ? 4 : 8;
                final cellSize = (constraints.maxWidth - 20) / columns;
                final fontSize = cellSize * (currentPlatform == AppPlatform.mobile ? 0.75 : 0.6);
                return CustomScrollView(
                  controller: _scrollController,
                  slivers: [
                    for (final section in sections) ...[
                      if (section.emojis.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: _SectionHeader(
                            key: section.category == null
                                ? null
                                : _headerKeys[section.category],
                            title: section.title,
                          ),
                        ),
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          sliver: SliverGrid(
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: columns,
                                  childAspectRatio: 1,
                                ),
                            delegate: SliverChildBuilderDelegate((context, i) {
                              final emoji = section.emojis[i];
                              final hasTones =
                                  emoji.skinVariations?.isNotEmpty ?? false;
                              return InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: () => widget.onSelect(emoji.emoji),
                                onLongPress: hasTones
                                    ? () => _showSkinTonePicker(emoji)
                                    : null,
                                child: Center(
                                  child: Text(
                                    emoji.emoji,
                                    style: TextStyle(fontSize: fontSize),
                                  ),
                                ),
                              );
                            }, childCount: section.emojis.length),
                          ),
                        ),
                      ],
                    ],
                  ],
                );
              },
            ),
    );

    final isMobile = currentPlatform == AppPlatform.mobile;

    // Search bar with auto-hide animation.
    final searchBarWidget = ValueListenableBuilder<bool>(
      valueListenable: _showSearchBar,
      builder: (context, show, child) {
        return AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: show ? child! : const SizedBox.shrink(),
        );
      },
      child: searchBar,
    );

    return Column(
      children: [
        if (isMobile && showToolbar) toolbar,
        searchBarWidget,
        list,
        if (!isMobile && showToolbar) toolbar,
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

/// Horizontal category toolbar with mouse-drag scrolling and auto-follow.
///
/// Items have a fixed stride so the active icon can be scrolled into view
/// without measuring render objects. Highlight updates come from [active]
/// without rebuilding the emoji list.
class _CategoryToolbar extends StatefulWidget {
  const _CategoryToolbar({
    required this.categories,
    required this.active,
    required this.onTap,
  });

  static const double itemStride = 40;
  static const double leadingPadding = 10;

  final List<EmojiCategory> categories;
  final ValueNotifier<EmojiCategory> active;
  final ValueChanged<EmojiCategory> onTap;

  @override
  State<_CategoryToolbar> createState() => _CategoryToolbarState();
}

class _CategoryToolbarState extends State<_CategoryToolbar> {
  final _controller = ScrollController();

  @override
  void initState() {
    super.initState();
    widget.active.addListener(_followActive);
  }

  @override
  void didUpdateWidget(covariant _CategoryToolbar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      oldWidget.active.removeListener(_followActive);
      widget.active.addListener(_followActive);
    }
    if (!_sameCategories(oldWidget.categories, widget.categories)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _followActive();
      });
    }
  }

  @override
  void dispose() {
    widget.active.removeListener(_followActive);
    _controller.dispose();
    super.dispose();
  }

  bool _sameCategories(List<EmojiCategory> a, List<EmojiCategory> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  void _followActive() {
    if (!_controller.hasClients) return;
    final index = widget.categories.indexOf(widget.active.value);
    if (index < 0) return;
    final position = _controller.position;
    const stride = _CategoryToolbar.itemStride;
    const leading = _CategoryToolbar.leadingPadding;
    final start = leading + index * stride;
    final end = start + stride;
    final pixels = position.pixels;
    final viewport = position.viewportDimension;
    double? target;
    if (start < pixels) {
      target = start - leading;
    } else if (end > pixels + viewport) {
      target = end - viewport + leading;
    }
    if (target == null) return;
    target = target.clamp(position.minScrollExtent, position.maxScrollExtent);
    if ((target - pixels).abs() < 1) return;
    _controller.animateTo(
      target,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: ScrollConfiguration(
        behavior: const _ToolbarScrollBehavior(),
        child: SingleChildScrollView(
          controller: _controller,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(
            horizontal: _CategoryToolbar.leadingPadding,
          ),
          child: ValueListenableBuilder<EmojiCategory>(
            valueListenable: widget.active,
            builder: (context, active, _) {
              return Row(
                children: [
                  for (final category in widget.categories)
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => widget.onTap(category),
                        child: Container(
                          width: 36,
                          height: 32,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: category == active
                                ? colorScheme.primaryContainer
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: AppHugeIcon(
                            icon: category.icon,
                            size: 18,
                            color: category == active
                                ? colorScheme.onPrimaryContainer
                                : colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Enables mouse-drag scrolling (desktop default only allows touch-like
/// drags), so the toolbar is scrollable with any pointer.
class _ToolbarScrollBehavior extends MaterialScrollBehavior {
  const _ToolbarScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => const {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.stylus,
    PointerDeviceKind.invertedStylus,
    PointerDeviceKind.trackpad,
    PointerDeviceKind.unknown,
  };
}

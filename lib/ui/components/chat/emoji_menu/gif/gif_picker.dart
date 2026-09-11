import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_grid.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_provider.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart';

/// GIF picker: search + provider filter + recents/trending/results grid.
///
/// Data comes from [GifProvider] (gateway-backed, Klipy today). Recents are
/// read from [GifRecentsStore] (persisted). Selection is reported via
/// [onSelectGif]; the caller (menu shell) sends the message and closes.
class GifPicker extends ConsumerStatefulWidget {
  const GifPicker({super.key, required this.onSelectGif});

  final ValueChanged<GifItem> onSelectGif;

  static const searchDebounce = Duration(milliseconds: 350);
  static const pageSize = 24;

  @override
  ConsumerState<GifPicker> createState() => _GifPickerState();
}

class _GifPickerState extends ConsumerState<GifPicker> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _debounce;

  String _query = '';
  String _selectedProvider = 'all';
  List<String> _availableProviders = const [];
  List<GifItem> _results = const [];
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  int _page = 1;
  bool _hasMore = true;
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _fetch(reset: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(GifPicker.searchDebounce, () {
      final q = value.trim();
      if (q == _query) return;
      setState(() => _query = q);
      _fetch(reset: true);
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 400) {
      _fetchMore();
    }
  }

  List<GifItem> _filtered(List<GifItem> items) {
    if (_selectedProvider == 'all') return items;
    return items.where((g) => g.provider == _selectedProvider).toList();
  }

  Future<void> _fetch({required bool reset}) async {
    final id = ++_requestId;
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _page = 1;
        _hasMore = true;
      });
    }
    try {
      final provider = ref.read(gifProviderProvider);
      final res = reset
          ? await provider.search(
              _query,
              limit: GifPicker.pageSize,
              page: 1,
              providerId: 'all',
            )
          : await provider.search(
              _query,
              limit: GifPicker.pageSize,
              page: _page,
              providerId: 'all',
            );
      if (!mounted || id != _requestId) return;
      setState(() {
        // Providers are advertised by the backend; keep them client-side so
        // the filter never triggers a refetch race (legacy behavior).
        if (res.providers.isNotEmpty) {
          _availableProviders = res.providers;
          if (_selectedProvider != 'all' &&
              !_availableProviders.contains(_selectedProvider)) {
            _selectedProvider = 'all';
          }
        }
        _results = res.items;
        _loading = false;
        _hasMore = res.items.length >= GifPicker.pageSize;
      });
    } catch (e) {
      if (!mounted || id != _requestId) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _fetchMore() async {
    if (_loading || _loadingMore || !_hasMore || _error != null) return;
    setState(() => _loadingMore = true);
    final id = _requestId;
    try {
      final provider = ref.read(gifProviderProvider);
      final next = _page + 1;
      final res = await provider.search(
        _query,
        limit: GifPicker.pageSize,
        page: next,
        providerId: 'all',
      );
      if (!mounted || id != _requestId) return;
      setState(() {
        _page = next;
        _results = [..._results, ...res.items];
        _hasMore = res.items.length >= GifPicker.pageSize;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final recents = ref.watch(gifRecentsProvider);
    final isSearching = _query.isNotEmpty;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
          child: TextField(
            controller: _searchController,
            onChanged: _onSearchChanged,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: l10n.gifSearchPlaceholder,
              hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
              prefixIcon: Icon(
                Icons.search,
                color: colorScheme.onSurfaceVariant,
              ),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                        setState(() {});
                      },
                    )
                  : null,
              filled: true,
              fillColor: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.6,
              ),
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
        ),
        if (_availableProviders.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  _ProviderChip(
                    label: l10n.gifProviderAll,
                    selected: _selectedProvider == 'all',
                    onTap: () =>
                        setState(() => _selectedProvider = 'all'),
                  ),
                  for (final p in _availableProviders)
                    _ProviderChip(
                      label: _capitalize(p),
                      selected: _selectedProvider == p,
                      onTap: () => setState(() => _selectedProvider = p),
                    ),
                ],
              ),
            ),
          ),
        Expanded(child: _buildBody(l10n, recents, isSearching)),
      ],
    );
  }

  Widget _buildBody(AppLocalizations l10n, List<GifItem> recents, bool isSearching) {
    final colorScheme = Theme.of(context).colorScheme;

    if (_loading) {
      return Center(
        child: CircularProgressIndicator(color: colorScheme.primary),
      );
    }
    if (_error != null && _results.isEmpty && (isSearching || recents.isEmpty)) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l10n.gifLoadError,
                style: TextStyle(color: colorScheme.error),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => _fetch(reset: true),
                child: Text(l10n.retry),
              ),
            ],
          ),
        ),
      );
    }

    final filteredResults = _filtered(_results);
    final filteredRecents = _filtered(recents);

    if (isSearching) {
      if (filteredResults.isEmpty) {
        return Center(
          child: Text(
            l10n.gifNoResults,
            style: TextStyle(color: colorScheme.onSurfaceVariant),
          ),
        );
      }
      return _GifSliverGrid(
        controller: _scrollController,
        sections: [GifSection(title: l10n.gifSearchResults, gifs: filteredResults)],
        loadingMore: _loadingMore,
        onTap: widget.onSelectGif,
      );
    }

    final showRecents = filteredRecents.isNotEmpty;
    if (!showRecents && filteredResults.isEmpty) {
      return Center(
        child: Text(
          l10n.gifNoResults,
          style: TextStyle(color: colorScheme.onSurfaceVariant),
        ),
      );
    }
    return _GifSliverGrid(
      controller: _scrollController,
      sections: [
        if (showRecents)
          GifSection(title: l10n.gifRecents, gifs: filteredRecents),
        GifSection(title: l10n.gifPopular, gifs: filteredResults),
      ],
      loadingMore: _loadingMore,
      onTap: widget.onSelectGif,
    );
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _ProviderChip extends StatelessWidget {
  const _ProviderChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: colorScheme.primaryContainer,
        backgroundColor: colorScheme.surfaceContainerHighest,
        labelStyle: TextStyle(
          color: selected
              ? colorScheme.onPrimaryContainer
              : colorScheme.onSurfaceVariant,
        ),
        side: BorderSide.none,
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}

/// Grid with optional section headers. Uses [SliverGrid] with fixed
/// cross-axis count (2 compact, 3 regular) and aspect-preserving cards.
class GifSection {
  const GifSection({required this.title, required this.gifs});

  final String title;
  final List<GifItem> gifs;
}

class _GifSliverGrid extends StatelessWidget {
  const _GifSliverGrid({
    required this.controller,
    required this.onTap,
    required this.sections,
    required this.loadingMore,
  });

  final ScrollController controller;
  final ValueChanged<GifItem> onTap;
  final List<GifSection> sections;
  final bool loadingMore;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = constraints.maxWidth < 280 ? 2 : 3;
        return CustomScrollView(
          controller: controller,
          slivers: [
            for (final section in sections)
              if (section.gifs.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: GifSectionHeader(title: section.title),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  sliver: SliverGrid(
                    gridDelegate:
                        SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: count,
                          mainAxisSpacing: 6,
                          crossAxisSpacing: 6,
                        ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => GifCard(
                        gif: section.gifs[i],
                        onTap: () => onTap(section.gifs[i]),
                      ),
                      childCount: section.gifs.length,
                    ),
                  ),
                ),
              ],
            if (loadingMore)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

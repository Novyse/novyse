import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:keyboard_controller/keyboard_controller.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji_menu_overlay.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji_panel_sheet.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart'
    show sharedPreferencesProvider;
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_send_handler.dart';

typedef ChatImeComposerBuilder = Widget Function(
  bool emojiOpen,
  VoidCallback onToggle,
);

/// Mobile IME-height slot + emoji sheet with keyboard swap.
class ChatImePanel extends ConsumerStatefulWidget {
  const ChatImePanel({
    super.key,
    required this.chatUUID,
    required this.subID,
    required this.focusNode,
    required this.composerBuilder,
    this.onEmojiOpenChanged,
  });

  final String chatUUID;
  final int subID;
  final FocusNode focusNode;
  final ChatImeComposerBuilder composerBuilder;
  final ValueChanged<bool>? onEmojiOpenChanged;

  @override
  ConsumerState<ChatImePanel> createState() => ChatImePanelState();
}

class ChatImePanelState extends ConsumerState<ChatImePanel>
    with SingleTickerProviderStateMixin {
  static const _prefsKey = 'chat.ime_keyboard_height';
  static double _cachedHeight = 0;

  bool _emojiOpen = false;
  bool _opening = false;
  bool _holdKeyboard = false;
  int _epoch = 0;
  double _dragOffset = 0;

  Timer? _holdTimeout;
  KeyboardController? _keyboard;
  late final AnimationController _sheetAnim;

  bool get isEmojiOpen => _emojiOpen;
  bool get _locked => _emojiOpen || _opening || _holdKeyboard;

  @override
  void initState() {
    super.initState();
    widget.focusNode.addListener(_onFocusChanged);
    _sheetAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 240),
      reverseDuration: const Duration(milliseconds: 200),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _restoreHeight();
    });
  }

  @override
  void didUpdateWidget(covariant ChatImePanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode == widget.focusNode) return;
    oldWidget.focusNode.removeListener(_onFocusChanged);
    widget.focusNode.addListener(_onFocusChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final keyboard = KeyboardScope.of(context);
    if (identical(_keyboard, keyboard)) return;
    _unbindKeyboard();
    _keyboard = keyboard;
    _bindKeyboard(keyboard);
  }

  @override
  void dispose() {
    _holdTimeout?.cancel();
    _unbindKeyboard();
    widget.focusNode.removeListener(_onFocusChanged);
    _sheetAnim.dispose();
    super.dispose();
  }

  void _bindKeyboard(KeyboardController keyboard) {
    keyboard.height.addListener(_onKeyboardTick);
    keyboard.targetHeight.addListener(_onKeyboardTick);
    keyboard.phase.addListener(_onKeyboardTick);
  }

  void _unbindKeyboard() {
    final keyboard = _keyboard;
    if (keyboard == null) return;
    keyboard.height.removeListener(_onKeyboardTick);
    keyboard.targetHeight.removeListener(_onKeyboardTick);
    keyboard.phase.removeListener(_onKeyboardTick);
    _keyboard = null;
  }

  void _onFocusChanged() {
    if (widget.focusNode.hasFocus && _emojiOpen) {
      goToKeyboard(requestFocus: false);
    }
  }

  void _onKeyboardTick() {
    final live = _keyboard?.height.value ?? 0;
    if (live > 0) _rememberHeight(live);
    if (_holdKeyboard && _keyboard?.phase.value == KeyboardPhase.open) {
      _holdKeyboard = false;
      _holdTimeout?.cancel();
    }
    if (mounted) setState(() {});
  }

  Future<void> _persistHeight(double height) async {
    try {
      await ref.read(sharedPreferencesProvider).setDouble(_prefsKey, height);
    } catch (_) {}
  }

  void _rememberHeight(double height) {
    if (height <= 0 || height <= _cachedHeight) return;
    _cachedHeight = height;
    unawaited(_persistHeight(height));
  }

  void _restoreHeight() {
    if (_cachedHeight > 0) return;
    try {
      final stored =
          ref.read(sharedPreferencesProvider).getDouble(_prefsKey) ?? 0;
      if (stored > 0) _cachedHeight = stored;
    } catch (_) {}
  }

  double _slotHeight() {
    final live = _keyboard?.height.value ?? 0;
    if (live > 0) _rememberHeight(live);
    if (!_locked) return live;
    return _cachedHeight > 0 ? math.max(live, _cachedHeight) : live;
  }

  double _reported(KeyboardController k) =>
      math.max(k.height.value, k.targetHeight.value);

  Future<double> _waitForHeight() async {
    final keyboard = KeyboardScope.of(context);
    final already = _reported(keyboard);
    if (already > 0) return already;

    final completer = Completer<double>();
    void listener() {
      final height = _reported(keyboard);
      if (height > 0 && !completer.isCompleted) completer.complete(height);
    }

    keyboard.height.addListener(listener);
    keyboard.targetHeight.addListener(listener);
    final timer = Timer(const Duration(milliseconds: 700), () {
      if (!completer.isCompleted) completer.complete(_reported(keyboard));
    });
    try {
      return await completer.future;
    } finally {
      timer.cancel();
      keyboard.height.removeListener(listener);
      keyboard.targetHeight.removeListener(listener);
    }
  }

  void _beginHold() {
    _holdKeyboard = true;
    _holdTimeout?.cancel();
    _holdTimeout = Timer(const Duration(milliseconds: 1200), () {
      if (!mounted || !_holdKeyboard) return;
      setState(() => _holdKeyboard = false);
    });
  }

  void _resetSheetAnim() {
    if (!_sheetAnim.isAnimating && _sheetAnim.value == 0) return;
    _sheetAnim.stop();
    _sheetAnim.value = 0;
  }

  void goToKeyboard({bool requestFocus = true}) {
    _epoch++;
    _opening = false;
    _resetSheetAnim();
    setState(() {
      _emojiOpen = false;
      _dragOffset = 0;
      _beginHold();
    });
    widget.onEmojiOpenChanged?.call(false);
    if (requestFocus) widget.focusNode.requestFocus();
  }

  void _dismissFromDrag() {
    _epoch++;
    _opening = false;
    _holdTimeout?.cancel();
    _sheetAnim.value = 0;
    setState(() {
      _emojiOpen = false;
      _holdKeyboard = false;
      _dragOffset = 0;
    });
    widget.onEmojiOpenChanged?.call(false);
  }

  Future<void> hideAccessoryPanel({bool animated = true}) async {
    final epoch = ++_epoch;
    _opening = false;
    _holdTimeout?.cancel();

    if (_emojiOpen) {
      if (animated && _sheetAnim.value > 0 && _dragOffset <= 0) {
        await _sheetAnim.reverse();
        if (!mounted || epoch != _epoch) return;
      } else {
        _sheetAnim.value = 0;
      }
      if (!mounted || epoch != _epoch) return;
      setState(() {
        _emojiOpen = false;
        _holdKeyboard = false;
        _dragOffset = 0;
      });
      widget.onEmojiOpenChanged?.call(false);
    } else {
      _holdKeyboard = false;
      _dragOffset = 0;
    }

    if (widget.focusNode.hasFocus) widget.focusNode.unfocus();
  }

  Future<void> openEmojiSheet() async {
    final epoch = ++_epoch;
    _opening = true;
    if (mounted) setState(() {});
    try {
      _restoreHeight();
      final keyboard = KeyboardScope.of(context);
      var measured = _reported(keyboard);
      if (measured > 0) _rememberHeight(measured);

      if (_cachedHeight <= 0) {
        widget.focusNode.requestFocus();
        measured = await _waitForHeight();
        if (!mounted || epoch != _epoch) return;
        _rememberHeight(
          measured > 0 ? measured : MediaQuery.sizeOf(context).height * 0.4,
        );
      }

      if (!mounted || epoch != _epoch) return;
      setState(() {
        _emojiOpen = true;
        _holdKeyboard = false;
        _dragOffset = 0;
      });
      widget.onEmojiOpenChanged?.call(true);
      widget.focusNode.unfocus();
      await _sheetAnim.forward();
    } finally {
      if (epoch == _epoch) {
        _opening = false;
        if (mounted) setState(() {});
      }
    }
  }

  void toggleEmoji() {
    if (_emojiOpen || _opening) {
      goToKeyboard();
    } else {
      unawaited(openEmojiSheet());
    }
  }

  Future<void> _onSelectGif(GifItem gif) async {
    try {
      await GifSendHandler.sendGif(
        ref: ref,
        chatUUID: widget.chatUUID,
        subID: widget.subID,
        gif: gif,
      );
    } catch (_) {
      return;
    }
    await hideAccessoryPanel();
  }

  @override
  Widget build(BuildContext context) {
    final safeBottom = MediaQuery.viewPaddingOf(context).bottom;
    final panel = _slotHeight();
    final visible = math.max(0.0, panel - _dragOffset).toDouble();
    final lift = math.max(0.0, visible - safeBottom);
    final showSheet = (_emojiOpen || _sheetAnim.isAnimating) && panel > 0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        widget.composerBuilder(_emojiOpen, toggleEmoji),
        SizedBox(
          height: lift,
          child: showSheet
              ? OverflowBox(
                  alignment: Alignment.bottomCenter,
                  minHeight: visible,
                  maxHeight: visible,
                  child: EmojiPanelSheet(
                    height: visible,
                    maxDrag: panel,
                    animation: _sheetAnim,
                    onDragOffset: (offset) {
                      if (_dragOffset == offset) return;
                      setState(() => _dragOffset = offset);
                    },
                    onDismiss: _dismissFromDrag,
                    child: EmojiMenuPanel(
                      textController: ref.watch(
                        chatTextControllerProvider(widget.chatUUID),
                      ),
                      onSelectGif: _onSelectGif,
                      height: math.max(0.0, visible - 28),
                      style: EmojiMenuPanelStyle.sheet,
                    ),
                  ),
                )
              : null,
        ),
      ],
    );
  }
}

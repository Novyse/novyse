import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/chat/message_quick_action.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';

const _buttonOverlap = 0.175;
const _buttonLift = 0.775;

class MessageQuickActionsOverlay extends StatefulWidget {
  const MessageQuickActionsOverlay({
    super.key,
    required this.enabled,
    required this.isSender,
    required this.message,
    required this.child,
  });

  final bool enabled;
  final bool isSender;
  final MessageModel message;
  final Widget child;

  @override
  State<MessageQuickActionsOverlay> createState() =>
      _MessageQuickActionsOverlayState();
}

class _MessageQuickActionsOverlayState extends State<MessageQuickActionsOverlay>
    with SingleTickerProviderStateMixin {
  final _portal = OverlayPortalController();
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 150),
  );
  late final Animation<double> _opacity = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOut,
    reverseCurve: Curves.easeIn,
  );

  var _overBubble = false;
  var _overActions = false;
  var _shown = false;
  var _alive = false;

  @override
  void initState() {
    super.initState();
    _controller.addStatusListener(_onStatus);
    _portal.show();
  }

  @override
  void didUpdateWidget(MessageQuickActionsOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.enabled != widget.enabled) _applyShown();
  }

  @override
  void dispose() {
    _controller.removeStatusListener(_onStatus);
    _controller.dispose();
    super.dispose();
  }

  void _setHover({bool? bubble, bool? actions}) {
    final overBubble = bubble ?? _overBubble;
    final overActions = actions ?? _overActions;
    if (overBubble == _overBubble && overActions == _overActions) return;
    _overBubble = overBubble;
    _overActions = overActions;
    _applyShown();
  }

  void _applyShown() {
    final show = widget.enabled && (_overBubble || _overActions);
    if (show == _shown) return;
    setState(() {
      _shown = show;
      if (show) _alive = true;
    });
    if (show) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  void _onStatus(AnimationStatus status) {
    if (status != AnimationStatus.dismissed || _shown) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _shown) return;
      setState(() => _alive = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return OverlayPortal.overlayChildLayoutBuilder(
      controller: _portal,
      overlayChildBuilder: (context, info) {
        if (!_alive) return const SizedBox.shrink();
        final origin = MatrixUtils.transformPoint(
          info.childPaintTransform,
          Offset.zero,
        );
        final corner = widget.isSender
            ? origin
            : origin + Offset(info.childSize.width, 0);
        return Positioned(
          left: corner.dx,
          top: corner.dy,
          child: FractionalTranslation(
            translation: Offset(
              widget.isSender ? -_buttonOverlap : -1 + _buttonOverlap,
              -_buttonLift,
            ),
            child: IgnorePointer(
              ignoring: !_shown,
              child: FadeTransition(
                opacity: _opacity,
                child: MouseRegion(
                  onEnter: (_) => _setHover(actions: true),
                  onExit: (_) => _setHover(actions: false),
                  child: _QuickActionButtons(message: widget.message),
                ),
              ),
            ),
          ),
        );
      },
      child: MouseRegion(
        onEnter: (_) => _setHover(bubble: true),
        onExit: (_) => _setHover(bubble: false),
        child: widget.child,
      ),
    );
  }
}

class _QuickActionButtons extends ConsumerWidget {
  const _QuickActionButtons({required this.message});

  final MessageModel message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final actions = MessageQuickAction.resolve(
      ref.watch(settingValueProvider(MessageQuickAction.settingKey1)),
      ref.watch(settingValueProvider(MessageQuickAction.settingKey2)),
    );
    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final chat = ref.watch(chatProvider(message.chatUUID));
    final visible = [
      for (final action in actions)
        if (MessageQuickAction.isAllowed(
          action: action,
          message: message,
          chat: chat,
          localUserUUID: localUserUUID,
        ))
          action,
    ];
    if (visible.isEmpty) return const SizedBox.shrink();

    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        for (final action in visible)
          _QuickActionButton(
            icon: MessageQuickAction.iconFor(action),
            color: action == MessageQuickAction.delete
                ? colorScheme.error
                : colorScheme.onSurface,
            onTap: () {
              final methods = MessageActionMethods(
                ref: ref,
                context: context,
                chatUUID: message.chatUUID,
                subID: message.subID,
              );
              switch (action) {
                case MessageQuickAction.reply:
                  methods.reply(message);
                case MessageQuickAction.edit:
                  methods.edit(message);
                case MessageQuickAction.delete:
                  unawaited(methods.delete(context, message));
              }
            },
          ),
      ],
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final List<List<dynamic>> icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      elevation: 2,
      shadowColor: Colors.black54,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: AppHugeIcon(icon: icon, size: 14, color: color),
        ),
      ),
    );
  }
}

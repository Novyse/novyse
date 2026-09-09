import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/onboarding/onboarding_primary_button.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/status/status_message.dart';

Future<T?> showJoinOrCreateChatModal<T>({
  required BuildContext context,
  required ChatModel chat,
  required ValueChanged<String> onJoined,
}) {
  return ResponsiveOverlay.show<T>(
    context: context,
    mode: ResponsiveOverlayMode.dynamic,
    child: JoinOrCreateChatModal(chat: chat, onJoined: onJoined),
  );
}

class JoinOrCreateChatModal extends ConsumerStatefulWidget {
  const JoinOrCreateChatModal({
    super.key,
    required this.chat,
    required this.onJoined,
  });

  final ChatModel chat;
  final ValueChanged<String> onJoined;

  @override
  ConsumerState<JoinOrCreateChatModal> createState() =>
      _JoinOrCreateChatModalState();
}

class _JoinOrCreateChatModalState extends ConsumerState<JoinOrCreateChatModal> {
  bool _loading = false;
  String? _error;

  bool get _isUser => widget.chat.type == 'DM';

  String _getTitle(AppLocalizations l10n) {
    if (_isUser) return l10n.joinCreateStartDm;
    switch (widget.chat.type) {
      case 'CHANNEL':
        return l10n.joinCreateJoinChannel;
      case 'GROUP':
        return l10n.joinCreateJoinGroup;
      case 'FORUM':
        return l10n.joinCreateJoinForum;
      default:
        return l10n.joinCreateJoinChat;
    }
  }

  Future<void> _handleAction() async {
    final l10n = AppLocalizations.of(context);
    if (l10n == null || _loading) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (_isUser) {
        final targetUUID = widget.chat.uuid;
        if (targetUUID.isEmpty) throw Exception('User UUID missing');

        final res = await apiGateway.chat.create(
          'DM',
          memberUUIDs: [targetUUID],
        );
        if (!mounted) return;

        final success = res['success'] == true;
        final newChat = res['chat'];
        if (success && newChat is Map<String, dynamic>) {
          final users = (res['users'] as List?) ?? const [];
          await globalEventEmitter.chat.add(newChat, users);
          if (!mounted) return;
          final uuid = newChat['uuid'] as String?;
          Navigator.of(context, rootNavigator: true).pop();
          if (uuid != null && uuid.isNotEmpty) {
            widget.onJoined(uuid);
          }
        } else {
          setState(() {
            _loading = false;
            _error = l10n.joinCreateError;
          });
        }
      } else {
        final handle = widget.chat.handle;
        if (handle == null || handle.isEmpty) {
          throw Exception('Chat handle missing');
        }

        final res = await apiGateway.chat.join(handle);
        if (!mounted) return;

        final success = res['success'] == true;
        final newChat = res['chat'];
        if (success && newChat is Map<String, dynamic>) {
          final users = (res['users'] as List?) ?? const [];
          await globalEventEmitter.chat.add(newChat, users);
          if (!mounted) return;
          final uuid = newChat['uuid'] as String?;
          Navigator.of(context, rootNavigator: true).pop();
          if (uuid != null && uuid.isNotEmpty) {
            widget.onJoined(uuid);
          }
        } else {
          setState(() {
            _loading = false;
            _error = l10n.joinCreateError;
          });
        }
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = l10n.joinCreateError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final chat = widget.chat;
    final title = _getTitle(l10n);

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top row: Modal title & close button
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              IconButton(
                icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // User / Chat info centered
          Center(
            child: Column(
              children: [
                Avatar(
                  uuid: chat.profilePictureUUID,
                  name: chat.name,
                  seedKey: chat.uuid.isNotEmpty ? chat.uuid : chat.name,
                  size: 84,
                  type: chat.type,
                ),
                const SizedBox(height: 12),
                Text(
                  chat.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (chat.handle != null && chat.handle!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    '@${chat.handle}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Main Info Box
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHighest.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: scheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppHugeIcon(
                  icon: HugeIcons.strokeRoundedInformationCircle,
                  size: 20,
                  color: scheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _isUser ? l10n.joinCreateUserDesc : l10n.joinCreateChatDesc,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurface,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Security Notice
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppHugeIcon(
                icon: HugeIcons.strokeRoundedShield01,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l10n.joinCreateSecurityDesc,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Notifications Notice
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppHugeIcon(
                icon: HugeIcons.strokeRoundedNotificationOff01,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l10n.joinCreateNotificationDesc,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            StatusMessage(
              type: StatusMessageType.danger,
              content: [_error!],
              visible: true,
              onClose: () => setState(() => _error = null),
            ),
          ],
          const SizedBox(height: 22),
          OnboardingPrimaryButton(
            label: _loading ? l10n.joinCreateProcessing : title,
            isLoading: _loading,
            onPressed: _loading ? null : _handleAction,
          ),
        ],
      ),
    );
  }
}

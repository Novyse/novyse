import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/auth/validator.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/onboarding/onboarding_primary_button.dart';
import 'package:novyse/ui/components/onboarding/onboarding_text_field.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/status/status_message.dart';

enum CreateChatType { group, channel, forum }

enum CreateChatPrivacy { private, public }

extension _CreateChatTypeX on CreateChatType {
  String get apiValue => switch (this) {
    CreateChatType.group => 'GROUP',
    CreateChatType.channel => 'CHANNEL',
    CreateChatType.forum => 'FORUM',
  };
}

Future<T?> showCreateChatModal<T>(BuildContext context) {
  return ResponsiveOverlay.show<T>(
    context: context,
    mode: ResponsiveOverlayMode.dynamic,
    child: const CreateChatModal(),
  );
}

class CreateChatModal extends ConsumerStatefulWidget {
  const CreateChatModal({super.key});

  @override
  ConsumerState<CreateChatModal> createState() => _CreateChatModalState();
}

class _CreateChatModalState extends ConsumerState<CreateChatModal> {
  final _nameController = TextEditingController();
  final _handleController = TextEditingController();

  CreateChatType _type = CreateChatType.group;
  CreateChatPrivacy _privacy = CreateChatPrivacy.private;

  String? _nameError;
  String? _handleError;
  bool? _handleAvailable;
  bool _handleLoading = false;
  bool _creating = false;
  Timer? _handleTimer;

  @override
  void dispose() {
    _handleTimer?.cancel();
    _nameController.dispose();
    _handleController.dispose();
    super.dispose();
  }

  String? _validateChatName(String value, AppLocalizations l10n) {
    final name = value.trim();
    if (name.isEmpty) return l10n.requiredField;
    if (name.length > 50) return l10n.nameTooLong;
    return null;
  }

  void _onNameChanged(String value) {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _nameError = l10n == null ? null : _validateChatName(value, l10n);
    });
  }

  void _onHandleChanged(String value) {
    final normalized = value.trim().toLowerCase();
    if (normalized != value) {
      _handleController.value = TextEditingValue(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length),
      );
    }
    _handleTimer?.cancel();

    if (normalized.isEmpty) {
      setState(() {
        _handleAvailable = null;
        _handleError = null;
        _handleLoading = false;
      });
      return;
    }

    final l10n = AppLocalizations.of(context);
    final validation = Validator.validateHandle(normalized, l10n);
    if (validation != null) {
      setState(() {
        _handleAvailable = null;
        _handleError = l10n == null
            ? validation
            : '$validation ${l10n.createChatPublicRequired}';
        _handleLoading = false;
      });
      return;
    }

    setState(() {
      _handleLoading = true;
      _handleError = null;
      _handleAvailable = null;
    });

    _handleTimer = Timer(const Duration(milliseconds: 1000), () async {
      try {
        final res = await apiGateway.check.handle(normalized);
        if (!mounted) return;
        setState(() {
          _handleLoading = false;
          if (res.success) {
            _handleAvailable = res.available ?? false;
            _handleError = (res.available ?? false)
                ? null
                : AppLocalizations.of(context)?.createChatHandleTaken;
          } else {
            _handleAvailable = false;
            _handleError = AppLocalizations.of(
              context,
            )?.createChatHandleError;
          }
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _handleLoading = false;
          _handleAvailable = false;
          _handleError = AppLocalizations.of(context)?.createChatHandleError;
        });
      }
    });
  }

  void _onPrivacyChanged(CreateChatPrivacy value) {
    setState(() {
      _privacy = value;
      if (value == CreateChatPrivacy.private) {
        _handleTimer?.cancel();
        _handleController.clear();
        _handleAvailable = null;
        _handleError = null;
        _handleLoading = false;
      }
    });
  }

  Future<void> _onCreate() async {
    final l10n = AppLocalizations.of(context);
    if (l10n == null || _creating) return;

    final name = _nameController.text.trim();
    final handle = _handleController.text.trim().toLowerCase();

    final nameError = _validateChatName(name, l10n);
    final handleValidation = Validator.validateHandle(handle, l10n);

    setState(() {
      _nameError = nameError;
      if (_privacy == CreateChatPrivacy.public) {
        if (handleValidation != null) {
          _handleError =
              '$handleValidation ${l10n.createChatPublicRequired}';
        } else if (_handleAvailable == false || _handleAvailable == null) {
          _handleError = l10n.createChatHandleTaken;
        } else {
          _handleError = null;
        }
      } else {
        _handleError = null;
      }
    });

    if (nameError != null) return;
    if (_privacy == CreateChatPrivacy.public) {
      if (handleValidation != null) return;
      if (_handleAvailable != true) return;
    }

    setState(() => _creating = true);
    try {
      final res = await apiGateway.chat.create(
        _type.apiValue,
        memberUUIDs: const [],
        name: name,
        handle: _privacy == CreateChatPrivacy.private ? '' : handle,
      );
      if (!mounted) return;
      final success = res['success'] == true;
      final chat = res['chat'];
      if (success && chat is Map<String, dynamic>) {
        final users = (res['users'] as List?) ?? const [];
        await globalEventEmitter.chat.add(chat, users);
        if (!mounted) return;
        final uuid = chat['uuid'] as String?;
        Navigator.of(context, rootNavigator: true).pop();
        if (uuid != null && uuid.isNotEmpty) {
          ref.read(activeChatProvider.notifier).setSelectedChatUUID(uuid);
          context.push('/chats/$uuid');
        }
      } else {
        setState(() {
          _nameError = null;
          _handleError = l10n.createChatError;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _handleError = l10n.createChatError);
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Widget? _buildHandleSuffix(ColorScheme scheme) {
    if (_handleLoading) {
      return Padding(
        padding: const EdgeInsets.all(14),
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2, color: scheme.primary),
        ),
      );
    }
    if (_handleAvailable == true) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: AppHugeIcon(
          icon: HugeIcons.strokeRoundedCheckmarkCircle02,
          color: Color(0xFF2E7D32),
          size: 20,
        ),
      );
    }
    if (_handleAvailable == false) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: AppHugeIcon(
          icon: HugeIcons.strokeRoundedCancel01,
          color: Color(0xFFC62828),
          size: 20,
        ),
      );
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final errors = [_nameError, _handleError].whereType<String>().toList();

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.createChatTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.createChatSubtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
              ),
            ],
          ),
          const SizedBox(height: 20),
          OnboardingTextField(
            label: l10n.createChatName,
            hint: l10n.createChatNameHint,
            controller: _nameController,
            textInputAction: TextInputAction.next,
            onChanged: _onNameChanged,
          ),
          const SizedBox(height: 20),
          Text(
            l10n.createChatType,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _TypeCard(
                  selected: _type == CreateChatType.group,
                  icon: HugeIcons.strokeRoundedChat01,
                  title: l10n.createChatGroup,
                  subtitle: l10n.createChatGroupDesc,
                  onTap: () =>
                      setState(() => _type = CreateChatType.group),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _TypeCard(
                  selected: _type == CreateChatType.channel,
                  icon: HugeIcons.strokeRoundedMegaphone01,
                  title: l10n.createChatChannel,
                  subtitle: l10n.createChatChannelDesc,
                  onTap: () =>
                      setState(() => _type = CreateChatType.channel),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _TypeCard(
                  selected: _type == CreateChatType.forum,
                  icon: HugeIcons.strokeRoundedDocumentAttachment,
                  title: l10n.createChatForum,
                  subtitle: l10n.createChatForumDesc,
                  onTap: () =>
                      setState(() => _type = CreateChatType.forum),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            l10n.createChatPrivacy,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          SegmentedButton<CreateChatPrivacy>(
            segments: [
              ButtonSegment(
                value: CreateChatPrivacy.private,
                label: Text(l10n.createChatPrivate),
                icon: const AppHugeIcon(
                  icon: HugeIcons.strokeRoundedShield01,
                  size: 16,
                ),
              ),
              ButtonSegment(
                value: CreateChatPrivacy.public,
                label: Text(l10n.createChatPublic),
                icon: const AppHugeIcon(
                  icon: HugeIcons.strokeRoundedMegaphone01,
                  size: 16,
                ),
              ),
            ],
            selected: {_privacy},
            onSelectionChanged: (s) => _onPrivacyChanged(s.first),
            style: SegmentedButton.styleFrom(
              visualDensity: VisualDensity.compact,
            ),
          ),
          if (_privacy == CreateChatPrivacy.public) ...[
            const SizedBox(height: 16),
            OnboardingTextField(
              label: l10n.createChatHandle,
              hint: l10n.createChatHandleHint,
              controller: _handleController,
              keyboardType: TextInputType.text,
              textInputAction: TextInputAction.done,
              onChanged: _onHandleChanged,
              prefixIcon: const Padding(
                padding: EdgeInsets.only(left: 16, right: 4),
                child: Text(
                  '@',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
              ),
              suffixIcon: _buildHandleSuffix(scheme),
            ),
            const SizedBox(height: 6),
            Text(
              l10n.createChatHandleHelper,
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
          if (errors.isNotEmpty) ...[
            const SizedBox(height: 12),
            StatusMessage(
              type: StatusMessageType.danger,
              content: errors,
              visible: true,
              onClose: () => setState(() {
                _nameError = null;
                _handleError = null;
              }),
            ),
          ],
          const SizedBox(height: 20),
          OnboardingPrimaryButton(
            label: l10n.createChatAction,
            isLoading: _creating,
            onPressed: _creating ? null : _onCreate,
          ),
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  const _TypeCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final List<List<dynamic>> icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? scheme.primary.withValues(alpha: 0.12)
              : scheme.surfaceContainerHighest.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            AppHugeIcon(icon: icon, color: scheme.primary, size: 22),
            const SizedBox(height: 6),
            Text(
              title,
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: theme.textTheme.bodySmall?.copyWith(
                fontSize: 10,
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

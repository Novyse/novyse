import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/onboarding/onboarding_primary_button.dart';
import 'package:novyse/ui/components/onboarding/onboarding_text_field.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/status/status_message.dart';

const _creatableSubTypes = ['MIXED', 'TEXT', 'VOCAL', 'ANNOUNCE'];
const _disabledSubTypes = ['BROADCAST', 'BOARD'];

Future<T?> showCreateSubModal<T>(
  BuildContext context, {
  required String chatUUID,
}) {
  return ResponsiveOverlay.show<T>(
    context: context,
    mode: ResponsiveOverlayMode.dynamic,
    child: CreateSubModal(chatUUID: chatUUID),
  );
}

class CreateSubModal extends ConsumerStatefulWidget {
  const CreateSubModal({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  ConsumerState<CreateSubModal> createState() => _CreateSubModalState();
}

class _CreateSubModalState extends ConsumerState<CreateSubModal> {
  final _nameController = TextEditingController();
  String _type = 'MIXED';
  String? _error;
  bool _creating = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  String _labelFor(String type, AppLocalizations l10n) {
    return switch (type) {
      'MIXED' => l10n.createSubMixed,
      'TEXT' => l10n.createSubText,
      'VOCAL' => l10n.createSubVocal,
      'ANNOUNCE' => l10n.createSubAnnounce,
      'BROADCAST' => l10n.createSubBroadcast,
      'BOARD' => l10n.createSubBoard,
      _ => type,
    };
  }

  Future<void> _onCreate() async {
    final l10n = AppLocalizations.of(context);
    if (l10n == null || _creating) return;

    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = l10n.requiredField);
      return;
    }

    setState(() {
      _creating = true;
      _error = null;
    });

    try {
      final result = await apiGateway.chat.sub.create(
        widget.chatUUID,
        name,
        _type,
      );
      if (!mounted) return;

      if (result.success && result.sub != null) {
        final sub = Map<String, dynamic>.from(result.sub!);
        sub['type'] ??= _type;
        await GlobalEventEmitter.instance.chat.update(
          widget.chatUUID,
          'sub_create',
          null,
          {'sub': sub},
        );
        if (!mounted) return;
        Navigator.of(context, rootNavigator: true).pop();
      } else {
        setState(() {
          _creating = false;
          _error = l10n.createSubError;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _creating = false;
        _error = l10n.createSubError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

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
                      l10n.createSubTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.createSubSubtitle,
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
            textInputAction: TextInputAction.done,
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
          ),
          const SizedBox(height: 20),
          Text(
            l10n.createSubType,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final type in _creatableSubTypes)
                ChoiceChip(
                  label: Text(_labelFor(type, l10n)),
                  selected: _type == type,
                  onSelected: (_) => setState(() => _type = type),
                ),
              for (final type in _disabledSubTypes)
                ChoiceChip(
                  label: Text(_labelFor(type, l10n)),
                  selected: false,
                  onSelected: null,
                ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            StatusMessage(
              type: StatusMessageType.danger,
              content: [_error!],
              visible: true,
              onClose: () => setState(() => _error = null),
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

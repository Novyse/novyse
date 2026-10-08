import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/auth.dart' as auth_service;
import 'package:novyse/core/stores/status_message_type.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/copy_text_field.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/settings/security/security_list_card.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/status/status_message.dart';

typedef ApiKeysLoader = Future<List<Map<String, dynamic>>> Function();
typedef ApiKeyCreator = Future<Map<String, dynamic>?> Function(String name);
typedef ApiKeyActiveUpdater = Future<bool> Function(int id, bool active);
typedef ApiKeyRevoker = Future<bool> Function(int id);

class ApiKeysPage extends StatefulWidget {
  const ApiKeysPage({
    super.key,
    this.loadKeys,
    this.createKey,
    this.updateKeyActive,
    this.revokeKey,
  });

  /// Optional API overrides used to keep widget tests independent of the network.
  final ApiKeysLoader? loadKeys;
  final ApiKeyCreator? createKey;
  final ApiKeyActiveUpdater? updateKeyActive;
  final ApiKeyRevoker? revokeKey;

  @override
  State<ApiKeysPage> createState() => _ApiKeysPageState();
}

class _ApiKeysPageState extends State<ApiKeysPage> {
  List<_ApiKeyEntry> _keys = const [];
  bool _isLoading = true;
  String? _error;
  String? _notice;
  bool _isCreating = false;
  final Set<String> _updatingKeys = {};
  final Set<String> _revokingKeys = {};

  @override
  void initState() {
    super.initState();
    _loadKeys();
  }

  Future<void> _loadKeys() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final loader = widget.loadKeys;
      final List<Map<String, dynamic>> data;
      if (loader != null) {
        data = await loader();
      } else {
        final response = await auth_service.auth.apikey.list();
        if (!response.success) {
          if (!mounted) return;
          setState(() {
            _isLoading = false;
            _error =
                response.error ??
                AppLocalizations.of(context)!.settingsApiKeysLoadFailed;
          });
          return;
        }
        final result = response.data ?? const <String, dynamic>{};
        final keys = result['keys'] ?? result['apiKeys'] ?? const <dynamic>[];
        data = (keys as List)
            .whereType<Map>()
            .map((key) => Map<String, dynamic>.from(key))
            .toList();
      }
      if (!mounted) return;
      setState(() {
        _keys = data.map(_ApiKeyEntry.fromMap).toList();
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = AppLocalizations.of(context)!.settingsApiKeysLoadFailed;
      });
    }
  }

  Future<bool> _createKey(String name) async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _isCreating = true;
      _error = null;
    });
    await Future<void>.delayed(Duration.zero);
    if (!mounted) return false;
    try {
      final creator = widget.createKey;
      final Map<String, dynamic>? created;
      if (creator != null) {
        created = await creator(name);
      } else {
        final response = await auth_service.auth.apikey.create(name.trim());
        if (!response.success) {
          if (mounted) {
            setState(
              () => _error = response.error ?? l10n.settingsApiKeyCreateFailed,
            );
          }
          return false;
        }
        created = response.data;
      }
      if (!mounted) return false;
      final secret = _extractSecret(created);
      setState(() {
        _notice = l10n.settingsApiKeysCreated;
        _error = null;
      });
      await _loadKeys();
      if (secret != null && mounted) await _showCreatedSecret(secret);
      return true;
    } catch (_) {
      if (mounted) setState(() => _error = l10n.settingsApiKeyCreateFailed);
      return false;
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  String? _extractSecret(Map<String, dynamic>? response) {
    if (response == null) return null;
    final nested = response['apiKey'];
    if (nested is Map) {
      for (final field in ['key', 'apiKey', 'token', 'secret']) {
        final value = nested[field];
        if (value is String && value.isNotEmpty) return value;
      }
    }
    for (final field in ['apiKey', 'key', 'token', 'secret']) {
      final value = response[field];
      if (value is String && value.isNotEmpty) return value;
    }
    return null;
  }

  Future<void> _showCreatedSecret(String secret) async {
    await ResponsiveOverlay.show<void>(
      context: context,
      title: AppLocalizations.of(context)!.settingsApiKeyCreatedTitle,
      mode: ResponsiveOverlayMode.modal,
      child: _CreatedApiKeyDialog(secret: secret),
    );
  }

  Future<void> _setActive(_ApiKeyEntry key, bool active) async {
    final l10n = AppLocalizations.of(context)!;
    final id = int.tryParse(key.id);
    if (id == null) return;
    setState(() {
      _updatingKeys.add(key.id);
      _error = null;
    });
    try {
      final updater = widget.updateKeyActive;
      final success = updater != null
          ? await updater(id, active)
          : (await auth_service.auth.apikey.toggleActive(id, active)).success;
      if (!mounted) return;
      if (!success) {
        setState(() => _error = l10n.settingsApiKeyActivateFailed);
        return;
      }
      await _loadKeys();
    } catch (_) {
      if (mounted) setState(() => _error = l10n.settingsApiKeyActivateFailed);
    } finally {
      if (mounted) setState(() => _updatingKeys.remove(key.id));
    }
  }

  Future<void> _revoke(_ApiKeyEntry key) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showOverlayConfirm(
      context,
      title: l10n.settingsApiKeyRevokeTitle,
      message: l10n.settingsApiKeyRevokeMessage,
      confirmLabel: l10n.settingsApiKeyRevokeConfirm,
      cancelLabel: l10n.cancel,
      isDanger: true,
    );
    if (!confirmed || !mounted) return;
    final id = int.tryParse(key.id);
    if (id == null) return;

    setState(() {
      _revokingKeys.add(key.id);
      _error = null;
    });
    try {
      final revoker = widget.revokeKey;
      final success = revoker != null
          ? await revoker(id)
          : (await auth_service.auth.apikey.revoke(id)).success;
      if (!mounted) return;
      if (!success) {
        setState(() => _error = l10n.settingsApiKeyRevokeFailed);
        return;
      }
      setState(() => _notice = l10n.settingsApiKeyRevoked);
      await _loadKeys();
    } catch (_) {
      if (mounted) setState(() => _error = l10n.settingsApiKeyRevokeFailed);
    } finally {
      if (mounted) setState(() => _revokingKeys.remove(key.id));
    }
  }

  String _formatDate(DateTime? date, AppLocalizations l10n) => date == null
      ? l10n.settingsApiKeyUnknownDate
      : DateFormat.yMd(l10n.localeName).format(date.toLocal());

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return SettingsPageTemplate(
      title: l10n.settingsApiKeysTitle,
      children: [
        if (_error != null || _notice != null)
          StatusMessage(
            type: _error == null
                ? StatusMessageType.success
                : StatusMessageType.danger,
            content: [_error ?? _notice!],
            onClose: () => setState(() {
              _error = null;
              _notice = null;
            }),
          ),
        SettingsSection(
          title: l10n.settingsApiKeysActions,
          children: [
            ListTile(
              leading: AppHugeIcon(
                icon: HugeIcons.strokeRoundedPlusSign,
                color: Theme.of(context).colorScheme.primary,
              ),
              title: Text(l10n.settingsApiKeysCreate),
              onTap: _isCreating ? null : _showCreateDialog,
              trailing: _isCreating
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chevron_right),
            ),
          ],
        ),
        SettingsSection(
          title: l10n.settingsApiKeysManage,
          children: [
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_keys.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 24,
                ),
                child: Column(
                  children: [
                    AppHugeIcon(
                      icon: HugeIcons.strokeRoundedKey01,
                      size: 40,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      l10n.settingsApiKeysEmpty,
                      style: Theme.of(context).textTheme.titleSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.settingsApiKeysEmptySubtitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              for (final key in _keys)
                SecurityListCard(
                  icon: HugeIcons.strokeRoundedKey01,
                  title: key.name,
                  subtitle:
                      '${l10n.settingsApiKeyCreatedAt}: ${_formatDate(key.createdAt, l10n)} · '
                      '${l10n.settingsApiKeyLastUsed}: ${_formatDate(key.lastUsedAt, l10n)}',
                  active: key.active,
                  onToggle: _updatingKeys.contains(key.id)
                      ? null
                      : (value) => _setActive(key, value),
                  onRevoke: _revokingKeys.contains(key.id)
                      ? null
                      : () => _revoke(key),
                  revokeTooltip: l10n.settingsApiKeyRevoke,
                  isRevoking: _revokingKeys.contains(key.id),
                ),
          ],
        ),
      ],
    );
  }

  Future<void> _showCreateDialog() async {
    final l10n = AppLocalizations.of(context)!;
    final name = await ResponsiveOverlay.show<String>(
      context: context,
      title: l10n.settingsApiKeyCreateDialogTitle,
      subtitle: l10n.settingsApiKeyCreateDialogMessage,
      mode: ResponsiveOverlayMode.modal,
      child: const _CreateApiKeyDialog(),
    );
    if (name != null && mounted) await _createKey(name);
  }
}

class _CreateApiKeyDialog extends StatefulWidget {
  const _CreateApiKeyDialog();
  @override
  State<_CreateApiKeyDialog> createState() => _CreateApiKeyDialogState();
}

class _CreateApiKeyDialogState extends State<_CreateApiKeyDialog> {
  final _controller = TextEditingController();
  bool _nameError = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _controller,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          textInputAction: TextInputAction.done,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _submit(),
          decoration: InputDecoration(
            labelText: l10n.settingsApiKeyName,
            hintText: l10n.settingsApiKeyNameHint,
            errorText: _nameError ? l10n.settingsApiKeyNameRequired : null,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 20),
        AppButton(label: l10n.settingsApiKeyCreateConfirm, onPressed: _submit),
      ],
    );
  }

  void _submit() {
    final name = _controller.text.trim();
    if (name.isEmpty) {
      setState(() => _nameError = true);
      return;
    }
    Navigator.of(context, rootNavigator: true).pop(name);
  }
}

class _CreatedApiKeyDialog extends StatefulWidget {
  const _CreatedApiKeyDialog({required this.secret});

  final String secret;

  @override
  State<_CreatedApiKeyDialog> createState() => _CreatedApiKeyDialogState();
}

class _CreatedApiKeyDialogState extends State<_CreatedApiKeyDialog> {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StatusMessage(
          type: StatusMessageType.success,
          content: [l10n.settingsApiKeyCreatedWarning],
          closable: false,
        ),
        const SizedBox(height: 16),
        CopyTextField(
          value: widget.secret,
          copyTooltip: l10n.settingsApiKeyCopy,
          copiedTooltip: l10n.settingsApiKeyCopied,
        ),
        const SizedBox(height: 16),
        AppButton(
          label: l10n.settingsApiKeyDone,
          onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
        ),
      ],
    );
  }
}

class _ApiKeyEntry {
  const _ApiKeyEntry({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.lastUsedAt,
    required this.active,
  });

  final String id;
  final String name;
  final DateTime? createdAt;
  final DateTime? lastUsedAt;
  final bool active;

  factory _ApiKeyEntry.fromMap(Map<String, dynamic> map) {
    DateTime? date(Object? raw) =>
        raw == null ? null : DateTime.tryParse(raw.toString());

    return _ApiKeyEntry(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      createdAt: date(map['created_at'] ?? map['createdAt']),
      lastUsedAt: date(map['last_used_at'] ?? map['lastUsedAt']),
      active: map['active'] as bool? ?? true,
    );
  }
}

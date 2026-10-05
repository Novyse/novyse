import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/auth.dart' as auth_service;
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/settings/security/security_list_card.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

typedef ActiveDeviceSessionLoader =
    Future<List<Map<String, dynamic>>> Function();
typedef ActiveDeviceOtherSessionsRevoker = Future<bool> Function();

class ActiveDevicesPage extends StatefulWidget {
  const ActiveDevicesPage({
    super.key,
    this.sessionLoader,
    this.revokeOtherSessions,
  });

  /// Optional data source for deterministic widget tests.
  final ActiveDeviceSessionLoader? sessionLoader;
  final ActiveDeviceOtherSessionsRevoker? revokeOtherSessions;

  @override
  State<ActiveDevicesPage> createState() => _ActiveDevicesPageState();
}

class _ActiveDevicesPageState extends State<ActiveDevicesPage> {
  List<_DeviceSession> _sessions = const [];
  bool _isLoading = true;
  bool _isRevokingOther = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final loader = widget.sessionLoader;
      final List<Map<String, dynamic>> data;
      if (loader != null) {
        data = await loader();
      } else {
        final response = await auth_service.auth.settings.session.list();
        if (!mounted) return;
        if (!response.success) {
          setState(() {
            _isLoading = false;
            _error =
                response.error ??
                AppLocalizations.of(context)!.settingsDevicesLoadFailed;
          });
          return;
        }
        data = (response.data ?? const <dynamic>[])
            .whereType<Map>()
            .map((session) => Map<String, dynamic>.from(session))
            .toList();
      }
      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      setState(() {
        _sessions = data
            .map(
              (session) => _DeviceSession.fromMap(
                session,
                unknown: l10n.settingsDeviceUnknown,
              ),
            )
            .toList();
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = AppLocalizations.of(context)!.settingsDevicesLoadFailed;
      });
    }
  }

  Future<void> _revokeSession(_DeviceSession session) async {
    final id = int.tryParse(session.id);
    if (id == null) return;
    final response = await auth_service.auth.settings.session.revoke(id);
    if (!mounted) return;
    if (response.success) {
      setState(
        () => _notice = AppLocalizations.of(context)!.settingsDeviceRevoked,
      );
      await _loadSessions();
    } else {
      setState(() {
        _error =
            response.error ??
            AppLocalizations.of(context)!.settingsDeviceRevokeFailed;
      });
    }
  }

  Future<void> _revokeOtherSessions() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showOverlayConfirm(
      context,
      title: l10n.settingsRevokeOtherDevicesConfirmTitle,
      message: l10n.settingsRevokeOtherDevicesConfirmMessage,
      confirmLabel: l10n.settingsRevokeOtherDevicesConfirm,
      cancelLabel: l10n.cancel,
      isDanger: true,
    );
    if (!confirmed || !mounted) return;

    setState(() {
      _isRevokingOther = true;
      _error = null;
    });

    try {
      final revoker = widget.revokeOtherSessions;
      final bool success;
      String? responseError;
      if (revoker != null) {
        success = await revoker();
      } else {
        final response = await auth_service.auth.settings.session.revokeOther();
        success = response.success;
        responseError = response.error;
      }
      if (!mounted) return;
      if (success) {
        setState(() => _notice = l10n.settingsOtherDevicesRevoked);
        await _loadSessions();
      } else {
        setState(() {
          _error = responseError ?? l10n.settingsDevicesRevokeFailed;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.settingsDevicesRevokeFailed);
      }
    } finally {
      if (mounted) setState(() => _isRevokingOther = false);
    }
  }

  String _formatDate(DateTime? date, AppLocalizations l10n) {
    if (date == null) return l10n.settingsDeviceUnknown;
    return DateFormat.yMd(l10n.localeName).add_Hm().format(date.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return SettingsPageTemplate(
      title: l10n.settingsItemAuthSessionsTitle,
      children: [
        if (_error != null || _notice != null)
          MaterialBanner(
            content: Text(_error ?? _notice!),
            backgroundColor: _error == null
                ? Theme.of(context).colorScheme.primaryContainer
                : Theme.of(context).colorScheme.errorContainer,
            actions: [
              TextButton(
                onPressed: () => setState(() {
                  _error = null;
                  _notice = null;
                }),
                child: Text(l10n.settingsDismiss),
              ),
            ],
          ),
        SettingsSection(
          title: l10n.settingsActiveDevicesSection,
          children: [
            SettingsBaseRow(
              icon: HugeIcons.strokeRoundedLogout01,
              title: l10n.settingsRevokeOtherDevices,
              subtitle: l10n.settingsRevokeOtherDevicesConfirmMessage,
              danger: true,
              onTap: _isRevokingOther ? null : _revokeOtherSessions,
            ),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_sessions.isEmpty)
              Padding(
                padding: const EdgeInsets.all(20),
                child: Text(l10n.settingsDevicesEmpty),
              )
            else
              for (final session in _sessions)
                SecurityListCard(
                  title: session.device,
                  subtitle: session.platform,
                  isCurrent: session.isCurrent,
                  currentLabel: l10n.settingsDeviceCurrent,
                  revokeTooltip: l10n.settingsRevokeDevice,
                  onRevoke: session.isCurrent
                      ? null
                      : () => _revokeSession(session),
                  details: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _detailRow(l10n.settingsDeviceIp, session.ip),
                      _detailRow(
                        l10n.settingsDeviceCreated,
                        _formatDate(session.createdAt, l10n),
                      ),
                      _detailRow(
                        l10n.settingsDeviceLastActive,
                        _formatDate(session.lastActiveAt, l10n),
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ],
    );
  }

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text('$label: $value'),
  );
}

class _DeviceSession {
  const _DeviceSession({
    required this.id,
    required this.device,
    required this.platform,
    required this.ip,
    required this.createdAt,
    required this.lastActiveAt,
    required this.isCurrent,
  });

  final String id;
  final String device;
  final String platform;
  final String ip;
  final DateTime? createdAt;
  final DateTime? lastActiveAt;
  final bool isCurrent;

  factory _DeviceSession.fromMap(
    Map<String, dynamic> map, {
    required String unknown,
  }) {
    DateTime? date(Object? raw) =>
        raw == null ? null : DateTime.tryParse(raw.toString());

    return _DeviceSession(
      id: map['id']?.toString() ?? '',
      device: map['userAgent']?.toString().trim().isNotEmpty == true
          ? map['userAgent'].toString()
          : unknown,
      platform: map['platform']?.toString() ?? unknown,
      ip: map['ipAddress']?.toString() ?? unknown,
      createdAt: date(map['createdAt']),
      lastActiveAt: date(map['lastActiveAt']),
      isCurrent: map['isCurrent'] == true,
    );
  }
}

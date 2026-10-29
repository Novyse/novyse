import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_permission_helpers.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/settings/settings_models.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';

abstract final class MessageQuickAction {
  static const none = 'none';
  static const reply = 'reply';
  static const edit = 'edit';
  static const delete = 'delete';

  static const settingKey1 = 'chat.quickAction1';
  static const settingKey2 = 'chat.quickAction2';
  static const default1 = reply;
  static const default2 = edit;

  static const _values = [none, reply, edit, delete];

  static String normalize(Object? raw, String fallback) =>
      raw is String && _values.contains(raw) ? raw : fallback;

  static List<String> resolve(Object? first, Object? second) {
    final primary = normalize(first, default1);
    final secondary = normalize(second, default2);
    return [
      if (primary != none) primary,
      if (secondary != none && secondary != primary) secondary,
    ];
  }

  static List<SettingOption> options({String? other}) {
    final taken = other == none ? null : other;
    return [
      SettingOption(none, (l) => l.settingsOptionQuickActionNoneLabel),
      SettingOption(reply, (l) => l.reply, disabled: taken == reply),
      SettingOption(edit, (l) => l.edit, disabled: taken == edit),
      SettingOption(delete, (l) => l.delete, disabled: taken == delete),
    ];
  }

  static List<List<dynamic>> iconFor(String action) => switch (action) {
    reply => HugeIcons.strokeRoundedArrowMoveUpLeft,
    edit => HugeIcons.strokeRoundedEdit02,
    delete => HugeIcons.strokeRoundedDelete02,
    _ => const [],
  };

  static bool isAllowed({
    required String action,
    required MessageModel message,
    required ChatModel? chat,
    required String localUserUUID,
  }) {
    if (message.isSystem || message.isPending) return false;
    if (action == delete) {
      return ChatPermissionHelpers.canUserDeleteMessage(
        chat: chat,
        localUserUUID: localUserUUID,
        targetUserUUID: message.userUUID,
      );
    }
    final canSend = ChatPermissionHelpers.canUserSendMessage(
      chat,
      localUserUUID,
      subID: message.subID,
    );
    return switch (action) {
      reply => canSend,
      edit => message.userUUID == localUserUUID && canSend,
      _ => false,
    };
  }

  static Future<List<SettingOption>> loadOptions(
    WidgetRef ref, {
    required String otherKey,
    required String fallback,
  }) async => options(
    other: normalize(ref.read(settingValueProvider(otherKey)), fallback),
  );

  static Future<void> save(
    WidgetRef ref,
    String value, {
    required String key,
    required String otherKey,
    required String fallback,
  }) async {
    final other = normalize(ref.read(settingValueProvider(otherKey)), fallback);
    if (value != none && value == other) return;
    await ref.read(settingsControllerProvider.notifier).set(key, value);
  }
}

/// Chat role permissions bitmask definitions.
class ChatPermissions {
  static final BigInt readMessage = BigInt.from(1) << 0;
  static final BigInt sendMessage = BigInt.from(1) << 1;
  static final BigInt attachFileMessage = BigInt.from(1) << 2;
  static final BigInt addReactionMessage = BigInt.from(1) << 3;
  static final BigInt pinMessage = BigInt.from(1) << 4;
  static final BigInt connectVocal = BigInt.from(1) << 5;
  static final BigInt speakVocal = BigInt.from(1) << 6;
  static final BigInt videoVocal = BigInt.from(1) << 7;
  static final BigInt screenshareVocal = BigInt.from(1) << 8;
  static final BigInt watchtogetherVocal = BigInt.from(1) << 9;
  static final BigInt muteMemberVocal = BigInt.from(1) << 10;
  static final BigInt deafenMemberVocal = BigInt.from(1) << 11;
  static final BigInt disableVideoVocal = BigInt.from(1) << 12;
  static final BigInt moveMemberVocal = BigInt.from(1) << 13;
  static final BigInt deleteMessage = BigInt.from(1) << 14;
  static final BigInt muteMember = BigInt.from(1) << 15;
  static final BigInt kickMember = BigInt.from(1) << 16;
  static final BigInt banMember = BigInt.from(1) << 17;
  static final BigInt viewChatLog = BigInt.from(1) << 18;
  static final BigInt manageInvite = BigInt.from(1) << 19;
  static final BigInt manageSub = BigInt.from(1) << 20;
  static final BigInt assignRole = BigInt.from(1) << 21;
  static final BigInt manageRole = BigInt.from(1) << 22;
  static final BigInt manageChat = BigInt.from(1) << 23;
}

/// Standard predefined role IDs.
class DefaultRoles {
  static const int owner = 0;
  static const int admin = 1;
  static const int user = 2;
}

/// Sub-channel types with specific role write permissions.
final Map<String, Set<int>> subWriteAllowedRoles = {
  'ANNOUNCE': {DefaultRoles.owner, DefaultRoles.admin},
};

/// Evaluates if a member with given [memberRoles] possesses the [requiredPermission].
///
/// If [subType] is specified (e.g. `'ANNOUNCE'`), restrictions on sending messages
/// or attaching files are enforced based on [subWriteAllowedRoles].
bool hasPermission(
  List<dynamic> memberRoles,
  BigInt requiredPermission, [
  String? subType,
]) {
  if (memberRoles.isEmpty) return false;

  final allowedRoles = subType != null ? subWriteAllowedRoles[subType] : null;
  var permissions = BigInt.zero;

  for (final roleRaw in memberRoles) {
    if (roleRaw is! Map) continue;
    final roleId = roleRaw['id'] is num
        ? (roleRaw['id'] as num).toInt()
        : int.tryParse(roleRaw['id']?.toString() ?? '0') ?? 0;

    var rolePerms = BigInt.zero;
    final permVal = roleRaw['permission'];
    if (permVal is num) {
      rolePerms = BigInt.from(permVal);
    } else if (permVal is String) {
      rolePerms = BigInt.tryParse(permVal) ?? BigInt.zero;
    } else if (permVal is BigInt) {
      rolePerms = permVal;
    }

    if (allowedRoles != null && !allowedRoles.contains(roleId)) {
      rolePerms = rolePerms & ~ChatPermissions.sendMessage;
      rolePerms = rolePerms & ~ChatPermissions.attachFileMessage;
    }

    permissions |= rolePerms;
  }

  return (permissions & requiredPermission) == requiredPermission;
}

/// Returns the highest role level among the member's roles.
int getEffectiveLevel(List<dynamic> memberRoles) {
  var level = 0;
  for (final roleRaw in memberRoles) {
    if (roleRaw is! Map) continue;
    final roleLevel = roleRaw['level'] is num
        ? (roleRaw['level'] as num).toInt()
        : int.tryParse(roleRaw['level']?.toString() ?? '0') ?? 0;

    if (roleLevel > level) {
      level = roleLevel;
    }
  }
  return level;
}

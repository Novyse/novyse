export const PERMISSIONS = {
  READ_MESSAGE: 1n << 0n,
  SEND_MESSAGE: 1n << 1n,
  ATTACH_FILE_MESSAGE: 1n << 2n,
  ADD_REACTION_MESSAGE: 1n << 3n,
  PIN_MESSAGE: 1n << 4n,
  CONNECT_VOCAL: 1n << 5n,
  SPEAK_VOCAL: 1n << 6n,
  VIDEO_VOCAL: 1n << 7n,
  SCREENSHARE_VOCAL: 1n << 8n,
  WATCHTOGETHER_VOCAL: 1n << 9n,
  MUTE_MEMBER_VOCAL: 1n << 10n,
  DEAFEN_MEMBER_VOCAL: 1n << 11n,
  DISABLE_VIDEO_VOCAL: 1n << 12n,
  MOVE_MEMBER_VOCAL: 1n << 13n,
  DELETE_MESSAGE: 1n << 14n,
  MUTE_MEMBER: 1n << 15n,
  KICK_MEMBER: 1n << 16n,
  BAN_MEMBER: 1n << 17n,
  VIEW_CHAT_LOG: 1n << 18n,
  MANAGE_INVITE: 1n << 19n,
  MANAGE_SUB: 1n << 20n,
  ASSIGN_ROLE: 1n << 21n,
  MANAGE_ROLE: 1n << 22n,
  MANAGE_CHAT: 1n << 23n,
} as const;

export const DEFAULT_ROLES = {
  OWNER: { id: 0 },
  ADMIN: { id: 1 },
  USER: { id: 2 },
} as const;

export const SUB_WRITE_ALLOWED_ROLES: Record<string, Set<number>> = {
  ANNOUNCE: new Set([DEFAULT_ROLES.OWNER.id, DEFAULT_ROLES.ADMIN.id]),
};

export function hasPermission(
  memberRoles: Array<{ id: number; permission: string; level: number }>,
  requiredPermission: bigint,
  subType?: string,
): boolean {
  if (!memberRoles || memberRoles.length === 0) return false;

  const allowedRoles = subType ? SUB_WRITE_ALLOWED_ROLES[subType] : null;

  let permissions = 0n;

  for (const role of memberRoles) {
    let rolePerms = BigInt(role.permission);

    if (allowedRoles && !allowedRoles.has(role.id)) {
      rolePerms = rolePerms & ~PERMISSIONS.SEND_MESSAGE;
      rolePerms = rolePerms & ~PERMISSIONS.ATTACH_FILE_MESSAGE;
    }

    permissions |= rolePerms;
  }

  return (permissions & requiredPermission) === requiredPermission;
}

export function getEffectiveLevel(
  memberRoles: Array<{ level: number }>,
): number {
  let level = 0;
  if (!memberRoles) return level;
  for (const role of memberRoles) {
    if (role.level > level) {
      level = role.level;
    }
  }
  return level;
}

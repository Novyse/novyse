import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';

/// Immutable model representing an user
@immutable
class UserModel {
  final String uuid;
  final String? email;
  final String name;
  final String? surname;
  final String? handle;
  final String? profilePictureUUID;
  final String? bannerPictureUUID;
  final String? biography;
  final String? birthday;
  final String? region;
  final String? country;
  final String? color;
  final String status; // 'ONLINE' | 'OFFLINE'
  final DateTime? lastAccessAt;

  const UserModel({
    required this.uuid,
    this.email,
    required this.name,
    this.surname,
    this.handle,
    this.profilePictureUUID,
    this.bannerPictureUUID,
    this.biography,
    this.birthday,
    this.region,
    this.country,
    this.color,
    this.status = 'OFFLINE',
    this.lastAccessAt,
  });

  String get displayName {
    if (surname != null && surname!.isNotEmpty) {
      return '$name $surname';
    }
    return name;
  }

  bool get isOnline => status.toUpperCase() == 'ONLINE';

  Map<String, dynamic> toMap() {
    return {
      'uuid': uuid,
      'userUUID': uuid,
      'email': email,
      'name': name,
      'surname': surname,
      'handle': handle,
      'profilePictureUUID': profilePictureUUID,
      'bannerPictureUUID': bannerPictureUUID,
      'biography': biography,
      'birthday': birthday,
      'region': region,
      'country': country,
      'color': color,
      'status': status,
      'lastAccessAt': lastAccessAt?.toIso8601String(),
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map) {
    DateTime? parseDate(dynamic val) {
      if (val == null) return null;
      if (val is DateTime) return val;
      if (val is String && val.isNotEmpty) {
        return DateTime.tryParse(val);
      }
      return null;
    }

    return UserModel(
      uuid: (map['uuid'] ?? map['userUUID'] ?? '') as String,
      email: map['email'] as String?,
      name: (map['name'] ?? '') as String,
      surname: map['surname'] as String?,
      handle: map['handle'] as String?,
      profilePictureUUID:
          (map['profilePictureUUID'] ?? map['profilePictureUuid']) as String?,
      bannerPictureUUID:
          (map['bannerPictureUUID'] ?? map['bannerPictureUuid']) as String?,
      biography: map['biography'] as String?,
      birthday: map['birthday']?.toString(),
      region: map['region'] as String?,
      country: map['country'] as String?,
      color: map['color']?.toString(),
      status:
          (map['status'] ?? (map['isOnline'] == true ? 'ONLINE' : 'OFFLINE'))
              as String,
      lastAccessAt: parseDate(map['lastAccessAt'] ?? map['last_access_at']),
    );
  }

  UserModel copyWith({
    String? uuid,
    String? email,
    String? name,
    String? surname,
    String? handle,
    String? profilePictureUUID,
    String? bannerPictureUUID,
    String? biography,
    String? birthday,
    String? region,
    String? country,
    String? color,
    String? status,
    DateTime? lastAccessAt,
  }) {
    return UserModel(
      uuid: uuid ?? this.uuid,
      email: email ?? this.email,
      name: name ?? this.name,
      surname: surname ?? this.surname,
      handle: handle ?? this.handle,
      profilePictureUUID: profilePictureUUID ?? this.profilePictureUUID,
      bannerPictureUUID: bannerPictureUUID ?? this.bannerPictureUUID,
      biography: biography ?? this.biography,
      birthday: birthday ?? this.birthday,
      region: region ?? this.region,
      country: country ?? this.country,
      color: color ?? this.color,
      status: status ?? this.status,
      lastAccessAt: lastAccessAt ?? this.lastAccessAt,
    );
  }
}

/// State for the user cache store.
@immutable
class UserStoreState {
  final Map<String, UserModel> users;
  final String localUserUUID;
  final bool loading;

  const UserStoreState({
    this.users = const {},
    this.localUserUUID = '',
    this.loading = false,
  });

  UserStoreState copyWith({
    Map<String, UserModel>? users,
    String? localUserUUID,
    bool? loading,
  }) {
    return UserStoreState(
      users: users ?? this.users,
      localUserUUID: localUserUUID ?? this.localUserUUID,
      loading: loading ?? this.loading,
    );
  }
}

/// Riverpod Notifier managing in-memory user cache and presence.
class UserNotifier extends Notifier<UserStoreState> {
  final List<StreamSubscription> _subscriptions = [];

  @override
  UserStoreState build() {
    ref.onDispose(() {
      for (final sub in _subscriptions) {
        sub.cancel();
      }
      _subscriptions.clear();
    });

    _setupEventListeners();
    return const UserStoreState();
  }

  void _setupEventListeners() {
    final bus = ref.read(eventBusProvider);

    _subscriptions.add(
      bus.on<UserProfileUpdateEvent>().listen((event) {
        onProfileUpdate(event.userUUID, event.data);
      }),
    );

    _subscriptions.add(
      bus.on<UserPresenceUpdateEvent>().listen((event) {
        onPresenceUpdate(event.userUUID, event.status, event.lastAccessAt);
      }),
    );

    _subscriptions.add(
      bus.on<ChatNewEvent>().listen((event) {
        onNewChat(event.users);
      }),
    );

    _subscriptions.add(
      bus.on<ChatMemberJoinedEvent>().listen((event) {
        onNewMember(event.user);
      }),
    );
  }

  /// Initializes the user store by loading users from SQLite and setting local user.
  Future<void> init({
    AppDatabase? dbOverride,
    Gateway? gatewayOverride,
    bool fetchPresence = true,
  }) async {
    state = state.copyWith(loading: true);

    try {
      final AppDatabase db = dbOverride ?? ref.read(databaseProvider);
      if (!db.isOpen) {
        await db.initialize();
      }
      final rawUsers = await db.user.get.all();

      final usersMap = <String, UserModel>{};
      for (final raw in rawUsers) {
        final user = UserModel.fromMap(raw);
        usersMap[user.uuid] = user;
      }

      String localUUID = '';
      try {
        localUUID = (await onboardingManager.getUserUUID()) ?? '';
      } catch (_) {}

      if (localUUID.isNotEmpty && usersMap.containsKey(localUUID)) {
        usersMap[localUUID] = usersMap[localUUID]!.copyWith(status: 'ONLINE');
      }

      state = state.copyWith(
        users: usersMap,
        localUserUUID: localUUID,
        loading: false,
      );

      if (fetchPresence) {
        await this.fetchPresence(gatewayOverride: gatewayOverride);
      }
    } catch (e) {
      debugPrint('UserStore init error: $e');
      state = state.copyWith(loading: false);
    }
  }

  UserModel? getUser(String uuid) => state.users[uuid];

  UserModel? getUserByHandle(String handle) {
    final normalized = handle.toLowerCase();
    for (final user in state.users.values) {
      if (user.handle?.toLowerCase() == normalized) {
        return user;
      }
    }
    return null;
  }

  void onProfileUpdate(String userUUID, Map<String, dynamic> updates) {
    final existing = state.users[userUUID];
    if (existing == null) return;

    final updated = existing.copyWith(
      name: updates['name'] as String?,
      surname: updates['surname'] as String?,
      handle: updates['handle'] as String?,
      profilePictureUUID:
          (updates['profilePictureUUID'] ?? updates['profilePictureUuid'])
              as String?,
      bannerPictureUUID:
          (updates['bannerPictureUUID'] ?? updates['bannerPictureUuid'])
              as String?,
      biography: updates['biography'] as String?,
      birthday: updates['birthday']?.toString(),
      region: updates['region'] as String?,
      country: updates['country'] as String?,
      color: updates['color']?.toString(),
    );

    state = state.copyWith(users: {...state.users, userUUID: updated});
  }

  void onPresenceUpdate(String userUUID, String status, String? lastAccessAt) {
    final existing = state.users[userUUID];
    if (existing == null) return;

    DateTime? accessDate;
    if (lastAccessAt != null && lastAccessAt.isNotEmpty) {
      accessDate = DateTime.tryParse(lastAccessAt);
    }

    final updated = existing.copyWith(
      status: status,
      lastAccessAt: accessDate ?? existing.lastAccessAt,
    );

    state = state.copyWith(users: {...state.users, userUUID: updated});
  }

  void onNewChat(List<dynamic> rawUsers) {
    final newUsers = Map<String, UserModel>.from(state.users);
    for (final raw in rawUsers) {
      if (raw is Map<String, dynamic>) {
        final user = UserModel.fromMap(raw);
        if (!newUsers.containsKey(user.uuid)) {
          newUsers[user.uuid] = user;
        }
      }
    }
    state = state.copyWith(users: newUsers);
  }

  void onNewMember(Map<String, dynamic> rawUser) {
    final user = UserModel.fromMap(rawUser);
    state = state.copyWith(users: {...state.users, user.uuid: user});
  }

  Future<void> fetchPresence({Gateway? gatewayOverride}) async {
    final userUUIDs = state.users.keys.toList();
    if (userUUIDs.isEmpty) return;

    try {
      final Gateway gw = gatewayOverride ?? ref.read(apiGatewayProvider);
      final response = await gw.user.presence(userUUIDs);
      if (response.success && response.data != null) {
        final updatedUsers = Map<String, UserModel>.from(state.users);
        final rawData = response.data;

        if (rawData is Map) {
          for (final entry in rawData.entries) {
            final uuid = entry.key.toString();
            final val = entry.value;
            if (val is Map && updatedUsers.containsKey(uuid)) {
              final status = val['status'] as String? ?? 'OFFLINE';
              DateTime? lastAccess;
              if (val['lastAccessAt'] != null) {
                lastAccess = DateTime.tryParse(val['lastAccessAt'].toString());
              }
              updatedUsers[uuid] = updatedUsers[uuid]!.copyWith(
                status: status,
                lastAccessAt: lastAccess,
              );
            }
          }
        } else if (rawData is List) {
          for (final item in rawData) {
            if (item is Map) {
              final uuid = (item['userUUID'] ?? item['uuid']) as String?;
              if (uuid != null && updatedUsers.containsKey(uuid)) {
                final status = item['status'] as String? ?? 'OFFLINE';
                DateTime? lastAccess;
                if (item['lastAccessAt'] != null) {
                  lastAccess = DateTime.tryParse(
                    item['lastAccessAt'].toString(),
                  );
                }
                updatedUsers[uuid] = updatedUsers[uuid]!.copyWith(
                  status: status,
                  lastAccessAt: lastAccess,
                );
              }
            }
          }
        }

        state = state.copyWith(users: updatedUsers);
      }
    } catch (e) {
      debugPrint('UserStore fetchPresence error: $e');
    }
  }

  void clear() {
    state = const UserStoreState();
  }
}

/// Provider for global [UserNotifier].
final userStoreProvider = NotifierProvider<UserNotifier, UserStoreState>(
  UserNotifier.new,
);

/// Granular Family Provider returning a single [UserModel] by UUID.
/// Any widget watching this will ONLY rebuild when this specific user changes.
final userProvider = Provider.family<UserModel?, String>((ref, userUUID) {
  final users = ref.watch(userStoreProvider.select((s) => s.users));
  return users[userUUID];
});

/// Convenience provider returning the current authenticated [UserModel].
final localUserProvider = Provider<UserModel?>((ref) {
  final localUUID = ref.watch(userStoreProvider.select((s) => s.localUserUUID));
  if (localUUID.isEmpty) return null;
  return ref.watch(userProvider(localUUID));
});

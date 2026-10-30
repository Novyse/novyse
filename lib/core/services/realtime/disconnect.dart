/// What the server tells the client when it closes the connection, and what
/// the app does about it.
///
/// Temporary disconnects (transport closed, missing pings, ...) reconnect
/// through the SDK itself, which asks the `getToken` callback for a fresh
/// access token whenever a handshake is refused. The codes below are the
/// ones the client reacts to itself.
library;

/// The access token is malformed or signed by the wrong key.
const int disconnectInvalidToken = 3500;

/// The node is draining for a deploy: the SDK stops instead of
/// reconnecting on this code.
const int disconnectServerShutdown = 3501;

/// The session is gone: revoked elsewhere, or a refresh carried the
/// identity of another session or user. The token must be cleared and the
/// user routed back to sign in.
const Set<int> sessionInvalidatingDisconnectCodes = <int>{3510, 3511};

/// Next move after the server closed the connection.
enum DisconnectReaction {
  /// Clear the token and route the user back to sign in, never reconnect.
  signInAgain,

  /// Reconnect with a forcibly refreshed access token, with backoff.
  reconnectWithFreshToken,

  /// Reconnect normally with backoff (node draining for a deploy).
  reconnectAfterShutdown,

  /// Nothing to do: the SDK reconnects by itself.
  sdkHandles,
}

/// Maps a server disconnect [code] to the [DisconnectReaction] to perform.
DisconnectReaction classifyDisconnect(int code) {
  if (sessionInvalidatingDisconnectCodes.contains(code)) {
    return DisconnectReaction.signInAgain;
  }
  if (code == disconnectInvalidToken) {
    return DisconnectReaction.reconnectWithFreshToken;
  }
  if (code == disconnectServerShutdown) {
    return DisconnectReaction.reconnectAfterShutdown;
  }
  return DisconnectReaction.sdkHandles;
}

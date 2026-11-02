/// The `window.AppSDK` bootstrap, injected into every plugin document before
/// its own scripts run.
///
/// The plugin talks to the host through one JSON request/response channel and
/// receives events through `window.__appSdkEmit`. Three transports, chosen at
/// runtime so the same bundle runs unchanged everywhere:
///
/// - native (`flutter_inappwebview`): `callHandler`, which returns a promise;
/// - Linux (`webview_all`): a JavaScript channel, answered by `__appSdkReply`;
/// - web: `postMessage` to the parent frame, answered by `__appSdkReply`.
///
/// The SDK is a thin transport: every decision (permissions, limits, the
/// snapshot) belongs to the host, so nothing here can be trusted by a plugin
/// to be authoritative.
const String appSdkSource = r'''
(function () {
  if (window.AppSDK) return;

  var pending = new Map();
  var nextId = 1;
  var handlers = { participants: [], ended: [], action: [], stream: [] };
  var stateHandlers = new Map();

  function sdkError(code, message) {
    var error = new Error(message || code);
    error.code = code;
    return error;
  }

  function settle(raw) {
    if (raw === null || raw === undefined) return;

    var reply = raw;
    if (typeof raw === 'string') {
      try {
        reply = JSON.parse(raw);
      } catch (error) {
        return;
      }
    }

    if (!reply || typeof reply.id !== 'number') return;

    var entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);

    if (reply.ok) {
      entry.resolve(reply.result === undefined ? null : reply.result);
      return;
    }

    var failure = reply.error || {};
    entry.reject(sdkError(failure.code || 'E_INTERNAL', failure.message));
  }

  function transmit(message) {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
      window.flutter_inappwebview
        .callHandler('appSdk', message)
        .then(settle)
        .catch(settle);
      return;
    }

    if (window.appSdkHost && window.appSdkHost.postMessage) {
      window.appSdkHost.postMessage(message);
      return;
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'app-sdk', payload: message }, '*');
      return;
    }

    throw sdkError('E_INTERNAL', 'no host transport');
  }

  function request(method, params) {
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      pending.set(id, { resolve: resolve, reject: reject });

      var message = JSON.stringify({
        id: id,
        method: method,
        params: params === undefined ? null : params
      });

      try {
        transmit(message);
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
  }

  function subscribe(bucket, callback) {
    handlers[bucket].push(callback);
    return function () {
      var index = handlers[bucket].indexOf(callback);
      if (index >= 0) handlers[bucket].splice(index, 1);
    };
  }

  function dispatch(bucket, callback) {
    try {
      callback();
    } catch (error) {
      if (window.console && window.console.error) window.console.error(error);
    }
  }

  function emit(event, payload) {
    if (event === 'activity:participants') {
      handlers.participants.slice().forEach(function (callback) {
        dispatch('participants', function () { callback(payload || []); });
      });
      return;
    }

    if (event === 'activity:ended') {
      var reason = payload && payload.reason ? payload.reason : 'stopped';
      handlers.ended.slice().forEach(function (callback) {
        dispatch('ended', function () { callback(reason); });
      });
      return;
    }

    if (event === 'activity:action') {
      handlers.action.slice().forEach(function (callback) {
        dispatch('action', function () { callback(payload || {}); });
      });
      return;
    }

    if (event === 'activity:stream') {
      var bytes = fromBase64(payload && payload.data ? payload.data : '');
      var sender = payload && payload.sender ? payload.sender : '';
      handlers.stream.slice().forEach(function (callback) {
        dispatch('stream', function () { callback(sender, bytes); });
      });
      return;
    }

    if (event === 'activity:state') {
      var type = payload && payload.type ? payload.type : '';
      var callbacks = stateHandlers.get(type) || [];
      callbacks.slice().forEach(function (callback) {
        dispatch('state', function () { callback(payload || {}); });
      });

      var wildcard = stateHandlers.get('*') || [];
      if (type !== '*') {
        wildcard.slice().forEach(function (callback) {
          dispatch('state', function () { callback(payload || {}); });
        });
      }
    }
  }

  window.__appSdkEmit = function (raw) {
    var envelope = raw;
    if (typeof raw === 'string') {
      try {
        envelope = JSON.parse(raw);
      } catch (error) {
        return;
      }
    }

    if (!envelope || !envelope.event) return;
    emit(envelope.event, envelope.payload);
  };

  window.__appSdkReply = settle;

  window.addEventListener('message', function (message) {
    var data = message.data;
    if (!data || data.source !== 'app-sdk-host') return;

    var payload = data.payload;
    if (payload && typeof payload === 'object' && payload.event) {
      emit(payload.event, payload.payload);
      return;
    }

    settle(payload);
  });

  function toBase64(bytes) {
    var view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
    var binary = '';
    for (var index = 0; index < view.length; index++) {
      binary += String.fromCharCode(view[index]);
    }
    return window.btoa(binary);
  }

  function fromBase64(encoded) {
    var binary = window.atob(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  window.AppSDK = {
    init: function () {
      if (!window.AppSDK._init) window.AppSDK._init = request('init', null);
      return window.AppSDK._init;
    },

    onParticipants: function (callback) {
      return subscribe('participants', callback);
    },

    onEnded: function (callback) {
      return subscribe('ended', callback);
    },

    state: {
      send: function (type, data) {
        return request('state.send', {
          type: type,
          data: data === undefined ? null : data
        });
      },
      on: function (type, callback) {
        var key = type || '*';
        if (!stateHandlers.has(key)) stateHandlers.set(key, []);
        var bucket = stateHandlers.get(key);
        bucket.push(callback);

        return function () {
          var index = bucket.indexOf(callback);
          if (index >= 0) bucket.splice(index, 1);
        };
      }
    },

    action: {
      send: function (type, data) {
        return request('action.send', {
          type: type,
          data: data === undefined ? null : data
        }).then(function () { return undefined; });
      },
      on: function (callback) {
        return subscribe('action', callback);
      }
    },

    stream: {
      send: function (bytes) {
        request('stream.send', { data: toBase64(bytes) }).catch(function () {});
      },
      on: function (callback) {
        return subscribe('stream', callback);
      }
    },

    users: {
      get: function (uuid) {
        return request('users.get', { uuid: uuid });
      }
    },

    ui: {
      requestFullscreen: function () {
        request('ui.fullscreen', null).catch(function () {});
      },
      exitFullscreen: function () {
        request('ui.restore', null).catch(function () {});
      },
      close: function () {
        request('ui.close', null).catch(function () {});
      }
    },

    storage: {
      get: function (key) {
        return request('storage.get', { key: key });
      },
      set: function (key, value) {
        return request('storage.set', { key: key, value: value });
      },
      delete: function (key) {
        return request('storage.delete', { key: key });
      }
    },

    log: function (level) {
      var args = Array.prototype.slice.call(arguments, 1);
      request('log', { level: level, args: args }).catch(function () {});
    }
  };
})();
''';

/// Content Security Policy injected into every plugin document (§11).
///
/// Inline script and style are needed because the bundle is a single
/// self-contained HTML file; everything else is limited to `https:`, `data:`
/// and `blob:`. Frames are disabled outright.
const String pluginContentSecurityPolicy =
    "default-src 'none'; "
    "script-src 'unsafe-inline' https:; "
    "style-src 'unsafe-inline' https:; "
    "img-src https: data: blob:; "
    "media-src https: blob:; "
    "font-src https: data:; "
    "connect-src https:; "
    "frame-src 'none'";

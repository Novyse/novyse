#include <dlfcn.h>
#include <gio/gio.h>
#include <stdint.h>
#include <string.h>

typedef void (*RealGDBusProxyCallFn)(
    GDBusProxy *proxy, const gchar *method_name, GVariant *parameters,
    GDBusCallFlags flags, gint timeout_msec, GCancellable *cancellable,
    GAsyncReadyCallback callback, gpointer user_data);

// Intercept g_dbus_proxy_call to:
// 1. Force types = 3 (MONITOR | WINDOW) so the OS portal dialog presents both
// tabs (screens and individual windows).
// 2. Keep persist_mode transient (1) and drop restore_token so that clicking
// "Change source"
//    opens a fresh source selection menu every time without locking into a
//    previous choice.
extern "C" __attribute__((visibility("default"))) void
g_dbus_proxy_call(GDBusProxy *proxy, const gchar *method_name,
                  GVariant *parameters, GDBusCallFlags flags, gint timeout_msec,
                  GCancellable *cancellable, GAsyncReadyCallback callback,
                  gpointer user_data) {

  static RealGDBusProxyCallFn real_fn = nullptr;
  if (!real_fn) {
    real_fn = (RealGDBusProxyCallFn)dlsym(RTLD_NEXT, "g_dbus_proxy_call");
  }

  if (method_name && strcmp(method_name, "SelectSources") == 0 && parameters) {
    void *caller = __builtin_return_address(0);
    Dl_info caller_info;

    if (dladdr(caller, &caller_info) && caller_info.dli_fname &&
        strstr(caller_info.dli_fname, "libwebrtc.so")) {

      // Force types = 3 (MONITOR | WINDOW) so both screens and windows appear.
      const gchar *type_str = g_variant_get_type_string(parameters);
      if (type_str && strcmp(type_str, "(oa{sv})") == 0) {
        GVariant *session_handle = nullptr;
        GVariant *options = nullptr;
        g_variant_get(parameters, "(@o@a{sv})", &session_handle, &options);

        GVariantBuilder builder;
        g_variant_builder_init(&builder, G_VARIANT_TYPE("a{sv}"));

        GVariantIter iter;
        g_variant_iter_init(&iter, options);
        const gchar *key;
        GVariant *val;
        bool types_set = false;

        while (g_variant_iter_next(&iter, "{&sv}", &key, &val)) {
          if (strcmp(key, "types") == 0) {
            // 1: MONITOR, 2: WINDOW, 3: MONITOR | WINDOW
            g_variant_builder_add(&builder, "{sv}", "types",
                                  g_variant_new_uint32(3));
            g_variant_unref(val);
            types_set = true;
          } else if (strcmp(key, "persist_mode") == 0) {
            // Transient mode (1) so choices are not permanently locked in
            g_variant_builder_add(&builder, "{sv}", "persist_mode",
                                  g_variant_new_uint32(1));
            g_variant_unref(val);
          } else if (strcmp(key, "restore_token") == 0) {
            // Drop any cached restore_token to allow fresh selection on change
            // source
            g_variant_unref(val);
          } else {
            g_variant_builder_add(&builder, "{sv}", key, val);
            g_variant_unref(val);
          }
        }

        if (!types_set) {
          g_variant_builder_add(&builder, "{sv}", "types",
                                g_variant_new_uint32(3));
        }

        GVariant *new_options = g_variant_builder_end(&builder);
        GVariant *new_params = g_variant_new(
            "(o@a{sv})", g_variant_get_string(session_handle, nullptr),
            new_options);

        g_variant_unref(session_handle);
        g_variant_unref(options);

        if (real_fn) {
          real_fn(proxy, method_name, new_params, flags, timeout_msec,
                  cancellable, callback, user_data);
        }
        return;
      }
    }
  }

  if (real_fn) {
    real_fn(proxy, method_name, parameters, flags, timeout_msec, cancellable,
            callback, user_data);
  }
}

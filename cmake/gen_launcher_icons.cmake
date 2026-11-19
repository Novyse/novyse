# Composes the launcher icons (generated, not committed) at configure time, so
# they always exist before Flutter assembles the asset bundle. The settings
# preview, the window/dock icons and the native launcher resources all read
# these files.
#
# Shared by linux/CMakeLists.txt and windows/CMakeLists.txt so there is a single
# implementation. The shell entrypoint (scripts/sync-icons.sh) does the same for
# run.sh, build.sh and the Xcode phases, where CMake is not involved.
#
# Usage: include("${CMAKE_CURRENT_SOURCE_DIR}/../cmake/gen_launcher_icons.cmake")
#        gen_launcher_icons("${CMAKE_CURRENT_SOURCE_DIR}/.."
#                           "${FLUTTER_MANAGED_DIR}")
function(gen_launcher_icons PROJECT_ROOT FLUTTER_DIR)
  # Flutter writes the SDK path into the ephemeral config it generates before
  # configuring CMake; fall back to the environment, then to PATH.
  set(_flutter_root "")
  set(_config "${FLUTTER_DIR}/ephemeral/generated_config.cmake")
  if(EXISTS "${_config}")
    file(STRINGS "${_config}" _root_line
      REGEX "^file\\(TO_CMAKE_PATH \".*\" FLUTTER_ROOT\\)")
    string(REGEX REPLACE "^file\\(TO_CMAKE_PATH \"(.*)\" FLUTTER_ROOT\\)$"
      "\\1" _flutter_root "${_root_line}")
  endif()
  if(NOT _flutter_root AND DEFINED ENV{FLUTTER_ROOT})
    file(TO_CMAKE_PATH "$ENV{FLUTTER_ROOT}" _flutter_root)
  endif()

  # Prefer the cached Dart SDK executable: a real .exe on Windows (no cmd.exe
  # needed, unlike dart.bat) and the same layout on Linux/macOS.
  set(_dart "")
  if(WIN32)
    set(_sdk_dart "${_flutter_root}/bin/cache/dart-sdk/bin/dart.exe")
    set(_wrapper_dart "${_flutter_root}/bin/dart.bat")
  else()
    set(_sdk_dart "${_flutter_root}/bin/cache/dart-sdk/bin/dart")
    set(_wrapper_dart "${_flutter_root}/bin/dart")
  endif()
  if(EXISTS "${_sdk_dart}")
    set(_dart "${_sdk_dart}")
  elseif(EXISTS "${_wrapper_dart}")
    set(_dart "${_wrapper_dart}")
  else()
    find_program(_dart NAMES dart dart.bat)
  endif()

  if(NOT _dart)
    message(WARNING "dart not found: launcher icons are not regenerated")
    return()
  endif()

  # Re-configure when any icon source changes, so the composed output follows.
  set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
    "${PROJECT_ROOT}/tool/gen_launcher_icons.dart"
    "${PROJECT_ROOT}/assets/images/icons"
    "${PROJECT_ROOT}/assets/images/icons_backgrounds"
    "${PROJECT_ROOT}/assets/images/tray_icon.png"
    "${PROJECT_ROOT}/assets/images/novyse-icon-logo.png"
  )

  execute_process(
    COMMAND "${_dart}" tool/gen_launcher_icons.dart
    WORKING_DIRECTORY "${PROJECT_ROOT}"
    RESULT_VARIABLE _result
    OUTPUT_QUIET
  )
  if(NOT _result EQUAL 0)
    message(FATAL_ERROR
      "tool/gen_launcher_icons.dart failed (${_result}): "
      "launcher icons cannot be generated")
  endif()
endfunction()

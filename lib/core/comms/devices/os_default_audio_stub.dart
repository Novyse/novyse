/// OS default capture and render endpoints.
///
/// [inputId] / [outputId] are OS-specific endpoint identifiers
/// (a GUID on Windows, a PulseAudio sink/source name on Linux, or a
/// CoreAudio device ID on macOS).
/// [input] / [output] are the friendly names in the system language.
class OsDefaultAudioNames {
  final String? inputId;
  final String? input;
  final String? outputId;
  final String? output;

  const OsDefaultAudioNames({
    this.inputId,
    this.input,
    this.outputId,
    this.output,
  });
}

/// Web and platforms without a native default-device query.
Future<OsDefaultAudioNames> readOsDefaultAudioNames() async =>
    const OsDefaultAudioNames();

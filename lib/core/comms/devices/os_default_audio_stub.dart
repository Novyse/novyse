/// OS default capture and render endpoints.
///
/// [inputId] / [outputId] are endpoint ids (a GUID on Windows).
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

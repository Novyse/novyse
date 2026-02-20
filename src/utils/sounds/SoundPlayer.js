import sounds from "./sounds";
import { createAudioPlayer } from "expo-audio";

class SoundPlayer {
  static instance = null;

  constructor() {
    if (SoundPlayer.instance) {
      return SoundPlayer.instance;
    }
    SoundPlayer.instance = this;
  }

  static getInstance() {
    if (!SoundPlayer.instance) {
      SoundPlayer.instance = new SoundPlayer();
    }
    return SoundPlayer.instance;
  }

  /**
   * Suona un suono specifico usando expo-audio
   * @param {string} soundName - Nome del suono da suonare (es. 'comms_join_vocal', 'comms_leave_vocal')
   */
  async playSound(soundName) {
    try {
      // support simple dot-separated paths (e.g. "comms.join" or "comms.screen_share.start")
      const keys = soundName.split(".");
      let soundObj = sounds;
      for (const key of keys) {
        if (!soundObj) break;
        soundObj = soundObj[key];
      }

      if (!soundObj) {
        console.warn(`[SoundPlayer] Sound '${soundName}' not found`);
        return;
      }

      // Crea un AudioPlayer usando expo-audio
      const player = createAudioPlayer(soundObj);

      // Aggiungi un listener per pulire le risorse quando il suono finisce
      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          player.remove();
        }
      });

      // Suona il suono
      player.play();

      console.log(`[SoundPlayer] Played sound: ${soundName}`);
    } catch (error) {
      console.error(`[SoundPlayer] Error playing sound '${soundName}':`, error);
    }
  }
}

export default SoundPlayer;

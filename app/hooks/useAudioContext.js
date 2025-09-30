import { useEffect } from "react";

import { useAudio } from "@/context/AudioContext";

import methods from "../utils/webrtc/methods";
const { set } = methods;

const useAudioContext = () => {
  const { audioContext } = useAudio();
  useEffect(() => {
    set.audioContext(audioContext);
  }, [audioContext]);

  return { audioContext };
};

export default useAudioContext;

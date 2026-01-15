import { AudioContext } from "react-native-audio-api";

/**
 * Generates waveform data for an audio file given its URI.
 * @param {String} uri
 * @param {Int} samples
 * @returns {Promise<number[]|null>} Array of normalized amplitudes or null in case of error
 */
export const getWaveformData = async (uri, samples = 50) => {
  const audioBuffer = await getAudioBuffer(uri);
  if (!audioBuffer) return null;
  const waveformData = processWaveform(audioBuffer, samples);
  return waveformData;
};

/**
 * Retrieves and decodes the audio file from a URI.
 * @param {string} uri - The URI of the audio file
 * @returns {Promise<AudioBuffer|null>} The decoded audio buffer or null in case of error
 */

const getAudioBuffer = async (uri) => {
  try {
    const response = await fetch(uri);

    const arrayBuffer = await response.arrayBuffer();
    const context = new AudioContext();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);

    return audioBuffer;
  } catch (error) {
    console.error("Error decoding audio:", error);
    return null;
  }
};

/**
 * Transforms raw audio data into an array of amplitudes for the waveform.
 * @param {AudioBuffer} audioBuffer - The decoded buffer
 * @param {number} samples - How many bars you want in the graph
 * @returns {number[]} Array of values between 0 and 1
 */
const processWaveform = (audioBuffer, samples) => {
  const rawData = audioBuffer.getChannelData(0);
  const totalSamples = rawData.length;
  const blockSize = Math.floor(totalSamples / samples);
  const filteredData = [];

  for (let i = 0; i < samples; i++) {
    let blockStart = blockSize * i;
    let sum = 0;

    for (let j = 0; j < blockSize; j++) {
      sum = sum + Math.abs(rawData[blockStart + j]);
    }

    filteredData.push(sum / blockSize);
  }

  const multiplier = Math.pow(Math.max(...filteredData), -1);
  return filteredData.map((n) => n * multiplier);
};

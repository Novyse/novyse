class AudioUtils {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  /**
   * Applies noise reduction to an audio stream using a combination of high-pass filtering
   * and dynamic range compression
   * @param {MediaStream} inputStream - Input media stream
   * @param {Object} options - Configuration options
   * @param {number} options.threshold - Noise threshold in dB (default: -50)
   * @param {number} options.reduction - Noise reduction amount in dB (default: -20)
   * @param {number} options.cutoffFreq - High-pass filter cutoff frequency (default: 80)
   * @returns {MediaStream} Filtered audio stream
   */
  noiseReduction(inputStream, options = {}) {
    const { threshold = -50, reduction = -20, cutoffFreq = 80 } = options;

    try {
      // Create audio source from MediaStream
      const source = this.audioContext.createMediaStreamSource(inputStream);

      // Create high-pass filter to remove low-frequency noise
      const highPassFilter = this.audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.setValueAtTime(
        cutoffFreq,
        this.audioContext.currentTime
      );
      highPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

      // Create compressor for dynamic noise reduction
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(
        threshold,
        this.audioContext.currentTime
      );
      compressor.knee.setValueAtTime(40, this.audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

      // Create gain node for final adjustment
      const outputGain = this.audioContext.createGain();
      outputGain.gain.setValueAtTime(
        Math.pow(10, reduction / 20),
        this.audioContext.currentTime
      );

      // Create output destination
      const outputDestination =
        this.audioContext.createMediaStreamDestination();

      // Connect the audio graph
      source.connect(highPassFilter);
      highPassFilter.connect(compressor);
      compressor.connect(outputGain);
      outputGain.connect(outputDestination);

      return outputDestination.stream;
    } catch (error) {
      console.error("Error in noise reduction:", error);
      return inputStream; // Return original stream if processing fails
    }
  }

  /**
   * Applies noise gate to an audio stream with different strategies
   * @param {MediaStream} inputStream - Input media stream
   * @param {Object} options - Configuration options
   * @param {string} options.type - Gate type: 'static', 'adaptive', 'hybrid' (default: 'static')
   * @param {number} options.threshold - Gate threshold in dB (default: -25)
   * @param {number} options.ratio - Gate ratio (default: 12)
   * @param {number} options.attack - Attack time (default: 0.002)
   * @param {number} options.release - Release time (default: 0.15)
   * @param {number} options.adaptationSpeed - Adaptation speed for adaptive/hybrid (default: 0.1)
   * @param {number} options.minThreshold - Min threshold for adaptive (default: -50)
   * @param {number} options.maxThreshold - Max threshold for adaptive (default: -15)
   * @param {number} options.hybridWeight - Weight of adaptive in hybrid mode (default: 0.3)
   * @returns {MediaStream} Filtered audio stream
   */
  noiseGate(inputStream, options = {}) {
    const {
      type = "static",
      threshold = -25,
      ratio = 12,
      attack = 0.002,
      release = 0.15,
      adaptationSpeed = 0.1,
      minThreshold = -50,
      maxThreshold = -15,
      hybridWeight = 0.3,
    } = options;

    console.log(
      `🎯 Noise gate tipo: ${type.toUpperCase()} (threshold: ${threshold} dB)`
    );

    try {
      const source = this.audioContext.createMediaStreamSource(inputStream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      const gateGain = this.audioContext.createGain();
      gateGain.gain.setValueAtTime(0, this.audioContext.currentTime);

      const outputDestination =
        this.audioContext.createMediaStreamDestination();

      // Connetti il grafo audio
      source.connect(analyser);
      source.connect(gateGain);
      gateGain.connect(outputDestination);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Variabili per tutti i tipi di gate
      let currentThreshold = threshold;
      let noiseSamples = [];
      let voiceSamples = [];
      let lastLogTime = 0;
      let silenceStart = null;
      let voiceStart = null;

      const gateLoop = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calcola il volume RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const dbLevel = rms > 0 ? 20 * Math.log10(rms / 255) : -100;

        const now = Date.now();
        const isAboveThreshold = dbLevel > currentThreshold;

        // === GESTIONE DEL GATE ===
        if (isAboveThreshold) {
          gateGain.gain.setValueAtTime(1, this.audioContext.currentTime);

          // Traccia periodo di voce per adaptive/hybrid
          if ((type === "adaptive" || type === "hybrid") && !voiceStart) {
            voiceStart = now;
            silenceStart = null;
          }

          if (voiceStart && now - voiceStart < 1000) {
            // 1 secondo di voce
            voiceSamples.push(dbLevel);
          }
        } else {
          gateGain.gain.setValueAtTime(0, this.audioContext.currentTime);

          // Traccia periodo di silenzio per adaptive/hybrid
          if ((type === "adaptive" || type === "hybrid") && !silenceStart) {
            silenceStart = now;
            voiceStart = null;
          }

          if (silenceStart && now - silenceStart < 2000) {
            // 2 secondi di silenzio
            noiseSamples.push(dbLevel);
          }
        }

        // === ADATTAMENTO BASATO SUL TIPO ===
        if (type === "adaptive" && noiseSamples.length > 50) {
          // ADAPTIVE: Usa solo il threshold calcolato dinamicamente
          const avgNoise =
            noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length;
          const maxNoise = Math.max(...noiseSamples);

          const suggestedThreshold = Math.max(avgNoise + 8, maxNoise + 3);
          const clampedThreshold = Math.max(
            minThreshold,
            Math.min(maxThreshold, suggestedThreshold)
          );

          currentThreshold +=
            (clampedThreshold - currentThreshold) * adaptationSpeed;

          if (now - lastLogTime > 5000) {
            console.log(
              `🔄 Threshold adattivo: ${currentThreshold.toFixed(
                1
              )} dB (rumore: ${avgNoise.toFixed(1)} dB)`
            );
            lastLogTime = now;
          }

          noiseSamples = noiseSamples.slice(-20);
        } else if (type === "hybrid" && noiseSamples.length > 50) {
          // HYBRID: Combina threshold statico con quello adattivo
          const avgNoise =
            noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length;

          const calculatedThreshold = Math.max(
            avgNoise + 8,
            threshold - 10 // Non andare più di 10dB sotto il threshold statico
          );

          // Mix tra statico e adattivo
          const targetThreshold =
            threshold * (1 - hybridWeight) + calculatedThreshold * hybridWeight;

          const conservativeMin = Math.max(minThreshold, threshold - 15); // Non più di 15dB sotto lo statico
          const clampedThreshold = Math.max(
            conservativeMin,
            Math.min(maxThreshold, targetThreshold)
          );

          currentThreshold +=
            (clampedThreshold - currentThreshold) * adaptationSpeed;

          if (now - lastLogTime > 5000) {
            console.log(
              `🔄 Threshold ibrido: ${currentThreshold.toFixed(
                1
              )} dB (statico: ${threshold} dB, adattivo: ${calculatedThreshold.toFixed(
                1
              )} dB, conservativeMin: ${conservativeMin.toFixed(1)} dB)`
            );
            lastLogTime = now;
          }

          noiseSamples = noiseSamples.slice(-20);
        }

        // STATIC: currentThreshold rimane sempre uguale a threshold iniziale

        // Calibrazione fine con campioni di voce (per adaptive e hybrid)
        if (
          (type === "adaptive" || type === "hybrid") &&
          voiceSamples.length > 30
        ) {
          const avgVoice =
            voiceSamples.reduce((a, b) => a + b, 0) / voiceSamples.length;

          if (
            avgVoice - currentThreshold < 8 &&
            currentThreshold > minThreshold + 5
          ) {
            const adjustment = (avgVoice - 5 - currentThreshold) * 0.02; // MOLTO più conservativo
            currentThreshold += adjustment;
            currentThreshold = Math.max(
              minThreshold,
              Math.min(maxThreshold, currentThreshold)
            );

            console.log(
              `🎤 Threshold calibrato per voce: ${currentThreshold.toFixed(
                1
              )} dB (voce media: ${avgVoice.toFixed(1)} dB)`
            );
          }

          voiceSamples = voiceSamples.slice(-15);
        }

        requestAnimationFrame(gateLoop);
      };

      gateLoop();
      return outputDestination.stream;
    } catch (error) {
      console.error("Error in noise gate:", error);
      return inputStream;
    }
  }

  /**
   * Applies typing attenuation to reduce keyboard/typing noise
   * @param {MediaStream} inputStream - Input media stream
   * @param {Object} options - Configuration options
   * @param {number} options.cutoffFreq - Low-pass filter cutoff frequency (default: 4000)
   * @param {number} options.resonance - Filter resonance/Q factor (default: 1.0)
   * @param {number} options.attackTime - Compressor attack time (default: 0.001)
   * @param {number} options.releaseTime - Compressor release time (default: 0.05)
   * @param {number} options.threshold - Compressor threshold in dB (default: -20)
   * @returns {MediaStream} Filtered audio stream
   */
  typingAttenuation(inputStream, options = {}) {
    const {
      cutoffFreq = 4000,
      resonance = 1.0,
      attackTime = 0.001,
      releaseTime = 0.05,
      threshold = -20,
    } = options;

    try {
      // Create audio source from MediaStream
      const source = this.audioContext.createMediaStreamSource(inputStream);

      // Create low-pass filter to remove high-frequency typing noise
      const lowPassFilter = this.audioContext.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.setValueAtTime(
        cutoffFreq,
        this.audioContext.currentTime
      );
      lowPassFilter.Q.setValueAtTime(resonance, this.audioContext.currentTime);

      // Create notch filter for specific typing frequencies
      const notchFilter = this.audioContext.createBiquadFilter();
      notchFilter.type = "notch";
      notchFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime); // Common typing frequency
      notchFilter.Q.setValueAtTime(5, this.audioContext.currentTime);

      // Create compressor for dynamic typing noise reduction
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(
        threshold,
        this.audioContext.currentTime
      );
      compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      compressor.ratio.setValueAtTime(6, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(
        attackTime,
        this.audioContext.currentTime
      );
      compressor.release.setValueAtTime(
        releaseTime,
        this.audioContext.currentTime
      );

      // Create output destination
      const outputDestination =
        this.audioContext.createMediaStreamDestination();

      // Connect the audio graph
      source.connect(lowPassFilter);
      lowPassFilter.connect(notchFilter);
      notchFilter.connect(compressor);
      compressor.connect(outputDestination);

      return outputDestination.stream;
    } catch (error) {
      console.error("Error in typing attenuation:", error);
      return inputStream; // Return original stream if processing fails
    }
  }

  /**
   * Calcola automaticamente il threshold ottimale analizzando il rumore di fondo
   * @param {MediaStream} inputStream - Input media stream
   * @param {number} calibrationTime - Tempo di calibrazione in secondi (default: 3)
   * @returns {Promise<number>} Il threshold calcolato in dB
   */
  calculateOptimalThreshold(inputStream, calibrationTime = 3) {
    return new Promise((resolve) => {
      try {
        const source = this.audioContext.createMediaStreamSource(inputStream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;

        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const samples = [];
        const startTime = Date.now();

        console.log(
          `🎤 CALIBRAZIONE NOISE GATE: Resta in silenzio per ${calibrationTime} secondi...`
        );

        const collectSamples = () => {
          analyser.getByteFrequencyData(dataArray);

          // Calcola il volume RMS
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);

          // Converti in dB
          const dbLevel = rms > 0 ? 20 * Math.log10(rms / 255) : -100;
          samples.push(dbLevel);

          const elapsed = (Date.now() - startTime) / 1000;

          if (elapsed < calibrationTime) {
            requestAnimationFrame(collectSamples);
          } else {
            // Calcola statistiche
            samples.sort((a, b) => b - a); // Ordina dal più alto al più basso

            const maxNoise = samples[0];
            const avgNoise =
              samples.reduce((a, b) => a + b, 0) / samples.length;
            const percentile90 = samples[Math.floor(samples.length * 0.1)]; // 90° percentile

            // Calcola threshold ottimale: media + margine di sicurezza
            const optimalThreshold = Math.max(avgNoise + 8, percentile90 + 5);

            console.log(`📊 ANALISI RUMORE COMPLETATA:`);
            console.log(`   • Rumore massimo: ${maxNoise.toFixed(1)} dB`);
            console.log(`   • Rumore medio: ${avgNoise.toFixed(1)} dB`);
            console.log(`   • 90° percentile: ${percentile90.toFixed(1)} dB`);
            console.log(
              `   • Threshold calcolato: ${optimalThreshold.toFixed(1)} dB`
            );
            console.log(`   • Campioni analizzati: ${samples.length}`);

            // Cleanup
            source.disconnect();

            resolve(optimalThreshold);
          }
        };

        collectSamples();
      } catch (error) {
        console.error("Errore nel calcolo del threshold:", error);
        resolve(-35); // Fallback threshold
      }
    });
  }

  /**
   * Cleanup method to dispose of audio context resources
   */
  dispose() {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
  }
}

export default AudioUtils;

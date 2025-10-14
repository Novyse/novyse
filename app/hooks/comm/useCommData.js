import { useState, useEffect } from "react";

import methods from "@/app/utils/webrtc/methods";
const { get, check } = methods;

import WebRTC from "@/app/utils/webrtc/index";

import eventEmitter from "@/app/utils/global/Events/EventEmitter";

const useCommData = (commUUID) => {
  const [commData, setCommData] = useState({});
  const [activeStreams, setActiveStreams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleStreamUpdate = (data) => {
    // Only update streams if the user is still in comms
    if (!check.isInComms()) {
      console.info("[VocalContent] User not in comms, ignoring stream update");
      return;
    }

    let {
      deviceUUID,
      stream = null,
      streamUUID,
      action = "add_or_update",
    } = data;

    if (!deviceUUID || !streamUUID) {
      console.warn(
        "[VocalContent] Invalid stream update data, missing deviceUUID, stream or streamUUID",
        data
      );
      return;
    }

    if (action === "add_or_update") {
      // Check if this is a screen share (when deviceUUID != streamUUID)
      if (deviceUUID !== streamUUID) {
        // Add screen share data to commData if it doesn't exist
        setCommData((prev) => {
          const updated = { ...prev };

          if (updated[deviceUUID]) {
            const activeScreenShares =
              updated[deviceUUID].activeScreenShares || [];

            // Add streamUUID to activeScreenShares if it doesn't exist
            if (!activeScreenShares.includes(streamUUID)) {
              updated[deviceUUID] = {
                ...updated[deviceUUID],
                activeScreenShares: [...activeScreenShares, streamUUID],
              };
            }
          }

          return updated;
        });
      }
      setActiveStreams((prevStreams) => {
        const updatedStreams = { ...prevStreams };

        // Ensure participant object exists
        if (!updatedStreams[deviceUUID]) {
          updatedStreams[deviceUUID] = {};
        }

        // Add or update the stream
        updatedStreams[deviceUUID][streamUUID] = stream;

        return updatedStreams;
      });
    } else if (action === "remove") {
      // Check if this is a screen share (when deviceUUID != streamUUID)
      if (deviceUUID !== streamUUID) {
        // Remove screen share data deviceUUID commData if it exists
        setCommData((prev) => {
          const updated = { ...prev };

          if (updated[deviceUUID]) {
            const activeScreenShares =
              updated[deviceUUID].activeScreenShares || [];

            // Remove streamUUID deviceUUID activeScreenShares if it exists
            updated[deviceUUID] = {
              ...updated[deviceUUID],
              activeScreenShares: activeScreenShares.filter(
                (id) => id !== streamUUID
              ),
            };
          }

          return updated;
        });

        setActiveStreams((prevStreams) => {
          const updatedStreams = { ...prevStreams };
          if (
            updatedStreams[deviceUUID] &&
            updatedStreams[deviceUUID][streamUUID]
          ) {
            delete updatedStreams[deviceUUID][streamUUID];
            // Se non ci sono più stream per questo partecipante, rimuovi l'oggetto
            if (Object.keys(updatedStreams[deviceUUID]).length === 0) {
              delete updatedStreams[deviceUUID];
            }
          }
          return updatedStreams;
        });
      }
    } else {
      console.warn(
        "[VocalContent] Invalid action for stream update, expected 'add_or_update' or 'remove', got",
        action
      );
      return;
    }
  };

  // Speech detection handlers
  const handleStartedSpeaking = (data) => {
    if (
      !check.isInComms() ||
      data.commUUID !== commUUID ||
      data.commUUID !== get.commUUID()
    ) {
      return;
    }

    const deviceUUID = data.deviceUUID;

    setCommData((prev) => {
      const updated = { ...prev };

      // Ensure the participant exists in commData
      if (!updated[deviceUUID]) {
        updated[deviceUUID] = {
          userData: {
            handle: "Unknown User",
            isSpeaking: false,
            webcamOn: false,
          },
          activeScreenShares: [],
        };
      }

      // Ensure userData exists
      if (!updated[deviceUUID].userData) {
        updated[deviceUUID].userData = {
          handle: "Unknown User",
          isSpeaking: false,
          webcamOn: false,
        };
      }

      updated[deviceUUID] = {
        ...updated[deviceUUID],
        userData: {
          ...updated[deviceUUID].userData,
          isSpeaking: true,
        },
      };

      return updated;
    });
  };

  const handleStoppedSpeaking = (data) => {
    if (
      !check.isInComms() ||
      data.commUUID !== commUUID ||
      data.commUUID !== get.commUUID()
    ) {
      return;
    }

    const deviceUUID = data.deviceUUID;

    setCommData((prev) => {
      const updated = { ...prev };

      // Ensure the participant exists in commData
      if (!updated[deviceUUID]) {
        updated[deviceUUID] = {
          userData: {
            handle: "Unknown User",
            isSpeaking: false,
            webcamOn: false,
          },
          activeScreenShares: [],
        };
      }

      // Ensure userData exists
      if (!updated[deviceUUID].userData) {
        updated[deviceUUID].userData = {
          handle: "Unknown User",
          isSpeaking: false,
          webcamOn: false,
        };
      }

      updated[deviceUUID] = {
        ...updated[deviceUUID],
        userData: {
          ...updated[deviceUUID].userData,
          isSpeaking: false,
        },
      };

      return updated;
    });
  };

  // Screen sharing handlers
  const handleScreenShareStarted = (data) => {
    console.debug("[VocalContent] Screen share started:", data);
    const { deviceUUID, screenShareUUID } = data;

    // Non saltare per l'utente locale: aggiorna sempre per mantenere la sincronizzazione con il core WebRTC
    // if (deviceUUID === get.deviceUUID()) {
    //   console.info("[VocalContent] Ignoring own screen share started event");
    //   return;
    // }

    setCommData((prev) => {
      const updated = { ...prev };

      // Assicurati che il partecipante esista in commData
      if (!updated[deviceUUID]) {
        updated[deviceUUID] = {
          userData: {
            handle: "Unknown User",
            isSpeaking: false,
            webcamOn: false,
          },
          activeScreenShares: [],
        };
      }

      // Assicurati che activeScreenShares sia un array
      if (!Array.isArray(updated[deviceUUID].activeScreenShares)) {
        updated[deviceUUID].activeScreenShares = [];
      }

      // Aggiungi screenShareUUID se non presente
      if (!updated[deviceUUID].activeScreenShares.includes(screenShareUUID)) {
        updated[deviceUUID] = {
          ...updated[deviceUUID],
          activeScreenShares: [
            ...updated[deviceUUID].activeScreenShares,
            screenShareUUID,
          ],
        };
      }

      return updated;
    });
  };

  const handleScreenShareStopped = (data) => {
    console.debug("[VocalContent] Screen share stopped:", data);

    const { deviceUUID, screenShareUUID } = data;

    // Non saltare per l'utente locale
    // if (deviceUUID === get.deviceUUID()) {
    //   console.info("[VocalContent] Ignoring own screen share stopped event");
    //   return;
    // }

    // Rimuovi lo screen share da activeStreams e commData
    setCommData((prev) => {
      const updated = { ...prev };

      if (updated[deviceUUID]) {
        // Assicurati che activeScreenShares sia un array
        if (!Array.isArray(updated[deviceUUID].activeScreenShares)) {
          updated[deviceUUID].activeScreenShares = [];
        }

        updated[deviceUUID] = {
          ...updated[deviceUUID],
          activeScreenShares: updated[deviceUUID].activeScreenShares.filter(
            (id) => id !== screenShareUUID
          ),
        };
        console.log(
          `[VocalContent] Updated activeScreenShares for ${deviceUUID}: ${screenShareUUID} removed`
        );
      }

      return updated;
    });

    setActiveStreams((prev) => {
      const newStreams = { ...prev };

      if (newStreams[deviceUUID]) {
        // Rimuovi lo stream di screen share per il partecipante
        delete newStreams[deviceUUID][screenShareUUID];
        console.log(
          `[VocalContent] Removed screen share stream for ${deviceUUID}: ${screenShareUUID}`
        );
      }
      return newStreams;
    });
  };
  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {
    console.debug("[VocalContent] Member joined comms:", data);
    // Controlla se l'evento è per il commUUID corretto (usa commUUID invece di commUUID)
    if (data.commUUID == commUUID) {
      console.log("[VocalContent] Adding member to profiles");

      setCommData((prev) => {
        const updated = { ...prev };
        const deviceUUID = data.deviceUUID;

        // Ensure the participant exists in commData
        if (!updated[deviceUUID]) {
          updated[deviceUUID] = {
            userData: {
              handle: data.handle || "Unknown User",
              isSpeaking: data.speaking,
              webcamOn: data.webcamOn || false, // Default webcam status
            },
            activeScreenShares: data.screenShares || [],
          };
        }
        return updated;
      });

      // Se è il mio join event, sincronizza subito gli stream esistenti
      if (data.deviceUUID === get.deviceUUID()) {
        const updatedActiveStreams = get.activeStreams();
        console.debug(
          "[VocalContent] Syncing existing streams after my join:",
          updatedActiveStreams
        );
        setActiveStreams(updatedActiveStreams);
      }
    } else {
      console.log(
        "[VocalContent] View incorrect, ignored member join event for different comm",
        { dataCommUUID: data.commUUID, currentCommUUID: get.commUUID() }
      );
    }
  };
  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = async (data) => {
    console.log(`[VocalContent] Member left: ${data}`);
    // Controlla se l'evento è per il commUUID corretto
    if (data.commUUID === commUUID) {
      // Rimuovo il profilo
      setCommData((prev) => {
        const updated = { ...prev };
        const deviceUUID = data.deviceUUID;

        // Remove the participant if they exist
        if (updated[deviceUUID]) {
          delete updated[deviceUUID];
          console.log(
            `[VocalContent] Removed profile for user: ${data.deviceUUID}`
          );
        } else {
          console.warn(
            `[VocalContent] Attempted to remove non-existent profile for user: ${data.deviceUUID}`
          );
        }
        return updated;
      });

      // Rimuovo anche lo stream associato e tutti i screen share streams dell'utente

      setActiveStreams((prev) => {
        const newStreams = { ...prev };
        // Remove all active streams for the departing user

        if (newStreams[data.deviceUUID]) {
          delete newStreams[data.deviceUUID];
          console.log(
            `[VocalContent] Removed all active streams for departing user ${data.deviceUUID}`
          );
        }
        return newStreams;
      });
    } else {
      console.log(
        "[VocalContent] View incorrect, ignored member left event for different comm",
        { dataCommUUID: data.commUUID, currentCommUUID: get.commUUID() }
      );
    }
  };

  // Webcam status handlers
  const handleWebcamOn = (data) => {
    // Controlla se l'evento è per il commUUID corretto
    if (!check.isInComms()) {
      return;
    }

    if (data.commUUID === commUUID && data.commUUID === get.commUUID()) {
      // Aggiorna lo stato webcamOn per l'utente remoto in commData
      setCommData((prev) => {
        const updated = { ...prev };
        const deviceUUID = data.deviceUUID;

        if (updated[deviceUUID]) {
          updated[deviceUUID] = {
            ...updated[deviceUUID],
            userData: {
              ...updated[deviceUUID].userData,
              webcamOn: true,
            },
          };
        }
        return updated;
      });
    }
  };

  const handleWebcamOff = (data) => {
    // Controlla se l'evento è per il commUUID corretto
    if (!check.isInComms()) {
      return;
    }

    if (data.commUUID === commUUID && data.commUUID === get.commUUID()) {
      // Aggiorna lo stato webcamOn per l'utente remoto in commData
      setCommData((prev) => {
        const updated = { ...prev };
        const deviceUUID = data.deviceUUID;

        if (updated[deviceUUID]) {
          updated[deviceUUID] = {
            ...updated[deviceUUID],
            userData: {
              ...updated[deviceUUID].userData,
              webcamOn: false,
            },
          };
        }
        return updated;
      });
    }
  };

  useEffect(() => {
    const loadCommData = async () => {
      try {
        setLoading(true);
        setCommData({});
        setActiveStreams({});

        if (commUUID) {
          const commData = await get.commData(commUUID);
          console.log("[VocalContent] Loaded commData:", commData);
          setCommData(commData || {});
          setActiveStreams(get.activeStreams() || {});
        }
      } catch (err) {
        console.error("Error loading messages:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadCommData();

    eventEmitter.getEmitter().on("comms_join", handleMemberJoined);
    eventEmitter.getEmitter().on("comms_leave", handleMemberLeft);

    eventEmitter
      .getEmitter()
      .on("comms_screen_share_start", handleScreenShareStarted);
    eventEmitter
      .getEmitter()
      .on("comms_screen_share_stop", handleScreenShareStopped);

    eventEmitter.getEmitter().on("comms_speaking", handleStartedSpeaking);
    eventEmitter.getEmitter().on("comms_not_speaking", handleStoppedSpeaking);

    eventEmitter.getEmitter().on("comms_webcam_on", handleWebcamOn);
    eventEmitter.getEmitter().on("comms_webcam_off", handleWebcamOff);

    eventEmitter.getEmitter().on("ui_update", handleStreamUpdate);
    return () => {
      eventEmitter.getEmitter().off("comms_join", handleMemberJoined);
      eventEmitter.getEmitter().off("comms_leave", handleMemberLeft);

      eventEmitter
        .getEmitter()
        .off("comms_screen_share_start", handleScreenShareStarted);
      eventEmitter
        .getEmitter()
        .off("comms_screen_share_stop", handleScreenShareStopped);

      eventEmitter.getEmitter().off("comms_speaking", handleStartedSpeaking);
      eventEmitter.getEmitter().off("comms_not_speaking", handleStoppedSpeaking);

      eventEmitter.getEmitter().off("comms_webcam_on", handleWebcamOn);
      eventEmitter.getEmitter().off("comms_webcam_off", handleWebcamOff);

      eventEmitter.getEmitter().off("ui_update", handleStreamUpdate);
    };
  }, [commUUID]);

  useEffect(() => {
    // Set commsData to WebRTC whenever it changes
    WebRTC.setCommData(commData);
  }, [commData]);

  return { commUUID, commData, activeStreams, loading, error };
};

export default useCommData;

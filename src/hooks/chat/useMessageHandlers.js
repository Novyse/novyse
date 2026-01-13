import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Alert, Platform } from "react-native";
import queueManager from "@/src/utils/chat/queueManager.js";

const useMessageHandlers = (
  chat,
  selectedChatUUID,
  setSelectedChatUUID,
  setMessages,
  setNewMessageText,
  setVoiceMessage,
  setIsMicClicked,
  sheetIndex,
  myUUID
) => {
  const handleSendMediaMessage = useCallback(
    async (files, chatUUID) => {
      await handleSendFileMessage(files, chatUUID);
    },
    [
      chat,
      setSelectedChatUUID,
      setMessages,
      setNewMessageText,
      setVoiceMessage,
      setIsMicClicked,
    ]
  );

  const pickMedia = useCallback(async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }
    }
    try{
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images','videos','livePhotos'], // livePhotos only on iOS
          allowsMultipleSelection: true,
          quality: 1,
        });


        if (!result.canceled) {
          await handleSendMediaMessage(result.assets, chat.uuid);
        }
      }catch(error){
      console.info("Error picking media:", error);
    }

    _closeFileMenu();
  }, [chat, selectedChatUUID, setSelectedChatUUID, handleSendMediaMessage]);

  const handleSendFileMessage = useCallback(
    async (files, chatUUID) => {
      if (!files || !chatUUID) return;

      const cleanedFiles = files.map((file) => ({
        uri: file.uri,
        name: file.name || file.fileName || "novyse_file_"+Date.now(),
        mimeType:
          file.mimeType && file.mimeType !== ""
            ? file.mimeType
            : "application/octet-stream",
        size: file.size,
      }));

      console.log("Cleaned files to send:", cleanedFiles, files);

      const message = {
        senderUUID: myUUID,
        content: "",
        type: "message",
        files: cleanedFiles,
      };

      await queueManager.addOutgoingMessageJob(message, chat);
    },
    [chat, myUUID]
  );

  const pickFile = useCallback(async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (!result.canceled) {
      await handleSendFileMessage(result.assets, chat.uuid);
    }

    _closeFileMenu();
  }, [chat, selectedChatUUID, setSelectedChatUUID, handleSendFileMessage]);

  const handleSendMessage = useCallback(
    async (type = "message", content, files = []) => {
      // no content and files, so nothing happens
      if (content.trim() === "" && files.length === 0) return;

      /*
      // If chat is pending creation, remove chat.uuid and put it as job uuid
      if (chat.pendingCreation){
        const id = chat.uuid;
        chat.uuid = null;
        await queueManager.addOutgoingMessageJob(message,chat,id);
        return;
      }
      */
      const message = {
        senderUUID: myUUID,
        content,
        type,
        files,
      };

      await queueManager.addOutgoingMessageJob(message, chat);

      // let currentChatUUID = chat.uuid;

      // if (!chat.uuid) {
      //   const response = await gateway.chat.create(
      //     "DM",
      //     chat.member,
      //     null,
      //     null
      //   );
      //   const success = response.success;
      //   const newChat = response.chat;
      //   if (success) {
      //     newChat.name = newChat.members[0].name;
      //     console.log("Chat created successfully:", newChat);
      //     await eventEmitter.newChat(newChat);
      //     setSelectedChatUUID(newChat.uuid);
      //     currentChatUUID = newChat.uuid;
      //   } else {
      //     console.error("Failed to create chat");
      //     return;
      //   }
      // }

      // await queueManager.addJob("send", {
      //   chatUUID: currentChatUUID,
      //   content,
      //   senderUUID: myUUID,
      //   type,
      //   files,
      // });

      setNewMessageText("");
      setVoiceMessage(true);
      setIsMicClicked(false);
    },
    [
      chat,
      setSelectedChatUUID,
      setMessages,
      setNewMessageText,
      setVoiceMessage,
      setIsMicClicked,
    ]
  );

  // const handleSendVoiceMessage = useCallback(
  //   async ({ uri }) => {
  //     if (!uri) return;

  //     // 1. Crea un oggetto messaggio FITTIZIO che rispecchia la struttura del DB
  //     const mockVoiceMessage = {
  //       id: `temp_${Date.now()}`, // ID temporaneo
  //       uuid: `temp_${Date.now()}`,
  //       chat_uuid: chat.uuid,
  //       senderUUID: myUUID, // Usa l'UUID reale dell'utente
  //       text: "", // I messaggi vocali spesso non hanno testo
  //       type: "audio", // Importante per MessageBase
  //       created_at: new Date().toISOString(),
  //       attachments: [
  //         {
  //           type: "audio",
  //           uri: uri, // L'URI locale del file registrato
  //         },
  //       ],
  //       sender_name: "Me (Local)", // Placeholder
  //     };

  //     console.log("Adding mock voice message to list:", mockVoiceMessage);

  //     // 2. Aggiorna lo stato locale immediatamente (Optimistic Update)
  //     setMessages((currentMessages) => [mockVoiceMessage, ...currentMessages]);

  //     // NOTA: Qui normalmente faresti la chiamata API: await gateway.message.send(...)

  //     // Reset stati UI se necessario
  //     setVoiceMessage(true);
  //     setIsMicClicked(false);
  //   },
  //   [chat.uuid, myUUID, setMessages, setVoiceMessage, setIsMicClicked]
  // );

  const handleTextChanging = useCallback(
    (text, isMicClicked) => {
      setVoiceMessage(text.length === 0 && !isMicClicked);
    },
    [setVoiceMessage]
  );

  const handleMenuItemPress = useCallback(
    async (action) => {
      if (action === "Gallery") {
        await pickMedia();
        return;
      }
      if (action === "File") {
        await pickFile();
        return;
      }
      _closeFileMenu();
    },
    [pickMedia, pickFile]
  );

  // // Listen for message sent events to update message IDs
  // useEffect(() => {
  //   const handleMessageSent = ({ tempId, message }) => {
  //     setMessages((currentMessages) => {
  //       // Remove any existing message with the same id as the new message
  //       const filteredMessages = currentMessages.filter(
  //         (msg) => msg.id !== message.id
  //       );
  //       // Then replace the tempId with the new message, setting only id and timestamp, rest undefined
  //       return filteredMessages.map((msg) =>
  //         msg.id === tempId
  //           ? { ...msg, id: message.id, created_at: message.created_at }
  //           : msg
  //       );
  //     });
  //   };

  //   const handleMessageUploading = ({ tempId, message }) => {
  //     setMessages((currentMessages) => {
  //       return currentMessages.map((msg) =>
  //         msg.id === tempId ? { ...message, id: message.messageUUID } : msg
  //       );
  //     });
  //   };

  //   eventEmitter.getEmitter().on("message:sent", handleMessageSent);
  //   eventEmitter.getEmitter().on("message:upload", handleMessageUploading);

  //   return () => {
  //     eventEmitter.getEmitter().off("message:sent", handleMessageSent);
  //     eventEmitter.getEmitter().off("message:upload", handleMessageUploading);
  //   };
  // }, [setMessages]);

  const _closeFileMenu = useCallback(() => {
    // Close menu after action
    if (Platform.OS === "web") {
      // Assumi setSheetIndex(-1) sia passato o gestito esternamente
    } else {
      // Assumi bottomSheetRef.current?.close() sia gestito esternamente
    }
  }, []);

  return {
    handleSendMessage,
    handleSendMediaMessage,
    pickMedia,
    pickFile,
    handleTextChanging,
    handleMenuItemPress,
  };
};

export default useMessageHandlers;

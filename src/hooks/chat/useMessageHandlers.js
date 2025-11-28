import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import gateway from "@/src/utils/backend-services/api-gateway.js";
import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";

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
  const handleSendImageMessage = useCallback(
    async (imageUri, chatUUID) => {
      if (!imageUri || !chatUUID) return;

      const { success, message } = await gateway.message.send(
        chatUUID,
        null,
        "image",
        { uri: imageUri }
      );

      if (success) {
        console.log("Image message sent successfully:", message);
        await eventEmitter.newMessage(message);
        setMessages((currentMessages) => {
          const exists = currentMessages.some((msg) => msg.id === message.id);
          if (!exists) {
            return [message, ...currentMessages];
          }
          return currentMessages;
        });
      } else {
        console.error("Failed to send image message");
        Alert.alert("Error", "Failed to send image");
      }
    },
    [setMessages]
  );

  const pickImage = useCallback(async () => {
    console.log("Starting to pick image");
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

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      let currentChatUUID = chat.uuid;

      if (!chat.uuid) {
        const response = await gateway.chat.create(
          "DM",
          chat.member,
          null,
          null
        );
        const success = response.success;
        const newChat = response.chat;
        if (success) {
          newChat.name = newChat.members[0].name;
          console.log("Chat created successfully:", newChat);
          await eventEmitter.newChat(newChat);
          setSelectedChatUUID(newChat.uuid);
          currentChatUUID = newChat.uuid;
        } else {
          console.error("Failed to create chat");
          Alert.alert("Error", "Failed to create chat");
          return;
        }
      }

      await handleSendImageMessage(imageUri, currentChatUUID);
    }

    // Close menu after action
    if (Platform.OS === "web") {
      // Assumi setSheetIndex(-1) sia passato o gestito esternamente
    } else {
      // Assumi bottomSheetRef.current?.close() sia gestito esternamente
    }
  }, [chat, selectedChatUUID, setSelectedChatUUID, handleSendImageMessage]);

  const handleSendMessage = useCallback(
    async (content, files = [], type) => {
      // type temporaneo
      // no text and files, so nothing happens
      if (content.trim() === "" && files.length === 0) return;

      let currentChatUUID = chat.uuid;

      if (!chat.uuid) {
        const response = await gateway.chat.create(
          "DM",
          chat.member,
          null,
          null
        );
        const success = response.success;
        const newChat = response.chat;
        if (success) {
          newChat.name = newChat.members[0].name;
          console.log("Chat created successfully:", newChat);
          await eventEmitter.newChat(newChat);
          setSelectedChatUUID(newChat.uuid);
          currentChatUUID = newChat.uuid;
        } else {
          console.error("Failed to create chat");
          return;
        }
      }
      if (type === "audio") {
        const uri = files[0].uri;
        files[0].uri = undefined;
      }

      const { success, message } = await gateway.message.send(
        currentChatUUID,
        content,
        "message",
        files
      );
      if (success) {
        console.log("Message sent successfully:", message);
        if (type === "audio") {
          message.type = "audio";
          message.attachments = [
            {
              type: "audio",
              uri: uri,
            },
          ];
        }
        await eventEmitter.newMessage(message);
        setMessages((currentMessages) => {
          const exists = currentMessages.some((msg) => msg.id === message.id);
          if (!exists) {
            return [message, ...currentMessages];
          }
          return currentMessages;
        });
      } else {
        console.error("Failed to send message");
      }

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
      // Assumi setNewMessageText sia chiamata esternamente, qui solo logica
      setVoiceMessage(text.length === 0 && !isMicClicked);
    },
    [setVoiceMessage]
  );

  const handleMenuItemPress = useCallback(
    async (action) => {
      console.log("Menu item pressed:", action);
      if (action === "Gallery") {
        await pickImage();
        return;
      }
      console.log(`Action: ${action}`);
      // Close menu logic handled externally
    },
    [pickImage]
  );

  return {
    handleSendMessage,
    handleSendImageMessage,
    pickImage,
    handleTextChanging,
    handleMenuItemPress,
  };
};

export default useMessageHandlers;

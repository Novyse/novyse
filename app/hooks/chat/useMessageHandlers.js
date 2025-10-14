import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import gateway from "@/app/utils/backend-services/api-gateway.js";
import eventEmitter from "@/app/utils/global/Events/EventEmitter.js";

const useMessageHandlers = (
  chat,
  selectedChatUUID,
  setSelectedChatUUID,
  setMessages,
  setNewMessageText,
  setVoiceMessage,
  setIsMicClicked,
  sheetIndex
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
    async (text) => {
      if (text.trim() === "") return;

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

      const { success, message } = await gateway.message.send(
        currentChatUUID,
        text,
        "text"
      );
      if (success) {
        console.log("Message sent successfully:", message);
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

  const handleVoiceMessage = useCallback(() => {
    console.log("Voice message button pressed");
    setIsMicClicked(true);
    setVoiceMessage(false);
  }, [setIsMicClicked, setVoiceMessage]);

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
    handleVoiceMessage,
    handleTextChanging,
    handleMenuItemPress,
  };
};

export default useMessageHandlers;

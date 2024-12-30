// ChatContent.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ChatContent = ({ chatId, userHandle, lastMessage, dateTime, onBack }) => {
  return (
    <View>
      <Text>Last message: {lastMessage}</Text>
      <Text>Sent at: {dateTime}</Text>
      {/* Your chat content rendering */}
      <TouchableOpacity onPress={onBack}>
        <Text>Back to Chat List</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChatContent;
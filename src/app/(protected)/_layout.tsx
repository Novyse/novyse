import React from "react";
import { Stack } from "expo-router";

import { AudioProvider } from "@/context/AudioContext";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { ChatProvider } from "@/context/ChatContext";
import { LocalUserProvider } from "@/context/LocalUserContext";
import { NetworkProvider } from "@/context/NetworkContext";

import SetupGlobalEventReceiver from "@/src/utils/global/Events/EventReceiver";

export default function ProtectedLayout() {
  SetupGlobalEventReceiver();

  return (
    <AudioProvider>
      <AudioPlayerProvider>
        <ChatProvider>
          <LocalUserProvider>
            <NetworkProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="app" />
              </Stack>
            </NetworkProvider>
          </LocalUserProvider>
        </ChatProvider>
      </AudioPlayerProvider>
    </AudioProvider>
  );
}

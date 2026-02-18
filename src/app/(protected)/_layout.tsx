import React from "react";
import { Stack } from "expo-router";

import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { ChatProvider } from "@/context/ChatContext";
import { CommsProvider } from "@/context/CommsContext";
import { LocalUserProvider } from "@/context/LocalUserContext";
import { NetworkProvider } from "@/context/NetworkContext";

import SetupGlobalEventReceiver from "@/src/utils/global/Events/EventReceiver";

export default function ProtectedLayout() {
  SetupGlobalEventReceiver();

  return (
    <AudioPlayerProvider>
      <ChatProvider>
        <CommsProvider>
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
        </CommsProvider>
      </ChatProvider>
    </AudioPlayerProvider>
  );
}

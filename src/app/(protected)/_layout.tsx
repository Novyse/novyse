import React, { useState } from "react";
import { Stack } from "expo-router";

import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { ChatProvider } from "@/context/ChatContext";
import { CommsProvider } from "@/context/CommsContext";
import { LocalUserProvider } from "@/context/LocalUserContext";
import { NetworkProvider } from "@/context/NetworkContext";

import { getPlatform } from "@/src/utils/device/type";

import SetupGlobalEventReceiver from "@/src/utils/global/Events/EventReceiver";
import SocketIO from "@/src/utils/backend-services/socket-io";
import database from "@/src/utils/storage/database";

import ErrorPage from "@/src/pages/ErrorPage";

function ProtectedContent() {
  SetupGlobalEventReceiver();
  SocketIO.open();

  if (getPlatform() === "mobile") {
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
  }

  const db = useSQLiteContext();
  database.setDb(db);

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

export default function ProtectedLayout() {
  // Manages SQLite errors in the app
  const [sqliteError, setSqliteError] = useState(false);
  if (sqliteError) {
    return <ErrorPage />;
  }

  return (
    <SQLiteProvider
      databaseName="novyse"
      onError={(e) => {
        setSqliteError(true);
      }}
    >
      <ProtectedContent />
    </SQLiteProvider>
  );
}

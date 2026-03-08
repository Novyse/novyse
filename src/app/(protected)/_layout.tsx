import React, { useEffect, useState } from "react";
import { Slot } from "expo-router";

import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { ChatProvider } from "@/context/ActiveChatContext";
import { CommsProvider } from "@/context/CommsContext";
import { LocalUserProvider } from "@/context/LocalUserContext";
import { NetworkProvider } from "@/context/NetworkContext";

import { getPlatform } from "@/src/utils/device/type";

import SetupGlobalEventReceiver from "@/src/utils/global/Events/EventReceiver";
import SocketIO from "@/src/utils/backend-services/socket-io";
import database from "@/src/utils/storage/database";

import ErrorPage from "@/src/components/pages/ErrorPage";

function ProtectedContent() {
  // Init and set database instance
  const db = useSQLiteContext();
  database.setDb(db);

  // Global event emitter receiver
  SetupGlobalEventReceiver();

  // Open SocketIO
  useEffect(() => {
    SocketIO.open();
  }, [SocketIO]);

  // Init livekit module for android/ios
  if (getPlatform() === "mobile") {
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
  }

  return (
    <AudioPlayerProvider>
      <ChatProvider>
        <CommsProvider>
          <LocalUserProvider>
            <NetworkProvider>
              <Slot />
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

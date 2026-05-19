import React, { useEffect, useState } from "react";
import { Slot } from "expo-router";
import { tabNavigator } from "@/src/utils/navigation/tabRef";

import { BRANCH } from "@/app.config";

import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";

import { AudioPlayerProvider } from "@/src/context/AudioPlayerContext";

import { ShareIntentProvider } from "expo-share-intent";

import { CommsProvider } from "@/src/context/CommsContext";
import useNetworkStore from "@/src/context/NetworkContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import Platform from "@/src/utils/device/type";

import SetupGlobalEventReceiver from "@/src/utils/global/Events/EventReceiver";
import SocketIO from "@/src/utils/backend-services/socket-io";
import database from "@/src/utils/storage/database";

import ErrorPage from "@/src/components/pages/ErrorPage";

function ProtectedContent() {
  let db = null;
  switch (Platform) {
    case "desktop":
      db = new DesktopSQLiteAdapter();
      break;
    case "mobile":
    case "web":
      db = useSQLiteContext();
  }

  const initNetwork = useNetworkStore((state: any) => state.init);
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  SetupGlobalEventReceiver();

  // Init and set database instance & global event receiver
  useEffect(() => {
    initNetwork();
    if (db) {
      database.setDb(db);
    }
  }, [db, initNetwork]);

  // Open SocketIO
  useEffect(() => {
    SocketIO.open();
  }, [SocketIO]);

  // Init livekit module for android/ios
  if (Platform === "mobile") {
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
  }

  return (
    <ShareIntentProvider
      options={{
        debug: BRANCH === "development",
        resetOnBackground: true,
        onResetShareIntent: () => {
          setSelectedChatUUID(null);
          tabNavigator.navigate("ChatList");
        },
      }}
    >
      <AudioPlayerProvider>
        <CommsProvider>
          <Slot />
        </CommsProvider>
      </AudioPlayerProvider>
    </ShareIntentProvider>
  );
}

export default function ProtectedLayout() {
  // Manages SQLite errors in the app
  const [sqliteError, setSqliteError] = useState(false);
  if (sqliteError) {
    return <ErrorPage />;
  }

  if (Platform === "desktop") {
    return <ProtectedContent />;
  }

  return (
    <SQLiteProvider
      databaseName="novyse"
      onError={(e) => {
        // Defer state update to avoid "update during render" error
        setTimeout(() => setSqliteError(true), 0);
      }}
    >
      <ProtectedContent />
    </SQLiteProvider>
  );
}

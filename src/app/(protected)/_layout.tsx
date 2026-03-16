import React, { useEffect, useState } from "react";
import { Slot } from "expo-router";

import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";

import { CommsProvider } from "@/context/CommsContext";
import useNetworkStore from "@/context/NetworkContext";

import { getPlatform } from "@/src/utils/device/type";

import SetupGlobalEventReceiver from "@/src/utils/global/Events/EventReceiver";
import SocketIO from "@/src/utils/backend-services/socket-io";
import database from "@/src/utils/storage/database";

import ErrorPage from "@/src/components/pages/ErrorPage";

function ProtectedContent() {
  const db = useSQLiteContext();
  const initNetwork = useNetworkStore((state: any) => state.init);
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
  if (getPlatform() === "mobile") {
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
  }

  return (
    <AudioPlayerProvider>
      
        <CommsProvider>
            <Slot />
        </CommsProvider>
      
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
        // Defer state update to avoid "update during render" error
        setTimeout(() => setSqliteError(true), 0);
      }}
    >
      <ProtectedContent />
    </SQLiteProvider>
  );
}

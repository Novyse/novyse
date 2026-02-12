import React, { useState } from "react";
import { Stack } from "expo-router";

import { KeyboardProvider } from "react-native-keyboard-controller";

import { ScreenProvider } from "@/context/ScreenContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import { useSQLiteContext, SQLiteProvider } from "expo-sqlite";
import database from "@/src/utils/storage/database";

import ErrorPage from "@/src/pages/ErrorPage";

function RootLayoutContent() {
  const { isLoggedIn } = useAuth();

  const db = useSQLiteContext();
  database.setDb(db);

  return (
    <KeyboardProvider>
      <ScreenProvider>
        <ThemeProvider>
          <LanguageProvider>
            <Stack>
              <Stack.Protected guard={isLoggedIn}>
                <Stack.Screen
                  name="(protected)"
                  options={{ headerShown: false }}
                />
              </Stack.Protected>
              <Stack.Protected guard={!isLoggedIn}>
                <Stack.Screen
                  name="(welcome)"
                  options={{ headerShown: false }}
                />
              </Stack.Protected>
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
          </LanguageProvider>
        </ThemeProvider>
      </ScreenProvider>
    </KeyboardProvider>
  );
}

export default function RootLayout() {
  // Manages SQLite errors in the app
  const [sqliteError, setSqliteError] = useState(false);
  if (sqliteError) {
    return <ErrorPage />;
  }

  return (
    <AuthProvider>
      <SQLiteProvider
        databaseName="novyse"
        onError={(e) => {
          setSqliteError(true);
        }}
      >
        <RootLayoutContent />
      </SQLiteProvider>
    </AuthProvider>
  );
}

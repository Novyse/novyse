import React, { useRef, useState, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Struttura compatibile con expo-document-picker / expo-image-picker.
 * `uri` è un blob URL utilizzabile ovunque ci si aspetti un URI in RN web.
 */
export interface DroppedFile {
  uri: string;      // blob URL — es. "blob:http://localhost:8081/abc-123"
  name: string;
  size: number;
  mimeType: string;
  file: File;       // oggetto File nativo, utile per FormData / upload diretti
}

interface WebDropZoneProps {
  onFilesDropped: (files: DroppedFile[]) => void;
  accept?: string;
  style?: import("react-native").ViewStyle;
  children?: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types).includes("Files");
}

function filterFiles(fileList: FileList, accept?: string): File[] {
  const files = Array.from(fileList);
  if (!accept) return files;

  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return files.filter((file) =>
    tokens.some((token) => {
      if (token.endsWith("/*")) {
        return file.type.startsWith(token.replace("/*", "/"));
      }
      if (token.startsWith(".")) {
        return file.name.toLowerCase().endsWith(token);
      }
      return file.type === token;
    }),
  );
}

/** Converte un File nativo in DroppedFile con blob URI. */
function toDroppedFile(file: File): DroppedFile {
  return {
    uri: URL.createObjectURL(file), // <-- questo è l'uri che mancava
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    file,
  };
}

// ─── Mobile: no-op ───────────────────────────────────────────────────────────

const WebDropZoneNoop: React.FC<WebDropZoneProps> = () => null;

// ─── Web component ────────────────────────────────────────────────────────────

const WebDropZoneWeb: React.FC<WebDropZoneProps> = ({
  onFilesDropped,
  accept,
  style,
  children,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);
  const attachedRef = useRef<boolean>(false);

  const handleWindowDragEnter = useCallback((e: DragEvent): void => {
    if (!hasFiles(e.dataTransfer)) return;
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDraggingOver(true);
  }, []);

  const handleWindowDragLeave = useCallback((e: DragEvent): void => {
    if (!hasFiles(e.dataTransfer)) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  }, []);

  const handleWindowDragOver = useCallback((e: DragEvent): void => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleWindowDrop = useCallback(
    (e: DragEvent): void => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      if (!e.dataTransfer?.files) return;

      const filtered = filterFiles(e.dataTransfer.files, accept);
      if (filtered.length === 0) return;

      // Converti ogni File in DroppedFile con blob URI
      const droppedFiles: DroppedFile[] = filtered.map(toDroppedFile);
      onFilesDropped(droppedFiles);
    },
    [accept, onFilesDropped],
  );

  const attachListeners = useCallback((): void => {
    if (attachedRef.current) return;
    attachedRef.current = true;
    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
  }, [
    handleWindowDragEnter,
    handleWindowDragLeave,
    handleWindowDragOver,
    handleWindowDrop,
  ]);

  const detachListeners = useCallback((): void => {
    if (!attachedRef.current) return;
    attachedRef.current = false;
    window.removeEventListener("dragenter", handleWindowDragEnter);
    window.removeEventListener("dragleave", handleWindowDragLeave);
    window.removeEventListener("dragover", handleWindowDragOver);
    window.removeEventListener("drop", handleWindowDrop);
  }, [
    handleWindowDragEnter,
    handleWindowDragLeave,
    handleWindowDragOver,
    handleWindowDrop,
  ]);

  const containerRef = useCallback(
    (node: View | null): void => {
      if (node) {
        attachListeners();
      } else {
        detachListeners();
      }
    },
    [attachListeners, detachListeners],
  );

  return (
    <View
      ref={containerRef}
      pointerEvents={isDraggingOver ? "auto" : "none"}
      style={[styles.overlay, style]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
    zIndex: 999,
  },
});

// ─── Single export ────────────────────────────────────────────────────────────

const WebDropZone: React.FC<WebDropZoneProps> =
  Platform.OS === "web" ? WebDropZoneWeb : WebDropZoneNoop;

export default WebDropZone;
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Platform from "@/src/utils/device/type";
import MessageText from "./MessageText";
import MessageTimestamp from "./MessageTimestamp";

const META_GAP = 8;
const LINE_HEIGHT = 20;
const FONT_SIZE = 15;
const PAD = 10;

const isWebLike = Platform === "web" || Platform === "desktop";

const plainForMeasure = (markdown) =>
  String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]+/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .trim();

/**
 * WhatsApp / Telegram trick (web):
 * invisible inline-block in the last text node so meta shares the last line
 * when there is room, otherwise wraps (phantom line). Visible meta is absolute.
 */
const ensureWebSpacer = (host, widthPx) => {
  if (!host || typeof document === "undefined") return;
  const width = Math.max(1, Math.ceil(widthPx));

  let spacer = host.querySelector("[data-msg-meta-spacer]");
  if (!spacer) {
    spacer = document.createElement("span");
    spacer.setAttribute("data-msg-meta-spacer", "1");
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.display = "inline-block";
    spacer.style.height = "1.2em";
    spacer.style.verticalAlign = "bottom";
    spacer.style.pointerEvents = "none";
    spacer.style.userSelect = "none";
    spacer.style.marginInlineStart = `${META_GAP}px`;
  }

  spacer.style.setProperty("width", `${width}px`, "important");
  spacer.style.setProperty("max-width", `${width}px`, "important");
  spacer.style.setProperty("min-width", `${width}px`, "important");

  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let lastText = null;
  let node = walker.nextNode();
  while (node) {
    if ((node.textContent || "").replace(/\s/g, "").length > 0) {
      lastText = node;
    }
    node = walker.nextNode();
  }

  const target = lastText?.parentElement || host;
  if (spacer.parentElement !== target) {
    target.appendChild(spacer);
  }
};

/**
 * Native: measure at the bubble's MAX width (80% of screen), never at the
 * shrink-wrapped width. Otherwise "a\\na" looks like two "full" lines, we drop
 * the timestamp reserve, and overflow:hidden clips the clock.
 * Same rule for 1 or N lines: if the longest line + meta fits in max width,
 * grow the bubble and reserve the right; if text already spans max width,
 * full-bleed text and a phantom line only when the last line has no room.
 */
const MessageTextWithMeta = ({
  message,
  textContent,
  onReply,
  isSelected,
  highlightedRange,
  onTaskListItemPress,
  createdAt,
  isSender,
  hasBeenRead,
  isEdited,
  isPendingEdit,
  isPinned,
  replyCount,
  fillWidth = false,
}) => {
  const textHostRef = useRef(null);
  const metaRef = useRef({ w: 72, h: 18 });
  const settledRef = useRef(false);
  const linesRef = useRef([]);
  const { width: windowW } = useWindowDimensions();
  const maxBubbleW = Math.floor(windowW * 0.8);
  const measureCap = Math.max(80, maxBubbleW - PAD * 2);

  const [padBottom, setPadBottom] = useState(0);
  const [inlineReserve, setInlineReserve] = useState(!isWebLike && !fillWidth);
  const [metaW, setMetaW] = useState(72);
  const [minWidth, setMinWidth] = useState(undefined);

  const contentKey = `${textContent}|${fillWidth}|${isEdited}|${isPinned}|${replyCount}|${hasBeenRead}|${isPendingEdit}`;

  useEffect(() => {
    if (isWebLike) return;
    settledRef.current = false;
    setPadBottom(0);
    setInlineReserve(!fillWidth);
    setMinWidth(undefined);
  }, [contentKey, fillWidth]);

  const applyNativeLayout = useCallback(
    (lines) => {
      if (isWebLike || settledRef.current) return;
      if (lines?.length) linesRef.current = lines;
      const used = linesRef.current;
      if (!used.length) return;
      const { w: mW, h: mH } = metaRef.current;
      if (mW <= 0) return;

      const maxLineW = Math.max(...used.map((l) => l.width || 0));
      const lastLineW = used[used.length - 1].width || 0;
      const needed = Math.ceil(maxLineW + META_GAP + mW + PAD * 2);
      const narrow = !fillWidth && needed <= maxBubbleW;

      settledRef.current = true;

      if (narrow) {
        // "ciao" or "a\\na": bubble grows to text + timestamp, same line as last text.
        setMinWidth(needed);
        setInlineReserve(true);
        setPadBottom(0);
        return;
      }

      setMinWidth(undefined);
      setInlineReserve(false);
      const fits = lastLineW + META_GAP + mW <= measureCap;
      setPadBottom(fits ? 0 : Math.ceil(mH));
    },
    [fillWidth, maxBubbleW, measureCap],
  );

  const syncWebSpacer = useCallback(() => {
    if (!isWebLike) return;
    const host = textHostRef.current;
    if (!host) return;
    ensureWebSpacer(host, metaRef.current.w);
  }, []);

  useLayoutEffect(() => {
    if (!isWebLike) return;
    syncWebSpacer();
  }, [
    syncWebSpacer,
    textContent,
    metaW,
    isEdited,
    isPinned,
    replyCount,
    hasBeenRead,
    fillWidth,
  ]);

  useEffect(() => {
    if (!isWebLike) return;
    if (fillWidth) {
      setMinWidth((prev) => (prev !== undefined ? undefined : prev));
      return;
    }
    const host = textHostRef.current;
    if (!host) return;

    const id = requestAnimationFrame(() => {
      try {
        const spacer = host.querySelector("[data-msg-meta-spacer]");
        if (!spacer) return;
        const hostTop = host.getBoundingClientRect().top;
        const spacerRect = spacer.getBoundingClientRect();
        const onFirstLine = spacerRect.top - hostTop < LINE_HEIGHT * 1.5;
        if (!onFirstLine) {
          setMinWidth((prev) => (prev !== undefined ? undefined : prev));
          return;
        }
        const needed = Math.ceil(
          spacerRect.right - host.getBoundingClientRect().left + PAD * 2,
        );
        setMinWidth((prev) => (prev !== needed ? needed : prev));
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [textContent, metaW, fillWidth]);

  const plain = plainForMeasure(textContent);
  const reserve = metaRef.current.w + META_GAP;

  return (
    <View
      style={[
        styles.container,
        fillWidth && styles.containerFill,
        !isWebLike && padBottom > 0 && { paddingBottom: PAD + padBottom },
        minWidth != null && { minWidth },
      ]}
      onLayout={() => {
        if (isWebLike) requestAnimationFrame(syncWebSpacer);
      }}
    >
      <View
        ref={textHostRef}
        collapsable={false}
        style={[
          styles.textHost,
          !isWebLike && inlineReserve && { paddingRight: reserve },
        ]}
        onLayout={() => {
          if (isWebLike) requestAnimationFrame(syncWebSpacer);
        }}
      >
        <MessageText
          message={{ ...message, content: textContent }}
          onReply={onReply}
          isSelected={isSelected}
          highlightedRange={highlightedRange}
          onTaskListItemPress={onTaskListItemPress}
        />
      </View>

      {!isWebLike && plain.length > 0 && (
        <Text
          selectable={false}
          style={[styles.measurer, { width: measureCap }]}
          onTextLayout={(e) => applyNativeLayout(e.nativeEvent.lines || [])}
        >
          {plain}
        </Text>
      )}

      <View
        style={styles.meta}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          const next = { w: Math.ceil(width), h: Math.ceil(height) };
          if (next.w === metaRef.current.w && next.h === metaRef.current.h) {
            return;
          }
          metaRef.current = next;
          setMetaW(next.w);
          if (isWebLike) requestAnimationFrame(syncWebSpacer);
          else {
            settledRef.current = false;
            applyNativeLayout(linesRef.current);
          }
        }}
      >
        <MessageTimestamp
          time={createdAt}
          sent={isSender}
          receivedByAll={hasBeenRead}
          isEdited={isEdited}
          isPendingEdit={isPendingEdit}
          isPinned={isPinned}
          replyCount={replyCount}
          compact
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: PAD,
    paddingVertical: PAD,
    userSelect: "text",
  },
  containerFill: {
    alignSelf: "stretch",
    width: "100%",
  },
  textHost: {
    maxWidth: "100%",
  },
  measurer: {
    position: "absolute",
    opacity: 0,
    left: PAD,
    top: 0,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    zIndex: -1,
    includeFontPadding: false,
    pointerEvents: "none"
  },
  meta: {
    position: "absolute",
    right: PAD,
    bottom: PAD,
  },
});

export default MessageTextWithMeta;

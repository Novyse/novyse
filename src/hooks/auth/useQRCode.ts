import { useState, useEffect, useCallback, useRef } from "react";
import auth from "@/src/utils/backend-services/auth";

/**
 * Custom hook to manage QR Code authentication state, polling, and auto-refresh.
 * @param isSmallScreen Whether the current device is a small screen (skips QR logic).
 * @param onAuthorized Callback triggered when the QR code is authorized.
 */
export const useQRCode = (isSmallScreen: boolean, onAuthorized: (data: any) => void) => {
  const [qrToken, setQrToken] = useState<string>("");
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQrToken = useCallback(async () => {
    if (isSmallScreen) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await auth.qrcode.new();
      if (res.success) {
        setQrToken(res.data.token);
        
        // Calculate remaining time in seconds based on expiresAt timestamp
        const now = Date.now();
        const expiresAt = res.data.expiresAt;
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setRemainingTime(diff);
      } else {
        throw new Error(res.error || "Failed to generate QR token");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("QR Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSmallScreen]);

  // Start/Stop Polling
  useEffect(() => {
    if (!qrToken || isSmallScreen) return;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await auth.qrcode.status(qrToken);
        if (res.success && res.data.status === "AUTHORIZED") {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          onAuthorized(res.data);
        } else if (!res.success) {
            // If status check fails (e.g. token invalid/deleted), refresh
            fetchQrToken();
        }
      } catch (err) {
        console.error("Polling check failed:", err);
      }
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [qrToken, isSmallScreen, onAuthorized, fetchQrToken]);

  // Countdown and Auto-Refresh
  useEffect(() => {
    if (remainingTime > 0) {
      expiryTimerRef.current = setTimeout(() => {
        setRemainingTime((prev) => prev - 1);
      }, 1000);
    } else if (qrToken && !isSmallScreen && !isLoading) {
      // Token expired, fetch a new one
      fetchQrToken();
    }

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [remainingTime, qrToken, isSmallScreen, fetchQrToken, isLoading]);

  // Initial fetch on mount
  useEffect(() => {
    fetchQrToken();
  }, [fetchQrToken]);

  return {
    qrToken,
    remainingTime,
    isLoading,
    error,
    refresh: fetchQrToken
  };
};

export default useQRCode;

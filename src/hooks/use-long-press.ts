"use client";

import { useCallback, useRef, useState } from "react";

interface UseLongPressOptions {
  threshold?: number;
  moveTolerance?: number;
  onLongPress: (e?: React.PointerEvent | React.MouseEvent) => void;
  onClick?: (e?: React.MouseEvent) => void;
}

export function useLongPress({
  threshold = 500,
  moveTolerance = 10,
  onLongPress,
  onClick,
}: UseLongPressOptions) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle primary button (left click or touch)
      if (e.button !== 0) return;

      startPosRef.current = { x: e.clientX, y: e.clientY };
      isLongPressTriggeredRef.current = false;
      setIsPressing(true);

      clearTimer();
      timerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        setIsPressing(false);
        try {
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.(40);
          }
        } catch {
          // Ignore vibration errors if unsupported
        }
        onLongPress(e);
      }, threshold);
    },
    [clearTimer, onLongPress, threshold]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current) return;
      const deltaX = Math.abs(e.clientX - startPosRef.current.x);
      const deltaY = Math.abs(e.clientY - startPosRef.current.y);

      // If user moves beyond tolerance (e.g. scrolling), cancel hold
      if (deltaX > moveTolerance || deltaY > moveTolerance) {
        clearTimer();
      }
    },
    [clearTimer, moveTolerance]
  );

  const handlePointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handlePointerCancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressTriggeredRef.current = false;
        return;
      }
      onClick?.(e);
    },
    [onClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimer();
      onLongPress(e);
    },
    [clearTimer, onLongPress]
  );

  return {
    isPressing,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerCancel,
      onClick: handleClick,
      onContextMenu: handleContextMenu,
    },
  };
}

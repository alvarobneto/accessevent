import { useCallback, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

/** Touch callbacks to attach to the view that contains the interactive map. */
export type MapGestureTouchHandlers = {
  onTouchStart: () => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
  onTouchCancel: (event: GestureResponderEvent) => void;
};

/**
 * Suspend the native back-swipe recognizer while a finger is on the map.
 * Outside the map, the screen keeps the platform's normal back gesture.
 */
export function useMapGestureNavigation() {
  const [isMapTouchActive, setIsMapTouchActive] = useState(false);

  const onTouchStart = useCallback(() => {
    setIsMapTouchActive(true);
  }, []);

  const onTouchEnd = useCallback((event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length === 0) {
      setIsMapTouchActive(false);
    }
  }, []);

  const onTouchCancel = useCallback((event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length === 0) {
      setIsMapTouchActive(false);
    }
  }, []);

  return {
    isMapTouchActive,
    screenOptions: {
      gestureEnabled: !isMapTouchActive,
      // Keep iOS 26's full-screen pop recognizer out of the map hit-area. The
      // normal edge back gesture stays available while the map is untouched.
      fullScreenGestureEnabled: false,
    },
    touchHandlers: { onTouchStart, onTouchEnd, onTouchCancel } satisfies MapGestureTouchHandlers,
  };
}

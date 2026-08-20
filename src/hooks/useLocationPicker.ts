import {useState, useRef, useCallback} from 'react';
import {Animated} from 'react-native';

/**
 * Encapsulates the animated floating location picker state and transitions.
 */
export function useLocationPicker() {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const openPicker = useCallback(() => {
    setOpen(true);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [anim]);

  const closePicker = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  }, [anim]);

  return {pickerOpen: open, pickerAnim: anim, openPicker, closePicker};
}

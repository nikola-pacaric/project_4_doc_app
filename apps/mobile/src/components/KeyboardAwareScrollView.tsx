import { spacing } from '@project4/ui-tokens';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  Keyboard,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

type KeyboardAwareScrollContextValue = {
  onInputFocus: () => void;
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(null);

export function useKeyboardAwareInput() {
  return useContext(KeyboardAwareScrollContext);
}

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: ReactNode;
}

export function KeyboardAwareScrollView({
  children,
  keyboardDismissMode = 'on-drag',
  keyboardShouldPersistTaps = 'handled',
  onScroll,
  scrollEventThrottle = 16,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  const scrollFocusedInputIntoView = useCallback(() => {
    const focusedInput = TextInput.State.currentlyFocusedInput?.();
    if (!focusedInput || keyboardHeightRef.current <= 0) return;

    focusedInput.measureInWindow((_x, y, _width, height) => {
      const keyboardTop = Dimensions.get('window').height - keyboardHeightRef.current;
      const bottomPadding = spacing.xl;
      const overlap = y + height + bottomPadding - keyboardTop;

      if (overlap > 0) {
        scrollRef.current?.scrollTo({
          animated: true,
          y: Math.max(0, scrollYRef.current + overlap),
        });
      }
    });
  }, []);

  const onInputFocus = useCallback(() => {
    globalThis.setTimeout(scrollFocusedInputIntoView, 80);
    globalThis.setTimeout(scrollFocusedInputIntoView, 280);
  }, [scrollFocusedInputIntoView]);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      globalThis.setTimeout(scrollFocusedInputIntoView, 60);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [scrollFocusedInputIntoView]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  }

  const contextValue = useMemo(() => ({ onInputFocus }), [onInputFocus]);

  return (
    <KeyboardAwareScrollContext.Provider value={contextValue}>
      <ScrollView
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onScroll={handleScroll}
        ref={scrollRef}
        scrollEventThrottle={scrollEventThrottle}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAwareScrollContext.Provider>
  );
}

import { spacing } from '@project4/ui-tokens';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  UIManager,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

type KeyboardAwareScrollContextValue = {
  onInputFocus: (target?: number | null) => void;
  onInputContentChange: () => void;
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
  contentContainerStyle,
  onScroll,
  scrollEventThrottle = 16,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const focusedInputTargetRef = useRef<number | null>(null);
  const keyboardOpenStartScrollYRef = useRef(0);
  const autoScrolledRef = useRef(false);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const scrollFocusedInputIntoView = useCallback(() => {
    const fallbackInput = TextInput.State.currentlyFocusedInput?.();
    const target =
      focusedInputTargetRef.current ?? (fallbackInput ? findNodeHandle(fallbackInput as never) : null);
    if (!target || keyboardHeightRef.current <= 0) return;

    const responder = scrollRef.current?.getScrollResponder?.();
    responder?.scrollResponderScrollNativeHandleToKeyboard?.(target, spacing.xl * 3, true);

    UIManager.measureInWindow(target, (_x, y, _width, height) => {
      const fallbackKeyboardTop = Dimensions.get('window').height - keyboardHeightRef.current;
      const keyboardTop = keyboardTopRef.current ?? fallbackKeyboardTop;
      const bottomPadding = spacing.xl;
      const overlap = y + height + bottomPadding - keyboardTop;

      if (overlap > 0) {
        autoScrolledRef.current = true;
        scrollRef.current?.scrollTo({
          animated: true,
          y: Math.max(0, scrollYRef.current + overlap + spacing.md),
        });
      }
    });
  }, []);

  const onInputFocus = useCallback((target?: number | null) => {
    focusedInputTargetRef.current = target ?? focusedInputTargetRef.current;
    globalThis.setTimeout(scrollFocusedInputIntoView, 80);
    globalThis.setTimeout(scrollFocusedInputIntoView, 280);
    globalThis.setTimeout(scrollFocusedInputIntoView, 520);
  }, [scrollFocusedInputIntoView]);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', (event) => {
      if (keyboardHeightRef.current <= 0) {
        keyboardOpenStartScrollYRef.current = scrollYRef.current;
      }
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardTopRef.current =
        event.endCoordinates.screenY > 0
          ? event.endCoordinates.screenY
          : Dimensions.get('window').height - event.endCoordinates.height;
      setKeyboardPadding(event.endCoordinates.height);
      globalThis.setTimeout(scrollFocusedInputIntoView, 60);
      globalThis.setTimeout(scrollFocusedInputIntoView, 220);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = null;
      focusedInputTargetRef.current = null;
      setKeyboardPadding(0);
      if (autoScrolledRef.current) {
        globalThis.setTimeout(() => {
          scrollRef.current?.scrollTo({
            animated: true,
            y: Math.max(0, keyboardOpenStartScrollYRef.current),
          });
          autoScrolledRef.current = false;
        }, 80);
      }
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

  const contextValue = useMemo(
    () => ({ onInputContentChange: scrollFocusedInputIntoView, onInputFocus }),
    [onInputFocus, scrollFocusedInputIntoView],
  );

  return (
    <KeyboardAwareScrollContext.Provider value={contextValue}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={contentContainerStyle}
          keyboardDismissMode={keyboardDismissMode}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          onScroll={handleScroll}
          ref={scrollRef}
          scrollEventThrottle={scrollEventThrottle}
          {...props}
        >
          {children}
          {keyboardPadding > 0 ? (
            <View
              pointerEvents="none"
              style={{ height: keyboardPadding + spacing.xl * 2 }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardAwareScrollContext.Provider>
  );
}

const styles = {
  flex: {
    flex: 1,
  },
};

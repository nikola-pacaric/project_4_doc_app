import { createContext, useContext } from 'react';

export type KeyboardAwareScrollContextValue = {
  onInputFocus: (target?: number | null) => void;
  onInputContentChange: () => void;
};

export const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(
  null,
);

export function useKeyboardAwareInput() {
  return useContext(KeyboardAwareScrollContext);
}

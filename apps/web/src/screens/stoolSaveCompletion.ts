interface StoolSaveCompletionOptions {
  onDone: () => void;
  onPersisted: () => void;
}

export function createStoolSaveCompletion({ onDone, onPersisted }: StoolSaveCompletionOptions) {
  return {
    done: onDone,
    persisted(showConfirmation: () => void) {
      showConfirmation();
      onPersisted();
    },
  };
}

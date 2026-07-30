interface HardwareBackSubscription {
  remove: () => void;
}

interface HardwareBackSource {
  addEventListener: (
    eventName: 'hardwareBackPress',
    listener: () => boolean,
  ) => HardwareBackSubscription;
}

export function registerPhotoUploadHardwareBack(
  source: HardwareBackSource,
  onBack: () => void,
): () => void {
  const subscription = source.addEventListener('hardwareBackPress', () => {
    onBack();
    return true;
  });

  return () => subscription.remove();
}

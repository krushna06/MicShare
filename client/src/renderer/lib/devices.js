const VB_CABLE_LABEL_PATTERN = /vb-audio|cable/i;

export function isVirtualCable(label) {
  return VB_CABLE_LABEL_PATTERN.test(label || '');
}

export async function unlockDeviceLabels() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export async function listAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    throw new Error('Audio device access is not available in this environment');
  }
  const raw = await navigator.mediaDevices.enumerateDevices();
  return raw
    .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
    .map((d) => ({
      deviceId: d.deviceId,
      kind: d.kind === 'audioinput' ? 'input' : 'output',
      label: d.label || '(unlabeled device)',
      groupId: d.groupId || null,
      isVirtualCable: isVirtualCable(d.label),
    }));
}

export function subscribeToDeviceChanges(callback) {
  if (!navigator.mediaDevices) return () => {};
  navigator.mediaDevices.addEventListener('devicechange', callback);
  return () => navigator.mediaDevices.removeEventListener('devicechange', callback);
}

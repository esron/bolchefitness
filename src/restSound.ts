let audio: AudioContext | null = null;

/** Call directly from the user's timer-start gesture to satisfy browser autoplay rules. */
export function enableRestSound(): void {
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
  } catch {
    // Audio is optional; the timer and its visual completion state still work.
  }
}

/** Play the approved 880 Hz, 290 ms beep three times. */
export function playRestSound(): void {
  if (!audio) return;
  const play = () => {
    if (!audio || audio.state !== 'running') return;
    const now = audio.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.42;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
      gain.gain.setValueAtTime(0.22, start + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.29);
    }
  };
  if (audio.state === 'running') play();
  else
    void audio
      .resume()
      .then(play)
      .catch(() => {});
}

export function vibrateRestComplete(): void {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.vibrate !== 'function' ||
    typeof document === 'undefined' ||
    document.visibilityState !== 'visible'
  )
    return;
  try {
    navigator.vibrate([180, 80, 180]);
  } catch {
    // Vibration is optional; the sound and visual completion state remain available.
  }
}

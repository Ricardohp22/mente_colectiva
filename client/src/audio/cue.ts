let context: AudioContext | null = null;

function getContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
  }

  return context;
}

function playTone(
  audio: AudioContext,
  frequency: number,
  when: number,
  duration: number,
): void {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.2, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.02);
}

export async function playWelcomeCue(): Promise<void> {
  const audio = getContext();

  if (audio.state === "suspended") {
    await audio.resume();
  }

  const now = audio.currentTime;
  playTone(audio, 523.25, now, 0.14);
  playTone(audio, 659.25, now + 0.1, 0.16);
  playTone(audio, 783.99, now + 0.2, 0.28);
}

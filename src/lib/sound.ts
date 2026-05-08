/**
 * Tiny Web Audio synth for in-app sounds.
 *
 * One sound effect for now — a soft two-note "ti-tu" played when a
 * chat message is sent successfully. Synthesised at runtime so we
 * don't ship an audio asset; works offline.
 *
 * The user can toggle this off — preference stored in localStorage
 * under `MSG_SOUND_KEY`. Default OFF (per modern chat-UX consensus —
 * premium apps don't ping by default).
 */

export const MSG_SOUND_KEY = "bhq:msg-sound";

export function isMsgSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MSG_SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMsgSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MSG_SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) return sharedCtx;
  try {
    const W = window as unknown as {
      AudioContext: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
    return sharedCtx;
  } catch {
    return null;
  }
}

/**
 * Play the "send" tone. Two short sine notes at 880 Hz then 1320 Hz
 * (5th up), each ~70ms with a quick attack + decay envelope. Total
 * duration ~140ms — quiet enough to be ambient, distinctive enough
 * to register as feedback.
 *
 * No-op if the user has muted it OR the browser blocks autoplay
 * (common pre-interaction). Wrapped in try/catch so audio failures
 * never throw into the calling component.
 */
export function playSendSound(): void {
  if (!isMsgSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    // Resume on first user gesture is required by some browsers.
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const notes: Array<{ freq: number; offset: number; dur: number }> = [
      { freq: 880, offset: 0, dur: 0.07 },
      { freq: 1320, offset: 0.06, dur: 0.09 },
    ];
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.06; // quiet — peaks around -24 dB
    masterGain.connect(ctx.destination);

    for (const { freq, offset, dur } of notes) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now + offset);
      env.gain.linearRampToValueAtTime(1, now + offset + 0.005);
      env.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.02);
    }
  } catch {
    /* ignore — never throw on audio */
  }
}

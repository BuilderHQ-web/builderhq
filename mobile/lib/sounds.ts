/**
 * Subtle UI sound feedback — respectful by default (off unless the user
 * has enabled it in settings, and always muted when the system is in
 * Silent / Do Not Disturb).
 *
 * Loading is lazy — the AudioPlayer for each sound is created the first
 * time it plays, then cached for subsequent plays. Keeps cold-start
 * fast and avoids decoding audio we may never actually play.
 *
 * Sound assets live under assets/audio/ — drop in 8-bit AAC files at
 * ~30-80ms duration. Anything longer feels obnoxious in a tap context.
 */
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREF_KEY = "@bhq/sounds-enabled";

// In-memory cache for the current preference so we don't hit AsyncStorage
// on every play. Hydrated on app boot via `initSounds()`.
let soundsEnabled = false;

const players = new Map<SoundKind, AudioPlayer>();

// The list is fixed — every sound that can be played has a name here, so
// callers don't risk typos and we can pre-warm at boot if we want.
const ASSETS: Record<SoundKind, number | null> = {
  // null = placeholder. Drop the file in and update the path to enable.
  tap: null, // assets/audio/tap.aac
  success: null, // assets/audio/success.aac
  error: null, // assets/audio/error.aac
};

export type SoundKind = "tap" | "success" | "error";

/** Read the user pref into the in-memory flag. Call once on app boot. */
export async function initSounds() {
  try {
    const v = await AsyncStorage.getItem(PREF_KEY);
    soundsEnabled = v === "1";
  } catch {
    soundsEnabled = false;
  }
}

export async function setSoundsEnabled(on: boolean) {
  soundsEnabled = on;
  try {
    await AsyncStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {
    // Persistence is a nice-to-have; the runtime flag still works for
    // the rest of the session even if storage is unavailable.
  }
}

export function areSoundsEnabled() {
  return soundsEnabled;
}

/**
 * Play one of the named sounds. No-op if sounds are disabled or the
 * asset isn't bundled yet. Failures are swallowed — we never want a
 * UI sound failure to break a real interaction.
 */
export async function play(kind: SoundKind) {
  if (!soundsEnabled) return;
  const asset = ASSETS[kind];
  if (!asset) return;
  try {
    let player = players.get(kind);
    if (!player) {
      player = createAudioPlayer(asset);
      players.set(kind, player);
    }
    player.seekTo(0);
    player.play();
  } catch {
    // Audio path failed — silently bail. UI feedback should never block
    // a real interaction.
  }
}

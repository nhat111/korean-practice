// Reads Korean text aloud with the browser's SpeechSynthesis (ko-KR).

import { useEffect, useState } from 'react';
import { audioKey, audioUrl, NATURAL_VOICES, type NaturalVoice } from './speaking/audioKey';
import { getPrefs } from './storage/prefs';

/** Pitch used for the "deep voice" option (approximates a male voice). */
const DEEP_PITCH = 0.7;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Korean voices installed on this device, ko-KR first. */
export function getKoreanVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ko'))
    .sort((a, b) => Number(b.lang === 'ko-KR') - Number(a.lang === 'ko-KR'));
}

// Last non-empty Korean voice list. Some engines (iOS) briefly return [] from
// getVoices(), which would empty the picker and silently fall back to the
// default voice.
let knownVoices: SpeechSynthesisVoice[] = [];

function availableKoreanVoices(): SpeechSynthesisVoice[] {
  const fresh = getKoreanVoices();
  if (fresh.length > 0) knownVoices = fresh;
  return knownVoices;
}

/** Korean voices, updated when the browser finishes loading its voice list. */
export function useKoreanVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(availableKoreanVoices);
  useEffect(() => {
    if (!isSpeechSupported()) return;
    const update = () => setVoices(availableKoreanVoices());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    update();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}

// Browsers don't expose a voice's gender; guess from well-known voice names.
const MALE_HINTS = ['male', '남성', 'injoon', 'hyunsu', 'minsu', 'jinho', 'bongjin', 'gookmin', 'jiwon', 'sangchul'];
const FEMALE_HINTS = ['female', '여성', 'sunhi', 'yuna', 'sora', 'jimin', 'seoyeon', 'heami', 'yujin', 'seohyeon', 'soonbok'];

export type VoiceGender = 'male' | 'female' | 'unknown';

export function guessGender(voice: SpeechSynthesisVoice): VoiceGender {
  const name = voice.name.toLowerCase();
  if (MALE_HINTS.some((h) => name.includes(h))) return 'male';
  if (FEMALE_HINTS.some((h) => name.includes(h))) return 'female';
  return 'unknown';
}

function pickVoice(voiceURI: string): SpeechSynthesisVoice | undefined {
  const voices = availableKoreanVoices();
  return (voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : undefined) ?? voices[0];
}

// Some browsers load voices asynchronously; touching getVoices() early helps.
if (isSpeechSupported()) {
  availableKoreanVoices();
  window.speechSynthesis.addEventListener('voiceschanged', availableKoreanVoices);
}

/**
 * Speaks `text` with the learner's chosen voice and speed (or the given rate).
 * Natural voices play pre-generated MP3s; when a sentence has no file (e.g.
 * AI-generated text) or playback fails, the device voice reads it instead.
 * Passing `voiceURI` forces that device voice (diagnostics). Resolves when
 * speech ends, fails or is cancelled.
 */
export function speakKorean(text: string, rate?: number, voiceURI?: string): Promise<void> {
  const prefs = getPrefs();
  const r = rate ?? prefs.speechRate;
  if (voiceURI === undefined && prefs.voiceSource !== 'device' && hasAudio(prefs.voiceSource, text)) {
    return playNatural(prefs.voiceSource, text, r).catch(() => speakDevice(text, r, prefs.voiceURI));
  }
  return speakDevice(text, r, voiceURI ?? prefs.voiceURI);
}

function speakDevice(text: string, rate: number, voiceURI: string): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  const synth = window.speechSynthesis;
  // iOS WebKit can drop the chosen voice (or the whole utterance) when speak()
  // follows cancel() on an idle synthesizer, so only cancel when busy.
  if (synth.speaking || synth.pending) synth.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = getPrefs().deepVoice ? DEEP_PITCH : 1;
    const voice = pickVoice(voiceURI);
    // Match lang to the voice: WebKit picks the default voice for `lang`
    // when the two disagree (e.g. "ko-KR" vs "ko_KR").
    utterance.lang = voice?.lang ?? 'ko-KR';
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

// Which sentences have a natural-voice file (written by scripts/tts.py).
// Until it loads (or if it fails) every sentence is tried, falling back on 404.
let audioIndex: Partial<Record<NaturalVoice, Set<string>>> | null = null;

function hasAudio(voice: NaturalVoice, text: string): boolean {
  return audioIndex === null || (audioIndex[voice]?.has(audioKey(text)) ?? false);
}

if (typeof window !== 'undefined') {
  fetch(`${import.meta.env.BASE_URL}data/audio-index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    .then((data) => {
      const voices = (data as { voices?: unknown } | null)?.voices;
      if (typeof voices !== 'object' || voices === null) return;
      const next: Partial<Record<NaturalVoice, Set<string>>> = {};
      for (const v of Object.keys(NATURAL_VOICES) as NaturalVoice[]) {
        const keys: unknown = (voices as Record<string, unknown>)[v];
        if (Array.isArray(keys)) next[v] = new Set(keys.filter((k): k is string => typeof k === 'string'));
      }
      audioIndex = next;
    })
    .catch(() => undefined);
}

// 50 ms of silence. Played on the first tap so iOS lets this element play
// later without a gesture (e.g. the client line in voice roleplay, or after
// the async fetch below).
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAABQAAAigAenp6enp6enp6enp6enp6enp6epubm5ubm5ubm5ubm5ubm5ubm5ubvb29vb29vb29vb29vb29vb29vb3e3t7e3t7e3t7e3t7e3t7e3t7e3v//////////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQEUAAAAAAAAAIoTTfS5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//M0xAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVV//M0xDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//M0xHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//M0xLEAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//M0xMQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

let player: HTMLAudioElement | null = null;
let playId = 0;

function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.src = SILENT_MP3;
    player.play().catch(() => undefined);
  }
  return player;
}

async function playNatural(voice: NaturalVoice, text: string, rate: number): Promise<void> {
  stopSpeaking();
  const id = playId;
  const audio = getPlayer();
  // fetch + blob (not audio.src = url) so the service worker can cache the
  // file for offline use without having to answer media range requests.
  const res = await fetch(audioUrl(voice, text));
  if (!res.ok) throw new Error(`audio ${res.status}`);
  const blob = await res.blob();
  if (id !== playId) return; // superseded or stopped meanwhile
  const url = URL.createObjectURL(blob);
  return new Promise<void>((resolve, reject) => {
    const done = (err?: unknown) => {
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onEnd);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(url);
      if (err === undefined) resolve();
      else reject(err);
    };
    const onEnd = () => done();
    const onError = () => done(new Error('audio playback failed'));
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onEnd);
    audio.addEventListener('error', onError);
    audio.src = url;
    audio.preservesPitch = true;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    audio.play().catch((e: unknown) => done(e ?? new Error('play failed')));
  });
}

export function stopSpeaking(): void {
  playId++;
  player?.pause();
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

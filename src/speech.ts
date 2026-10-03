// Reads Korean text aloud with the browser's SpeechSynthesis (ko-KR).

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function findKoreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ko-KR') ?? voices.find((v) => v.lang.toLowerCase().startsWith('ko'))
  );
}

// Some browsers load voices asynchronously; touching getVoices() early helps.
if (isSpeechSupported()) {
  window.speechSynthesis.getVoices();
}

export function speakKorean(text: string, rate = 0.9): void {
  if (!isSpeechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = rate;
  const voice = findKoreanVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

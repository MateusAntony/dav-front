export function useTTS() {
  const tts = useTtsStore();
  const { t } = useI18n();
  const voice = ref();
  const voicesReady = ref(false);

  const loadVoices = () => {
    return new Promise<void>((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesReady.value = true;
        resolve();
      } else {
        speechSynthesis.onvoiceschanged = () => {
          voicesReady.value = true;
          resolve();
        };
      }
    });
  };

  const configSpeech = (phrase: string) => {
    const voices = speechSynthesis.getVoices();
    voice.value = voices.find((v) => v.lang === 'pt-BR');
    const speech = useSpeechSynthesis(phrase, {
      voice,
      rate: tts.speech.rate,
    });
    return speech;
  };

  const speakPhrase = async (phrase: string) => {
    if (!voicesReady.value) await loadVoices();

    stopSpeaking();

    const speech = configSpeech(phrase);
    speech.speak();
    tts.addPhraseToHistory(phrase);
  };

  const updateTTSPreferences = (increase: boolean) => {
    tts.setRate(increase ? tts.speech.rate + 2 : tts.speech.rate - 2);
    speakPhrase(t('message.speech_rate_test', { rate: tts.speech.rate / 2 }));
  };

  const stopSpeaking = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
  };

  return {
    voicesReady,
    loadVoices,
    speakPhrase,
    updateTTSPreferences,
    stopSpeaking,
  };
}

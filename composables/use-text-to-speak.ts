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
      rate: tts.speech.rate/4, // Coloquei divido por 4 para funcionar no linux
    }); 
    return speech;
  };

  const toggleVoice = () => {
    tts.toggleEnabled();
    speakPhrase(
      t(tts.enabled ? 'message.voice_enabled' : 'message.voice_disabled'),
      true,
    );
  };

  const speakPhrase = async (phrase: string, force = false) => {
    if (!tts.enabled && !force) return;

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
    isVoiceEnabled: computed(() => tts.enabled),
    toggleVoice,
  };
}

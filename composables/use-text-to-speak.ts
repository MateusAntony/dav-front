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

  // Fala uma lista de frases em sequência, uma depois da outra, sem cortar
  // a anterior no meio (necessário para "ouvir tabela inteira"/"ouvir tudo").
  const speakSequence = async (phrases: string[], force = false) => {
    if (!tts.enabled && !force) return;
    if (!voicesReady.value) await loadVoices();

    stopSpeaking();

    const voices = speechSynthesis.getVoices();
    const selectedVoice = voices.find((v) => v.lang === 'pt-BR');

    return new Promise<void>((resolve) => {
      let index = 0;
      const speakNext = () => {
        if (index >= phrases.length) {
          resolve();
          return;
        }
        const phrase = phrases[index];
        index += 1;
        const utterance = new SpeechSynthesisUtterance(phrase);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = tts.speech.rate / 4;
        utterance.onend = speakNext;
        utterance.onerror = speakNext;
        tts.addPhraseToHistory(phrase);
        speechSynthesis.speak(utterance);
      };
      speakNext();
    });
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
    speakSequence,
    updateTTSPreferences,
    stopSpeaking,
    isVoiceEnabled: computed(() => tts.enabled),
    toggleVoice,
  };
}
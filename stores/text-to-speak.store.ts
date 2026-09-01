export type SpeechPreferences = {
  rate: number;
};

export const useTtsStore = defineStore('tts', {
  state: (): {
    speech: SpeechPreferences;
    history: string[];
    hasUserInteracted: boolean;
    enabled: boolean;
  } => ({
    speech: {
      rate: 4,
    },
    history: [],
    hasUserInteracted: false,
    enabled: true,
  }),
  actions: {
    addPhraseToHistory(phrase: string) {
      if (this.history.length === 50) {
        this.history.shift();
      }
      this.history.push(phrase);
    },
    setRate(rate: number) {
      this.speech.rate = rate <= 0 ? 2 : rate;
    },
    setUserInteracted() {
      this.hasUserInteracted = true;
    },
    setEnabled(enabled: boolean) {
      this.enabled = enabled;
    },
    toggleEnabled() {
      this.enabled = !this.enabled;
    },
  },
  persist: {
    paths: ['speech', 'enabled'],
  },
});
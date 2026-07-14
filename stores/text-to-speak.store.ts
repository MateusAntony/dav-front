export type SpeechPreferences = {
  rate: number;
};

export const useTtsStore = defineStore('tts', {
  state: (): {
    speech: SpeechPreferences;
    history: string[];
    hasUserInteracted: boolean;
  } => ({
    speech: {
      rate: 4,
    },
    history: [],
    hasUserInteracted: false,
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
  },
  persist: {
    paths: ['speech'],
  },
});

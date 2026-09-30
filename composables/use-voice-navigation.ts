// Navegação por voz: traduz comandos falados nas MESMAS ações que o
// teclado já dispara (setas, Enter, F1, e os botões da barra de
// navegação). Não existe lógica de navegação duplicada aqui — a voz é
// só mais uma forma de "apertar tecla".
//
// Ativa/desativa pelo menu de configuração da síntese de voz. Enquanto
// ativa, o teclado de setas fica desligado (o usuário escolhe voz OU
// teclado, não os dois ao mesmo tempo).
//
// IMPORTANTE: este módulo NUNCA usa useTTS()/useI18n() para falar,
// porque ele precisa funcionar disparado de qualquer lugar (um evento
// de reconhecimento de voz, por exemplo) — não só de dentro do
// setup() de um componente, que é a única hora em que useI18n() pode
// ser chamado. Por isso ele fala direto pela API do navegador, e usa a
// store do Pinia (que funciona em qualquer contexto) só pra respeitar
// a velocidade de fala configurada pelo usuário.

interface VoiceCommand {
  patterns: string[];
  action: () => void;
}

let instance: ReturnType<typeof createVoiceNavigation> | null = null;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function speakDirectly(phrase: string) {
  if (!process.client) return;
  try {
    const ttsStore = useTtsStore();
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    const ptVoice = speechSynthesis
      .getVoices()
      .find((v) => v.lang === 'pt-BR');
    if (ptVoice) utterance.voice = ptVoice;
    utterance.rate = ttsStore.speech.rate / 4;
    speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Erro ao falar mensagem da navegação por voz:', error);
  }
}

function createVoiceNavigation() {
  const isListening = ref(false);
  const isSupported = ref(false);
  const lastHeard = ref('');
  let recognition: any = null;

  function dispatchKey(key: string, code: string) {
    const event = new KeyboardEvent('keydown', {
      key,
      code,
      bubbles: true,
      cancelable: true,
    });
    (document.activeElement ?? document.body).dispatchEvent(event);
  }

  function clickActiveElement() {
    (document.activeElement as HTMLElement | null)?.click();
  }

  function clickNavButton(name: 'back' | 'home' | 'help') {
    (
      document.querySelector(`[data-nav="${name}"]`) as HTMLElement | null
    )?.click();
  }

  function getCommands(): VoiceCommand[] {
    return [
      {
        patterns: ['proximo', 'avancar', 'descer', 'seguinte'],
        action: () => useKeyboardNavigation().moveFocus('down'),
      },
      {
        patterns: ['anterior', 'subir', 'item anterior'],
        action: () => useKeyboardNavigation().moveFocus('up'),
      },
      {
        patterns: ['selecionar', 'abrir', 'confirmar', 'entrar'],
        action: clickActiveElement,
      },
      {
        patterns: ['ajuda', 'explicar', 'explicacao'],
        action: () => dispatchKey('F1', 'F1'),
      },
      { patterns: ['voltar'], action: () => clickNavButton('back') },
      {
        patterns: ['inicio', 'menu principal'],
        action: () => clickNavButton('home'),
      },
      {
        patterns: ['parar escuta', 'desativar voz', 'parar'],
        action: () => stop(),
      },
    ];
  }

  function handleTranscript(transcript: string) {
    const normalized = normalize(transcript);
    lastHeard.value = normalized;
    console.log('[voz] ouvido:', transcript, '→ normalizado:', normalized);

    const match = getCommands().find((cmd) =>
      cmd.patterns.some((pattern) => normalized.includes(pattern)),
    );

    if (match) {
      match.action();
    } else {
      speakDirectly('Comando de voz não reconhecido.');
    }
  }

  function setup() {
    if (!process.client) return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    isSupported.value = !!SpeechRecognitionCtor;
    if (!SpeechRecognitionCtor) return;

    recognition = new SpeechRecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult?.[0]?.transcript ?? '';
      if (transcript) handleTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;

      const errorMessages: Record<string, string> = {
        'not-allowed':
          'Permissão de microfone negada. Autorize o microfone nas configurações do navegador e tente ativar de novo.',
        'service-not-allowed':
          'Permissão de microfone negada. Autorize o microfone nas configurações do navegador e tente ativar de novo.',
        'audio-capture': 'Nenhum microfone foi encontrado neste dispositivo.',
        network:
          'Erro de rede ao tentar reconhecer a voz. Verifique sua conexão com a internet.',
      };
      speakDirectly(
        errorMessages[event.error] ??
          'Ocorreu um erro no reconhecimento de voz.',
      );
      console.error('Erro no reconhecimento de voz:', event.error);
    };

    // O navegador encerra o reconhecimento periodicamente por conta
    // própria; reinicia sozinho enquanto o modo de voz estiver ativo.
    recognition.onend = () => {
      if (isListening.value) {
        try {
          recognition.start();
        } catch {
          // já estava reiniciando, ignora
        }
      }
    };
  }

  function start() {
    if (!recognition) setup();
    if (!isSupported.value) {
      speakDirectly('Reconhecimento de voz não é suportado neste navegador.');
      return;
    }
    isListening.value = true;
    try {
      recognition.start();
    } catch {
      // já estava escutando, ignora
    }
    speakDirectly(
      'Navegação por voz ativada. Diga um comando, ou parar, para desativar.',
    );
  }

  function stop() {
    isListening.value = false;
    recognition?.stop();
    speakDirectly('Navegação por voz desativada.');
  }

  function toggle() {
    if (isListening.value) {
      stop();
    } else {
      start();
    }
  }

  return { isListening, isSupported, lastHeard, start, stop, toggle };
}

export function useVoiceNavigation() {
  if (!instance) {
    instance = createVoiceNavigation();
  }
  return instance;
}
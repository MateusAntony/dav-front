import { PDVMenusEnum } from '~/src/interfaces/pdv-menu';

// Singleton: precisa ser criado UMA vez só, durante o setup() do
// app.vue (onde useTTS()/useI18n() podem ser chamados com segurança).
// Se cada chamador criasse sua própria instância — como a navegação
// por voz fazia antes —, useTTS() seria invocado fora do setup() e
// quebraria. Reaproveitar a mesma instância resolve isso de vez.
let instance: ReturnType<typeof createKeyboardNavigation> | null = null;

function createKeyboardNavigation() {
  const focusableElements = ref<HTMLElement[]>([]);
  const menuStore = useMenuOptions();
  const ttsStore = useTtsStore();
  const tts = useTTS();
  const diagramTool = useDiagram();
  const updateFocusableElements = () => {
    focusableElements.value = Array.from(
      document.querySelectorAll(
        '.focusable-input, .focusable-textarea, .focusable-element, .focusable-select, [tabindex]:not([tabindex="-1"])',
      ),
    ) as HTMLElement[];
  };

  // Move o foco pro próximo/anterior item focável. Usada tanto pelo
  // teclado físico (dentro de hotkeys) quanto pelos comandos de voz
  // "próximo"/"anterior" (chamada direta, sem passar pelo bloqueio de
  // teclado que existe enquanto a navegação por voz está ativa).
  const moveFocus = (direction: 'up' | 'down') => {
    updateFocusableElements();
    ttsStore.setUserInteracted();

    const currentIndex = focusableElements.value.findIndex(
      (el) => el === document.activeElement,
    );
    focusableElements.value.forEach((el, index) => {
      (el as HTMLElement).tabIndex = index + 1;
    });

    const nextIndex =
      direction === 'down'
        ? getNextIndex(currentIndex, focusableElements.value.length)
        : getPrevIndex(currentIndex, focusableElements.value.length);
    focusableElements.value[nextIndex]?.focus();
  };

  const hotkeys = (event: KeyboardEvent) => {
    updateFocusableElements();
    ttsStore.setUserInteracted();

    const currentIndex = focusableElements.value.findIndex(
      (el) => el === document.activeElement,
    );
    focusableElements.value.forEach((el, index) => {
      (el as HTMLElement).tabIndex = index + 1;
    });
    const isTextEntry = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;

    if (!isTextEntry && (event.code === 'ArrowUp' || (event.code === 'Tab' && event.shiftKey))) {
      const prevIndex = getPrevIndex(
        currentIndex,
        focusableElements.value.length,
      );
      focusableElements.value[prevIndex]?.focus();
      event.preventDefault();
    } else if (!isTextEntry && event.code === 'ArrowDown') {
      const nextIndex = getNextIndex(
        currentIndex,
        focusableElements.value.length,
      );
      focusableElements.value[nextIndex]?.focus();
      event.preventDefault();
    } else if (event.code === 'Escape') {
      if (menuStore.activeMainMenu === PDVMenusEnum.PROJECTS) {
        diagramTool.saveDiagram().catch((error: unknown) => {
          console.error('Erro ao salvar diagrama:', error);
        });
        if (menuStore.previousDerMenu !== undefined) {
          menuStore.setActiveDerMenu(menuStore.previousDerMenu);
        } else {
          menuStore.setActiveMainMenu(PDVMenusEnum.DEFAULT);
        }
      } else if (menuStore.activeMainMenu === PDVMenusEnum.TTS) {
        menuStore.setActiveMainMenu(PDVMenusEnum.DEFAULT);
      } else if (menuStore.activeMainMenu === PDVMenusEnum.DEFAULT) {
        navigateTo(Routes.WELCOME);
      }
    } else if (event.key === 'Home' && event.ctrlKey) {
      menuStore.setActiveMainMenu(PDVMenusEnum.DEFAULT);
    } else if (event.key === 'Alt' && event.ctrlKey) {
      menuStore.setActiveMainMenu(PDVMenusEnum.TTS);
    }
    if (event.key === 'Control') {
      tts.stopSpeaking();
    }
  };

  function getPrevIndex(currentIndex: number, length: number): number {
    return currentIndex === 0 ? length - 1 : currentIndex - 1;
  }

  function getNextIndex(currentIndex: number, length: number): number {
    return currentIndex === length - 1 ? 0 : currentIndex + 1;
  }

  return { hotkeys, moveFocus };
}

export function useKeyboardNavigation() {
  if (!instance) {
    instance = createKeyboardNavigation();
  }
  return instance;
}
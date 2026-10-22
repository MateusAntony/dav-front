
type BackHandler = () => boolean;

let current: BackHandler | null = null;

export function useBackHandler() {
  // Registra o handler da tela. Devolve a função que o remove.
  const register = (handler: BackHandler) => {
    current = handler;
    return () => {
      if (current === handler) current = null;
    };
  };

  // Chamado pelo Esc e pelo botão Voltar. true = já foi tratado.
  const handle = (): boolean => (current ? current() : false);

  return { register, handle };
}

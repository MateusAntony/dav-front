// ---------------------------------------------------------------------------
// Limpeza de sessão.
//
// Vários composables (useDiagram, useSqlGenerator, useSqlSimulator...) e
// stores guardam estado em MEMÓRIA, e o Nuxt é uma SPA: trocar de conta sem
// recarregar a página NÃO zera esse estado. Sem esta limpeza, a segunda conta
// herdava a lista de diagramas, o diagrama aberto, o modo "somente leitura",
// o menu ativo, etc. da conta anterior.
//
// IMPORTANTE: chame useSession() no topo do setup do componente/composable.
// Tudo é capturado aqui porque useDiagram() usa useI18n(), que só pode ser
// chamado durante o setup (e não dentro de handlers de clique).
// ---------------------------------------------------------------------------
export function useSession() {
  const authStore = useAuthStore();
  const diagramTool = useDiagram();
  const sqlGen = useSqlGenerator();
  const menuStore = useMenuOptions();
  const derStore = useDerOptions();
  const ttsStore = useTtsStore();

  // Zera tudo que pertence ao usuário, sem mexer no token.
  const clearUserState = () => {
    diagramTool.resetSession();
    sqlGen.reset();
    menuStore.reset();
    derStore.reset();
    // O histórico de frases faladas contém nomes de diagramas/entidades.
    ttsStore.history = [];
  };

  // Encerra a sessão: apaga o token e todo o estado do usuário.
  const endSession = () => {
    authStore.logout();
    clearUserState();
  };

  return { clearUserState, endSession };
}
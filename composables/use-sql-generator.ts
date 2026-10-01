import { generateSqlScript, type SqlScript } from '~/src/utils/sql-generator';

let instance: ReturnType<typeof createSqlGeneratorStore> | null = null;

// IMPORTANTE: este estado é compartilhado por TODOS os componentes. Se ele for
// criado dentro do setup de um componente, os `computed` ficam presos ao ciclo
// de vida DESSE componente: quando ele é desmontado (ex.: ao sair do menu), o
// Vue 3.4 "congela" o computed e ele nunca mais atualiza — a tela passa a mostrar
// sempre o primeiro SQL / a primeira tabela escolhida. O effectScope(true) abaixo
// cria um escopo independente, que nunca é desmontado.
const sharedScope = effectScope(true);

function createSqlGeneratorStore() {
  return sharedScope.run(buildSqlGeneratorStore) as ReturnType<
    typeof buildSqlGeneratorStore
  >;
}

function buildSqlGeneratorStore() {
  const selectedTableId = ref<string | null>(null);

  // O script é SEMPRE calculado a partir do diagrama aberto neste momento.
  // Antes ele era uma "foto" tirada ao entrar na tela; se a foto ficasse
  // velha (outro projeto, outra conta, exemplo do convidado) o SQL mostrado
  // era o do diagrama errado.
  const script = computed<SqlScript | null>(() => {
    const current = useDiagram().diagram.value;
    return current ? generateSqlScript(current) : null;
  });

  // Chamado ao entrar em "Gerar SQL": começa sem tabela escolhida e com a
  // simulação zerada (os registros de exemplo pertencem ao diagrama atual).
  const build = () => {
    selectedTableId.value = null;
    useSqlSimulator().reset();
  };

  const selectedTable = computed(
    () => script.value?.tables.find((t) => t.id === selectedTableId.value) ?? null,
  );

  // Só o código técnico é exibido na tela. O texto simplificado existe
  // apenas para ser OUVIDO (leitura por voz), nunca para ser mostrado.
  const fullCode = computed(() => script.value?.technicalSql ?? '');

  const selectTable = (tableId: string | null) => {
    selectedTableId.value = tableId;
  };

  const reset = () => {
    selectedTableId.value = null;
    useSqlSimulator().reset();
  };

  const exportSql = () => {
    if (!script.value || !process.client) return;
    const blob = new Blob([script.value.technicalSql], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagrama.sql';
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    script,
    selectedTableId,
    selectedTable,
    fullCode,
    build,
    selectTable,
    reset,
    exportSql,
  };
}

export function useSqlGenerator() {
  if (!instance) {
    instance = createSqlGeneratorStore();
  }
  return instance;
}
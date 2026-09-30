import { generateSqlScript, type SqlScript } from '~/src/utils/sql-generator';

export type SqlCodeMode = 'technical' | 'simple';

let instance: ReturnType<typeof createSqlGeneratorStore> | null = null;

function createSqlGeneratorStore() {
  const script = ref<SqlScript | null>(null);
  const codeMode = ref<SqlCodeMode>('simple');
  const selectedTableId = ref<string | null>(null);

  const build = () => {
    const diagramTool = useDiagram();
    if (!diagramTool.diagram.value) {
      script.value = null;
      return;
    }
    script.value = generateSqlScript(diagramTool.diagram.value);
  };

  const selectedTable = computed(
    () => script.value?.tables.find((t) => t.id === selectedTableId.value) ?? null,
  );

  // Código exibido no painel visual, de acordo com o modo atual.
  // Sem tabela selecionada: script inteiro. Com tabela selecionada: só aquela tabela.
  const displayedCode = computed(() => {
    if (!script.value) return '';
    if (selectedTable.value) {
      return codeMode.value === 'technical'
        ? selectedTable.value.technicalCode
        : selectedTable.value.simpleCode;
    }
    return codeMode.value === 'technical'
      ? script.value.technicalSql
      : script.value.simpleSql;
  });

  const columnCode = (column: { technicalCode: string; simpleCode: string }) =>
    codeMode.value === 'technical' ? column.technicalCode : column.simpleCode;

  const toggleCodeMode = () => {
    codeMode.value = codeMode.value === 'technical' ? 'simple' : 'technical';
  };

  const selectTable = (tableId: string | null) => {
    selectedTableId.value = tableId;
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
    codeMode,
    selectedTableId,
    selectedTable,
    displayedCode,
    columnCode,
    build,
    toggleCodeMode,
    selectTable,
    exportSql,
  };
}

export function useSqlGenerator() {
  if (!instance) {
    instance = createSqlGeneratorStore();
  }
  return instance;
}
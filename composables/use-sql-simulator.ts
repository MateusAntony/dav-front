import {
  createSimState,
  simulateDelete,
  simulateInsert,
  simulateSelect,
  simulateUpdate,
  type SimCommand,
  type SimResult,
  type SimRow,
  type SimState,
} from '~/src/utils/sql-simulator';
import type { SqlTableNode } from '~/src/utils/sql-generator';

let instance: ReturnType<typeof createSqlSimulatorStore> | null = null;

// Escopo independente (ver explicação em use-sql-generator.ts).
const sharedScope = effectScope(true);

// Estado da simulação (registros de exemplo em memória). Fica separado do
// gerador para que a tela possa exibir a tabela e o último comando.
function createSqlSimulatorStore() {
  return sharedScope.run(buildSqlSimulatorStore) as ReturnType<
    typeof buildSqlSimulatorStore
  >;
}

function buildSqlSimulatorStore() {
  const state = ref<SimState>(createSimState());
  const lastResult = ref<SimResult | null>(null);
  // Tabela a que o último resultado se refere (para não exibir o resultado
  // de uma tabela em cima de outra).
  const lastTableName = ref<string | null>(null);

  const rowsOf = (table: SqlTableNode | null): SimRow[] =>
    table ? (state.value.rows[table.name] ?? []) : [];

  const resultFor = (table: SqlTableNode | null) =>
    table && lastTableName.value === table.name ? lastResult.value : null;

  const run = (command: SimCommand, table: SqlTableNode): SimResult | null => {
    const gen = useSqlGenerator();
    const script = gen.script.value;
    if (!script) return null;

    let result: SimResult;
    switch (command) {
      case 'SELECT':
        result = simulateSelect(script, table, state.value);
        break;
      case 'INSERT':
        result = simulateInsert(script, table, state.value);
        break;
      case 'UPDATE':
        result = simulateUpdate(script, table, state.value);
        break;
      default:
        result = simulateDelete(script, table, state.value);
    }
    lastResult.value = result;
    lastTableName.value = table.name;
    return result;
  };

  const reset = () => {
    state.value = createSimState();
    lastResult.value = null;
    lastTableName.value = null;
  };

  return { state, lastResult, lastTableName, rowsOf, resultFor, run, reset };
}

export function useSqlSimulator() {
  if (!instance) {
    instance = createSqlSimulatorStore();
  }
  return instance;
}
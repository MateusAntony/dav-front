import {
  createSimState,
  emptyQuery,
  emptyWriteQuery,
  simulateDelete,
  simulateInsertValues,
  simulateSelect,
  simulateUpdate,
  type SelectQuery,
  type SimResult,
  type SimRow,
  type SimState,
  type SimValue,
  type WriteQuery,
} from '~/src/utils/sql-simulator';
import type { SqlTableNode } from '~/src/utils/sql-generator';
import type { SimulationRows } from '~/src/interfaces/der-diagram';

let instance: ReturnType<typeof createSqlSimulatorStore> | null = null;

// Escopo independente: o estado é compartilhado por várias telas e não pode
// ficar preso ao ciclo de vida de nenhuma delas (ver use-sql-generator.ts).
const sharedScope = effectScope(true);

function createSqlSimulatorStore() {
  return sharedScope.run(buildSqlSimulatorStore) as ReturnType<
    typeof buildSqlSimulatorStore
  >;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Registros de exemplo (em memória, espelhados no diagrama), o último comando
// executado e a consulta SELECT que está sendo montada.
function buildSqlSimulatorStore() {
  // Capturados na criação (dentro de um setup): useDiagram() usa useI18n e não
  // pode ser chamado dentro de eventos (ver use-sql-generator.ts).
  const diagramTool = useDiagram();
  const authStore = useAuthStore();

  const state = ref<SimState>(createSimState());
  const lastResult = ref<SimResult | null>(null);
  // Tabela a que o último resultado se refere (para não exibir o resultado
  // de uma tabela em cima de outra).
  const lastTableName = ref<string | null>(null);
  const query = ref<SelectQuery>(emptyQuery());
  // Comando UPDATE/DELETE que está sendo montado (SET e WHERE).
  const writeQuery = ref<WriteQuery>(emptyWriteQuery());

  const rowsOf = (table: SqlTableNode | null): SimRow[] =>
    table ? (state.value.rows[table.name] ?? []) : [];

  const resultFor = (table: SqlTableNode | null) =>
    table && lastTableName.value === table.name ? lastResult.value : null;

  const currentScript = () => useSqlGenerator().script.value;

  // Salva os registros junto com o diagrama (backend). Convidado e leitor
  // mantêm os registros só em memória.
  const persist = () => {
    diagramTool.saveSimulation(clone(state.value.rows) as SimulationRows);
  };

  // Carrega os registros salvos no diagrama aberto (ao entrar em "Gerar SQL").
  const hydrate = () => {
    const saved = diagramTool.diagram.value?.simulation ?? {};
    const script = currentScript();
    const known = new Set(script?.tables.map((t) => t.name));
    const rows: Record<string, SimRow[]> = {};
    Object.entries(saved).forEach(([name, list]) => {
      if (!script || known.has(name)) rows[name] = clone(list) as SimRow[];
    });
    state.value = { rows };
    lastResult.value = null;
    lastTableName.value = null;
    query.value = emptyQuery();
    writeQuery.value = emptyWriteQuery();
  };

  // Aviso quando os registros não ficarão salvos.
  const saveNotice = () => {
    if (!authStore.token) {
      return ' Como você não está logado, os registros ficam só nesta sessão.';
    }
    if (diagramTool.isReadOnly.value) {
      return ' Como você só tem acesso de leitura, o registro não é salvo.';
    }
    return '';
  };

  const insert = (
    table: SqlTableNode,
    values: Record<string, SimValue | string>,
  ): SimResult | null => {
    const script = currentScript();
    if (!script) return null;
    const result = simulateInsertValues(script, table, state.value, values);
    if (result.ok) {
      const notice = saveNotice();
      result.message += notice;
      result.spoken += notice;
      persist();
    }
    lastResult.value = result;
    lastTableName.value = table.name;
    return result;
  };

  const startQuery = (tableName: string) => {
    query.value = emptyQuery(tableName);
  };

  const runSelect = (table: SqlTableNode): SimResult | null => {
    const script = currentScript();
    if (!script) return null;
    const result = simulateSelect(script, table, state.value, query.value);
    lastResult.value = result;
    lastTableName.value = table.name;
    return result;
  };

  // O UPDATE exige ao menos um registro na tabela. Se estiver vazia, devolve o
  // erro (e o deixa visível na tela); se estiver tudo certo, devolve null.
  const checkUpdateAllowed = (table: SqlTableNode): SimResult | null => {
    const script = currentScript();
    if (!script || rowsOf(table).length > 0) return null;
    const result = simulateUpdate(script, table, state.value, emptyWriteQuery());
    lastResult.value = result;
    lastTableName.value = table.name;
    return result;
  };

  const startWrite = () => {
    writeQuery.value = emptyWriteQuery();
  };

  // UPDATE e DELETE alteram os registros: salvam como o INSERT.
  const finishWrite = (table: SqlTableNode, result: SimResult) => {
    if (result.ok) {
      const notice = saveNotice();
      result.message += notice;
      result.spoken += notice;
      persist();
    }
    lastResult.value = result;
    lastTableName.value = table.name;
    return result;
  };

  const runUpdate = (table: SqlTableNode): SimResult | null => {
    const script = currentScript();
    if (!script) return null;
    return finishWrite(
      table,
      simulateUpdate(script, table, state.value, writeQuery.value),
    );
  };

  const runDelete = (table: SqlTableNode): SimResult | null => {
    const script = currentScript();
    if (!script) return null;
    return finishWrite(
      table,
      simulateDelete(script, table, state.value, writeQuery.value),
    );
  };

  // Esconde o resultado do último comando (ex.: ao sair da tela do SELECT).
  const clearResult = () => {
    lastResult.value = null;
    lastTableName.value = null;
  };

  const clearAll = () => {
    state.value = createSimState();
    lastResult.value = null;
    lastTableName.value = null;
    persist();
  };

  // Zera só a memória (troca de conta/sessão): não toca no diagrama.
  const reset = () => {
    state.value = createSimState();
    lastResult.value = null;
    lastTableName.value = null;
    query.value = emptyQuery();
    writeQuery.value = emptyWriteQuery();
  };

  return {
    state,
    lastResult,
    lastTableName,
    query,
    writeQuery,
    rowsOf,
    resultFor,
    hydrate,
    insert,
    startQuery,
    runSelect,
    startWrite,
    checkUpdateAllowed,
    runUpdate,
    runDelete,
    clearResult,
    clearAll,
    reset,
  };
}

export function useSqlSimulator() {
  if (!instance) {
    instance = createSqlSimulatorStore();
  }
  return instance;
}

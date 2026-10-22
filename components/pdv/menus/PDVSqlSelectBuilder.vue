<template>
  <FocusableSelect
    v-if="picker"
    :key="step"
    :title="picker.title"
    :items="picker.items"
    :should-translate="false"
    hide-help-hint
    @submit="picker.onPick"
  />
  <FocusableInput
    v-else-if="typed"
    :key="step"
    v-model="draft"
    :title="typed.title"
    :allow-empty="typed.allowEmpty"
    @submit="typed.onSubmit"
  />
  <PDVMenu v-else :menu="menu" />
</template>

<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import {
  AGG_FUNCTIONS,
  COMPARE_OPS,
  HAVING_OPS,
  emptyQuery,
  itemLabel,
  kindOf,
  parseColumnInput,
  type AggFn,
  type CompareOp,
} from '~/src/utils/sql-simulator';

// Montagem do SELECT cláusula por cláusula. O comando final aparece na tela
// enquanto é montado; "FROM" troca a tabela consultada.
const tts = useTTS();
const menuStore = useMenuOptions();
const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();

const backHandler = useBackHandler();

const query = simulator.query;
const table = computed(() => sqlGen.selectedTable.value);
const columns = computed(() => table.value?.columns ?? []);

type Step =
  | 'MENU'
  | 'SELECT_PICK'
  | 'SELECT_AGG_FN'
  | 'SELECT_AGG_COL'
  | 'FROM_PICK'
  | 'WHERE_COL'
  | 'WHERE_OP'
  | 'WHERE_VALUE'
  | 'GROUP_PICK'
  | 'HAVING_FN'
  | 'HAVING_COL'
  | 'HAVING_OP'
  | 'HAVING_VALUE'
  | 'ORDER_PICK'
  | 'ORDER_DIR'
  | 'LIMIT';

const step = ref<Step>('MENU');
const draft = ref('');

// Escolhas intermediárias dos passos com mais de uma pergunta.
const pending = reactive({
  fn: '' as AggFn | '',
  column: '',
  op: '' as CompareOp | '',
});

const toMenu = () => {
  draft.value = '';
  step.value = 'MENU';
};
const go = (next: Step) => {
  draft.value = '';
  step.value = next;
};

const speakError = (message: string) => tts.speakPhrase(message);

// --- Rótulos do menu (também são falados ao focar cada item) ---------------
const whereLabel = (w: { column: string; op: CompareOp; value?: string }) =>
  w.op === 'IS NULL' || w.op === 'IS NOT NULL'
    ? `${w.column} ${w.op}`
    : `${w.column} ${w.op} ${w.value}`;

const menu = computed(() => {
  const q = query.value;
  return {
    title: 'Consulta SELECT',
    items: [
      {
        label: `SELECT: ${q.items.length ? q.items.map(itemLabel).join(', ') : 'todas as colunas (*)'}`,
        action: () => go('SELECT_PICK'),
      },
      {
        label: `FROM: ${q.table ?? 'nenhuma tabela'}`,
        action: () => go('FROM_PICK'),
      },
      {
        label: `WHERE: ${q.where.length ? q.where.map(whereLabel).join(' E ') : 'sem condição'}`,
        action: () => go('WHERE_COL'),
      },
      {
        label: `GROUP BY: ${q.groupBy.length ? q.groupBy.join(', ') : 'não usado'}`,
        action: () => go('GROUP_PICK'),
      },
      {
        label: `HAVING: ${
          q.having.length
            ? q.having.map((h) => `${h.fn}(${h.column}) ${h.op} ${h.value}`).join(' E ')
            : 'não usado'
        }`,
        action: () => go('HAVING_FN'),
      },
      {
        label: `ORDER BY: ${
          q.orderBy.length
            ? q.orderBy.map((o) => `${o.column} ${o.direction}`).join(', ')
            : 'não usado'
        }`,
        action: () => go('ORDER_PICK'),
      },
      {
        label: `LIMIT: ${q.limit !== null ? q.limit : 'sem limite'}`,
        action: () => go('LIMIT'),
      },
      { label: 'Executar SELECT', action: execute },
      { label: 'Limpar consulta', action: clearQuery },
    ],
  };
});

function execute() {
  if (!table.value) return;
  const result = simulator.runSelect(table.value);
  if (result) tts.speakPhrase(result.spoken);
}

function clearQuery() {
  query.value = emptyQuery(query.value.table);
  tts.speakPhrase('Consulta limpa.');
}

// --- Passos de escolha (listas) ----------------------------------------------
const columnItems = () => columns.value.map((c) => ({ title: c.name }));

interface Picker {
  title: string;
  items: { title: string }[];
  onPick: (index: number) => void;
}

const numericColumns = () =>
  columns.value.filter((c) => ['int', 'float'].includes(kindOf(c)));

// Colunas permitidas para uma função: COUNT aceita * ; SUM/AVG só numéricas.
const aggColumnChoices = (fn: AggFn): string[] => {
  if (fn === 'COUNT') return ['*', ...columns.value.map((c) => c.name)];
  if (fn === 'SUM' || fn === 'AVG') return numericColumns().map((c) => c.name);
  return columns.value.map((c) => c.name);
};

const picker = computed<Picker | null>(() => {
  const q = query.value;
  const tables = sqlGen.script.value?.tables ?? [];

  switch (step.value) {
    case 'SELECT_PICK': {
      const items = [
        { title: 'Todas as colunas (*)' },
        ...columnItems(),
        { title: 'Função de agregação (COUNT, SUM, AVG, MIN, MAX)' },
      ];
      return {
        title: 'SELECT: escolha o que mostrar',
        items,
        onPick: (i) => {
          if (i === 0) {
            q.items = [];
            toMenu();
          } else if (i <= columns.value.length) {
            const name = columns.value[i - 1].name;
            if (!q.items.some((it) => !it.fn && it.column === name)) {
              q.items = [...q.items, { column: name }];
            }
            toMenu();
          } else {
            go('SELECT_AGG_FN');
          }
        },
      };
    }
    case 'SELECT_AGG_FN':
    case 'HAVING_FN': {
      const isHaving = step.value === 'HAVING_FN';
      const items = AGG_FUNCTIONS.map((fn) => ({ title: fn }));
      if (isHaving) items.push({ title: 'Limpar HAVING' });
      return {
        title: isHaving ? 'HAVING: escolha a função' : 'Escolha a função de agregação',
        items,
        onPick: (i) => {
          if (i >= AGG_FUNCTIONS.length) {
            q.having = [];
            toMenu();
            return;
          }
          if (aggColumnChoices(AGG_FUNCTIONS[i]).length === 0) {
            speakError(
              `A tabela não tem colunas numéricas para usar com ${AGG_FUNCTIONS[i]}.`,
            );
            return;
          }
          pending.fn = AGG_FUNCTIONS[i];
          go(isHaving ? 'HAVING_COL' : 'SELECT_AGG_COL');
        },
      };
    }
    case 'SELECT_AGG_COL':
    case 'HAVING_COL': {
      const fn = pending.fn as AggFn;
      const choices = aggColumnChoices(fn);
      return {
        title: `${fn}: escolha a coluna`,
        items: choices.map((c) => ({ title: c === '*' ? '* (todas as linhas)' : c })),
        onPick: (i) => {
          const column = choices[i];
          if (step.value === 'SELECT_AGG_COL') {
            if (!q.items.some((it) => it.fn === fn && it.column === column)) {
              q.items = [...q.items, { fn, column }];
            }
            toMenu();
          } else {
            pending.column = column;
            go('HAVING_OP');
          }
        },
      };
    }
    case 'FROM_PICK':
      return {
        title: 'FROM: escolha a tabela',
        items: tables.map((t) => ({ title: t.name })),
        onPick: (i) => {
          const chosen = tables[i];
          if (!chosen) return;
          if (chosen.name !== q.table) {
            // Trocar a tabela invalida as outras cláusulas (colunas diferentes).
            query.value = emptyQuery(chosen.name);
            sqlGen.selectTable(chosen.id);
          }
          toMenu();
        },
      };
    case 'WHERE_COL': {
      const items = [...columnItems(), { title: 'Limpar WHERE' }];
      return {
        title: 'WHERE: escolha a coluna',
        items,
        onPick: (i) => {
          if (i >= columns.value.length) {
            q.where = [];
            toMenu();
            return;
          }
          pending.column = columns.value[i].name;
          go('WHERE_OP');
        },
      };
    }
    case 'WHERE_OP': {
      const col = columns.value.find((c) => c.name === pending.column);
      const ops = COMPARE_OPS.filter((op) => op !== 'LIKE' || (col && kindOf(col) === 'text'));
      return {
        title: `WHERE ${pending.column}: escolha o operador`,
        items: ops.map((op) => ({ title: op })),
        onPick: (i) => {
          const op = ops[i];
          if (op === 'IS NULL' || op === 'IS NOT NULL') {
            q.where = [...q.where, { column: pending.column, op }];
            toMenu();
          } else {
            pending.op = op;
            go('WHERE_VALUE');
          }
        },
      };
    }
    case 'HAVING_OP':
      return {
        title: `HAVING ${pending.fn}(${pending.column}): escolha o operador`,
        items: HAVING_OPS.map((op) => ({ title: op })),
        onPick: (i) => {
          pending.op = HAVING_OPS[i];
          go('HAVING_VALUE');
        },
      };
    case 'GROUP_PICK': {
      const items = [...columnItems(), { title: 'Limpar GROUP BY' }];
      return {
        title: 'GROUP BY: escolha a coluna',
        items,
        onPick: (i) => {
          if (i >= columns.value.length) {
            q.groupBy = [];
          } else {
            const name = columns.value[i].name;
            if (!q.groupBy.includes(name)) q.groupBy = [...q.groupBy, name];
          }
          toMenu();
        },
      };
    }
    case 'ORDER_PICK': {
      // Colunas da tabela + funções de agregação já escolhidas no SELECT.
      const names = [
        ...columns.value.map((c) => c.name),
        ...q.items.filter((it) => it.fn).map(itemLabel),
      ];
      const items = [...names.map((n) => ({ title: n })), { title: 'Limpar ORDER BY' }];
      return {
        title: 'ORDER BY: escolha a coluna',
        items,
        onPick: (i) => {
          if (i >= names.length) {
            q.orderBy = [];
            toMenu();
            return;
          }
          pending.column = names[i];
          go('ORDER_DIR');
        },
      };
    }
    case 'ORDER_DIR':
      return {
        title: `ORDER BY ${pending.column}: escolha a ordem`,
        items: [{ title: 'ASC (crescente)' }, { title: 'DESC (decrescente)' }],
        onPick: (i) => {
          q.orderBy = [
            ...q.orderBy.filter((o) => o.column !== pending.column),
            { column: pending.column, direction: i === 0 ? 'ASC' : 'DESC' },
          ];
          toMenu();
        },
      };
    default:
      return null;
  }
});

// --- Passos de digitação -------------------------------------------------------
interface Typed {
  title: string;
  allowEmpty: boolean;
  onSubmit: (value: string) => void;
}

const typed = computed<Typed | null>(() => {
  const q = query.value;
  switch (step.value) {
    case 'WHERE_VALUE':
      return {
        title: `Valor para ${pending.column} ${pending.op}. ${
          pending.op === 'LIKE' ? 'Use % para qualquer trecho, por exemplo A%.' : ''
        }`,
        allowEmpty: false,
        onSubmit: (value) => {
          const col = columns.value.find((c) => c.name === pending.column);
          if (!col) return;
          const parsed = parseColumnInput(col, value);
          if (!parsed.ok) return speakError(parsed.error);
          q.where = [
            ...q.where,
            { column: pending.column, op: pending.op as CompareOp, value: value.trim() },
          ];
          toMenu();
        },
      };
    case 'HAVING_VALUE':
      return {
        title: `Valor numérico para ${pending.fn}(${pending.column}) ${pending.op}`,
        allowEmpty: false,
        onSubmit: (value) => {
          if (Number.isNaN(Number(value.replace(',', '.')))) {
            return speakError(`"${value}" não é um número válido.`);
          }
          q.having = [
            ...q.having,
            {
              fn: pending.fn as AggFn,
              column: pending.column,
              op: pending.op as CompareOp,
              value: value.trim(),
            },
          ];
          toMenu();
        },
      };
    case 'LIMIT':
      return {
        title: 'LIMIT: quantidade máxima de linhas. Deixe vazio e pressione Enter para remover o limite.',
        allowEmpty: true,
        onSubmit: (value) => {
          if (value.trim() === '') {
            q.limit = null;
          } else if (/^\d+$/.test(value.trim()) && Number(value) > 0) {
            q.limit = Number(value);
          } else {
            return speakError('Digite um número inteiro maior que zero.');
          }
          toMenu();
        },
      };
    default:
      return null;
  }
});

// "Voltar" (Esc ou botão da barra de baixo) dentro de uma escolha volta só ao
// menu da consulta. No próprio menu da consulta, volta ao menu da tabela.
let unregisterBack: (() => void) | null = null;

onBeforeMount(() => {
  if (!table.value) {
    menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
  }
});

onMounted(() => {
  unregisterBack = backHandler.register(() => {
    if (step.value === 'MENU') return false;
    toMenu();
    return true;
  });
});

onBeforeUnmount(() => {
  unregisterBack?.();
  // Ao sair da consulta, o resultado some e a tabela volta a mostrar todos os
  // registros.
  simulator.clearResult();
});
</script>

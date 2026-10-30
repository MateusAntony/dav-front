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
  COMPARE_OPS,
  describeColumnPrompt,
  foreignKeyOptions,
  kindOf,
  parseColumnInput,
  settableColumns,
  type CompareOp,
  type SimValue,
} from '~/src/utils/sql-simulator';

// Montagem de UPDATE (SET + WHERE) e DELETE (WHERE), passo a passo. O comando
// aparece na tela enquanto é montado, e o resultado depois de executado.
const tts = useTTS();
const backHandler = useBackHandler();
const menuStore = useMenuOptions();
const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();

const query = simulator.writeQuery;
const table = computed(() => sqlGen.selectedTable.value);
const columns = computed(() => table.value?.columns ?? []);
const isUpdate = computed(
  () => menuStore.activeDerMenu === DerFlowEnum.SQL_UPDATE,
);

type Step =
  | 'MENU'
  | 'SET_COL'
  | 'SET_VALUE'
  | 'SET_FK'
  | 'WHERE_COL'
  | 'WHERE_OP'
  | 'WHERE_VALUE';

const step = ref<Step>('MENU');
const draft = ref('');
const pending = reactive({ column: '', op: '' as CompareOp | '' });

const toMenu = () => {
  draft.value = '';
  step.value = 'MENU';
};
const go = (next: Step) => {
  draft.value = '';
  step.value = next;
};
const speakError = (message: string) => tts.speakPhrase(message);

// --- Menu (os rótulos são falados ao focar cada item) -----------------------
const whereLabel = (w: { column: string; op: CompareOp; value?: string }) =>
  w.op === 'IS NULL' || w.op === 'IS NOT NULL'
    ? `${w.column} ${w.op}`
    : `${w.column} ${w.op} ${w.value}`;

const setLabel = (s: { column: string; value: SimValue | string }) => {
  const col = columns.value.find((c) => c.name === s.column);
  if (s.value === null || s.value === '') return `${s.column} = NULL`;
  // Chave estrangeira: o valor é um UUID, ilegível quando falado.
  if (col?.isForeignKey) return `${s.column} = registro escolhido`;
  return `${s.column} = ${s.value}`;
};

const menu = computed(() => {
  const q = query.value;
  const whereItem = {
    label: `WHERE: ${
      q.where.length
        ? q.where.map(whereLabel).join(' E ')
        : `sem condição (${isUpdate.value ? 'altera' : 'exclui'} TODOS os registros)`
    }`,
    action: () => go('WHERE_COL'),
  };
  if (isUpdate.value) {
    return {
      title: 'Comando UPDATE',
      items: [
        {
          label: `SET: ${q.sets.length ? q.sets.map(setLabel).join(', ') : 'nenhuma coluna escolhida'}`,
          action: () => go('SET_COL'),
        },
        whereItem,
        { label: 'Executar UPDATE', action: execute },
        { label: 'Limpar comando', action: clearQuery },
      ],
    };
  }
  return {
    title: 'Comando DELETE',
    items: [
      whereItem,
      { label: 'Executar DELETE', action: execute },
      { label: 'Limpar comando', action: clearQuery },
    ],
  };
});

function execute() {
  if (!table.value) return;
  const result = isUpdate.value
    ? simulator.runUpdate(table.value)
    : simulator.runDelete(table.value);
  if (result) tts.speakPhrase(result.spoken);
}

function clearQuery() {
  simulator.startWrite();
  tts.speakPhrase('Comando limpo.');
}

// --- Passos de escolha --------------------------------------------------------
interface Picker {
  title: string;
  items: { title: string }[];
  onPick: (index: number) => void;
}

const settable = computed(() =>
  table.value ? settableColumns(table.value) : [],
);

// Registros da tabela pai para a coluna de chave estrangeira em edição.
const fkChoices = computed(() => {
  const script = sqlGen.script.value;
  const col = columns.value.find((c) => c.name === pending.column);
  if (!script || !col || !col.isForeignKey) return [];
  const options = foreignKeyOptions(script, simulator.state.value, col).map(
    (o) => ({ title: o.label, value: o.value as SimValue }),
  );
  if (col.nullable) options.push({ title: 'Deixar vazio (NULL)', value: null });
  return options;
});

const addSet = (column: string, value: SimValue | string) => {
  const q = query.value;
  q.sets = [...q.sets.filter((s) => s.column !== column), { column, value }];
  toMenu();
};

const picker = computed<Picker | null>(() => {
  const q = query.value;
  const columnItems = columns.value.map((c) => ({ title: c.name }));

  switch (step.value) {
    case 'SET_COL':
      return {
        title: 'SET: escolha a coluna a alterar',
        items: [...settable.value.map((c) => ({ title: c.name })), { title: 'Limpar SET' }],
        onPick: (i) => {
          if (i >= settable.value.length) {
            q.sets = [];
            toMenu();
            return;
          }
          const col = settable.value[i];
          pending.column = col.name;
          if (col.isForeignKey && col.references) {
            if (fkChoices.value.length === 0) {
              speakError(
                `A tabela ${col.references.table} não tem registros para escolher.`,
              );
              return;
            }
            go('SET_FK');
          } else {
            go('SET_VALUE');
          }
        },
      };
    case 'SET_FK':
      return {
        title: `Escolha o novo registro para ${pending.column.replace(/_/g, ' ')}`,
        items: fkChoices.value.map((c) => ({ title: c.title })),
        onPick: (i) => addSet(pending.column, fkChoices.value[i].value),
      };
    case 'WHERE_COL':
      return {
        title: 'WHERE: escolha a coluna',
        items: [...columnItems, { title: 'Limpar WHERE' }],
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
    case 'WHERE_OP': {
      const col = columns.value.find((c) => c.name === pending.column);
      const ops = COMPARE_OPS.filter(
        (op) => op !== 'LIKE' || (col && kindOf(col) === 'text'),
      );
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
    default:
      return null;
  }
});

// --- Passos de digitação --------------------------------------------------------
interface Typed {
  title: string;
  allowEmpty: boolean;
  onSubmit: (value: string) => void;
}

const typed = computed<Typed | null>(() => {
  const q = query.value;
  const col = columns.value.find((c) => c.name === pending.column);
  if (!col) return null;

  if (step.value === 'SET_VALUE') {
    const prompt = describeColumnPrompt(col);
    return {
      title: prompt.title.replace(/^Valor de/, 'Novo valor de'),
      allowEmpty: prompt.allowEmpty,
      onSubmit: (value) => {
        const parsed = parseColumnInput(col, value);
        if (!parsed.ok) return speakError(parsed.error);
        addSet(col.name, value.trim());
      },
    };
  }
  if (step.value === 'WHERE_VALUE') {
    return {
      title: `Valor para ${pending.column} ${pending.op}. ${
        pending.op === 'LIKE' ? 'Use % para qualquer trecho, por exemplo A%.' : ''
      }`,
      allowEmpty: false,
      onSubmit: (value) => {
        const parsed = parseColumnInput(col, value);
        if (!parsed.ok) return speakError(parsed.error);
        q.where = [
          ...q.where,
          { column: pending.column, op: pending.op as CompareOp, value: value.trim() },
        ];
        toMenu();
      },
    };
  }
  return null;
});

// "Voltar" (Esc ou botão da barra de baixo) dentro de uma escolha volta só ao
// menu do comando. No próprio menu do comando, volta ao menu da tabela.
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

onBeforeUnmount(() => unregisterBack?.());
</script>

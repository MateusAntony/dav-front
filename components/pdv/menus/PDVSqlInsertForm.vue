<template>
  <FocusableSelect
    v-if="current && current.kind === 'fk'"
    :key="index"
    :title="current.title"
    :items="current.items"
    :should-translate="false"
    hide-help-hint
    @submit="onChooseForeignKey"
  />
  <FocusableInput
    v-else-if="current"
    :key="index"
    v-model="draft"
    :title="current.title"
    :allow-empty="current.allowEmpty"
    @submit="onTypeValue"
  />
</template>

<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import {
  describeColumnPrompt,
  foreignKeyOptions,
  parseColumnInput,
  type SimValue,
} from '~/src/utils/sql-simulator';

// INSERT digitado: uma coluna por vez (mesmo padrão dos outros formulários do
// sistema). Texto vazio = NULL, ou valor automático na chave primária UUID.
// Em chave estrangeira o usuário ESCOLHE um registro que já existe na tabela pai.
const tts = useTTS();
const backHandler = useBackHandler();
const menuStore = useMenuOptions();
const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();

const table = computed(() => sqlGen.selectedTable.value);
const index = ref(0);
const draft = ref('');
const collected = reactive<Record<string, SimValue | string>>({});

interface Step {
  kind: 'input' | 'fk';
  title: string;
  allowEmpty: boolean;
  items: { title: string }[];
  values: SimValue[];
}

const steps = computed<Step[]>(() => {
  const t = table.value;
  const script = sqlGen.script.value;
  if (!t || !script) return [];
  return t.columns.map((col) => {
    if (col.isForeignKey && col.references) {
      const options = foreignKeyOptions(script, simulator.state.value, col);
      const items = options.map((o) => ({ title: o.label }));
      const values = options.map((o) => o.value);
      if (col.nullable) {
        items.push({ title: 'Deixar vazio (NULL)' });
        values.push(null);
      }
      return {
        kind: 'fk' as const,
        title: `Escolha o registro de ${col.references.table} para ${col.name.replace(/_/g, ' ')}`,
        allowEmpty: col.nullable,
        items,
        values,
      };
    }
    const prompt = describeColumnPrompt(col);
    return {
      kind: 'input' as const,
      title: prompt.title,
      allowEmpty: prompt.allowEmpty,
      items: [],
      values: [],
    };
  });
});

const current = computed(() => steps.value[index.value]);

const finish = () => {
  const t = table.value;
  if (!t) return;
  const result = simulator.insert(t, { ...collected });
  menuStore.setActiveDerMenu(DerFlowEnum.SQL_TABLE_DETAIL);
  // Depois do título do menu da tabela (senão ele corta a mensagem).
  if (result) tts.speakAfterCurrent(result.spoken);
};

const next = () => {
  draft.value = '';
  if (index.value + 1 >= steps.value.length) {
    finish();
  } else {
    index.value += 1;
  }
};

const onTypeValue = (value: string) => {
  const t = table.value;
  if (!t) return;
  const col = t.columns[index.value];
  // Valida na hora: se o valor não serve, avisa e pede de novo.
  const parsed = parseColumnInput(col, value);
  if (!parsed.ok) {
    tts.speakPhrase(parsed.error);
    return;
  }
  collected[col.name] = value;
  next();
};

const onChooseForeignKey = (choice: number) => {
  const t = table.value;
  if (!t) return;
  const col = t.columns[index.value];
  collected[col.name] = steps.value[index.value].values[choice];
  next();
};

const goBack = () => {
  if (index.value > 0) {
    index.value -= 1;
    draft.value = '';
  } else {
    menuStore.setActiveDerMenu(DerFlowEnum.SQL_TABLE_DETAIL);
  }
};

// "Voltar" (Esc ou botão da barra de baixo) volta UMA pergunta; na primeira,
// volta ao menu da tabela.
let unregisterBack: (() => void) | null = null;
onMounted(() => {
  unregisterBack = backHandler.register(() => {
    goBack();
    return true;
  });
});
onBeforeUnmount(() => unregisterBack?.());

onBeforeMount(() => {
  const t = table.value;
  if (!t) {
    menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
    return;
  }
  // Chave estrangeira obrigatória sem nenhum registro no pai: não dá para inserir.
  const script = sqlGen.script.value;
  const blocked = t.columns.find(
    (col) =>
      script &&
      col.isForeignKey &&
      col.references &&
      !col.nullable &&
      foreignKeyOptions(script, simulator.state.value, col).length === 0,
  );
  if (blocked?.references) {
    tts.speakPhrase(
      `Antes, insira um registro na tabela ${blocked.references.table}. A coluna ${blocked.name} precisa apontar para um registro existente.`,
    );
    menuStore.setActiveDerMenu(DerFlowEnum.SQL_TABLE_DETAIL);
  }
});
</script>

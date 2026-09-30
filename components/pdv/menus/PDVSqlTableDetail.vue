<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';

const menuStore = useMenuOptions();
const tts = useTTS();
const sqlGen = useSqlGenerator();

const menu = ref();

function speakWholeTable() {
  const table = sqlGen.selectedTable.value;
  if (!table) return;
  const phrases = [
    table.explanation,
    ...table.columns.map((col) => `Coluna ${col.name}: ${sqlGen.columnCode(col)}`),
  ];
  tts.speakSequence(phrases);
}

function buildMenu() {
  const table = sqlGen.selectedTable.value;

  if (!table) {
    menu.value = {
      title: 'Tabela',
      items: [
        {
          label: 'Voltar',
          action: () => {
            sqlGen.selectTable(null);
            menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
          },
        },
      ],
    };
    return;
  }

  menu.value = {
    title: `Tabela ${table.name}`,
    items: [
      {
        label: 'Ouvir tabela inteira, coluna por coluna',
        action: speakWholeTable,
        infoText: table.explanation,
      },
      {
        label:
          sqlGen.codeMode.value === 'technical'
            ? 'Exibir código em texto simples (sem sintaxe de SQL)'
            : 'Exibir código SQL técnico (sintaxe padrão)',
        action: () => {
          sqlGen.toggleCodeMode();
          buildMenu();
        },
      },
      ...table.columns.map((col) => ({
        label: `${col.name}: ${sqlGen.columnCode(col)}`,
        action: () => tts.speakPhrase(sqlGen.columnCode(col)),
        infoText: col.explanation,
      })),
      {
        label: 'Voltar',
        action: () => {
          sqlGen.selectTable(null);
          menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
        },
      },
    ],
  };
}

onBeforeMount(buildMenu);
</script>
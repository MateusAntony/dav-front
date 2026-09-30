<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';

const menuStore = useMenuOptions();
const tts = useTTS();
const sqlGen = useSqlGenerator();

const menu = ref();

function speakSummary() {
  const script = sqlGen.script.value;
  if (!script) return;
  tts.speakPhrase(script.summary);
}

function buildMenu() {
  const script = sqlGen.script.value;

  if (!script || script.tables.length === 0) {
    menu.value = {
      title: 'Gerar SQL',
      items: [
        {
          label:
            'Nenhuma tabela pode ser gerada ainda. Crie ao menos uma entidade no diagrama.',
          action: () => {},
        },
        {
          label: 'Voltar',
          action: () => menuStore.setActiveDerMenu(DerFlowEnum.DEFAULT),
        },
      ],
    };
    return;
  }

  const items = [
    {
      label: 'Ouvir descrição geral do SQL gerado',
      action: speakSummary,
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
    ...script.tables.map((table) => ({
      label: table.label,
      action: () => {
        sqlGen.selectTable(table.id);
        menuStore.setActiveDerMenu(DerFlowEnum.SQL_TABLE_DETAIL);
      },
    })),
    {
      label: 'Exportar SQL como arquivo (.sql)',
      action: () => sqlGen.exportSql(),
    },
    {
      label: 'Voltar',
      action: () => menuStore.setActiveDerMenu(DerFlowEnum.DEFAULT),
    },
  ];

  menu.value = { title: 'Gerar SQL', items };
}

onBeforeMount(() => {
  sqlGen.build();
  sqlGen.selectTable(null); // painel visual mostra o script inteiro aqui
  buildMenu();
});
</script>
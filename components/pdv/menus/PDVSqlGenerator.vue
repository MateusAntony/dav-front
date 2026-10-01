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

// O texto simplificado existe só para ser OUVIDO; na tela aparece
// apenas o código técnico.
function speakSimpleExplanation() {
  const script = sqlGen.script.value;
  if (!script) return;
  tts.speakSequence(script.tables.map((table) => table.simpleCode));
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
      label: 'Ouvir explicação simplificada do SQL',
      action: speakSimpleExplanation,
      infoText:
        'Lê, em linguagem simples e sem a sintaxe do SQL, o que cada tabela guarda.',
    },
    ...script.tables.map((table) => ({
      label: table.label,
      action: () => {
        sqlGen.selectTable(table.id);
        menuStore.setActiveDerMenu(DerFlowEnum.SQL_TABLE_DETAIL);
      },
      infoText:
        'Abre a tabela e permite simular comandos SQL (SELECT, INSERT, UPDATE e DELETE) com dados de exemplo.',
    })),
    {
      label: 'Exportar SQL como arquivo (.sql)',
      action: () => sqlGen.exportSql(),
    },
  ];

  menu.value = { title: 'Gerar SQL', items };
}

onBeforeMount(() => {
  // Ao abrir "Gerar SQL" o painel mostra o SQL do diagrama inteiro; só
  // aparece o de uma tabela quando ela for escolhida na lista.
  sqlGen.build();
  buildMenu();
});
</script>
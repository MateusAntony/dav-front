<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import { speakableSql } from '~/src/utils/sql-speech';

const menuStore = useMenuOptions();
const tts = useTTS();
const sqlGen = useSqlGenerator();

const menu = ref();

// Fala o código SQL gerado do diagrama inteiro, linha por linha.
function speakSqlCode() {
  const script = sqlGen.script.value;
  if (!script) return;
  tts.speakSequence(speakableSql(script.technicalSql));
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
      label: 'Ouvir o código SQL gerado',
      action: speakSqlCode,
      infoText:
        'Lê em voz alta o código SQL do diagrama inteiro, linha por linha.',
    },
    {
      label: 'Ouvir explicação simplificada do SQL inteiro',
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
    })),
    {
      label: 'Exportar SQL como arquivo (.sql)',
      action: () => sqlGen.exportSql(),
    },
  ];

  // O título é falado ao abrir a tela: o SQL já foi gerado ao entrar aqui.
  menu.value = { title: 'SQL gerado', items };
}

onBeforeMount(() => {
  // Ao abrir "Gerar SQL" o painel mostra o SQL do diagrama inteiro; só
  // aparece o de uma tabela quando ela for escolhida na lista.
  sqlGen.build();
  buildMenu();
});
</script>
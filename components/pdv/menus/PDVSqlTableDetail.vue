<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import { speakableSql } from '~/src/utils/sql-speech';

const tts = useTTS();
const menuStore = useMenuOptions();
const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();

const menu = ref();

// Lê, literalmente, o SQL (CREATE TABLE) da tabela escolhida.
function speakTableSql() {
  const table = sqlGen.selectedTable.value;
  if (!table) return;
  tts.speakSequence(speakableSql(table.technicalCode));
}

function clearRecords() {
  simulator.clearAll();
  tts.speakPhrase('Registros de exemplo apagados.');
}

function buildMenu() {
  const table = sqlGen.selectedTable.value;

  // Sem tabela escolhida não há o que simular: volta para a lista de tabelas
  // (em vez de mostrar um menu vazio).
  if (!table) {
    menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
    return;
  }

  menu.value = {
    title: `Tabela ${table.name}`,
    items: [
      {
        label: 'Ouvir o SQL desta tabela',
        action: speakTableSql,
      },
      {
        label: 'INSERT: inserir um registro digitando os valores',
        action: () => menuStore.setActiveDerMenu(DerFlowEnum.SQL_INSERT),
      },
      {
        label: 'SELECT: montar e executar uma consulta',
        action: () => {
          simulator.startQuery(table.name);
          menuStore.setActiveDerMenu(DerFlowEnum.SQL_SELECT);
        },
      },
      {
        label: 'UPDATE: alterar registros',
        action: () => {
          // Sem nenhum registro não há o que alterar: pede o INSERT antes.
          const blocked = simulator.checkUpdateAllowed(table);
          if (blocked) {
            tts.speakPhrase(blocked.spoken);
            return;
          }
          simulator.startWrite();
          menuStore.setActiveDerMenu(DerFlowEnum.SQL_UPDATE);
        },
      },
      {
        label: 'DELETE: excluir registros',
        action: () => {
          simulator.startWrite();
          menuStore.setActiveDerMenu(DerFlowEnum.SQL_DELETE);
        },
      },
      {
        label: 'Limpar todos os registros de exemplo',
        action: clearRecords,
      },
    ],
  };
}

onBeforeMount(buildMenu);
</script>

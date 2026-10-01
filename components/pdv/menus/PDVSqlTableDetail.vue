<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import {
  commandExplanations,
  type SimCommand,
} from '~/src/utils/sql-simulator';

const tts = useTTS();
const menuStore = useMenuOptions();
const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();

const menu = ref();

// Ouve apenas a explicação geral da tabela. O detalhe de cada coluna já está
// na leitura do DER e não é repetido aqui.
function speakTable() {
  const table = sqlGen.selectedTable.value;
  if (!table) return;
  tts.speakPhrase(`${table.label}. ${table.explanation}`);
}

// Executa um comando na tabela: o resultado aparece na tabela exibida na tela
// (PDVSqlTableSimulation) e um resumo curto é falado.
function runCommand(command: SimCommand) {
  const table = sqlGen.selectedTable.value;
  if (!table) return;
  const result = simulator.run(command, table);
  if (result) tts.speakPhrase(result.spoken);
}

function clearRecords() {
  simulator.reset();
  tts.speakPhrase('Registros de exemplo apagados. A simulação recomeçou.');
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
        label: 'Ouvir explicação desta tabela',
        action: speakTable,
        infoText: table.explanation,
      },
      {
        label: 'SELECT: consultar os registros',
        action: () => runCommand('SELECT'),
        infoText: commandExplanations.SELECT,
      },
      {
        label: 'INSERT: inserir um registro de exemplo',
        action: () => runCommand('INSERT'),
        infoText: commandExplanations.INSERT,
      },
      {
        label: 'UPDATE: alterar um registro',
        action: () => runCommand('UPDATE'),
        infoText: commandExplanations.UPDATE,
      },
      {
        label: 'DELETE: excluir um registro',
        action: () => runCommand('DELETE'),
        infoText: commandExplanations.DELETE,
      },
      {
        label: 'Limpar registros de exemplo',
        action: clearRecords,
        infoText:
          'Apaga todos os registros de exemplo de todas as tabelas e recomeça a simulação do zero.',
      },
    ],
  };
}

onBeforeMount(buildMenu);
</script>
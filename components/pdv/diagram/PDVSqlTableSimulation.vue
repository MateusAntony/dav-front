<template>
  <section
    v-if="table"
    class="sql-sim printable-diagram"
    aria-labelledby="sql-sim-title"
  >
    <h2 id="sql-sim-title" class="sql-sim__title">Tabela {{ table.name }}</h2>

    <p class="sql-sim__label">Estrutura (CREATE TABLE)</p>
    <pre class="sql-sim__code"><code>{{ table.technicalCode }}</code></pre>

    <div v-if="previewSql" class="sql-sim__result">
      <p class="sql-sim__label">Comando que está sendo montado</p>
      <pre class="sql-sim__code"><code>{{ previewSql }}</code></pre>
    </div>

    <div
      v-if="result"
      class="sql-sim__result"
      :class="result.ok ? 'is-ok' : 'is-error'"
    >
      <p class="sql-sim__label">Último comando simulado: {{ result.command }}</p>
      <pre class="sql-sim__code"><code>{{ result.sql }}</code></pre>
      <p class="sql-sim__message">{{ result.message }}</p>
    </div>

    <div v-if="result?.resultSet" class="sql-sim__table-wrapper">
      <table class="sql-sim__table">
        <caption>
          Resultado do SELECT ({{ result.resultSet.rows.length }})
        </caption>
        <thead>
          <tr>
            <th v-for="col in result.resultSet.columns" :key="col" scope="col">
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="result.resultSet.rows.length === 0">
            <td :colspan="result.resultSet.columns.length" class="sql-sim__empty">
              Nenhum registro encontrado.
            </td>
          </tr>
          <tr v-for="(row, index) in result.resultSet.rows" :key="index">
            <td v-for="col in result.resultSet.columns" :key="col">
              {{ display(row[col]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Com um SELECT executado, só o resultado dele é mostrado: os registros
         da tabela ficam escondidos para não misturar as duas tabelas. -->
    <div v-if="!result?.resultSet" class="sql-sim__table-wrapper">
      <table class="sql-sim__table">
        <caption>
          Registros da tabela {{ table.name }} ({{ rows.length }})
        </caption>
        <thead>
          <tr>
            <th v-for="col in table.columns" :key="col.name" scope="col">
              {{ col.name }}
              <span v-if="col.isPrimaryKey" class="sql-sim__badge">PK</span>
              <span v-if="col.isForeignKey" class="sql-sim__badge is-fk">
                FK
              </span>
              <small class="sql-sim__type">{{ col.sqlType }}</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="table.columns.length" class="sql-sim__empty">
              Nenhum registro.
            </td>
          </tr>
          <tr v-for="(row, index) in rows" :key="index" :class="rowClass(index)">
            <td v-for="col in table.columns" :key="col.name">
              {{ display(row[col.name]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import {
  buildDeleteSql,
  buildSelectSql,
  buildUpdateSql,
  type SimValue,
} from '~/src/utils/sql-simulator';

const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();
const menuStore = useMenuOptions();

const table = computed(() => sqlGen.selectedTable.value);
const rows = computed(() => simulator.rowsOf(table.value));
const result = computed(() => simulator.resultFor(table.value));
// Comando que está sendo montado (SELECT, UPDATE ou DELETE), mostrado ao vivo.
const previewSql = computed(() => {
  const t = table.value;
  if (!t) return '';
  switch (menuStore.activeDerMenu) {
    case DerFlowEnum.SQL_SELECT:
      return buildSelectSql(simulator.query.value, t);
    case DerFlowEnum.SQL_UPDATE:
      return buildUpdateSql(t.name, simulator.writeQuery.value, t);
    case DerFlowEnum.SQL_DELETE:
      return buildDeleteSql(t.name, simulator.writeQuery.value, t);
    default:
      return '';
  }
});

const display = (value: SimValue | undefined) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

// INSERT e UPDATE destacam as linhas afetadas na tabela de registros.
const rowClass = (index: number) => {
  const r = result.value;
  if (!r || !r.highlight.includes(index)) return '';
  if (r.command === 'INSERT') return 'is-inserted';
  if (r.command === 'UPDATE') return 'is-updated';
  return '';
};
</script>

<style scoped>
.sql-sim {
  width: 100%;
  min-height: 100dvh;
  border: var(--border-style);
  margin-top: 32px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
}
.sql-sim__title {
  margin: 0 0 12px;
}
.sql-sim__label {
  font-weight: bold;
  margin: 12px 0 6px;
}
.sql-sim__code {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
}
.sql-sim__result {
  margin: 16px 0;
  padding: 8px 12px;
  border: var(--border-style);
  border-left-width: 8px;
}
/* O estado nunca depende só da cor: há sempre texto explicando o resultado. */
.sql-sim__result.is-ok {
  border-left-color: #1b7f3b;
}
.sql-sim__result.is-error {
  border-left-color: #b3261e;
}
.sql-sim__message {
  margin: 8px 0 0;
  font-weight: bold;
}
.sql-sim__table-wrapper {
  overflow-x: auto;
  margin-top: 16px;
}
.sql-sim__table {
  border-collapse: collapse;
  width: 100%;
}
.sql-sim__table caption {
  text-align: left;
  font-weight: bold;
  margin-bottom: 6px;
}
.sql-sim__table th,
.sql-sim__table td {
  border: var(--border-style);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
.sql-sim__table td {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}
.sql-sim__type {
  display: block;
  font-weight: normal;
  opacity: 0.8;
}
.sql-sim__badge {
  display: inline-block;
  margin-left: 4px;
  padding: 0 4px;
  border: var(--border-style);
  font-size: 0.75rem;
}
.sql-sim__empty {
  text-align: center !important;
  font-family: inherit !important;
}
/* Linhas destacadas também ganham um contorno, não só cor. */
tr.is-updated td {
  background-color: rgba(255, 193, 7, 0.3);
  font-weight: bold;
}
tr.is-inserted td {
  background-color: rgba(27, 127, 59, 0.2);
  font-weight: bold;
}
</style>

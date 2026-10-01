<template>
  <section
    v-if="table"
    class="sql-sim printable-diagram"
    aria-labelledby="sql-sim-title"
  >
    <h2 id="sql-sim-title" class="sql-sim__title">Tabela {{ table.name }}</h2>

    <p class="sql-sim__label">Estrutura (CREATE TABLE)</p>
    <pre class="sql-sim__code"><code>{{ table.technicalCode }}</code></pre>

    <div
      v-if="result"
      class="sql-sim__result"
      :class="result.ok ? 'is-ok' : 'is-error'"
    >
      <p class="sql-sim__label">Último comando simulado: {{ result.command }}</p>
      <pre class="sql-sim__code"><code>{{ result.sql }}</code></pre>
      <p class="sql-sim__message">{{ result.message }}</p>
    </div>
    <p v-else class="sql-sim__hint">
      Use as opções do menu (SELECT, INSERT, UPDATE e DELETE) para simular
      comandos. Os registros abaixo são apenas exemplos genéricos criados pelo
      sistema, guardados só na memória — nada é salvo em banco de dados.
    </p>

    <div class="sql-sim__table-wrapper">
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
              Nenhum registro. Use INSERT para adicionar um.
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
import type { SimValue } from '~/src/utils/sql-simulator';

const sqlGen = useSqlGenerator();
const simulator = useSqlSimulator();

const table = computed(() => sqlGen.selectedTable.value);
const rows = computed(() => simulator.rowsOf(table.value));
const result = computed(() => simulator.resultFor(table.value));

const display = (value: SimValue | undefined) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const rowClass = (index: number) => {
  const r = result.value;
  if (!r || !r.highlight.includes(index) || !r.highlightKind) return '';
  return `is-${r.highlightKind}`;
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
.sql-sim__hint {
  margin: 16px 0;
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
tr.is-inserted td {
  background-color: rgba(27, 127, 59, 0.2);
  font-weight: bold;
}
tr.is-updated td {
  background-color: rgba(255, 193, 7, 0.3);
  font-weight: bold;
}
tr.is-selected td {
  background-color: rgba(30, 100, 200, 0.12);
}
</style>
<template>
  <div class="sql-code-view printable-diagram">
    <p class="sql-code-view__label">
      {{ sqlGen.codeMode.value === 'technical' ? 'SQL (sintaxe técnica)' : 'SQL (texto simples)' }}
    </p>
    <pre class="sql-code-view__code"><code>{{ sqlGen.displayedCode.value || 'Nenhuma tabela gerada ainda.' }}</code></pre>
  </div>
</template>

<script setup lang="ts">
const sqlGen = useSqlGenerator();
</script>

<style scoped>
.sql-code-view {
  width: 100%;
  min-height: 100dvh;
  border: var(--border-style);
  margin-top: 32px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
}
.sql-code-view__label {
  font-weight: bold;
  margin-bottom: 8px;
}
.sql-code-view__code {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  line-height: 1.5;
}
</style>
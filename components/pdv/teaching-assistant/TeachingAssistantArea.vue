<template>
  <div>
    <button
      tabindex="-1"
      aria-hidden
      class="hide-or-show-btn"
      @click="showTAM = !showTAM"
    >
      {{
        showTAM ? $t('message.hide_assistant') : $t('message.show_assistant')
      }}
    </button>
    <div v-if="showTAM" class="teaching-assistant-menu">
      <PDVJson v-if="diagramTool.parsedDiagram.value" class="assistant-item" />
      <PDVTtsHistory class="assistant-item" />
    </div>
  </div>
  <PDVDiagram v-if="diagramTool.diagram.value" />
</template>
<script setup lang="ts">
const diagramTool = useDiagram();
const showTAM = ref(true);
</script>
<style scoped scss>
.teaching-assistant-menu {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-top: 32px;
  height: 200px;
  gap: 16px;
}
.assistant-item {
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  flex: 1 1 50%;
  padding: 8px !important;
  border: var(--border-style) !important;
}

.assistant-item:first {
  margin-right: 16px !important;
}

.hide-or-show-btn {
  display: inline-flex;
  padding: 10px;
  background-color: var(--high-contrast-button-bg);
  border: var(--high-contrast-button-border) !important;
  color: #ffffff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.option:focus-within {
  border: var(--focus-border-style) !important;
  background-color: var(--focus-background-color);
  color: var(--high-contrast-text-color);
}
</style>

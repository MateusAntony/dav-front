<template>
  <p ref="initialFocus" :tabindex="-1" />
  <div class="pdv-menu-summary">
    <table>
      <thead>
        <tr class="menu-item">
          <th colspan="2">
            <FocusableElement ref="tableTitle" :title="menu.title">
              {{ menu.title }}
            </FocusableElement>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in menu.items" :key="index" class="menu-item">
          <td colspan="2">
            <FocusableElement
              :title="item.label"
              :help-flag="Boolean(item.infoText)"
              :complement-text="item.complementText"
              @click="item.action"
              @keydown="(event) => readInfoText(event, $t(item.infoText ?? ''))"
            >
              {{ item.label }}
            </FocusableElement>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Menu } from '~/src/interfaces/pdv-menu';

interface PDVMenuProps {
  menu: Menu;
}

defineProps<PDVMenuProps>();
const tts = useTTS();
const ttsStore = useTtsStore();

const initialFocus = ref();
const tableTitle = ref();

const readInfoText = (event: KeyboardEvent, infoText: string) => {
  if (event.key === 'F1' && infoText) {
    event.preventDefault();
    tts.speakPhrase(infoText, true);
    
  }
};

onMounted(async () => {
  await nextTick();
  if (ttsStore.hasUserInteracted) {
    tableTitle.value.focusableRef.focus();
  } else {
    initialFocus.value.focus();
  }
});
</script>

<style scoped>
.pdv-menu-summary {
  width: 50%;
  text-align: center;
  border-collapse: collapse;
}

table {
  border-spacing: 0;
  width: 100%;
}

th {
  border: var(--border-style);
  font-size: 1.5rem;
  font-weight: bold;
  background-color: var(--neutral-color);
  cursor: default;
}

.menu-item td {
  background-color: var(--neutral-color);
  border: var(--border-style);
  cursor: pointer;
}

.menu-item td:focus-within,
.menu-item th:focus-within {
  border: var(--focus-border-style);
  background-color: var(--focus-background-color);
  color: var(--high-contrast-text-color);
}
</style>

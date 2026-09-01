<template>
  <div class="focusable-select">
    <table>
      <thead>
        <tr class="focusable-select-title">
          <th colspan="2">
            <FocusableElement ref="selectTitle" :title="title" help-flag>
              {{ title }}
            </FocusableElement>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in items"
          :key="index"
          class="focusable-select-item"
        >
          <td>
            <FocusableElement
              :title="shouldTranslate ? $t(item.title) : item.title"
              @click="() => handleSubmit(index)"
              @keydown="(event) => readInfoText(event, $t(item.infotext ?? ''))"
            >
              {{ shouldTranslate ? $t(item.title) : item.title }}
            </FocusableElement>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
interface FocusableSelectProps {
  title: string;
  items: {
    title: string;
    infotext?: string;
  }[];
  helpFlag?: boolean;
  shouldTranslate?: boolean;
}

const { title, items, helpFlag } = defineProps<FocusableSelectProps>();

const tts = useTTS();

const emit = defineEmits(['submit']);

const readInfoText = (event: KeyboardEvent, infoText: string) => {
  if (event.key === 'F1' && helpFlag) {
    event.preventDefault();
    tts.speakPhrase(infoText, true);
  }
};

const handleSubmit = (index: number) => {
  emit('submit', index);
};

const selectTitle = ref();

onMounted(() => {
  nextTick();
  selectTitle.value.focusableRef.focus();
});
</script>

<style scoped>
.focusable-select {
  width: 50%;
  text-align: center;
}

table {
  width: 100%;
  border-collapse: collapse; /* Colapsa bordas */
}

th {
  border: var(--border-style);
  font-size: 1.5rem;
  font-weight: bold;
  background-color: var(--n eutral-color);
  cursor: default;
  text-align: center; /* Centraliza o título */
}

.focusable-select-item td {
  background-color: var(--n eutral-color);
  border: var(--border-style);
}

.focusable-select-item td:focus-within,
.focusable-select-title th:focus-within {
  border: var(--focus-border-style);
  background-color: var(--focus-background-color);
  color: var(--high-contrast-text-color);
}
</style>

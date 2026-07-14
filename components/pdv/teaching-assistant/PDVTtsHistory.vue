<template>
  <div ref="phraseHistory" class="phrase-history">
    <ul v-if="ttsStore.history.length">
      <li v-for="(phrase, index) in ttsStore.history" :key="index">
        {{ phrase }}
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
const ttsStore = useTtsStore();
const phraseHistory = ref();

watch(
  ttsStore.history,
  async () => {
    await nextTick();
    if (phraseHistory.value) {
      phraseHistory.value.scrollTop = phraseHistory.value.scrollHeight;
    }
  },
  { deep: true },
);
</script>
<style scoped css>
ul {
  list-style-type: none;
}
.phrase-history li:last-child {
  font-weight: bold;
}
</style>

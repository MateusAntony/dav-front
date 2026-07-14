<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
const { t } = useI18n();
const menu = ref();
const tts = useTTS();

onBeforeMount(() => {
  menu.value = {
    title: t('menu.tts.title'),
    items: [
      {
        label: t('menu.tts.options.increase'),
        action: () => {
          tts.updateTTSPreferences(true);
        },
      },
      {
        label: t('menu.tts.options.decrease'),
        action: () => {
          tts.updateTTSPreferences(false);
        },
      },
    ],
  };
});
</script>

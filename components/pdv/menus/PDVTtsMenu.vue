<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
const { t } = useI18n();
const menu = ref();
const tts = useTTS();

function buildMenu() {
  menu.value = {
    title: t('menu.tts.title'),
    items: [
      {
        label: tts.isVoiceEnabled.value
          ? t('menu.tts.options.disable_voice')
          : t('menu.tts.options.enable_voice'),
        action: () => {
          tts.toggleVoice();
          buildMenu();
        },
      },
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
}

onBeforeMount(buildMenu);
</script>
<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { VOICE_NAVIGATION_ENABLED } from '~/src/constants/features';

const { t } = useI18n();
const menu = ref();
const tts = useTTS();
const voiceNav = useVoiceNavigation();

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
      // Navegação por voz: desligada por enquanto (src/constants/features.ts).
      ...(VOICE_NAVIGATION_ENABLED
        ? [
            {
              label: voiceNav.isListening.value
                ? 'Desativar navegação por comandos de voz'
                : 'Ativar navegação por comandos de voz',
              action: () => {
                voiceNav.toggle();
                buildMenu();
              },
              infoText:
                'Depois de ativar, diga próximo, anterior, selecionar, ajuda, voltar, início, ou parar.',
            },
          ]
        : []),
    ],
  };
}

onBeforeMount(buildMenu);
</script>
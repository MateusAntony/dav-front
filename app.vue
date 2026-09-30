<template>
  <NuxtLayout>
    <NuxtLoadingIndicator :height="5" :duration="3000" :throttle="400" />
    <v-app style="height: 100dvh; width: 100dvw" @keydown="handleKeydown">
      <NuxtPage />
    </v-app>
  </NuxtLayout>
</template>
<script setup lang="ts">
const { hotkeys } = useKeyboardNavigation();
const voiceNav = useVoiceNavigation();

const handleKeydown = (event: KeyboardEvent) => {
  // Com a navegação por voz ativa, o teclado físico de setas fica
  // desligado (é voz OU teclado por vez). Essa checagem fica aqui, no
  // app.vue, e não dentro de use-keyboard-navigation.ts, de propósito:
  // colocá-la lá criaria uma dependência circular entre
  // use-keyboard-navigation.ts e use-voice-navigation.ts (um chamando o
  // outro), o que quebra a renderização no servidor (SSR).
  if (voiceNav.isListening.value) return;
  hotkeys(event);
};
</script>
<style>
@import 'vue-draggable-resizable/style.css';
</style>
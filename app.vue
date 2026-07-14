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

const handleKeydown = (event: KeyboardEvent) => {
  hotkeys(event);
};
</script>
<style>
@import 'vue-draggable-resizable/style.css';
</style>

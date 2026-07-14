<template>
  <v-container>
    <div class="menu">
      <PDVMainMenu v-if="menu.activeMainMenu === PDVMenusEnum.DEFAULT" />
      <PDVDerMenu v-else-if="menu.activeMainMenu === PDVMenusEnum.PROJECTS" />
      <PDVTtsMenu v-else-if="menu.activeMainMenu === PDVMenusEnum.TTS" />
    </div>
    <NavigationMenu />
    <div :tabindex="-1" aria-hidden="true" :style="{ marginTop: '32px' }">
      <TeachingAssistantArea />
    </div>
  </v-container>
</template>
<script setup lang="ts">
import { PDVMenusEnum } from '~/src/interfaces/pdv-menu';
const menu = useMenuOptions();
</script>
<style lang="css" scoped>
.menu {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum, PDVMenusEnum } from '~/src/interfaces/pdv-menu';

const { t } = useI18n();
const menuStore = useMenuOptions();
const authStore = useAuthStore();

const menu = ref({
  title: t('menu.main.title'),
  items: [
    {
      label: authStore.token
        ? t('menu.main.options.my_projects')
        : t('menu.main.options.example_project'),
      action: () => {
        menuStore.setActiveMainMenu(PDVMenusEnum.PROJECTS);
        menuStore.setActiveDerMenu(DerFlowEnum.DEFAULT);
      },
    },
    {
      label: t('menu.main.options.tts_options'),
      action: () => {
        menuStore.setActiveMainMenu(PDVMenusEnum.TTS);
      },
    },
  ],
});
</script>
<style scoped lang="css">
.menu {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

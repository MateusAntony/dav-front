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
        menuStore.setDiagramListMode('own');
        menuStore.setActiveMainMenu(PDVMenusEnum.PROJECTS);
        // Logado: vai direto para a lista de projetos. Ir para o menu do
        // diagrama (DEFAULT) deixava "Gerar SQL" clicável, por alguns
        // instantes, sobre o diagrama antigo (ex.: o exemplo do convidado)
        // enquanto a lista ainda carregava.
        menuStore.setActiveDerMenu(
          authStore.token ? DerFlowEnum.DIAGRAM_LIST : DerFlowEnum.DEFAULT,
        );
      },
    },
    ...(authStore.token
      ? [
          {
            label: 'Projetos compartilhados',
            action: () => {
              menuStore.setDiagramListMode('shared');
              menuStore.setActiveMainMenu(PDVMenusEnum.PROJECTS);
              menuStore.setActiveDerMenu(DerFlowEnum.DIAGRAM_LIST);
            },
          },
        ]
      : []),
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
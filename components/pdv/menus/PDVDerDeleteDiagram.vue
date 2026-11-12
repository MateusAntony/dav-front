<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const { t } = useI18n();

const menu = ref({
  title: t('menu.der_flow.titles.delete_diagram', {
    project: diagramTool.diagram.value?.name,
  }),
  items: [
    {
      label: t('common.confirm'),
      action: () => {
        diagramTool.deleteDiagram();
      },
      infoText: t('message.delete_diagram'),
    },
    {
      label: t('common.cancel'),
      action: () => {
        menuStore.setActiveDerMenu(DerFlowEnum.DEFAULT);
      },
    },
  ],
});
</script>

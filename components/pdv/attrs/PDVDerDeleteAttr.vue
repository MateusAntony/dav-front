<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const { t } = useI18n();

const menu = ref({
  title: t('menu.der_flow.titles.delete_attribute', {
    attribute: diagramTool.getAttribute().name,
  }),
  items: [
    {
      label: t('common.confirm'),
      action: () => {
        diagramTool?.removeAttribute();
      },
    },
    {
      label: t('common.cancel'),
      action: () => {
        menuStore.setActiveDerMenu(DerFlowEnum.ATTR_OPTIONS);
      },
    },
  ],
});
</script>

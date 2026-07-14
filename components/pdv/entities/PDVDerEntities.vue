<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum, type Menu } from '~/src/interfaces/pdv-menu';

const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const derStore = useDerOptions();
const { t } = useI18n();

const menu = ref({
  title: '',
  items: [],
} as Menu);

onBeforeMount(() => {
  menu.value.title = t('menu.der_flow.titles.entity_list', {
    diagram: diagramTool.diagram.value?.name,
  });
  diagramTool.diagram.value?.entities.forEach((entity) => {
    menu.value.items.push({
      label: entity.name,
      action: () => {
        menuStore.setActiveDerMenu(DerFlowEnum.ENTITY_OPTIONS);
        derStore.setCurrentEntityId(entity.id);
      },
    });
  });
});
</script>

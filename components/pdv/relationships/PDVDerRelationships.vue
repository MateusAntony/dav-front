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
  const diagram = diagramTool.diagram.value;
  if (diagram) {
    menu.value.title = t('menu.der_flow.titles.relationships_list', {
      diagram: diagram?.name,
    });
  }
  if (diagram?.relationships.length) {
    diagram?.relationships.forEach((relationship) => {
      menu.value.items.push({
        label: relationship.name,
        action: () => {
          menuStore.setActiveDerMenu(DerFlowEnum.RELATIONSHIP_OPTIONS);
          derStore.setCurrentRelationshipId(relationship.id);
        },
      });
    });
  }
});
</script>

<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';

const MAX_DIAGRAMS = 3;

const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const { t } = useI18n();

const menu = ref();

function buildMenu() {
  const items = diagramTool.diagramsList.value.map((d: any) => ({
    label: d.name,
    action: () => diagramTool.selectDiagram(d.id),
  }));

  if (diagramTool.diagramsList.value.length < MAX_DIAGRAMS) {
    items.push({
      label: t('menu.projects.options.new_project'),
      action: () => menuStore.setActiveDerMenu(DerFlowEnum.NEW_DIAGRAM),
    });
  }

  menu.value = {
    title: t('menu.project_list.title'),
    items,
  };
}

onBeforeMount(buildMenu);
</script>
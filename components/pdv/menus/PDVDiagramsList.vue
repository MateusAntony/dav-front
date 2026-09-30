<template>
  <PDVMenu v-if="menu" :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';

const MAX_DIAGRAMS = 3;

const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const { t } = useI18n();

const menu = ref();

function buildMenu() {
  const isSharedMode = menuStore.diagramListMode === 'shared';
  const filtered = diagramTool.diagramsList.value.filter((d: any) =>
    isSharedMode ? d.is_owner === false : d.is_owner !== false,
  );

  const items: any[] = filtered.map((d: any) => ({
    label: d.name,
    action: () => diagramTool.selectDiagram(d.id),
  }));

  if (isSharedMode) {
    if (items.length === 0) {
      items.push({
        label: 'Nenhum diagrama foi compartilhado com você ainda.',
        action: () => {},
      });
    }
  } else if (filtered.length < MAX_DIAGRAMS) {
    items.push({
      label: t('menu.projects.options.new_project'),
      action: () => menuStore.setActiveDerMenu(DerFlowEnum.NEW_DIAGRAM),
    });
  }

  menu.value = {
    title: isSharedMode
      ? 'Projetos compartilhados comigo'
      : t('menu.project_list.title'),
    items,
  };
}

watch(
  () => [diagramTool.diagramsList.value, menuStore.diagramListMode],
  buildMenu,
  { deep: true, immediate: true },
);
</script>
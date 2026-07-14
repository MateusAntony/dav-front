<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum, type Menu } from '~/src/interfaces/pdv-menu';

const { getEntity } = useDiagram();
const menuStore = useMenuOptions();
const derStore = useDerOptions();
const { t } = useI18n();

const menu = ref({
  title: '',
  items: [],
} as Menu);

onBeforeMount(() => {
  const entity = getEntity();
  menu.value.title = t('menu.der_flow.titles.attribute_list', {
    entity: entity?.name,
  });
  if (entity?.attrs) {
    entity?.attrs.forEach((attr) => {
      menu.value.items.push({
        label: attr.name,
        action: () => {
          menuStore.setActiveDerMenu(DerFlowEnum.ATTR_OPTIONS);
          derStore.setCurrentAttrId(attr.id);
        },
      });
    });
  }
});
</script>

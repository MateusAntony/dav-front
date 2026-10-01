<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import { FormScope } from '~/stores/menu.store';

const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const { t } = useI18n();

const readItem = {
  label: t('menu.der_flow.options.relationship.readOnly'),
  action: () => {
    diagramTool.readRelationship();
  },
};

const editItems = [
  {
    label: t('menu.der_flow.options.relationship.edit'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.NEW_RELATIONSHIP);
      menuStore.setScope(FormScope.EDIT);
    },
  },
  {
    label: t('menu.der_flow.options.relationship.delete'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.DELETE_RELATIONSHIP);
    },
  },
];

// Quem só tem acesso de leitura vê apenas a leitura do relacionamento.
const menu = ref({
  title: t('menu.der_flow.titles.relationship_options', {
    relationship: diagramTool.getRelationship()?.name,
  }),
  items: diagramTool.isReadOnly.value ? [readItem] : [readItem, ...editItems],
});
</script>
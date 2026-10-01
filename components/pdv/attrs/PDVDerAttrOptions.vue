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
  label: 'Leitura do atributo',
  action: () => {
    diagramTool.readAttribute();
  },
};

const editItems = [
  {
    label: t('menu.der_flow.options.entity.attribute.edit'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.NEW_ATTR);
      menuStore.setScope(FormScope.EDIT);
    },
  },
  {
    label: t('menu.der_flow.options.entity.attribute.delete'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.DELETE_ATTR);
    },
  },
];

// Quem só tem acesso de leitura vê apenas a leitura; edição e exclusão
// ficam restritas ao dono do diagrama.
const menu = ref({
  title: t('menu.der_flow.titles.attribute_options', {
    attribute: diagramTool.getAttribute()?.name,
  }),
  items: diagramTool.isReadOnly.value ? [readItem] : [readItem, ...editItems],
});
</script>
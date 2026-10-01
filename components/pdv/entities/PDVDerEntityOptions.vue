<template>
  <PDVMenu :menu="menu" />
</template>
<script setup lang="ts">
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import { FormScope } from '~/stores/menu.store';

const diagramTool = useDiagram();
const menuStore = useMenuOptions();
const { t } = useI18n();
const tts = useTTS();

const readOnly = diagramTool.isReadOnly.value;

// Opções de leitura: valem para todos, inclusive quem só tem acesso de leitura.
const readItems = [
  {
    label: t('menu.der_flow.options.entity.attribute.navigate'),
    action: () => {
      if (hasAttrs()) {
        menuStore.setActiveDerMenu(DerFlowEnum.ATTRS);
      }
    },
  },
  {
    label: t('menu.der_flow.options.entity.attribute.read'),
    action: () => {
      if (hasAttrs()) {
        diagramTool.readEntityAttrs();
      }
    },
  },
];

// Opções de edição: só para o dono do diagrama.
const createAttrItem = {
  label: t('menu.der_flow.options.entity.attribute.create'),
  action: () => {
    menuStore.setActiveDerMenu(DerFlowEnum.NEW_ATTR);
    menuStore.setScope(FormScope.CREATE);
  },
  infoText: t('der.explanation.attribute'),
};
const editItems = [
  {
    label: t('menu.der_flow.options.entity.update_name'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.NEW_ENTITY);
      menuStore.setScope(FormScope.EDIT);
    },
  },
  {
    label: t('menu.der_flow.options.entity.delete'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.DELETE_ENTITY);
    },
    complementText: t('message.delete_entity'),
  },
];

const menu = ref({
  title: t('menu.der_flow.titles.entity_options', {
    entity: diagramTool.getEntity()?.name,
  }),
  items: readOnly
    ? readItems
    : [createAttrItem, ...readItems, ...editItems],
});

function hasAttrs() {
  if (diagramTool.getEntity()?.attrs?.length === 0) {
    tts.speakPhrase(t('message.has_no_attributes'));
    return false;
  }
  return true;
}
</script>
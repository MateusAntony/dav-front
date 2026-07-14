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

const menu = ref({
  title: t('menu.der_flow.titles.entity_options', {
    entity: diagramTool.getEntity()?.name,
  }),
  items: [
    {
      label: t('menu.der_flow.options.entity.attribute.create'),
      action: () => {
        menuStore.setActiveDerMenu(DerFlowEnum.NEW_ATTR);
        menuStore.setScope(FormScope.CREATE);
      },
      infoText: t('der.explanation.attribute'),
    },
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
  ],
});

function hasAttrs() {
  if (diagramTool.getEntity()?.attrs?.length === 0) {
    tts.speakPhrase(t('message.has_no_attributes'));
    return false;
  }
  return true;
}
</script>

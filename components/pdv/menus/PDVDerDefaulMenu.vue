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

const menu = ref();

onBeforeMount(() => {
  menu.value = {
    title: t('menu.der_flow.titles.default', {
      project: diagramTool.diagram.value?.name,
    }),
    items: [
      ...(diagramTool.isReadOnly.value
        ? [{ label: 'Este diagrama foi compartilhado com você somente para leitura.', action: () => {} }]
        : [
      {
        label: t('menu.der_flow.options.entity.create'),
        action: () => {
          menuStore.setActiveDerMenu(DerFlowEnum.NEW_ENTITY);
          menuStore.setScope(FormScope.CREATE);
        },
        infoText: t('der.explanation.entity'),
      },
      {
        label: t('menu.der_flow.options.entity.navigate'),
        action: () => {
          if (hasEntities()) {
            menuStore.setActiveDerMenu(DerFlowEnum.ENTITIES);
          }
        },
      },
      {
        label: t('menu.der_flow.options.entity.read'),
        action: () => {
          if (hasEntities()) {
            diagramTool.readAllEntities();
          }
        },
      },
      {
        label: t('menu.der_flow.options.relationship.create'),
        action: createRelationships,
        infoText: t('der.explanation.relationship'),
      },
      {
        label: t('menu.der_flow.options.relationship.navigate'),
        action: () => {
          if (hasRelationships()) {
            menuStore.setActiveDerMenu(DerFlowEnum.RELATIONSHIPS);
          }
        },
      },
      {
        label: t('menu.der_flow.options.relationship.read'),
        action: () => {
          if (hasRelationships()) {
            diagramTool.readAllRelationships();
          }
        },
      },
      {
        label: t('menu.der_flow.options.diagram.read'),
        action: () => {
          if (hasEntities()) {
            diagramTool.readDiagram();
          }
        },
      },
      {
        label: t('menu.der_flow.options.diagram.generate_sql'),
        action: () => {
          if (hasEntities()) {
            menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
          }
        },
        infoText: t('message.sql_generator_helper'),
      },
      {
        label: 'Compartilhar diagrama',
        action: () => menuStore.setActiveDerMenu(DerFlowEnum.SHARE_DIAGRAM),
        infoText: 'Convide outro usuário para visualizar o diagrama ou exporte em PDF.',
      },
      {
        label: 'Reorganizar diagrama automaticamente',
        action: () => {
          diagramTool.reorganizeDiagram(true);
          tts.speakPhrase('Diagrama reorganizado.');
        },
        infoText:
          'Reposiciona todas as entidades e relacionamentos em uma grade organizada, desfazendo qualquer posição manual anterior.',
      },
        ]),
    ],
  };
});

function hasEntities() {
  if (
    diagramTool.diagram.value &&
    diagramTool.diagram.value?.entities.length === 0
  ) {
    tts.speakPhrase(t('message.has_no_entities'));
    return false;
  }
  return true;
}

function hasRelationships() {
  if (
    diagramTool.diagram.value &&
    diagramTool.diagram.value?.relationships.length === 0
  ) {
    tts.speakPhrase(t('message.has_no_relationships'));
    return false;
  }
  return true;
}

function createRelationships() {
  if (
    diagramTool.diagram.value &&
    diagramTool.diagram.value?.entities.length < 2
  ) {
    tts.speakPhrase(t('message.has_not_two_entities'));
  } else {
    menuStore.setActiveDerMenu(DerFlowEnum.NEW_RELATIONSHIP);
    menuStore.setScope(FormScope.CREATE);
  }
}
</script>
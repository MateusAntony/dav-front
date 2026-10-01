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
  const readOnly = diagramTool.isReadOnly.value;

  // --- Opções de LEITURA (disponíveis para todos, inclusive leitores) -----
  const navigateEntities = {
    label: t('menu.der_flow.options.entity.navigate'),
    action: () => {
      if (hasEntities()) {
        menuStore.setActiveDerMenu(DerFlowEnum.ENTITIES);
      }
    },
  };
  const readEntities = {
    label: t('menu.der_flow.options.entity.read'),
    action: () => {
      if (hasEntities()) {
        diagramTool.readAllEntities();
      }
    },
  };
  const navigateRelationships = {
    label: t('menu.der_flow.options.relationship.navigate'),
    action: () => {
      if (hasRelationships()) {
        menuStore.setActiveDerMenu(DerFlowEnum.RELATIONSHIPS);
      }
    },
  };
  const readRelationships = {
    label: t('menu.der_flow.options.relationship.read'),
    action: () => {
      if (hasRelationships()) {
        diagramTool.readAllRelationships();
      }
    },
  };
  const readDiagram = {
    label: t('menu.der_flow.options.diagram.read'),
    action: () => {
      if (hasEntities()) {
        diagramTool.readDiagram();
      }
    },
  };
  const generateSql = {
    label: t('menu.der_flow.options.diagram.generate_sql'),
    action: () => {
      if (hasEntities()) {
        menuStore.setActiveDerMenu(DerFlowEnum.SQL_GENERATOR);
      }
    },
    infoText: t('message.sql_generator_helper'),
  };
  const reorganize = {
    label: 'Reorganizar diagrama automaticamente',
    action: () => {
      diagramTool.reorganizeDiagram(true);
      tts.speakPhrase('Diagrama reorganizado.');
    },
    infoText: readOnly
      ? 'Reposiciona as entidades e relacionamentos para facilitar a visualização. Como você só tem acesso de leitura, a nova organização vale apenas para você e não é salva.'
      : 'Reposiciona todas as entidades e relacionamentos de forma organizada, mantendo entidades ligadas por relacionamentos próximas, e desfazendo qualquer posição manual anterior.',
  };

  // --- Opções de EDIÇÃO (somente para o dono do diagrama) -----------------
  const createEntity = {
    label: t('menu.der_flow.options.entity.create'),
    action: () => {
      menuStore.setActiveDerMenu(DerFlowEnum.NEW_ENTITY);
      menuStore.setScope(FormScope.CREATE);
    },
    infoText: t('der.explanation.entity'),
  };
  const createRelationship = {
    label: t('menu.der_flow.options.relationship.create'),
    action: createRelationships,
    infoText: t('der.explanation.relationship'),
  };
  const share = {
    label: 'Compartilhar diagrama',
    action: () => menuStore.setActiveDerMenu(DerFlowEnum.SHARE_DIAGRAM),
    infoText:
      'Convide outro usuário para visualizar o diagrama ou exporte em PDF.',
  };

  menu.value = {
    title: t('menu.der_flow.titles.default', {
      project: diagramTool.diagram.value?.name,
    }),
    items: readOnly
      ? [
          {
            label:
              'Este diagrama foi compartilhado com você somente para leitura.',
            action: () => {},
          },
          navigateEntities,
          readEntities,
          navigateRelationships,
          readRelationships,
          readDiagram,
          generateSql,
          reorganize,
        ]
      : [
          createEntity,
          navigateEntities,
          readEntities,
          createRelationship,
          navigateRelationships,
          readRelationships,
          readDiagram,
          generateSql,
          share,
          reorganize,
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
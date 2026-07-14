<template>
  <FocusableInput
    v-if="step === RelationshipFormStep.NAME"
    v-model="relationshipForm.name"
    :title="$t('menu.der_flow.options.relationship.name')"
    @submit="saveRelationshipName"
  />
  <FocusableSelect
    v-else-if="step === RelationshipFormStep.ENTITYA"
    :items="entitiesAOptions"
    :title="$t('menu.der_flow.options.relationship.elementA')"
    @submit="saveRelationshipEntityAId"
    @keydown.esc.stop="() => (step = RelationshipFormStep.NAME)"
  />
  <FocusableSelect
    v-else-if="step === RelationshipFormStep.ENTITYB"
    :items="entitiesBOptions"
    :title="$t('menu.der_flow.options.relationship.elementB')"
    @submit="saveRelationshipEntityBId"
    @keydown.esc.stop="() => (step = RelationshipFormStep.ENTITYA)"
  />
  <FocusableSelect
    v-else-if="step === RelationshipFormStep.TYPE"
    :items="relationshipTypeOptions"
    :title="$t('menu.der_flow.options.relationship.type')"
    help-flag
    should-translate
    @submit="handleRelationshipType"
    @keydown.esc.stop="() => (step = RelationshipFormStep.ENTITYB)"
  />
  <FocusableSelect
    v-else-if="step === RelationshipFormStep.CARDINALITY"
    :items="cardinalityOptions"
    :title="$t('menu.der_flow.options.relationship.cardinality')"
    help-flag
    should-translate
    @submit="saveRelationshipCardinality"
    @keydown.esc.stop="() => (step = RelationshipFormStep.TYPE)"
  />
</template>

<script setup lang="ts">
import {
  cardinalityInfo,
  relationshipTypeinfo,
  CardinalityOptions,
  RelationshipTypeOptions,
} from '~/src/interfaces/der-diagram';

const diagramTool = useDiagram();
const { scope, isEditScope } = useMenuOptions();

const entitiesAOptions = Object.values(diagramTool.diagram.value.entities).map(
  (data) => ({
    id: data.id,
    title: data.name,
  }),
);

const entitiesBOptions = computed(() => {
  return entitiesAOptions.filter(
    (entity) => entity.id !== relationshipForm.entityAId,
  );
});

const relationshipForm = reactive({
  name: '',
  entityAId: '',
  entityBId: '',
  cardinality: 0,
  type: 0,
});

enum RelationshipFormStep {
  NAME,
  ENTITYA,
  ENTITYB,
  TYPE,
  CARDINALITY,
}

const cardinalityOptions = Object.values(cardinalityInfo).map(
  (data, index) => ({
    id: index,
    title: data.title,
    infotext: data.infoText,
  }),
);

const relationshipTypeOptions = Object.values(relationshipTypeinfo).map(
  (data, index) => ({
    id: index,
    title: data.title,
    infotext: data.infoText,
  }),
);

const step = ref(RelationshipFormStep.NAME);

const saveRelationshipName = (relationshipName: string) => {
  relationshipForm.name = relationshipName;
  step.value = RelationshipFormStep.ENTITYA;
};

const saveRelationshipEntityAId = (index: number) => {
  relationshipForm.entityAId = entitiesAOptions[index].id;

  step.value = RelationshipFormStep.ENTITYB;
};

const saveRelationshipEntityBId = (index: number) => {
  relationshipForm.entityBId = entitiesBOptions.value[index].id;
  step.value = RelationshipFormStep.TYPE;
};

const handleRelationshipType = (index: number) => {
  relationshipForm.type = relationshipTypeOptions[index].id;
  switch (index) {
    case RelationshipTypeOptions.COMMON:
    case RelationshipTypeOptions.ASSOCIATIVE:
      step.value = RelationshipFormStep.CARDINALITY;
      return;
    case RelationshipTypeOptions.WEAK:
      relationshipForm.cardinality = CardinalityOptions.OneToOne;
      break;
    case RelationshipTypeOptions.INHERITANCE:
      relationshipForm.cardinality = CardinalityOptions.OneToOne;
      break;
  }
  createRelationship();
};

const saveRelationshipCardinality = (index: number) => {
  relationshipForm.cardinality = cardinalityOptions[index].id;
  createRelationship();
};

const createRelationship = () => {
  if (scope === FormScope.CREATE) {
    diagramTool.createRelationship(relationshipForm);
  } else {
    diagramTool.editRelationship(relationshipForm);
  }
};

onBeforeMount(() => {
  if (isEditScope()) {
    const relationship = diagramTool?.getRelationship();
    if (relationship) {
      relationshipForm.name = relationship.name;
      relationshipForm.entityAId = relationship.entityAId;
      relationshipForm.entityBId = relationship.entityBId;
      relationshipForm.cardinality = relationship.cardinality;
    }
  }
});
</script>

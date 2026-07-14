<template>
  <FocusableInput
    v-if="step === AttrFormSteps.NAME"
    v-model="attributeForm.name"
    :title="$t('menu.der_flow.options.entity.attribute.name')"
    @submit="saveAttrName"
  />
  <FocusableSelect
    v-else
    :items="sqlTypes"
    :title="$t('menu.der_flow.options.entity.attribute.type')"
    help-flag
    :should-translate="false"
    @submit="createAttr"
    @keydown.esc.stop="() => (step = AttrFormSteps.NAME)"
  />
</template>

<script setup lang="ts">
import {
  DatabaseTypeOptions,
  databaseTypeInfo,
} from '~/src/interfaces/der-diagram';

const diagramTool = useDiagram();
const { scope, isEditScope } = useMenuOptions();

const sqlTypes = Object.values(databaseTypeInfo).map((data) => ({
  title: data.title,
  infotext: data.infoText,
}));

const attributeForm = reactive({
  name: '',
  type: '' as DatabaseTypeOptions,
});

enum AttrFormSteps {
  NAME,
  TYPE,
}

const step = ref(AttrFormSteps.NAME);

const saveAttrName = (attrName: string) => {
  attributeForm.name = attrName;
  step.value = AttrFormSteps.TYPE;
};

const createAttr = (index: number) => {
  attributeForm.type = index;

  if (scope === FormScope.CREATE) {
    diagramTool.createAttribute(attributeForm);
  } else {
    diagramTool.editAttribute(attributeForm);
  }
};

onMounted(() => {
  if (isEditScope()) {
    attributeForm.name = diagramTool?.getAttribute()?.name ?? '';
  }
});
</script>

<template>
  <FocusableInput
    v-model="entityName"
    :title="$t('menu.der_flow.options.entity.name')"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import { FormScope } from '~/stores/menu.store';

const { scope, isEditScope } = useMenuOptions();
const diagramTool = useDiagram();
const derStore = useDerOptions();
const entityName = ref();

const handleSubmit = (entityName: string) => {
  if (scope === FormScope.CREATE) {
    diagramTool.createEntity(entityName);
  } else if (derStore.currentEntityId) {
    diagramTool.editEntityName(entityName);
  }
};

onMounted(() => {
  if (isEditScope()) {
    entityName.value = diagramTool?.getEntity()?.name ?? '';
  }
});
</script>

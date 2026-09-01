<template>
  <FocusableInput
    v-model="diagramName"
    :title="t('menu.projects.options.new_project')"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
const { t } = useI18n();
const diagramTool = useDiagram();
const diagramName = ref('');

const handleSubmit = (name: string) => {
  if (name?.trim()) {
    diagramTool.createNewDiagram(name.trim());
  }
};
</script>
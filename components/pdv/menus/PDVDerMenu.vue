<template>
  <PDVDerDefaulMenu v-if="menuStore.activeDerMenu === DerFlowEnum.DEFAULT" />
  <PDVDerEntities
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.ENTITIES"
  />
  <PDVDerEntityOptions
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.ENTITY_OPTIONS"
  />
  <PDVDerDeleteEntity
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.DELETE_ENTITY"
  />
  <PDVCreateEntity
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.NEW_ENTITY"
  />
  <PDVDerAttributes v-else-if="menuStore.activeDerMenu === DerFlowEnum.ATTRS" />
  <PDVDerAttrOptions
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.ATTR_OPTIONS"
  />
  <PDVDerDeleteAttr
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.DELETE_ATTR"
  />
  <PDVCreateAttribute
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.NEW_ATTR"
  />
  <PDVDerRelationships
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.RELATIONSHIPS"
  />
  <PDVDerRelationshipOptions
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.RELATIONSHIP_OPTIONS"
  />
  <PDVDerDeleteRelationship
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.DELETE_RELATIONSHIP"
  />
  <PDVCreateRelationship
    v-else-if="menuStore.activeDerMenu === DerFlowEnum.NEW_RELATIONSHIP"
  />
</template>
<script setup lang="ts">
import PDVDerDeleteEntity from '../entities/PDVDerDeleteEntity.vue';
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';

const diagramTool = useDiagram();
const menuStore = useMenuOptions();

onBeforeMount(() => {
  diagramTool.loadDiagram();
});
</script>
<style scoped lang="css">
.teste {
  width: 100%;
}
</style>

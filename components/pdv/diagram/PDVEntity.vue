<template>
  <table class="entity-card">
    <tbody>
      <th colspan="2" class="entity-name">
        <strong>{{ entity.name.toLowerCase() }}</strong>
      </th>
      <tr v-for="(attr, index) in entity.attrs" :key="index" class="attributes">
        <td>{{ attr.name.toLowerCase() }}</td>
        <td class="attribute-type">
          <b>{{ DatabaseTypeOptionsMap[attr.type].toLowerCase() }}</b>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import {
  type DerEntity,
  DatabaseTypeOptionsMap,
} from '~/src/interfaces/der-diagram';

interface PDVEntityProps {
  entity: DerEntity;
}

defineProps<PDVEntityProps>();
</script>

<style scoped lang="css">
.entity-name {
  background-color: var(--focus-background-color);
  color: var(--high-contrast-text-color);
}

.entity-card {
  border-collapse: collapse;
  background-color: var(--neutral-color);
}

.entity-card th,
.entity-card td {
  border: var(--border-style);
  padding: 4px;
  text-align: left;
}
</style>

<template>
  <svg :width="width" :height="height">
    <template v-if="relationship.type === RelationshipTypeOptions.COMMON">
      <polygon :points="getDiamondPoints(width, height)" class="shape common" />
    </template>
    <template
      v-else-if="relationship.type === RelationshipTypeOptions.ASSOCIATIVE"
    >
      <rect :width="width" :height="height" class="shape associative" />
      <polygon
        :points="getDiamondPoints(width, height)"
        class="shape weak-overlay"
      />
    </template>
    <template
      v-else-if="relationship.type === RelationshipTypeOptions.INHERITANCE"
    >
      <polygon
        :points="getTrianglePoints(width, height)"
        class="shape inheritance"
      />
    </template>
    <template v-else-if="relationship.type === RelationshipTypeOptions.WEAK">
      <polygon :points="getDiamondPoints(width, height)" class="shape weak" />
      <polygon
        :points="getDiamondPoints(width - 14, height - 14)"
        class="shape weak-overlay"
        :transform="`translate(7, 7)`"
      />
    </template>
    <text
      x="50%"
      :y="
        relationship.type === RelationshipTypeOptions.INHERITANCE
          ? '80%'
          : '50%'
      "
      text-anchor="middle"
      dominant-baseline="middle"
      class="relationship-text"
    >
      {{ relationship.name.toLowerCase() }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import {
  RelationshipTypeOptions,
  type DerRelationship,
} from '~/src/interfaces/der-diagram';

interface PDVRelationshipProps {
  relationship: DerRelationship;
}

const props = defineProps<PDVRelationshipProps>();

const getDiamondPoints = (width: number, height: number) => {
  return `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
};

const getTrianglePoints = (width: number, height: number) => {
  return `0,${height} ${width / 2},0 ${width},${height}`;
};

const textLength = props.relationship.name.length;
const fontSize = 14;
const width = textLength * 10 > 100 ? textLength * 10 : 100;
const height = Math.max(60, fontSize * 2);
</script>

<style scoped>
.shape {
  fill: #fff;
  stroke: #000;
  stroke-width: 1;
}

.weak-overlay {
  fill: #fff;
  stroke-width: 1;
  stroke: #000;
}

.relationship-text {
  font-size: 14px;
  fill: #333;
}

.lines-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* Para não interferir no comportamento de arrastar */
}

line {
  stroke-width: 2;
  stroke: #000;
}
</style>

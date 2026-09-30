<template>
  <div ref="diagramContainer" class="diagram printable-diagram">
    <svg ref="svgContainer" class="diagram-lines">
      <text
        v-for="cardinality in cardinalities"
        :key="cardinality.id"
        :x="cardinality.x"
        :y="cardinality.y"
        class="cardinality"
      >
        {{ cardinality.text }}
      </text>
      <line
        v-for="line in lines"
        :key="line.id"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        stroke="black"
        stroke-width="2"
      />
    </svg>
    <vueDraggableResizable
      v-for="relationship in diagramTool.diagram.value.relationships"
      :id="relationship.id"
      :key="relationship.id"
      :parent="true"
      :resizable="false"
      :x="relationship.position.x"
      :y="relationship.position.y"
      :w="'auto'"
      :h="'auto'"
      :disable-user-select="true"
      :draggable="!diagramTool.isReadOnly.value"
      class="draggable"
      @drag-stop="
        (...event) => handleRelationshipDragStop(relationship.id, event)
      "
      @dragging="calculateLinePosition"
    >
      <PDVRelationship :relationship="relationship" />
    </vueDraggableResizable>
    <vueDraggableResizable
      v-for="entity in diagramTool.diagram.value.entities"
      :id="entity.id"
      :key="entity.id"
      :parent="true"
      :resizable="false"
      :x="entity.position.x"
      :y="entity.position.y"
      :w="'auto'"
      :h="'auto'"
      :disable-user-select="true"
      :draggable="!diagramTool.isReadOnly.value"
      class="draggable"
      @drag-stop="(...event) => handleEntityDragStop(entity.id, event)"
      @dragging="calculateLinePosition"
    >
      <PDVEntity :entity="entity" />
    </vueDraggableResizable>
  </div>
</template>

<script setup lang="ts">
import {
  CardinalityOptions,
  type DerRelationship,
} from '~/src/interfaces/der-diagram';

interface Line {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CardinalityLabel {
  id: string;
  x: number;
  y: number;
  text: string;
}

const diagramContainer = ref(null);
const diagramTool = useDiagram();
const lines = reactive<Line[]>([]);
const cardinalities = reactive<CardinalityLabel[]>([]);

const calculateLinePosition = () => {
  lines.length = 0;
  cardinalities.length = 0;
  diagramTool.diagram.value.relationships.forEach(
    (relationship: DerRelationship) => {
      const fromEntity = document.getElementById(relationship.entityAId);
      const toEntity = document.getElementById(relationship.entityBId);
      const relationshipNode = document.getElementById(relationship.id);

      if (fromEntity && toEntity && relationshipNode) {
        const fromRect = fromEntity.getBoundingClientRect();
        const toRect = toEntity.getBoundingClientRect();
        const relationshipRect = relationshipNode.getBoundingClientRect();
        const containerRect = diagramContainer.value.getBoundingClientRect();

        const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
        const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;

        const toX = toRect.left + toRect.width / 2 - containerRect.left;
        const toY = toRect.top + toRect.height / 2 - containerRect.top;

        const relationshipX =
          relationshipRect.left +
          relationshipRect.width / 2 -
          containerRect.left;
        const relationshipY =
          relationshipRect.top +
          relationshipRect.height / 2 -
          containerRect.top;

        lines.push({
          id: `${relationship.id}-line1`,
          x1: fromX,
          y1: fromY,
          x2: relationshipX,
          y2: relationshipY,
        });

        lines.push({
          id: `${relationship.id}-line2`,
          x1: relationshipX,
          y1: relationshipY,
          x2: toX,
          y2: toY,
        });

        let cardinalityA = '1';
        let cardinalityB = '1';
        if (relationship.cardinality === CardinalityOptions.OneToMany) {
          cardinalityA = '1';
          cardinalityB = 'M';
        } else if (relationship.cardinality === CardinalityOptions.ManyToMany) {
          cardinalityA = 'M';
          cardinalityB = 'M';
        }

        const offsetRatio = 0.5;
        const fromCardinalityX = fromX + (relationshipX - fromX) * offsetRatio;
        const fromCardinalityY = fromY + (relationshipY - fromY) * offsetRatio;

        const toCardinalityX =
          relationshipX + (toX - relationshipX) * offsetRatio;
        const toCardinalityY =
          relationshipY + (toY - relationshipY) * offsetRatio;

        cardinalities.push(
          {
            id: `${relationship.id}-cardinalityA`,
            x: fromCardinalityX - 16,
            y: fromCardinalityY,
            text: cardinalityA,
          },
          {
            id: `${relationship.id}-cardinalityB`,
            x: toCardinalityX - 16,
            y: toCardinalityY,
            text: cardinalityB,
          },
        );
      }
    },
  );
};

const handleEntityDragStop = (id: string, position: number[]) => {
  if (diagramTool.isReadOnly.value) return;
  diagramTool.updateEntityPosition(id, { x: position[0], y: position[1] });
};

const handleRelationshipDragStop = (id: string, position: number[]) => {
  if (diagramTool.isReadOnly.value) return;
  diagramTool.updateRelationshipPosition(id, {
    x: position[0],
    y: position[1],
  });
};

// Reorganiza sempre que: o diagrama carrega pela primeira vez, o
// usuário troca de diagrama (o "id" muda), ou uma entidade/relação
// nova é criada. Só preenche quem ainda não tem posição própria — quem
// o usuário já arrastou manualmente não é movido.
watch(
  () => diagramTool.diagram.value?.id,
  async () => {
    await nextTick();
    diagramTool.reorganizeDiagram();
    await nextTick();
    calculateLinePosition();
  },
);

watch(
  () => ({
    entityCount: diagramTool.diagram.value?.entities.length,
    relationshipCount: diagramTool.diagram.value?.relationships.length,
  }),
  async () => {
    await nextTick();
    diagramTool.reorganizeDiagram();
    await nextTick();
    calculateLinePosition();
  },
  { deep: true },
);

onMounted(async () => {
  await nextTick();
  diagramTool.reorganizeDiagram();
  await nextTick();
  calculateLinePosition();
});
</script>

<style scoped lang="scss">
.diagram {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
  height: 100dvh;
  border: var(--border-style);
  margin-top: 32px;
  position: relative;

  .draggable {
    border: none;
  }

  .diagram-lines {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    .cardinality {
      width: 20px;
      height: 20px;
      text-anchor: middle;
      font-weight: bold;
      font-size: 16px;
    }
  }
}

.lines-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
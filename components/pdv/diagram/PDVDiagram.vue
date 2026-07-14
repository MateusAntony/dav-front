<template>
  <div ref="diagramContainer" class="diagram">
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
  type DerEntity,
  type DerRelationship,
  type DiagramPosition,
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

let entitiesLength = 0;
let relationshipsLength = 0;
let lastElementId: string;
const spacing = 16;
let actualY = spacing;
let actualX = spacing;

const calculateEntityPosition = (entity: DerEntity) => {
  calculatePositionForElement(entity, diagramTool.updateEntityPosition);
};

const calculateRelationshipPosition = (relationship: DerRelationship) => {
  calculatePositionForElement(
    relationship,
    diagramTool.updateRelationshipPosition,
  );
};

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

const calculatePositionForElement = (
  element: DerEntity | DerRelationship,
  updateFn: (id: string, pos: DiagramPosition) => void,
) => {
  const newPosition = calculatePosition(element.position);
  lastElementId = element.id;
  if (newPosition !== element.position) {
    updateFn(element.id, newPosition);
  }
};

const calculatePosition = (position: DiagramPosition): DiagramPosition => {
  const currentPos = position;
  const containerRect = diagramContainer.value?.getBoundingClientRect();
  if (currentPos?.x !== null && currentPos?.y !== null) {
    return position;
  }

  if (lastElementId) {
    const previousElement = document.getElementById(lastElementId);
    if (previousElement) {
      const previousElementWidth =
        previousElement.getBoundingClientRect().width;
      actualX = actualX + (previousElementWidth ?? 0) + spacing * 8;
    }

    if (shouldStartNewLine(containerRect.width)) {
      actualX = spacing;
      actualY = actualY + spacing * 15;
    }
  }

  return {
    x: actualX,
    y: actualY,
  };
};

const shouldStartNewLine = (containerWidth: number): boolean => {
  return actualX + 250 > containerWidth;
};

const handleEntityDragStop = (id: string, position: number[]) => {
  diagramTool.updateEntityPosition(id, { x: position[0], y: position[1] });
};

const handleRelationshipDragStop = (id: string, position: number[]) => {
  diagramTool.updateRelationshipPosition(id, {
    x: position[0],
    y: position[1],
  });
};

watch(
  () => ({
    entities: diagramTool.diagram.value?.entities,
    relationships: diagramTool.diagram.value?.relationships,
  }),
  async ({ entities, relationships }) => {
    if (entities && entities?.length > entitiesLength) {
      calculateEntityPosition(entities[entities.length - 1] as DerEntity);
      entitiesLength = entities.length;
    }
    if (relationships && relationships?.length > relationshipsLength) {
      calculateRelationshipPosition(
        relationships[relationships.length - 1] as DerRelationship,
      );
      relationshipsLength = relationships.length;
    }
    calculateLinePosition();
    await nextTick();
  },
  { deep: true },
);

onMounted(async () => {
  const diagram = diagramTool.diagram.value;
  entitiesLength = diagram?.entities.length ?? 0;
  relationshipsLength = diagram?.relationships.length ?? 0;
  diagram?.entities.forEach((e) => {
    calculateEntityPosition(e as DerEntity);
  });
  diagram?.relationships.forEach((r) => {
    calculateRelationshipPosition(r as DerRelationship);
  });
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

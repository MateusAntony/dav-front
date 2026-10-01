<template>
  <div
    id="diagram-canvas"
    ref="diagramContainer"
    class="diagram printable-diagram"
    :style="canvasStyle"
  >
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
      @dragging="scheduleLines"
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
      @dragging="scheduleLines"
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
  if (!diagramTool.diagram.value || !diagramContainer.value) return;
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

// Altura do quadro: cresce com o diagrama (ver setCanvasHeight no useDiagram).
const canvasStyle = computed(() =>
  diagramTool.canvasHeight.value
    ? { height: `${diagramTool.canvasHeight.value}px` }
    : undefined,
);

// Linhas e cardinalidades são desenhadas a partir da posição REAL dos
// elementos na tela. Depois que as posições mudam, os elementos só chegam ao
// lugar novo após a renderização — por isso espera-se o próximo ciclo do Vue
// e um quadro de animação antes de medir. Sem essa espera (e sem ninguém
// pedir o redesenho após "Reorganizar"), as linhas ficavam nas posições
// antigas até o usuário arrastar algum elemento.
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// Se algum elemento (posição salva ou arrastado) passa da altura atual do
// quadro, aumenta o quadro para caber.
const fitCanvas = () => {
  const container = diagramContainer.value as HTMLElement | null;
  if (!container) return;
  const top = container.getBoundingClientRect().top;
  let bottom = 0;
  container.querySelectorAll('.draggable').forEach((el) => {
    bottom = Math.max(bottom, el.getBoundingClientRect().bottom - top);
  });
  if (bottom + 80 > container.clientHeight) {
    diagramTool.setCanvasHeight(bottom + 80);
  }
};

const redraw = async () => {
  await nextTick();
  await nextFrame();
  if (!diagramTool.diagram.value) return;
  fitCanvas();
  calculateLinePosition();
};

// Durante o arrasto, redesenha no máximo uma vez por quadro.
let frame = 0;
const scheduleLines = () => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    calculateLinePosition();
  });
};

// Organização inicial: ao abrir/trocar de diagrama, quem ainda não tem
// posição é organizado automaticamente (posições já salvas são mantidas).
const openDiagram = async () => {
  await nextTick();
  diagramTool.autoLayoutOnOpen();
  await redraw();
};

watch(() => diagramTool.diagram.value?.id, openDiagram);

// Entidade/relacionamento criado: posiciona só o novo, sem mexer no resto.
watch(
  () => ({
    entityCount: diagramTool.diagram.value?.entities.length,
    relationshipCount: diagramTool.diagram.value?.relationships.length,
  }),
  async () => {
    await nextTick();
    diagramTool.placeNewElements();
    await redraw();
  },
  { deep: true },
);

// Qualquer mudança que mexa na geometria (posição, nome, atributos...)
// redesenha as linhas. Cobre "Reorganizar", carregamento e arrasto.
const layoutSignature = computed(() => {
  const d = diagramTool.diagram.value;
  if (!d) return '';
  return JSON.stringify([
    d.entities.map((e: any) => [
      e.id,
      e.name,
      (e.attrs ?? []).map((a: any) => `${a.name}:${a.type}`),
      e.position?.x,
      e.position?.y,
    ]),
    d.relationships.map((r: any) => [
      r.id,
      r.name,
      r.entityAId,
      r.entityBId,
      r.cardinality,
      r.position?.x,
      r.position?.y,
    ]),
  ]);
});
watch(layoutSignature, redraw);
watch(() => diagramTool.layoutVersion.value, redraw);

onMounted(openDiagram);

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
});
</script>

<style scoped lang="scss">
.diagram {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
  height: 100dvh; // mínimo; o quadro cresce conforme o diagrama (canvasStyle)
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
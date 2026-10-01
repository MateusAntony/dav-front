import type {
  DerEntity,
  DerRelationship,
  Diagram,
  DiagramPosition,
} from '~/src/interfaces/der-diagram';

// ---------------------------------------------------------------------------
// Layout automático do DER.
//
// Função pura (não toca no DOM nem no estado): recebe o diagrama e devolve as
// posições calculadas. Quem aplica é o useDiagram.
//
//  1. Entidades: ordenadas por vizinhança (busca em largura pelos
//     relacionamentos) para que entidades ligadas fiquem perto, e dispostas em
//     "prateleiras" (linhas) que quebram conforme a largura disponível.
//  2. Relacionamentos: colocados no ponto médio entre as duas entidades; se
//     esse ponto estiver ocupado, procura o espaço livre mais próximo.
//
// Modo incremental (force = false): só posiciona o que ainda não tem posição,
// tratando o que já está posicionado como obstáculo (não sobrepõe).
// ---------------------------------------------------------------------------

export interface Size {
  w: number;
  h: number;
}

export interface LayoutOptions {
  containerWidth: number;
  // true = recalcula tudo; false = só quem tem posição nula.
  force: boolean;
  // Medidas reais (do DOM). Se devolverem null, usa-se uma estimativa.
  measureEntity?: (entity: DerEntity) => Size | null;
  measureRelationship?: (relationship: DerRelationship) => Size | null;
}

export interface LayoutResult {
  entities: Record<string, DiagramPosition>;
  relationships: Record<string, DiagramPosition>;
  // Área total ocupada por TODOS os elementos (novos e já posicionados).
  bounds: { width: number; height: number };
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN = 40;
const GAP_Y = 120;
const MIN_GAP_X = 160;
const MAX_GAP_X = 320;

export const estimateEntitySize = (entity: DerEntity): Size => {
  const longest = Math.max(
    entity.name?.length ?? 0,
    ...(entity.attrs ?? []).map(
      (a) => (a.name?.length ?? 0) + 8, // + tipo (ex.: VARCHAR)
    ),
  );
  const rows = (entity.attrs ?? []).length;
  return {
    w: Math.max(150, Math.round(longest * 9 + 40)),
    h: Math.max(70, 40 + rows * 32),
  };
};

export const estimateRelationshipSize = (
  relationship: DerRelationship,
): Size => ({
  w: Math.max(110, (relationship.name?.length ?? 0) * 9 + 60),
  h: 70,
});

const hasPosition = (p?: DiagramPosition | null) =>
  !!p && p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined;

const collides = (box: Box, obstacles: Box[], pad: number) =>
  obstacles.some(
    (o) =>
      box.x < o.x + o.w + pad &&
      box.x + box.w + pad > o.x &&
      box.y < o.y + o.h + pad &&
      box.y + box.h + pad > o.y,
  );

export function computeLayout(
  diagram: Pick<Diagram, 'entities' | 'relationships'>,
  options: LayoutOptions,
): LayoutResult {
  const { force, containerWidth } = options;
  const entities = diagram.entities ?? [];
  const relationships = diagram.relationships ?? [];

  const entitySize = new Map<string, Size>();
  entities.forEach((e) =>
    entitySize.set(
      e.id,
      options.measureEntity?.(e) ?? estimateEntitySize(e),
    ),
  );
  const relSize = new Map<string, Size>();
  relationships.forEach((r) =>
    relSize.set(
      r.id,
      options.measureRelationship?.(r) ?? estimateRelationshipSize(r),
    ),
  );

  const result: LayoutResult = {
    entities: {},
    relationships: {},
    bounds: { width: 0, height: 0 },
  };
  const boxOfEntity = new Map<string, Box>();
  const obstacles: Box[] = [];

  // Tudo que já está posicionado (e não será recalculado) vira obstáculo.
  entities.forEach((e) => {
    if (!force && hasPosition(e.position)) {
      const s = entitySize.get(e.id) as Size;
      const box = { x: e.position.x as number, y: e.position.y as number, ...s };
      boxOfEntity.set(e.id, box);
      obstacles.push(box);
    }
  });
  const boxOfRel = new Map<string, Box>();
  relationships.forEach((r) => {
    if (!force && hasPosition(r.position)) {
      const s = relSize.get(r.id) as Size;
      const box = { x: r.position.x as number, y: r.position.y as number, ...s };
      boxOfRel.set(r.id, box);
      obstacles.push(box);
    }
  });

  // --- 1. Entidades ---------------------------------------------------------
  const toPlace = entities.filter((e) => !boxOfEntity.has(e.id));

  const adjacency = new Map<string, string[]>();
  relationships.forEach((r) => {
    if (r.entityAId === r.entityBId) return;
    adjacency.set(r.entityAId, [...(adjacency.get(r.entityAId) ?? []), r.entityBId]);
    adjacency.set(r.entityBId, [...(adjacency.get(r.entityBId) ?? []), r.entityAId]);
  });
  const degree = (id: string) => adjacency.get(id)?.length ?? 0;

  const byId = new Map(toPlace.map((e) => [e.id, e]));
  const visited = new Set<string>();
  const ordered: DerEntity[] = [];
  [...toPlace]
    .sort((a, b) => degree(b.id) - degree(a.id))
    .forEach((start) => {
      if (visited.has(start.id)) return;
      const queue = [start.id];
      visited.add(start.id);
      while (queue.length > 0) {
        const id = queue.shift() as string;
        const entity = byId.get(id);
        if (entity) ordered.push(entity);
        (adjacency.get(id) ?? []).forEach((next) => {
          if (!visited.has(next) && byId.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        });
      }
    });

  const maxRelWidth = Math.max(
    110,
    ...relationships.map((r) => relSize.get(r.id)?.w ?? 110),
  );
  const gapX = Math.min(MAX_GAP_X, Math.max(MIN_GAP_X, maxRelWidth + 50));
  const maxX = Math.max(containerWidth, 600) - MARGIN;

  let cursorX = MARGIN;
  let cursorY = MARGIN;
  let rowHeight = 0;

  ordered.forEach((entity) => {
    const size = entitySize.get(entity.id) as Size;
    let box: Box = { x: cursorX, y: cursorY, ...size };

    for (let guard = 0; guard < 4000; guard += 1) {
      if (cursorX + size.w > maxX && cursorX > MARGIN) {
        cursorX = MARGIN;
        cursorY += rowHeight + GAP_Y;
        rowHeight = 0;
      }
      box = { x: cursorX, y: cursorY, ...size };
      if (!collides(box, obstacles, 30)) break;
      cursorX += 60;
    }

    boxOfEntity.set(entity.id, box);
    obstacles.push(box);
    result.entities[entity.id] = { x: Math.round(box.x), y: Math.round(box.y) };
    cursorX = box.x + size.w + gapX;
    rowHeight = Math.max(rowHeight, size.h);
  });

  // --- 2. Relacionamentos ---------------------------------------------------
  const DIRECTIONS: Array<[number, number]> = [
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];

  relationships.forEach((rel) => {
    if (boxOfRel.has(rel.id)) return;
    const size = relSize.get(rel.id) as Size;
    const a = boxOfEntity.get(rel.entityAId);
    const b = boxOfEntity.get(rel.entityBId);

    let cx: number;
    let cy: number;
    if (a && b) {
      cx = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
      cy = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
    } else {
      const only = a ?? b;
      cx = only ? only.x + only.w / 2 : MARGIN + size.w / 2;
      cy = only ? only.y + only.h + GAP_Y / 2 : MARGIN + size.h / 2;
    }

    const boxAt = (px: number, py: number): Box => ({
      x: Math.max(MARGIN / 2, px - size.w / 2),
      y: Math.max(MARGIN / 2, py - size.h / 2),
      ...size,
    });

    let box = boxAt(cx, cy);
    if (collides(box, obstacles, 12)) {
      let found = false;
      for (let radius = 50; radius <= 900 && !found; radius += 50) {
        for (const [dx, dy] of DIRECTIONS) {
          const candidate = boxAt(cx + dx * radius, cy + dy * radius);
          if (!collides(candidate, obstacles, 12)) {
            box = candidate;
            found = true;
            break;
          }
        }
      }
    }

    boxOfRel.set(rel.id, box);
    obstacles.push(box);
    result.relationships[rel.id] = { x: Math.round(box.x), y: Math.round(box.y) };
  });

  result.bounds = layoutBounds([
    ...Array.from(boxOfEntity.values()),
    ...Array.from(boxOfRel.values()),
  ]);

  return result;
}

// Dimensões totais ocupadas (para o container crescer junto com o diagrama).
export function layoutBounds(
  boxes: Array<{ x: number; y: number; w: number; h: number }>,
): { width: number; height: number } {
  return boxes.reduce(
    (acc, b) => ({
      width: Math.max(acc.width, b.x + b.w),
      height: Math.max(acc.height, b.y + b.h),
    }),
    { width: 0, height: 0 },
  );
}
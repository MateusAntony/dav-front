import { v4 as uuidv4 } from 'uuid';

import {
  CardinalityOptions,
  type DerAttribute,
  type DerEntity,
  type DerRelationship,
  type Diagram,
  type DiagramPosition,
  DatabaseTypeOptions,
  RelationshipTypeOptions,
  type ParsedDiagram,
  DatabaseTypeOptionsMap,
  CardinalityOptionsMap,
  RelationshipTypeOptionsMap,
  type ParsedEntity,
  type ParsedRelationship,
  type ParsedAttribute,
} from '~/src/interfaces/der-diagram';
import { DerFlowEnum } from '~/src/interfaces/pdv-menu';
import { diagramMock } from '~/mock/diagram.mock';
import { computeLayout, type Size } from '~/src/utils/diagram-layout';

// Ao abrir um diagrama, quem ainda não tem posição é organizado
// automaticamente (posições já salvas pelo usuário são respeitadas).
// Coloque true para SEMPRE reorganizar tudo ao abrir, descartando posições salvas.
const ALWAYS_AUTO_LAYOUT_ON_OPEN = false;

let instance: any;

export function useDiagram() {
  const derStore = useDerOptions();
  const menu = useMenuOptions();
  const tts = useTTS();
  const i18n = useI18n();

  if (!instance) {
    const diagramsList = ref<
      { id: string; name: string; is_owner: boolean }[]
    >([]);
    const MAX_DIAGRAMS = 3;
    const diagram = ref<Diagram | null>(null);
    const parsedDiagram = ref<ParsedDiagram | null>(null);
    const isReadOnly = ref(false);
    // Incrementado a cada reorganização: a tela observa isso para redesenhar
    // as linhas/cardinalidades depois que os elementos chegam na nova posição.
    const layoutVersion = ref(0);
    // Altura (px) do quadro do diagrama. Cresce junto com o diagrama para que
    // nada fique cortado nem preso (a lib de arrastar limita cada elemento
    // ao tamanho do quadro).
    const canvasHeight = ref(0);

    // Zera TUDO que pertence ao usuário logado. Chamado ao trocar de conta ou
    // sair: como o Nuxt é uma SPA, sem isso a próxima conta herdaria a lista de
    // diagramas, o diagrama aberto e o modo somente leitura da anterior.
    const resetSession = () => {
      diagram.value = null;
      parsedDiagram.value = null;
      diagramsList.value = [];
      isReadOnly.value = false;
      layoutVersion.value = 0;
      canvasHeight.value = 0;
    };

    // Defesa em profundidade: mesmo que algum caminho de UI esqueça de esconder
    // uma opção de edição, quem só tem acesso de leitura não altera nada.
    const denyIfReadOnly = () => {
      if (!isReadOnly.value) return false;
      tts.speakPhrase('Você tem acesso somente leitura neste diagrama.');
      return true;
    };

    // const loadDiagram = (diagramId: string) => {
    //   /** TODO - Função de get diagram */
    // };

    const loadDiagram = async () => {
      const { listDiagrams, createDiagram } = useDiagramsApi();
      const authStore = useAuthStore();
      console.log('LOG - token existe?', !!authStore.token);
      if (!authStore.token) {
        // Convidado: mantém o comportamento atual 
        diagram.value = {
          ...diagramMock,
          id: uuidv4(),
        };
        isReadOnly.value = false;
        parseDiagram();
        return;
      }

      const diagrams = await listDiagrams();
      console.log('LOG - diagramas encontrados:', diagrams);
      if (diagrams.length > 0) {
        const saved = diagrams[0];
        diagram.value = JSON.parse(saved.serialized_object);
        diagram.value.id = saved.id;
        isReadOnly.value = !saved.is_owner;
      } else {
        const created = await createDiagram(
          'diagrama sem título',
          JSON.stringify({ entities: [], relationships: [] }),
        );
        diagram.value = { id: created.id, name: created.name, entities: [], relationships: [] };
        isReadOnly.value = false;
      }
      parseDiagram();
    };

    const saveDiagram = async () => {
      const authStore = useAuthStore();
      const currentDiagram = diagram.value;
      console.log('LOG - salvando diagrama:', currentDiagram);
      if (!authStore.token || !currentDiagram || isReadOnly.value) return;

      const { updateDiagram } = useDiagramsApi();
      const result = await updateDiagram(
        currentDiagram.id,
        JSON.stringify({
          entities: currentDiagram.entities,
          relationships: currentDiagram.relationships,
        }),
      );
      console.log('LOG - resultado do salvamento:', result);
    };


    const listUserDiagrams = async () => {
      const { listDiagrams } = useDiagramsApi();
      const diagrams = await listDiagrams();
      diagramsList.value = diagrams.map((d: any) => ({
        id: d.id,
        name: d.name,
        is_owner: d.is_owner,
      }));
      return diagramsList.value;
    };

    const initDiagrams = async () => {
      const authStore = useAuthStore();
      if (!authStore.token) {
        await loadDiagram();
        menu.setActiveDerMenu(DerFlowEnum.DEFAULT);
        return;
      }
      // Logado: nenhum diagrama fica aberto até o usuário escolher um projeto.
      // Sem isso, o diagrama anterior (outro projeto, outra conta ou o exemplo
      // do convidado) continuava aparecendo e alimentando o "Gerar SQL".
      diagram.value = null;
      parsedDiagram.value = null;
      isReadOnly.value = false;
      await listUserDiagrams();
      if (menu.diagramListMode === 'shared') {
        menu.setActiveDerMenu(DerFlowEnum.DIAGRAM_LIST);
        return;
      }
      const ownDiagrams = diagramsList.value.filter((d) => d.is_owner);
      if (ownDiagrams.length === 0) {
        menu.setActiveDerMenu(DerFlowEnum.NEW_DIAGRAM);
      } else {
        menu.setActiveDerMenu(DerFlowEnum.DIAGRAM_LIST);
      }
    };

    const selectDiagram = async (id: string) => {
      const { getDiagram } = useDiagramsApi();
      const saved = await getDiagram(id);
      const content = saved.serialized_object
        ? JSON.parse(saved.serialized_object)
        : { entities: [], relationships: [] };
      diagram.value = {
        id: saved.id,
        name: saved.name,
        entities: content.entities ?? [],
        relationships: content.relationships ?? [],
      };
      isReadOnly.value = !saved.is_owner;
      parseDiagram();
      menu.setActiveDerMenu(DerFlowEnum.DEFAULT);
    };

    const createNewDiagram = async (name: string) => {
      const ownCount = diagramsList.value.filter((d) => d.is_owner).length;
      if (ownCount >= MAX_DIAGRAMS) {
        tts.speakPhrase(i18n.t('message.max_diagrams_reached'));
        return;
      }
      const { createDiagram } = useDiagramsApi();
      const created = await createDiagram(
        name,
        JSON.stringify({ entities: [], relationships: [] }),
      );
      diagramsList.value.push({
        id: created.id,
        name: created.name,
        is_owner: true,
      });
      diagram.value = {
        id: created.id,
        name: created.name,
        entities: [],
        relationships: [],
      };
      isReadOnly.value = false;
      parseDiagram();
      menu.setActiveDerMenu(DerFlowEnum.DEFAULT);
    };

    
    const parseDiagram = () => {
      if (diagram.value) {
        parsedDiagram.value = {
          ...diagram.value,
          entities: diagram.value.entities
            ? diagram.value.entities.map(({ position, ...entity }) => ({
                ...entity,
                attrs: entity.attrs
                  ? entity.attrs.map((attr) => ({
                      ...attr,
                      type: DatabaseTypeOptionsMap[attr.type], // Converte o tipo do atributo
                    }))
                  : [],
              }))
            : [],
          relationships: diagram.value.relationships
            ? diagram.value.relationships.map(
                ({ position, entityAId, entityBId, ...relationship }) => {
                  const [entityA, entityB] = getRelationshipEntities(
                    entityAId,
                    entityBId,
                  );

                  return {
                    ...relationship,
                    entityAId,
                    entityBId,
                    entityA: entityA?.name,
                    entityB: entityB?.name,
                    cardinality: i18n.t(
                      CardinalityOptionsMap[relationship.cardinality],
                    ),
                    type: i18n.t(RelationshipTypeOptionsMap[relationship.type]),
                  };
                },
              )
            : [],
        };
      }
      return null;
    };

    const createDiagram = (name: string) => {
      diagram.value = {
        id: uuidv4(),
        name: name.toLowerCase(),
        entities: [] as DerEntity[],
        relationships: [] as DerRelationship[],
      };
      parsedDiagram.value = {
        name: name.toLowerCase(),
        entities: [] as ParsedEntity[],
        relationships: [] as ParsedRelationship[],
      };
    };

    // const updateDiagram = (diagramId: string) => {
    //   /** TODO - Função de update diagram */
    // };

    // const deleteDiagram = (diagramId: string) => {
    //   /** TODO - Função de delete diagram */
    // };

    const createEntity = (name: string) => {
      if (denyIfReadOnly()) return;
      const id = uuidv4();
      if (diagram.value) {
        diagram.value.entities.push({
          id,
          name: name.toLowerCase(),
          attrs: [] as DerAttribute[],
          position: {
            x: null,
            y: null,
          },
        });
        parsedDiagram.value?.entities.push({
          id,
          name: name.toLowerCase(),
          attrs: [] as ParsedAttribute[],
        });
      }
      derStore.setCurrentEntityId(id);
      menu.setActiveDerMenu(DerFlowEnum.ENTITY_OPTIONS);
    };

    const editEntityName = (newName: string) => {
      if (denyIfReadOnly()) return;
      if (diagram.value) {
        const entity = getEntity();
        const parsedEntity = getEntity(true);
        if (entity && parsedEntity) {
          entity.name = newName.toLowerCase();
          parsedEntity.name = newName.toLowerCase();
        }
        menu.setActiveDerMenu(DerFlowEnum.ENTITY_OPTIONS);
      }
    };

    const updateEntityPosition = (id: string, position: DiagramPosition) => {
      const entity = diagram.value?.entities.find((e) => e.id === id);
      if (entity) {
        entity.position = { ...position };
      }
    };

    // Mede o elemento real na tela (o tamanho depende do texto). Se ele ainda
    // não foi desenhado, devolve null e o layout usa uma estimativa.
    const measureElement = (id: string): Size | null => {
      const el = document.getElementById(id);
      if (!el || !el.offsetWidth || !el.offsetHeight) return null;
      return { w: el.offsetWidth, h: el.offsetHeight };
    };

    // Ajusta a altura do quadro. É feito de forma SÍNCRONA no DOM e seguido de
    // um evento "resize", que faz a lib de arrastar reler o tamanho do quadro
    // antes de receber as novas posições (senão ela as "corrige" para dentro
    // do tamanho antigo e o diagrama sai torto).
    const setCanvasHeight = (needed: number) => {
      if (!process.client) return;
      const height = Math.max(Math.ceil(needed), window.innerHeight);
      canvasHeight.value = height;
      const canvas = document.getElementById('diagram-canvas');
      if (canvas) {
        canvas.style.height = `${height}px`;
        window.dispatchEvent(new Event('resize'));
      }
    };

    const hasUnpositioned = () =>
      !!diagram.value &&
      [...diagram.value.entities, ...diagram.value.relationships].some(
        (item) => item.position?.x == null || item.position?.y == null,
      );

    // Calcula (src/utils/diagram-layout.ts) e aplica as posições.
    //  - force=false: só posiciona quem ainda não tem posição (x/y nulos),
    //    sem sobrepor o que o usuário já arrastou.
    //  - force=true: recalcula TUDO (botão "Reorganizar diagrama").
    // No fim, incrementa layoutVersion: é o sinal para a tela redesenhar as
    // linhas e cardinalidades quando os elementos já estiverem no lugar novo.
    const reorganizeDiagram = (force = false) => {
      if (!diagram.value || !process.client) return;

      const canvas = document.getElementById('diagram-canvas');
      const containerWidth = canvas?.clientWidth || window.innerWidth * 0.85;

      const layout = computeLayout(diagram.value, {
        containerWidth,
        force,
        measureEntity: (entity) => measureElement(entity.id),
        measureRelationship: (relationship) => measureElement(relationship.id),
      });

      setCanvasHeight(layout.bounds.height + 80);

      diagram.value.entities.forEach((entity) => {
        const position = layout.entities[entity.id];
        if (position) updateEntityPosition(entity.id, position);
      });
      diagram.value.relationships.forEach((relationship) => {
        const position = layout.relationships[relationship.id];
        if (position) updateRelationshipPosition(relationship.id, position);
      });

      layoutVersion.value += 1;
    };

    // Posiciona só o que acabou de ser criado (sem mexer no resto).
    const placeNewElements = () => {
      if (hasUnpositioned()) reorganizeDiagram(false);
    };

    // Organização inicial: chamada pela tela sempre que um diagrama é aberto.
    const autoLayoutOnOpen = () => {
      if (ALWAYS_AUTO_LAYOUT_ON_OPEN) {
        reorganizeDiagram(true);
      } else if (hasUnpositioned()) {
        reorganizeDiagram(false);
      }
    };

    const getEntity = (parsed?: boolean) => {
      if (diagram.value && parsedDiagram.value) {
        const id = derStore.currentEntityId;
        return parsed
          ? parsedDiagram.value.entities.find((e) => e.id === id)
          : diagram.value.entities.find((e) => e.id === id);
      }
    };

    const removeEntity = () => {
      if (denyIfReadOnly()) return;
      if (diagram.value && parsedDiagram.value) {
        const id = derStore.currentEntityId;
        diagram.value.entities = diagram.value.entities.filter(
          (e) => e.id !== id,
        );
        parsedDiagram.value.entities = parsedDiagram.value.entities.filter(
          (e) => e.id !== id,
        );
        diagram.value.relationships = diagram.value.relationships.filter(
          (r) => {
            return r.entityAId !== id && r.entityBId !== id;
          },
        );
        parsedDiagram.value.relationships =
          parsedDiagram.value.relationships.filter((r) => {
            return r.entityAId !== id && r.entityBId !== id;
          });
        if (diagram.value.entities.length > 0) {
          menu.setActiveDerMenu(DerFlowEnum.ENTITIES);
        } else {
          menu.setActiveDerMenu(DerFlowEnum.DEFAULT);
        }
      }
    };

    const getRelationshipEntities = (idA: string, idB: string) => {
      if (diagram.value) {
        const entityA = diagram.value.entities.find((e) => e.id === idA);
        const entityB = diagram.value.entities.find((e) => e.id === idB);
        return [entityA, entityB];
      }
      return [];
    };

    const createRelationship = (props: {
      name: string;
      entityAId: string;
      entityBId: string;
      cardinality: CardinalityOptions;
      type: RelationshipTypeOptions;
    }) => {
      if (denyIfReadOnly()) return;
      if (diagram.value && parsedDiagram.value) {
        const [entityA, entityB] = getRelationshipEntities(
          props.entityAId,
          props.entityBId,
        );

        if (entityA && entityB) {
          const id = uuidv4();
          diagram.value.relationships.push({
            id,
            name: props.name.toLowerCase(),
            entityAId: props.entityAId,
            entityBId: props.entityBId,
            cardinality: props.cardinality,
            type: props.type,
            position: {
              x: null,
              y: null,
            },
          });
          parsedDiagram.value.relationships.push({
            id,
            name: props.name.toLowerCase(),
            entityAId: props.entityAId,
            entityBId: props.entityBId,
            entityA: entityA.name,
            entityB: entityB.name,
            cardinality: i18n.t(CardinalityOptionsMap[props.cardinality]),
            type: i18n.t(RelationshipTypeOptionsMap[props.type]),
          });
          derStore.setCurrentRelationshipId(id);
          menu.setActiveDerMenu(DerFlowEnum.RELATIONSHIP_OPTIONS);
        }
      }
    };

    const editRelationship = (newData: Omit<DerRelationship, 'id'>) => {
      if (denyIfReadOnly()) return;
      if (diagram.value) {
        const relationship = getRelationship() as DerRelationship;
        const parsedRelationship = getRelationship(true) as ParsedRelationship;
        if (relationship && parsedRelationship) {
          relationship.name = newData.name.toLowerCase();
          relationship.entityAId = newData.entityAId;
          relationship.entityBId = newData.entityBId;
          relationship.cardinality = newData.cardinality;
          relationship.type = newData.type;
          relationship.name = newData.name.toLowerCase();
          parsedRelationship.entityAId = newData.entityAId;
          parsedRelationship.entityBId = newData.entityBId;
          const [entityA, entityB] = getRelationshipEntities(
            newData.entityAId,
            newData.entityBId,
          );
          if (entityA && entityB) {
            parsedRelationship.entityA = entityA.name;
            parsedRelationship.entityB = entityB.name;
          }
          parsedRelationship.cardinality = i18n.t(
            CardinalityOptionsMap[newData.cardinality],
          );
          parsedRelationship.type = i18n.t(
            RelationshipTypeOptionsMap[newData.type],
          );
        }
        menu.setActiveDerMenu(DerFlowEnum.RELATIONSHIP_OPTIONS);
      }
    };

    const updateRelationshipPosition = (
      id: string,
      position: DiagramPosition,
    ) => {
      const relationship = diagram.value?.relationships.find(
        (r) => r.id === id,
      );
      if (relationship) {
        relationship.position = position;
      }
    };

    const getRelationship = (parsed?: boolean) => {
      if (diagram.value && parsedDiagram.value) {
        const id = derStore.currentRelationshipId;
        return parsed
          ? parsedDiagram.value.relationships.find((r) => r.id === id)
          : diagram.value.relationships.find((r) => r.id === id);
      }
    };

    const removeRelationship = () => {
      if (denyIfReadOnly()) return;
      if (diagram.value && parsedDiagram.value) {
        const id = derStore.currentRelationshipId;
        diagram.value.relationships = diagram.value.relationships.filter(
          (r) => r.id !== id,
        );
        parsedDiagram.value.relationships =
          parsedDiagram.value.relationships.filter((r) => r.id !== id);
        menu.setActiveDerMenu(DerFlowEnum.RELATIONSHIPS);
      }
    };

    const createAttribute = (props: {
      name: string;
      type: DatabaseTypeOptions;
    }) => {
      if (denyIfReadOnly()) return;
      if (diagram.value && parsedDiagram.value) {
        const entity = getEntity();
        const parsedEntity = getEntity(true);
        if (entity?.attrs && parsedEntity?.attrs) {
          const id = uuidv4();
          entity.attrs.push({
            id,
            name: props.name.toLowerCase(),
            type: props.type,
          });
          parsedEntity.attrs.push({
            id,
            name: props.name.toLowerCase(),
            type: DatabaseTypeOptionsMap[props.type],
          });
          menu.setActiveDerMenu(DerFlowEnum.ENTITY_OPTIONS);
        }
      }
    };

    const editAttribute = (newData: Omit<DerAttribute, 'id'>) => {
      if (denyIfReadOnly()) return;
      if (diagram.value) {
        const attr = getAttribute();
        const parsedAttr = getAttribute(true);
        if (attr && parsedAttr) {
          attr.name = newData.name.toLowerCase();
          attr.type = newData.type;
          parsedAttr.name = newData.name.toLowerCase();
          parsedAttr.type = DatabaseTypeOptionsMap[newData.type];
        }
        menu.setActiveDerMenu(DerFlowEnum.ENTITY_OPTIONS);
      }
    };

    const getAttribute = (parsed?: boolean) => {
      const entity = getEntity();
      const parsedEntity = getEntity(true);
      if (entity && entity.attrs && parsedEntity && parsedEntity.attrs) {
        const id = derStore.currentAttrId;
        return parsed
          ? parsedEntity.attrs.find((a) => a.id === id)
          : entity.attrs.find((a) => a.id === id);
      }
    };

    const removeAttribute = () => {
      if (denyIfReadOnly()) return;
      if (diagram.value) {
        const entity = getEntity();
        const parsedEntity = getEntity(true);
        if (entity && entity.attrs && parsedEntity && parsedEntity.attrs) {
          const id = derStore.currentAttrId;
          entity.attrs = entity.attrs.filter((a) => a.id !== id);
          parsedEntity.attrs = parsedEntity.attrs.filter((a) => a.id !== id);
          if (entity?.attrs?.length > 0) {
            menu.setActiveDerMenu(DerFlowEnum.ATTRS);
          } else {
            menu.setActiveDerMenu(DerFlowEnum.ENTITY_OPTIONS);
          }
        }
      }
    };

    function describeEntity(entity: ParsedEntity): string {
      let output: string;
      if (entity.attrs.length) {
        output = i18n.t('der.read_aux.entity_with_attrs', {
          entity: entity.name,
        });
        entity.attrs.forEach((attr: ParsedAttribute) => {
          output += i18n.t('der.read_aux.attr', {
            name: attr.name,
            type: attr.type,
          });
        });
      } else
        output = i18n.t('der.read_aux.entity_without_attrs', {
          entity: entity.name,
        });
      return output;
    }

    function describeRelationship(relationship: ParsedRelationship): string {
      return i18n.t('der.read_aux.relationship', {
        name: relationship.name,
        entityA: relationship.entityA,
        entityB: relationship.entityB,
        type: i18n.t(relationship.type),
        cardinality: i18n.t(relationship.cardinality),
      });
    }

    const readDiagram = () => {
      if (parsedDiagram.value && parsedDiagram.value.entities) {
        let output = i18n.t('der.read_aux.diagram', {
          diagram: parsedDiagram.value.name,
        });

        output += i18n.t('der.read_aux.entities');
        parsedDiagram.value.entities.forEach((entity: any) => {
          output += describeEntity(entity);
        });

        if (parsedDiagram.value.relationships) {
          output += i18n.t('der.read_aux.relationships');
          parsedDiagram.value.relationships.forEach((relationship: any) => {
            output += describeRelationship(relationship);
          });
        }

        tts.speakPhrase(output);
      }
    };

    const readAllEntities = () => {
      if (parsedDiagram.value && parsedDiagram.value.entities) {
        let output = i18n.t('der.read_aux.entities');
        parsedDiagram.value.entities.forEach((entity: any) => {
          output += describeEntity(entity) + '';
        });
        tts.speakPhrase(output);
      }
    };

    const readAllRelationships = () => {
      if (parsedDiagram.value && parsedDiagram.value.relationships) {
        let output = i18n.t('der.read_aux.relationships');
        parsedDiagram.value.relationships.forEach((relationship: any) => {
          output += describeRelationship(relationship);
        });
        tts.speakPhrase(output);
      }
    };

    const readEntityAttrs = () => {
      const entity = getEntity(true) as ParsedEntity;
      if (entity && entity.attrs) {
        const output = describeEntity(entity);
        tts.speakPhrase(output);
      }
    };

    // Leitura de um único atributo (usada por quem só tem acesso de leitura).
    const readAttribute = () => {
      const attr = getAttribute(true) as ParsedAttribute | undefined;
      if (attr) {
        tts.speakPhrase(
          i18n.t('der.read_aux.attr', { name: attr.name, type: attr.type }),
        );
      }
    };

    const readRelationship = () => {
      const relationship = getRelationship(true) as ParsedRelationship;
      if (relationship) {
        const output = describeRelationship(relationship);
        tts.speakPhrase(output);
      }
    };

    instance = {
      diagram,
      parsedDiagram,
      isReadOnly,
      createDiagram,
      parseDiagram,
      createEntity,
      editEntityName,
      updateEntityPosition,
      removeEntity,
      getEntity,
      createRelationship,
      editRelationship,
      updateRelationshipPosition,
      reorganizeDiagram,
      removeRelationship,
      getRelationship,
      createAttribute,
      editAttribute,
      removeAttribute,
      getAttribute,
      loadDiagram,
      readDiagram,
      readAllEntities,
      readAllRelationships,
      readEntityAttrs,
      readRelationship,
      readAttribute,
      layoutVersion,
      canvasHeight,
      setCanvasHeight,
      placeNewElements,
      autoLayoutOnOpen,
      resetSession,
      saveDiagram,
      diagramsList,
      listUserDiagrams,
      initDiagrams,
      selectDiagram,
      createNewDiagram,
      // updateDiagram,
      // deleteDiagram,
    };
  }

  return instance;
}
export enum PDVMenusEnum {
  DEFAULT,
  PROJECTS,
  TTS,
}

export interface MenuItem {
  label: string;
  action?: () => void;
  infoText?: string;
  complementText?: string;
}

export interface Menu {
  title: string;
  items: MenuItem[];
}

export enum DerFlowEnum {
  DEFAULT,
  ENTITIES,
  ENTITY_OPTIONS,
  DELETE_ENTITY,
  ATTRS,
  ATTR_OPTIONS,
  DELETE_ATTR,
  RELATIONSHIPS,
  RELATIONSHIP_OPTIONS,
  DELETE_RELATIONSHIP,
  NEW_ENTITY,
  NEW_ATTR,
  NEW_RELATIONSHIP,
}

export const previousDerMenuMapping: Record<
  DerFlowEnum,
  DerFlowEnum | undefined
> = {
  [DerFlowEnum.DEFAULT]: undefined,
  [DerFlowEnum.ENTITIES]: DerFlowEnum.DEFAULT,
  [DerFlowEnum.ENTITY_OPTIONS]: DerFlowEnum.ENTITIES,
  [DerFlowEnum.DELETE_ENTITY]: DerFlowEnum.ENTITY_OPTIONS,
  [DerFlowEnum.ATTRS]: DerFlowEnum.ENTITY_OPTIONS,
  [DerFlowEnum.ATTR_OPTIONS]: DerFlowEnum.ATTRS,
  [DerFlowEnum.DELETE_ATTR]: DerFlowEnum.ATTR_OPTIONS,
  [DerFlowEnum.RELATIONSHIPS]: DerFlowEnum.DEFAULT,
  [DerFlowEnum.RELATIONSHIP_OPTIONS]: DerFlowEnum.RELATIONSHIPS,
  [DerFlowEnum.DELETE_RELATIONSHIP]: DerFlowEnum.RELATIONSHIP_OPTIONS,
  [DerFlowEnum.NEW_ENTITY]: DerFlowEnum.DEFAULT,
  [DerFlowEnum.NEW_ATTR]: DerFlowEnum.ENTITY_OPTIONS,
  [DerFlowEnum.NEW_RELATIONSHIP]: DerFlowEnum.DEFAULT,
};

export enum DatabaseTypeOptions {
  VARCHAR,
  TEXT,
  INT,
  FLOAT,
  DOUBLE,
  TIMESTAMP,
  BOOLEAN,
  BLOB,
  JSON,
  UUID,
}

export const databaseTypeInfo = {
  [DatabaseTypeOptions.VARCHAR]: {
    title: 'VARCHAR',
    infoText: 'der.explanation.VARCHAR',
  },
  [DatabaseTypeOptions.TEXT]: {
    title: 'TEXT',
    infoText: 'der.explanation.TEXT',
  },
  [DatabaseTypeOptions.INT]: {
    title: 'INT',
    infoText: 'der.explanation.INT',
  },
  [DatabaseTypeOptions.FLOAT]: {
    title: 'FLOAT',
    infoText: 'der.explanation.FLOAT',
  },
  [DatabaseTypeOptions.DOUBLE]: {
    title: 'DOUBLE',
    infoText: 'der.explanation.DOUBLE',
  },
  [DatabaseTypeOptions.TIMESTAMP]: {
    title: 'TIMESTAMP',
    infoText: 'der.explanation.TIMESTAMP',
  },
  [DatabaseTypeOptions.BOOLEAN]: {
    title: 'BOOLEAN',
    infoText: 'der.explanation.BOOLEAN',
  },
  [DatabaseTypeOptions.BLOB]: {
    title: 'BLOB',
    infoText: 'der.explanation.BLOB',
  },
  [DatabaseTypeOptions.JSON]: {
    title: 'JSON',
    infoText: 'der.explanation.JSON',
  },
  [DatabaseTypeOptions.UUID]: {
    title: 'UUID',
    infoText: 'der.explanation.UUID',
  },
};

export enum CardinalityOptions {
  OneToOne,
  OneToMany,
  ManyToMany,
}

export const cardinalityInfo = {
  [CardinalityOptions.OneToOne]: {
    title: 'der.cardinality.OneToOne',
    infoText: 'der.explanation.OneToOne',
  },
  [CardinalityOptions.OneToMany]: {
    title: 'der.cardinality.OneToMany',
    infoText: 'der.explanation.OneToMany',
  },
  [CardinalityOptions.ManyToMany]: {
    title: 'der.cardinality.ManyToMany',
    infoText: 'der.explanation.ManyToMany',
  },
};

export enum RelationshipTypeOptions {
  COMMON,
  WEAK,
  INHERITANCE,
  ASSOCIATIVE,
}

export const relationshipTypeinfo = {
  [RelationshipTypeOptions.COMMON]: {
    title: 'der.relationship_type.common',
    infoText: 'der.explanation.common',
  },
  [RelationshipTypeOptions.WEAK]: {
    title: 'der.relationship_type.weak',
    infoText: 'der.explanation.weak',
  },
  [RelationshipTypeOptions.INHERITANCE]: {
    title: 'der.relationship_type.inheritance',
    infoText: 'der.explanation.inheritance',
  },
  [RelationshipTypeOptions.ASSOCIATIVE]: {
    title: 'der.relationship_type.associative',
    infoText: 'der.explanation.associative',
  },
};

export const DatabaseTypeOptionsMap = {
  [DatabaseTypeOptions.VARCHAR]: 'VARCHAR',
  [DatabaseTypeOptions.TEXT]: 'TEXT',
  [DatabaseTypeOptions.INT]: 'INT',
  [DatabaseTypeOptions.FLOAT]: 'FLOAT',
  [DatabaseTypeOptions.DOUBLE]: 'DOUBLE',
  [DatabaseTypeOptions.TIMESTAMP]: 'TIMESTAMP',
  [DatabaseTypeOptions.BOOLEAN]: 'BOOLEAN',
  [DatabaseTypeOptions.BLOB]: 'BLOB',
  [DatabaseTypeOptions.JSON]: 'JSON',
  [DatabaseTypeOptions.UUID]: 'UUID',
};

export const CardinalityOptionsMap = {
  [CardinalityOptions.OneToOne]: 'der.cardinality.OneToOne',
  [CardinalityOptions.OneToMany]: 'der.cardinality.OneToMany',
  [CardinalityOptions.ManyToMany]: 'der.cardinality.ManyToMany',
};

export const RelationshipTypeOptionsMap = {
  [RelationshipTypeOptions.COMMON]: 'der.relationship_type.common',
  [RelationshipTypeOptions.WEAK]: 'der.relationship_type.weak',
  [RelationshipTypeOptions.INHERITANCE]: 'der.relationship_type.inheritance',
  [RelationshipTypeOptions.ASSOCIATIVE]: 'der.relationship_type.associative',
};

export interface DiagramPosition {
  x: number | null;
  y: number | null;
}

export interface DerAttribute {
  id: string;
  name: string;
  type: DatabaseTypeOptions;
}

export interface ParsedAttribute {
  id: string;
  name: string;
  type: string;
}

export interface DerEntity {
  id: string;
  name: string;
  attrs?: DerAttribute[];
  position: DiagramPosition;
}

export interface ParsedEntity {
  id: string;
  name: string;
  attrs: ParsedAttribute[];
}

export interface DerRelationship {
  id: string;
  name: string;
  entityAId: string;
  entityBId: string;
  cardinality: CardinalityOptions;
  type: RelationshipTypeOptions;
  position: DiagramPosition;
}

export interface ParsedRelationship {
  id: string;
  name: string;
  entityA: string;
  entityB: string;
  entityAId: string;
  entityBId: string;
  cardinality: string;
  type: string;
}

export interface Diagram {
  id: string;
  name: string;
  entities: DerEntity[];
  relationships: DerRelationship[];
}

export interface ParsedDiagram {
  name: string;
  entities: ParsedEntity[];
  relationships: ParsedRelationship[];
}

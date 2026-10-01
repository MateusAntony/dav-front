import {
  CardinalityOptions,
  DatabaseTypeOptions,
  RelationshipTypeOptions,
  type Diagram,
  type DerAttribute,
  type DerEntity,
} from '~/src/interfaces/der-diagram';

// ---------------------------------------------------------------------------
// Cada nó da árvore de SQL carrega, ao mesmo tempo:
//  - technicalCode: o SQL padrão (o que de fato roda no banco)
//  - simpleCode: a MESMA informação em texto simples, sem sintaxe de SQL
//  - explanation: o "porquê" daquilo existir daquele jeito (lido no F1)
// As três coisas nascem do mesmo dado, nunca divergem entre si.
// ---------------------------------------------------------------------------

export interface SqlColumnNode {
  id: string;
  kind: 'column';
  name: string;
  sqlType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  nullable: boolean;
  unique: boolean;
  onDelete?: string;
  references?: { table: string; column: string };
  technicalCode: string;
  simpleCode: string;
  label: string;
  explanation: string;
}

export interface SqlTableNode {
  id: string;
  kind: 'table';
  name: string;
  originLabel: string;
  columns: SqlColumnNode[];
  pkColumns: string[];
  technicalCode: string;
  simpleCode: string;
  label: string;
  explanation: string;
}

export interface SqlScript {
  tables: SqlTableNode[];
  technicalSql: string;
  simpleSql: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Mapeamento de tipos (dialeto PostgreSQL, o banco usado no projeto)
// ---------------------------------------------------------------------------

const SQL_TYPE_MAP: Record<DatabaseTypeOptions, string> = {
  [DatabaseTypeOptions.VARCHAR]: 'VARCHAR(255)',
  [DatabaseTypeOptions.TEXT]: 'TEXT',
  [DatabaseTypeOptions.INT]: 'INTEGER',
  [DatabaseTypeOptions.FLOAT]: 'REAL',
  [DatabaseTypeOptions.DOUBLE]: 'DOUBLE PRECISION',
  [DatabaseTypeOptions.TIMESTAMP]: 'TIMESTAMP',
  [DatabaseTypeOptions.BOOLEAN]: 'BOOLEAN',
  [DatabaseTypeOptions.BLOB]: 'BYTEA',
  [DatabaseTypeOptions.JSON]: 'JSONB',
  [DatabaseTypeOptions.UUID]: 'UUID',
};

const SIMPLE_TYPE_MAP: Record<DatabaseTypeOptions, string> = {
  [DatabaseTypeOptions.VARCHAR]: 'texto curto',
  [DatabaseTypeOptions.TEXT]: 'texto longo',
  [DatabaseTypeOptions.INT]: 'número inteiro',
  [DatabaseTypeOptions.FLOAT]: 'número com casas decimais',
  [DatabaseTypeOptions.DOUBLE]: 'número decimal de alta precisão',
  [DatabaseTypeOptions.TIMESTAMP]: 'data e hora',
  [DatabaseTypeOptions.BOOLEAN]: 'sim ou não',
  [DatabaseTypeOptions.BLOB]: 'arquivo ou dado binário',
  [DatabaseTypeOptions.JSON]: 'dado estruturado (JSON)',
  [DatabaseTypeOptions.UUID]: 'código único gerado automaticamente',
};

function toSnakeCase(value: string): string {
  const cleaned = (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'tabela';
}

// ---------------------------------------------------------------------------
// Estruturas internas de construção
// ---------------------------------------------------------------------------

interface ColumnBuild {
  name: string;
  sqlType: string;
  simpleType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  nullable: boolean;
  unique?: boolean;
  references?: { table: string; column: string };
  onDelete?: string;
  explanation: string;
}

interface TableBuild {
  entityId?: string;
  tableName: string;
  originLabel: string;
  columns: ColumnBuild[];
  pkColumns: string[];
  // Coluna que outras tabelas referenciam (a chave primária "própria" da
  // entidade) e o tipo dela — as chaves estrangeiras copiam esse tipo.
  pkColumnName: string;
  pkSqlType: string;
  pkSimpleType: string;
  dependsOn: string[];
  explanation: string;
}

function buildColumnFromAttr(
  attr: DerAttribute,
  overrides: Partial<ColumnBuild> = {},
): ColumnBuild {
  const sqlType = SQL_TYPE_MAP[attr.type] ?? 'TEXT';
  const simpleType = SIMPLE_TYPE_MAP[attr.type] ?? 'um valor';
  return {
    name: toSnakeCase(attr.name),
    sqlType,
    simpleType,
    isPrimaryKey: false,
    isForeignKey: false,
    nullable: true,
    explanation: `Atributo definido no diagrama, do tipo ${sqlType}.`,
    ...overrides,
  };
}

function syntheticIdColumn(): ColumnBuild {
  return {
    name: 'id',
    sqlType: 'UUID',
    simpleType: SIMPLE_TYPE_MAP[DatabaseTypeOptions.UUID],
    isPrimaryKey: true,
    isForeignKey: false,
    nullable: false,
    explanation:
      'Nenhum atributo do tipo UUID (nem chamado "id") foi definido nessa entidade, então uma chave primária substituta (surrogate key) do tipo UUID foi adicionada automaticamente, seguindo prática comum em sistemas modernos.',
  };
}

const compact = (value: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Decide qual atributo JÁ EXISTENTE da entidade serve de chave primária:
//  1. um atributo chamado "id" (qualquer tipo);
//  2. senão, um atributo do tipo UUID — se houver vários, o que mais se
//     parece com o identificador da própria entidade (ex.: "DepartmentID"
//     em "Department", e não "ManagerID");
//  3. senão, nenhum (aí sim uma coluna "id" é criada).
export function resolvePrimaryKeyAttr(
  entity: DerEntity,
): DerAttribute | undefined {
  const attrs = entity.attrs ?? [];

  const namedId = attrs.find((attr) => compact(attr.name) === 'id');
  if (namedId) return namedId;

  const uuidAttrs = attrs.filter(
    (attr) => attr.type === DatabaseTypeOptions.UUID,
  );
  if (uuidAttrs.length === 0) return undefined;

  const entityKey = compact(entity.name);
  const score = (attr: DerAttribute): number => {
    const name = compact(attr.name);
    if (name === `${entityKey}id` || name === `id${entityKey}`) return 90;
    if (name.endsWith('id') && name.length > 2) {
      const base = name.slice(0, -2);
      if (entityKey.startsWith(base) || base.startsWith(entityKey)) return 85;
    }
    if (name === 'uuid' || name === 'guid') return 80;
    if (['codigo', 'code', 'cod', 'key', 'chave'].includes(name)) return 60;
    if (name.endsWith('id') || name.startsWith('id') || name.includes('uuid')) {
      return 40;
    }
    return 10;
  };

  return uuidAttrs
    .map((attr, index) => ({ attr, index, points: score(attr) }))
    .sort((a, b) => b.points - a.points || a.index - b.index)[0].attr;
}

// Monta a linha "técnica" (SQL de verdade) de uma coluna
function technicalColumnLine(col: ColumnBuild, singlePk: boolean): string {
  const parts = [
    col.name,
    col.sqlType,
    col.isPrimaryKey && singlePk ? 'PRIMARY KEY' : null,
    col.nullable ? null : 'NOT NULL',
    col.unique ? 'UNIQUE' : null,
    col.references
      ? `REFERENCES ${col.references.table}(${col.references.column})${
          col.onDelete ? ` ON DELETE ${col.onDelete}` : ''
        }`
      : null,
  ].filter(Boolean);
  return parts.join(' ');
}

// Monta a linha "simples" (texto natural) da mesma coluna
function simpleColumnLine(col: ColumnBuild): string {
  if (col.isPrimaryKey && col.isForeignKey) {
    return `${col.name} → identifica esta linha e, ao mesmo tempo, liga com "${col.references?.table}" (chave primária e estrangeira)`;
  }
  if (col.isPrimaryKey) {
    return `${col.name} → identificador único desta linha (chave primária)`;
  }
  if (col.isForeignKey) {
    return `${col.name} → liga esta linha a um registro de "${col.references?.table}"${
      col.unique ? ', sem repetir (relação de 1 para 1)' : ''
    }`;
  }
  return `${col.name} → guarda ${col.simpleType}${
    col.nullable ? '' : ', preenchimento obrigatório'
  }`;
}

// ---------------------------------------------------------------------------
// Geração principal
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Explicação simples (para ser ouvida), no formato:
//   "A tabela aluno tem 3 colunas de dados: nome, idade e email.
//    A chave primária é id, que identifica cada registro.
//    A chave estrangeira é turma_id, que liga esta tabela à tabela turma."
// ---------------------------------------------------------------------------
const spokenName = (name: string) => name.replace(/_/g, ' ');

const joinList = (items: string[]): string => {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
};

function simpleTableText(table: TableBuild): string {
  const plain = table.columns.filter((c) => !c.isPrimaryKey && !c.isForeignKey);
  const pks = table.columns.filter((c) => c.isPrimaryKey);
  const fks = table.columns.filter((c) => c.isForeignKey && c.references);

  const parts: string[] = [];

  parts.push(
    plain.length === 0
      ? `A tabela ${spokenName(table.tableName)} não tem colunas de dados comuns, apenas colunas de chave.`
      : `A tabela ${spokenName(table.tableName)} tem ${plain.length} ${
          plain.length === 1 ? 'coluna de dados' : 'colunas de dados'
        }: ${joinList(plain.map((c) => spokenName(c.name)))}.`,
  );

  if (pks.length === 1) {
    parts.push(
      `A chave primária é ${spokenName(pks[0].name)}, que identifica cada registro.`,
    );
  } else if (pks.length > 1) {
    parts.push(
      `A chave primária é formada por ${joinList(
        pks.map((c) => spokenName(c.name)),
      )} juntas, e identifica cada registro.`,
    );
  }

  if (fks.length === 1) {
    parts.push(
      `A chave estrangeira é ${spokenName(fks[0].name)}, que liga esta tabela à tabela ${spokenName(fks[0].references!.table)}.`,
    );
  } else if (fks.length > 1) {
    parts.push(
      `As chaves estrangeiras são ${joinList(
        fks.map(
          (c) =>
            `${spokenName(c.name)}, que liga à tabela ${spokenName(c.references!.table)}`,
        ),
      )}.`,
    );
  }

  return parts.join(' ');
}

export function generateSqlScript(diagram: Diagram): SqlScript {
  const entities = diagram.entities ?? [];
  const relationships = diagram.relationships ?? [];

  const tableNameByEntityId = new Map<string, string>();
  entities.forEach((entity) => {
    tableNameByEntityId.set(entity.id, toSnakeCase(entity.name));
  });

  // Chave primária "própria" de cada entidade (coluna, tipo). É daqui que
  // saem as colunas referenciadas pelas chaves estrangeiras — assim, se a
  // entidade já tem um atributo UUID usado como PK, é ELE que é referenciado
  // (e não uma coluna "id" que não existe).
  const pkAttrByEntityId = new Map<string, DerAttribute | undefined>();
  const pkInfoByEntityId = new Map<
    string,
    { column: string; sqlType: string; simpleType: string }
  >();
  entities.forEach((entity) => {
    const pkAttr = resolvePrimaryKeyAttr(entity);
    pkAttrByEntityId.set(entity.id, pkAttr);
    pkInfoByEntityId.set(
      entity.id,
      pkAttr
        ? {
            column: toSnakeCase(pkAttr.name),
            sqlType: SQL_TYPE_MAP[pkAttr.type] ?? 'TEXT',
            simpleType: SIMPLE_TYPE_MAP[pkAttr.type] ?? 'um valor',
          }
        : {
            column: 'id',
            sqlType: 'UUID',
            simpleType: SIMPLE_TYPE_MAP[DatabaseTypeOptions.UUID],
          },
    );
  });

  const parentOfChild = new Map<
    string,
    { parentEntityId: string; parentTableName: string }
  >();
  const ownerOfWeak = new Map<
    string,
    { ownerEntityId: string; ownerTableName: string }
  >();

  relationships.forEach((rel) => {
    if (rel.type === RelationshipTypeOptions.INHERITANCE) {
      parentOfChild.set(rel.entityBId, {
        parentEntityId: rel.entityAId,
        parentTableName: tableNameByEntityId.get(rel.entityAId) ?? '',
      });
    }
    if (rel.type === RelationshipTypeOptions.WEAK) {
      ownerOfWeak.set(rel.entityBId, {
        ownerEntityId: rel.entityAId,
        ownerTableName: tableNameByEntityId.get(rel.entityAId) ?? '',
      });
    }
  });

  const tables = new Map<string, TableBuild>();

  // --- Passo 1: uma tabela por entidade -----------------------------------
  entities.forEach((entity) => {
    const tableName = tableNameByEntityId.get(entity.id) as string;
    const columns: ColumnBuild[] = [];
    let pkColumns: string[] = [];
    const dependsOn: string[] = [];
    let explanation = `Gerada diretamente da entidade "${entity.name}" do diagrama.`;

    const inheritsFrom = parentOfChild.get(entity.id);
    const pkAttr = pkAttrByEntityId.get(entity.id);
    const ownPk = pkInfoByEntityId.get(entity.id) as {
      column: string;
      sqlType: string;
      simpleType: string;
    };

    if (inheritsFrom) {
      const parentPk = pkInfoByEntityId.get(inheritsFrom.parentEntityId) ?? {
        column: 'id',
        sqlType: 'UUID',
        simpleType: SIMPLE_TYPE_MAP[DatabaseTypeOptions.UUID],
      };
      columns.push({
        name: ownPk.column,
        sqlType: parentPk.sqlType,
        simpleType: parentPk.simpleType,
        isPrimaryKey: true,
        isForeignKey: true,
        nullable: false,
        references: {
          table: inheritsFrom.parentTableName,
          column: parentPk.column,
        },
        onDelete: 'CASCADE',
        explanation: `Esta entidade herda de "${inheritsFrom.parentTableName}" no diagrama (relacionamento de herança). Por isso, sua chave primária é também uma chave estrangeira para a tabela pai — estratégia de "tabela por subtipo", que evita duplicar dados comuns às duas entidades.`,
      });
      pkColumns = [ownPk.column];
      dependsOn.push(inheritsFrom.parentTableName);
      explanation = `Tabela criada a partir da especialização de "${inheritsFrom.parentTableName}" (relacionamento de herança no diagrama).`;
    } else if (pkAttr) {
      const isNamedId = compact(pkAttr.name) === 'id';
      columns.push(
        buildColumnFromAttr(pkAttr, {
          isPrimaryKey: true,
          nullable: false,
          explanation: isNamedId
            ? 'Atributo chamado "id" definido pelo próprio usuário no diagrama; foi utilizado diretamente como chave primária.'
            : `O atributo "${pkAttr.name}", do tipo UUID, já existe no diagrama; por isso ele mesmo foi usado como chave primária e nenhuma coluna "id" extra foi criada.`,
        }),
      );
      pkColumns = [ownPk.column];
    } else {
      columns.push(syntheticIdColumn());
      pkColumns = ['id'];
    }

    const weakOwner = ownerOfWeak.get(entity.id);
    if (weakOwner) {
      const fkColumn = `${weakOwner.ownerTableName}_id`;
      const ownerPk = pkInfoByEntityId.get(weakOwner.ownerEntityId) ?? {
        column: 'id',
        sqlType: 'UUID',
        simpleType: SIMPLE_TYPE_MAP[DatabaseTypeOptions.UUID],
      };
      columns.push({
        name: fkColumn,
        sqlType: ownerPk.sqlType,
        simpleType: ownerPk.simpleType,
        isPrimaryKey: true,
        isForeignKey: true,
        nullable: false,
        references: {
          table: weakOwner.ownerTableName,
          column: ownerPk.column,
        },
        onDelete: 'CASCADE',
        explanation: `Esta é uma entidade fraca (não existe sozinha no diagrama): sua identidade depende de "${weakOwner.ownerTableName}". Por isso a chave primária é composta, incluindo a chave estrangeira do "dono". Ao excluir o registro em "${weakOwner.ownerTableName}", os registros aqui são excluídos automaticamente (ON DELETE CASCADE).`,
      });
      pkColumns = [...pkColumns, fkColumn];
      dependsOn.push(weakOwner.ownerTableName);
      explanation += ' É uma entidade fraca, dependente da entidade proprietária.';
    }

    (entity.attrs ?? []).forEach((attr) => {
      if (pkAttr && attr.id === pkAttr.id) return;
      columns.push(buildColumnFromAttr(attr));
    });

    tables.set(entity.id, {
      entityId: entity.id,
      tableName,
      originLabel: entity.name,
      columns,
      pkColumns,
      pkColumnName: ownPk.column,
      pkSqlType: inheritsFrom
        ? (columns[0]?.sqlType ?? ownPk.sqlType)
        : ownPk.sqlType,
      pkSimpleType: ownPk.simpleType,
      dependsOn,
      explanation,
    });
  });

  // --- Passo 2: relacionamentos comuns/associativos/N:N ------------------
  let junctionIndex = 0;
  relationships.forEach((rel) => {
    if (
      rel.type === RelationshipTypeOptions.INHERITANCE ||
      rel.type === RelationshipTypeOptions.WEAK
    ) {
      return;
    }

    const tableA = tables.get(rel.entityAId);
    const tableB = tables.get(rel.entityBId);
    if (!tableA || !tableB) return;

    const needsJunctionTable =
      rel.cardinality === CardinalityOptions.ManyToMany ||
      rel.type === RelationshipTypeOptions.ASSOCIATIVE;

    if (needsJunctionTable) {
      junctionIndex += 1;
      const junctionName = rel.name
        ? toSnakeCase(rel.name)
        : `${tableA.tableName}_${tableB.tableName}`;
      const fkAColumn = `${tableA.tableName}_id`;
      const fkBColumn = `${tableB.tableName}_id`;
      const isAssociative = rel.type === RelationshipTypeOptions.ASSOCIATIVE;

      tables.set(`relationship:${rel.id}:${junctionIndex}`, {
        tableName: junctionName,
        originLabel: rel.name || `${tableA.originLabel} × ${tableB.originLabel}`,
        columns: [
          {
            name: fkAColumn,
            sqlType: tableA.pkSqlType,
            simpleType: tableA.pkSimpleType,
            isPrimaryKey: true,
            isForeignKey: true,
            nullable: false,
            references: {
              table: tableA.tableName,
              column: tableA.pkColumnName,
            },
            explanation: `Referencia a tabela "${tableA.tableName}", um dos dois lados do relacionamento.`,
          },
          {
            name: fkBColumn,
            sqlType: tableB.pkSqlType,
            simpleType: tableB.pkSimpleType,
            isPrimaryKey: true,
            isForeignKey: true,
            nullable: false,
            references: {
              table: tableB.tableName,
              column: tableB.pkColumnName,
            },
            explanation: `Referencia a tabela "${tableB.tableName}", o outro lado do relacionamento.`,
          },
        ],
        pkColumns: [fkAColumn, fkBColumn],
        pkColumnName: fkAColumn,
        pkSqlType: tableA.pkSqlType,
        pkSimpleType: tableA.pkSimpleType,
        dependsOn: [tableA.tableName, tableB.tableName],
        explanation: `Tabela de junção criada para o relacionamento "${
          rel.name || ''
        }" entre "${tableA.tableName}" e "${tableB.tableName}". O modelo relacional não representa relacionamentos muitos-para-muitos diretamente — por isso, ${
          isAssociative
            ? 'e por ter sido marcado como associativo no diagrama, '
            : ''
        }uma tabela intermediária é necessária.`,
      });
      return;
    }

    const fkColumn = `${tableA.tableName}_id`;
    const isOneToOne = rel.cardinality === CardinalityOptions.OneToOne;

    tableB.columns.push({
      name: fkColumn,
      sqlType: tableA.pkSqlType,
      simpleType: tableA.pkSimpleType,
      isPrimaryKey: false,
      isForeignKey: true,
      nullable: true,
      unique: isOneToOne,
      references: { table: tableA.tableName, column: tableA.pkColumnName },
      explanation: isOneToOne
        ? `Chave estrangeira para "${tableA.tableName}". Como a cardinalidade no diagrama é 1 para 1, uma restrição UNIQUE foi adicionada — sem ela, o banco permitiria vários registros aqui apontando para o mesmo registro de "${tableA.tableName}", o que caracterizaria 1 para N, não 1 para 1.`
        : `Chave estrangeira para "${tableA.tableName}", colocada no lado "muitos" do relacionamento (cardinalidade 1 para N no diagrama).`,
    });
    tableB.dependsOn.push(tableA.tableName);
  });

  // --- Passo 3: ordenar tabelas respeitando dependências -------------------
  const orderedNames: string[] = [];
  const pending = new Map(tables);
  const tableNames = new Set(Array.from(tables.values()).map((t) => t.tableName));

  let safety = 0;
  while (pending.size > 0 && safety < tables.size + 5) {
    safety += 1;
    for (const [key, table] of Array.from(pending.entries())) {
      const blocked = table.dependsOn.some(
        (dep) => tableNames.has(dep) && !orderedNames.includes(dep),
      );
      if (!blocked) {
        orderedNames.push(table.tableName);
        pending.delete(key);
      }
    }
  }
  Array.from(pending.values()).forEach((table) => orderedNames.push(table.tableName));

  const orderedTables = Array.from(tables.values()).sort(
    (a, b) => orderedNames.indexOf(a.tableName) - orderedNames.indexOf(b.tableName),
  );

  // --- Passo 4: montar os nós finais (código técnico + simples) -----------
  const finalTables: SqlTableNode[] = orderedTables.map((table) => {
    const singlePk = table.pkColumns.length === 1;

    const columnNodes: SqlColumnNode[] = table.columns.map((col) => ({
      id: `${table.tableName}.${col.name}`,
      kind: 'column',
      name: col.name,
      sqlType: col.sqlType,
      isPrimaryKey: col.isPrimaryKey,
      isForeignKey: col.isForeignKey,
      nullable: col.nullable,
      unique: Boolean(col.unique),
      onDelete: col.onDelete,
      references: col.references,
      technicalCode: technicalColumnLine(col, singlePk),
      simpleCode: simpleColumnLine(col),
      label: `${col.name}, ${col.sqlType}${col.isPrimaryKey ? ', chave primária' : ''}${col.isForeignKey ? ', chave estrangeira' : ''}`,
      explanation: col.explanation,
    }));

    const pkLine =
      table.pkColumns.length > 1
        ? `  PRIMARY KEY (${table.pkColumns.join(', ')})`
        : null;
    const technicalColumnLines = table.columns.map(
      (col) => `  ${technicalColumnLine(col, singlePk)}`,
    );
    const technicalAllLines = pkLine
      ? [...technicalColumnLines, pkLine]
      : technicalColumnLines;
    const technicalCode = `CREATE TABLE ${table.tableName} (\n${technicalAllLines.join(',\n')}\n);`;

    // Texto simplificado: serve só para ser OUVIDO (nunca é exibido na tela).
    // Frases curtas, sem sintaxe de SQL e sem tipos de dados.
    const simpleCode = simpleTableText(table);

    const fkCount = table.columns.filter((c) => c.isForeignKey).length;

    return {
      id: table.tableName,
      kind: 'table',
      name: table.tableName,
      originLabel: table.originLabel,
      columns: columnNodes,
      pkColumns: table.pkColumns,
      technicalCode,
      simpleCode,
      label: `Tabela ${table.tableName}, ${table.columns.length} colunas${fkCount ? `, ${fkCount} chave(s) estrangeira(s)` : ''}`,
      explanation: table.explanation,
    };
  });

  const technicalSql = finalTables.map((t) => t.technicalCode).join('\n\n');
  const simpleSql = finalTables.map((t) => t.simpleCode).join('\n\n');

  const totalColumns = finalTables.reduce((sum, t) => sum + t.columns.length, 0);
  const totalFks = finalTables.reduce(
    (sum, t) => sum + t.columns.filter((c) => c.isForeignKey).length,
    0,
  );

  const summary = `Foram geradas ${finalTables.length} tabela(s), com ${totalColumns} coluna(s) no total e ${totalFks} chave(s) estrangeira(s). Dialeto: PostgreSQL.`;

  return {
    tables: finalTables,
    technicalSql,
    simpleSql,
    summary,
  };
}
import type { SqlColumnNode, SqlScript, SqlTableNode } from '~/src/utils/sql-generator';

// ---------------------------------------------------------------------------
// Simulador de comandos SQL (SELECT / INSERT / UPDATE / DELETE).
//
// Nada aqui fala com banco de dados: os "registros" vivem só na memória e os
// valores são genéricos, gerados pelo sistema apenas para ilustrar o que cada
// comando faz. As regras de chave estrangeira, chave primária e UNIQUE do SQL
// gerado são respeitadas — assim, um INSERT em uma tabela "filha" só funciona
// se já existir um registro na tabela "pai", como num banco de verdade.
// ---------------------------------------------------------------------------

export type SimValue = string | number | boolean | null;
export type SimRow = Record<string, SimValue>;
export type SimCommand = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface SimState {
  rows: Record<string, SimRow[]>;
  counters: Record<string, number>;
}

export interface SimResult {
  ok: boolean;
  command: SimCommand;
  // Comando SQL "de verdade" que foi simulado (exibido na tela).
  sql: string;
  // Explicação curta exibida na tela.
  message: string;
  // Texto pensado para ser ouvido (sem UUIDs, sem sintaxe).
  spoken: string;
  // Linhas a destacar na tabela exibida.
  highlight: number[];
  highlightKind?: 'inserted' | 'updated' | 'selected';
}

export const createSimState = (): SimState => ({ rows: {}, counters: {} });

export type UuidFactory = () => string;

export const defaultUuid: UuidFactory = () => {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const rowsOf = (state: SimState, table: SqlTableNode): SimRow[] => {
  if (!state.rows[table.name]) state.rows[table.name] = [];
  return state.rows[table.name];
};

const isUuidType = (col: SqlColumnNode) => col.sqlType.toUpperCase() === 'UUID';

export const formatSqlLiteral = (value: SimValue): string => {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const nowText = () =>
  new Date().toISOString().slice(0, 19).replace('T', ' ');

// Valor genérico para uma coluna "comum" (que não é chave estrangeira).
export const sampleValue = (
  col: SqlColumnNode,
  n: number,
  uuid: UuidFactory,
  variant: 'new' | 'changed' = 'new',
): SimValue => {
  const type = col.sqlType.toUpperCase();
  const changed = variant === 'changed';
  if (type === 'UUID') return uuid();
  // Texto genérico baseado no nome da coluna: coluna "nome" -> nome1, nome2...
  if (type.startsWith('VARCHAR') || type === 'TEXT') {
    return changed ? `${col.name}${n} alterado` : `${col.name}${n}`;
  }
  if (type === 'INTEGER') return changed ? n + 100 : n;
  if (type === 'REAL' || type === 'DOUBLE PRECISION') {
    return changed ? n + 100.5 : n + 0.5;
  }
  if (type === 'TIMESTAMP') return nowText();
  if (type === 'BOOLEAN') return changed ? n % 2 === 0 : n % 2 === 1;
  if (type === 'BYTEA') return changed ? '\\xFF00' : '\\x00FF';
  if (type === 'JSONB') {
    return changed
      ? `{"exemplo": ${n}, "alterado": true}`
      : `{"exemplo": ${n}}`;
  }
  return `${col.name}${n}`;
};

const findTable = (script: SqlScript, name: string) =>
  script.tables.find((t) => t.name === name);

const keyOf = (row: SimRow, columns: string[]) =>
  JSON.stringify(columns.map((c) => row[c]));

// Fala amigável de uma linha (omite UUIDs e dados binários: são ilegíveis
// quando ouvidos).
const speakRow = (table: SqlTableNode, row: SimRow): string => {
  const parts = table.columns
    .filter((c) => !isUuidType(c) && c.sqlType.toUpperCase() !== 'BYTEA')
    .map((c) => `${c.name}: ${row[c.name] === null ? 'vazio' : row[c.name]}`);
  return parts.length > 0 ? parts.join(', ') : 'apenas identificadores';
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Texto que descreve, em linguagem comum, o que o comando faz.
export const commandExplanations: Record<SimCommand, string> = {
  SELECT:
    'SELECT consulta a tabela e devolve as linhas guardadas, sem modificar nada.',
  INSERT:
    'INSERT adiciona uma nova linha (um novo registro) na tabela. Aqui o sistema preenche a linha com valores genéricos, só para exemplo.',
  UPDATE:
    'UPDATE altera os valores de uma linha que já existe. O WHERE indica qual linha será alterada; sem ele, todas as linhas seriam alteradas.',
  DELETE:
    'DELETE remove uma linha da tabela. O WHERE indica qual linha será removida; sem ele, a tabela inteira seria esvaziada.',
};

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------

export function simulateSelect(
  _script: SqlScript,
  table: SqlTableNode,
  state: SimState,
): SimResult {
  const rows = rowsOf(state, table);
  const sql = `SELECT * FROM ${table.name};`;
  if (rows.length === 0) {
    return {
      ok: true,
      command: 'SELECT',
      sql,
      message:
        'Consulta executada: nenhum registro encontrado. A tabela está vazia — experimente um INSERT.',
      spoken:
        'Consulta executada. A tabela está vazia, nenhum registro encontrado. Experimente inserir um registro.',
      highlight: [],
    };
  }
  const listed = rows
    .slice(0, 5)
    .map((row, i) => `Registro ${i + 1}: ${speakRow(table, row)}.`)
    .join(' ');
  const extra =
    rows.length > 5 ? ` E mais ${rows.length - 5} registros na tela.` : '';
  return {
    ok: true,
    command: 'SELECT',
    sql,
    message: `Consulta executada: ${plural(rows.length, 'registro retornado', 'registros retornados')}.`,
    spoken: `Consulta executada: ${plural(rows.length, 'registro retornado', 'registros retornados')}. ${listed}${extra}`,
    highlight: rows.map((_, i) => i),
    highlightKind: 'selected',
  };
}

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------

// Testa se a linha candidata quebraria PK ou UNIQUE.
const violatesUniqueness = (
  table: SqlTableNode,
  rows: SimRow[],
  candidate: SimRow,
): boolean => {
  const pk = table.pkColumns;
  if (pk.length > 0) {
    const key = keyOf(candidate, pk);
    if (rows.some((r) => keyOf(r, pk) === key)) return true;
  }
  return table.columns
    .filter((c) => c.unique && !pk.includes(c.name))
    .some(
      (c) =>
        candidate[c.name] !== null &&
        rows.some((r) => r[c.name] === candidate[c.name]),
    );
};

export function simulateInsert(
  script: SqlScript,
  table: SqlTableNode,
  state: SimState,
  uuid: UuidFactory = defaultUuid,
): SimResult {
  const rows = rowsOf(state, table);
  const n = (state.counters[table.name] ?? 0) + 1;

  const fkColumns = table.columns.filter((c) => c.isForeignKey && c.references);

  // Para cada FK, os valores possíveis (chaves de registros existentes no pai).
  const options = fkColumns.map((col) => {
    const parent = findTable(script, col.references!.table);
    const parentRows = parent ? rowsOf(state, parent) : [];
    return parentRows.map((r) => r[col.references!.column] as SimValue);
  });

  // Uma FK obrigatória sem nenhum registro no pai é um erro real de banco.
  for (let i = 0; i < fkColumns.length; i++) {
    const col = fkColumns[i];
    if (!col.nullable && options[i].length === 0) {
      const parentName = col.references!.table;
      return {
        ok: false,
        command: 'INSERT',
        sql: `INSERT INTO ${table.name} ...;`,
        message: `Erro: a coluna "${col.name}" é uma chave estrangeira obrigatória e a tabela "${parentName}" ainda não tem nenhum registro. Insira primeiro um registro em "${parentName}".`,
        spoken: `Não foi possível inserir. A coluna ${col.name} precisa apontar para um registro existente na tabela ${parentName}, mas ela está vazia. Insira primeiro um registro em ${parentName}.`,
        highlight: [],
      };
    }
  }

  // Monta a linha-base (colunas comuns).
  const base: SimRow = {};
  table.columns.forEach((col) => {
    if (fkColumns.includes(col)) return;
    base[col.name] = sampleValue(col, n, uuid);
  });

  // Procura uma combinação de FKs que não quebre PK/UNIQUE (produto cartesiano
  // limitado — os diagramas de estudo são pequenos).
  const combos: SimValue[][] = [];
  const build = (idx: number, current: SimValue[]) => {
    if (combos.length >= 500) return;
    if (idx === fkColumns.length) {
      combos.push([...current]);
      return;
    }
    const pool: SimValue[] = [...options[idx]];
    if (fkColumns[idx].nullable) pool.push(null);
    pool.forEach((v) => build(idx + 1, [...current, v]));
  };
  build(0, []);

  let chosen: SimRow | null = null;
  for (const combo of combos) {
    const candidate: SimRow = { ...base };
    fkColumns.forEach((col, i) => {
      candidate[col.name] = combo[i];
    });
    if (!violatesUniqueness(table, rows, candidate)) {
      chosen = candidate;
      break;
    }
  }

  if (!chosen) {
    const parents = Array.from(
      new Set(fkColumns.map((c) => c.references!.table)),
    ).join(' ou ');
    return {
      ok: false,
      command: 'INSERT',
      sql: `INSERT INTO ${table.name} ...;`,
      message: `Erro: todas as combinações possíveis já existem em "${table.name}" (a chave primária ou uma restrição UNIQUE não permite repetição). Insira mais registros em ${parents} e tente de novo.`,
      spoken: `Não foi possível inserir. Todas as combinações possíveis já existem na tabela ${table.name}. Insira mais registros em ${parents} e tente novamente.`,
      highlight: [],
    };
  }

  // Ordena as colunas na ordem da tabela.
  const row: SimRow = {};
  table.columns.forEach((c) => {
    row[c.name] = chosen![c.name];
  });

  rows.push(row);
  state.counters[table.name] = n;

  const columnsSql = table.columns.map((c) => c.name).join(', ');
  const valuesSql = table.columns
    .map((c) => formatSqlLiteral(row[c.name]))
    .join(', ');

  return {
    ok: true,
    command: 'INSERT',
    sql: `INSERT INTO ${table.name} (${columnsSql})\nVALUES (${valuesSql});`,
    message: `1 registro inserido. A tabela agora tem ${plural(rows.length, 'registro', 'registros')}.`,
    spoken: `Registro inserido com valores genéricos. ${speakRow(table, row)}. A tabela agora tem ${plural(rows.length, 'registro', 'registros')}.`,
    highlight: [rows.length - 1],
    highlightKind: 'inserted',
  };
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

const whereClause = (table: SqlTableNode, row: SimRow) => {
  const pk = table.pkColumns.length > 0 ? table.pkColumns : [table.columns[0].name];
  return pk.map((c) => `${c} = ${formatSqlLiteral(row[c])}`).join(' AND ');
};

export function simulateUpdate(
  _script: SqlScript,
  table: SqlTableNode,
  state: SimState,
  uuid: UuidFactory = defaultUuid,
): SimResult {
  const rows = rowsOf(state, table);
  if (rows.length === 0) {
    return {
      ok: false,
      command: 'UPDATE',
      sql: `UPDATE ${table.name} SET ... WHERE ...;`,
      message:
        'Nada para alterar: a tabela está vazia. Faça um INSERT primeiro.',
      spoken:
        'Nada para alterar, a tabela está vazia. Faça um insert primeiro.',
      highlight: [],
    };
  }

  // Só colunas comuns são alteradas (chaves não mudam num UPDATE simples).
  const editable = table.columns.filter(
    (c) => !c.isPrimaryKey && !c.isForeignKey,
  );
  if (editable.length === 0) {
    return {
      ok: false,
      command: 'UPDATE',
      sql: `UPDATE ${table.name} SET ... WHERE ...;`,
      message:
        'Esta tabela só tem colunas de chave (identificadores), que normalmente não são alteradas. Não há o que atualizar.',
      spoken:
        'Esta tabela só tem colunas de chave, que normalmente não são alteradas. Não há o que atualizar.',
      highlight: [],
    };
  }

  const index = 0;
  const target = rows[index];
  const n = state.counters[table.name] ?? 1;
  const where = whereClause(table, target);

  const changes = editable.slice(0, 2).map((col) => {
    const previous = target[col.name];
    const type = col.sqlType.toUpperCase();
    // Texto: acrescenta " alterado" ao valor que já estava (nome1 -> nome1 alterado).
    const value =
      typeof previous === 'string' &&
      (type.startsWith('VARCHAR') || type === 'TEXT')
        ? `${previous} alterado`
        : sampleValue(col, n, uuid, 'changed');
    target[col.name] = value;
    return { col, value };
  });

  const setSql = changes
    .map(({ col, value }) => `${col.name} = ${formatSqlLiteral(value)}`)
    .join(', ');

  return {
    ok: true,
    command: 'UPDATE',
    sql: `UPDATE ${table.name}\nSET ${setSql}\nWHERE ${where};`,
    message: `1 registro alterado (o primeiro da tabela): ${changes.map((c) => c.col.name).join(', ')}.`,
    spoken: `Registro alterado. Foi atualizado o primeiro registro da tabela, nas colunas ${changes.map((c) => c.col.name).join(' e ')}. Os outros registros não mudaram.`,
    highlight: [index],
    highlightKind: 'updated',
  };
}

// ---------------------------------------------------------------------------
// DELETE (respeita chaves estrangeiras: bloqueia ou apaga em cascata)
// ---------------------------------------------------------------------------

// Tabelas/colunas que referenciam a tabela alvo.
const dependentsOf = (script: SqlScript, table: SqlTableNode) =>
  script.tables.flatMap((t) =>
    t.columns
      .filter((c) => c.references?.table === table.name)
      .map((c) => ({ table: t, column: c })),
  );

// Apaga em cascata; devolve quantas linhas foram apagadas por tabela.
const cascadeDelete = (
  script: SqlScript,
  table: SqlTableNode,
  state: SimState,
  row: SimRow,
  removed: Record<string, number>,
) => {
  const rows = rowsOf(state, table);
  const idx = rows.indexOf(row);
  if (idx >= 0) {
    rows.splice(idx, 1);
    removed[table.name] = (removed[table.name] ?? 0) + 1;
  }
  dependentsOf(script, table).forEach(({ table: child, column }) => {
    if (column.onDelete !== 'CASCADE') return;
    const value = row[column.references!.column];
    const childRows = rowsOf(state, child).filter(
      (r) => r[column.name] === value,
    );
    childRows.forEach((r) => cascadeDelete(script, child, state, r, removed));
  });
};

export function simulateDelete(
  script: SqlScript,
  table: SqlTableNode,
  state: SimState,
): SimResult {
  const rows = rowsOf(state, table);
  if (rows.length === 0) {
    return {
      ok: false,
      command: 'DELETE',
      sql: `DELETE FROM ${table.name} WHERE ...;`,
      message: 'Nada para excluir: a tabela está vazia. Faça um INSERT primeiro.',
      spoken: 'Nada para excluir, a tabela está vazia. Faça um insert primeiro.',
      highlight: [],
    };
  }

  const target = rows[rows.length - 1];
  const where = whereClause(table, target);
  const sql = `DELETE FROM ${table.name}\nWHERE ${where};`;

  // Registros em outras tabelas que dependem deste?
  const blockers = dependentsOf(script, table).filter(
    ({ table: child, column }) =>
      column.onDelete !== 'CASCADE' &&
      rowsOf(state, child).some(
        (r) => r[column.name] === target[column.references!.column],
      ),
  );
  if (blockers.length > 0) {
    const names = Array.from(new Set(blockers.map((b) => b.table.name))).join(
      ', ',
    );
    return {
      ok: false,
      command: 'DELETE',
      sql,
      message: `Erro: o registro não pode ser excluído porque há registros em "${names}" que dependem dele (chave estrangeira). Exclua primeiro os registros dependentes.`,
      spoken: `Não foi possível excluir. Existem registros na tabela ${names} que dependem deste registro. Exclua primeiro os registros dependentes.`,
      highlight: [],
    };
  }

  const removed: Record<string, number> = {};
  cascadeDelete(script, table, state, target, removed);

  const cascaded = Object.entries(removed).filter(([name]) => name !== table.name);
  const cascadeText =
    cascaded.length > 0
      ? ` Em cascata (ON DELETE CASCADE), também foram removidos: ${cascaded
          .map(([name, count]) => `${plural(count, 'registro', 'registros')} de "${name}"`)
          .join(', ')}.`
      : '';

  return {
    ok: true,
    command: 'DELETE',
    sql,
    message: `1 registro excluído (o último da tabela). Restam ${plural(rows.length, 'registro', 'registros')}.${cascadeText}`,
    spoken: `Registro excluído, o último da tabela. Restam ${plural(rows.length, 'registro', 'registros')}.${cascadeText}`,
    highlight: [],
  };
}
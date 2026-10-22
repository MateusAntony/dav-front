import type {
  SqlColumnNode,
  SqlScript,
  SqlTableNode,
} from '~/src/utils/sql-generator';

// ---------------------------------------------------------------------------
// Simulador de comandos SQL (INSERT e SELECT).
//
// Nada aqui fala com banco de dados: os registros são guardados em memória (e
// salvos junto com o diagrama). As regras do SQL gerado — tipo de cada coluna,
// NOT NULL, chave primária, UNIQUE e chave estrangeira — são respeitadas,
// então o erro que o usuário vê é o mesmo que um banco de verdade daria.
// ---------------------------------------------------------------------------

export type SimValue = string | number | boolean | null;
export type SimRow = Record<string, SimValue>;

export interface SimState {
  rows: Record<string, SimRow[]>;
}

export type SimCommand = 'SELECT' | 'INSERT';

export interface SimResultSet {
  columns: string[];
  rows: SimRow[];
}

export interface SimResult {
  ok: boolean;
  command: SimCommand;
  // Comando SQL (exibido na tela).
  sql: string;
  // Mensagem curta exibida na tela.
  message: string;
  // Texto pensado para ser ouvido (sem UUIDs, sem sintaxe).
  spoken: string;
  // Linhas da tabela a destacar (INSERT: a linha nova).
  highlight: number[];
  // Resultado de um SELECT.
  resultSet?: SimResultSet;
}

export const createSimState = (): SimState => ({ rows: {} });

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
// Tipos de coluna
// ---------------------------------------------------------------------------

export type ColumnKind =
  | 'uuid'
  | 'text'
  | 'int'
  | 'float'
  | 'timestamp'
  | 'bool'
  | 'bytes'
  | 'json';

export const kindOf = (col: SqlColumnNode): ColumnKind => {
  const type = col.sqlType.toUpperCase();
  if (type === 'UUID') return 'uuid';
  if (type === 'INTEGER') return 'int';
  if (type === 'REAL' || type === 'DOUBLE PRECISION') return 'float';
  if (type === 'TIMESTAMP') return 'timestamp';
  if (type === 'BOOLEAN') return 'bool';
  if (type === 'BYTEA') return 'bytes';
  if (type === 'JSONB') return 'json';
  return 'text';
};

const isNumeric = (col: SqlColumnNode) => {
  const k = kindOf(col);
  return k === 'int' || k === 'float';
};

const maxLength = (col: SqlColumnNode): number | null => {
  const match = col.sqlType.match(/\((\d+)\)/);
  return match ? Number(match[1]) : null;
};

const pad = (n: number) => String(n).padStart(2, '0');

// Aceita "2024-05-30", "2024-05-30 14:00[:00]" e "30/05/2024 [14:00]".
const parseTimestamp = (raw: string): string | null => {
  let y: number;
  let mo: number;
  let d: number;
  let m = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );
    if (!m) return null;
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const h = Number(m[4] ?? 0);
  const mi = Number(m[5] ?? 0);
  const s = Number(m[6] ?? 0);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const valid =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d &&
    h < 24 &&
    mi < 60 &&
    s < 60;
  return valid
    ? `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`
    : null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParseResult =
  | { ok: true; value: SimValue }
  | { ok: false; error: string };

// Converte o que o usuário digitou no valor do tipo da coluna.
// Texto vazio vira NULL (quem chama decide se NULL é permitido).
export function parseColumnInput(col: SqlColumnNode, raw: string): ParseResult {
  const text = (raw ?? '').trim();
  if (text === '') return { ok: true, value: null };

  switch (kindOf(col)) {
    case 'uuid':
      return UUID_RE.test(text)
        ? { ok: true, value: text.toLowerCase() }
        : {
            ok: false,
            error: `"${text}" não é um UUID válido. Deixe vazio para o sistema gerar um automaticamente.`,
          };
    case 'int':
      return /^-?\d+$/.test(text) && Math.abs(Number(text)) <= 2147483647
        ? { ok: true, value: Number(text) }
        : { ok: false, error: `"${text}" não é um número inteiro válido.` };
    case 'float': {
      const normalized = text.replace(',', '.');
      return /^-?\d+(\.\d+)?$/.test(normalized)
        ? { ok: true, value: Number(normalized) }
        : { ok: false, error: `"${text}" não é um número válido.` };
    }
    case 'bool': {
      const v = text.toLowerCase();
      if (['true', 't', 'verdadeiro', 'sim', 's', '1'].includes(v)) {
        return { ok: true, value: true };
      }
      if (['false', 'f', 'falso', 'nao', 'não', 'n', '0'].includes(v)) {
        return { ok: true, value: false };
      }
      return {
        ok: false,
        error: `"${text}" não é um valor lógico. Use verdadeiro ou falso.`,
      };
    }
    case 'timestamp': {
      const ts = parseTimestamp(text);
      return ts
        ? { ok: true, value: ts }
        : {
            ok: false,
            error: `"${text}" não é uma data válida. Use, por exemplo, 2024-05-30 ou 2024-05-30 14:00.`,
          };
    }
    case 'json':
      try {
        JSON.parse(text);
        return { ok: true, value: text };
      } catch {
        return { ok: false, error: `"${text}" não é um JSON válido.` };
      }
    case 'bytes':
      return { ok: true, value: text };
    default: {
      const limit = maxLength(col);
      if (limit !== null && text.length > limit) {
        return {
          ok: false,
          error: `O texto tem ${text.length} caracteres e a coluna aceita no máximo ${limit}.`,
        };
      }
      return { ok: true, value: text };
    }
  }
}

// Texto exibido/falado ao pedir o valor de uma coluna no INSERT.
export function describeColumnPrompt(col: SqlColumnNode): {
  title: string;
  allowEmpty: boolean;
} {
  const kind = kindOf(col);
  const typeText: Record<ColumnKind, string> = {
    uuid: 'identificador UUID',
    text: 'texto',
    int: 'número inteiro',
    float: 'número decimal',
    timestamp: 'data e hora, por exemplo 2024-05-30 14:00',
    bool: 'verdadeiro ou falso',
    bytes: 'dado binário',
    json: 'JSON',
  };
  let allowEmpty = true;
  let hint = '';
  if (kind === 'uuid' && col.isPrimaryKey && !col.isForeignKey) {
    hint = 'Deixe vazio e pressione Enter para gerar automaticamente.';
  } else if (col.nullable) {
    hint = 'Deixe vazio e pressione Enter para NULL.';
  } else {
    allowEmpty = false;
    hint = 'Preenchimento obrigatório.';
  }
  const flags = [col.isPrimaryKey ? 'chave primária' : '', col.unique ? 'valor único' : '']
    .filter(Boolean)
    .join(', ');
  return {
    title: `Valor de ${col.name.replace(/_/g, ' ')}. ${typeText[kind]}${
      flags ? `, ${flags}` : ''
    }. ${hint}`,
    allowEmpty,
  };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

export const formatSqlLiteral = (value: SimValue): string => {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const rowsOf = (state: SimState, table: SqlTableNode): SimRow[] => {
  if (!state.rows[table.name]) state.rows[table.name] = [];
  return state.rows[table.name];
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Fala de uma linha: omite UUIDs e dados binários (ilegíveis quando ouvidos).
const speakRow = (columns: string[], row: SimRow, skip: Set<string>): string => {
  const parts = columns
    .filter((c) => !skip.has(c))
    .map((c) => `${c.replace(/_/g, ' ')}: ${row[c] === null ? 'vazio' : row[c]}`);
  return parts.length > 0 ? parts.join(', ') : 'apenas identificadores';
};

const keyOf = (row: SimRow, columns: string[]) =>
  JSON.stringify(columns.map((c) => row[c]));

const unreadable = (table: SqlTableNode) =>
  new Set(
    table.columns
      .filter((c) => kindOf(c) === 'uuid' || kindOf(c) === 'bytes')
      .map((c) => c.name),
  );

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------

// Valores possíveis de uma chave estrangeira (chaves dos registros do pai).
export function foreignKeyOptions(
  script: SqlScript,
  state: SimState,
  col: SqlColumnNode,
): { value: SimValue; label: string }[] {
  const parent = script.tables.find((t) => t.name === col.references?.table);
  if (!parent || !col.references) return [];
  const skip = unreadable(parent);
  const parentColumns = parent.columns.map((c) => c.name);
  return rowsOf(state, parent).map((row, i) => ({
    value: row[col.references!.column],
    label: `Registro ${i + 1} de ${parent.name}: ${speakRow(parentColumns, row, skip)}`,
  }));
}

const failInsert = (table: SqlTableNode, message: string): SimResult => ({
  ok: false,
  command: 'INSERT',
  sql: `INSERT INTO ${table.name} ...;`,
  message: `Erro: ${message}`,
  spoken: `Não foi possível inserir. ${message}`,
  highlight: [],
});

// Insere um registro com os valores digitados pelo usuário.
// `values` traz, por coluna, o texto digitado (ou o valor já escolhido, no caso
// de chave estrangeira). Vazio = NULL (ou valor automático para a PK UUID).
export function simulateInsertValues(
  script: SqlScript,
  table: SqlTableNode,
  state: SimState,
  values: Record<string, SimValue | string>,
  uuid: UuidFactory = defaultUuid,
): SimResult {
  const rows = rowsOf(state, table);
  const row: SimRow = {};

  for (const col of table.columns) {
    const given = values[col.name];
    let value: SimValue;

    if (col.isForeignKey && col.references) {
      // Valor já escolhido na lista de registros do pai.
      value = given === undefined || given === '' ? null : (given as SimValue);
    } else {
      const parsed = parseColumnInput(
        col,
        given === null || given === undefined ? '' : String(given),
      );
      if (!parsed.ok) {
        return failInsert(table, `coluna ${col.name}: ${parsed.error}`);
      }
      value = parsed.value;
    }

    if (
      value === null &&
      col.isPrimaryKey &&
      kindOf(col) === 'uuid' &&
      !col.isForeignKey
    ) {
      value = uuid();
    }
    if (value === null && !col.nullable) {
      return failInsert(
        table,
        `a coluna ${col.name} é obrigatória e não pode ficar vazia.`,
      );
    }
    row[col.name] = value;
  }

  // Chave estrangeira: o registro referenciado precisa existir.
  for (const col of table.columns) {
    if (!col.isForeignKey || !col.references || row[col.name] === null) continue;
    const parent = script.tables.find((t) => t.name === col.references!.table);
    const exists =
      !!parent &&
      rowsOf(state, parent).some(
        (r) => r[col.references!.column] === row[col.name],
      );
    if (!exists) {
      return failInsert(
        table,
        `a coluna ${col.name} aponta para um registro que não existe na tabela ${col.references.table}.`,
      );
    }
  }

  // Chave primária e UNIQUE.
  const pk = table.pkColumns;
  if (pk.length > 0 && rows.some((r) => keyOf(r, pk) === keyOf(row, pk))) {
    return failInsert(
      table,
      `já existe um registro com essa chave primária (${pk.join(', ')}) na tabela ${table.name}.`,
    );
  }
  for (const col of table.columns) {
    if (
      col.unique &&
      !pk.includes(col.name) &&
      row[col.name] !== null &&
      rows.some((r) => r[col.name] === row[col.name])
    ) {
      return failInsert(
        table,
        `a coluna ${col.name} só aceita valores únicos e esse valor já existe.`,
      );
    }
  }

  rows.push(row);

  const columnsSql = table.columns.map((c) => c.name).join(', ');
  const valuesSql = table.columns
    .map((c) => formatSqlLiteral(row[c.name]))
    .join(', ');

  return {
    ok: true,
    command: 'INSERT',
    sql: `INSERT INTO ${table.name} (${columnsSql})\nVALUES (${valuesSql});`,
    message: `1 registro inserido. A tabela agora tem ${plural(rows.length, 'registro', 'registros')}.`,
    spoken: `Registro inserido. ${speakRow(
      table.columns.map((c) => c.name),
      row,
      unreadable(table),
    )}. A tabela agora tem ${plural(rows.length, 'registro', 'registros')}.`,
    highlight: [rows.length - 1],
  };
}

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------

export type AggFn = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
export const AGG_FUNCTIONS: AggFn[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

export type CompareOp =
  | '='
  | '<>'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'IS NULL'
  | 'IS NOT NULL';
export const COMPARE_OPS: CompareOp[] = [
  '=',
  '<>',
  '>',
  '<',
  '>=',
  '<=',
  'LIKE',
  'IS NULL',
  'IS NOT NULL',
];
export const HAVING_OPS: CompareOp[] = ['=', '<>', '>', '<', '>=', '<='];

export interface SelectItem {
  fn?: AggFn;
  // Nome da coluna, ou '*' (todas as colunas / COUNT(*)).
  column: string;
}
export interface Condition {
  column: string;
  op: CompareOp;
  value?: string;
}
export interface HavingCondition {
  fn: AggFn;
  column: string;
  op: CompareOp;
  value: string;
}
export interface OrderBy {
  // Nome de coluna da tabela OU rótulo de uma função (ex.: COUNT(*)).
  column: string;
  direction: 'ASC' | 'DESC';
}
export interface SelectQuery {
  table: string | null;
  items: SelectItem[];
  where: Condition[];
  groupBy: string[];
  having: HavingCondition[];
  orderBy: OrderBy[];
  limit: number | null;
}

export const emptyQuery = (table: string | null = null): SelectQuery => ({
  table,
  items: [],
  where: [],
  groupBy: [],
  having: [],
  orderBy: [],
  limit: null,
});

export const itemLabel = (item: SelectItem) =>
  item.fn ? `${item.fn}(${item.column})` : item.column;

const conditionSql = (
  col: SqlColumnNode | undefined,
  label: string,
  op: CompareOp,
  value: string | undefined,
) => {
  if (op === 'IS NULL' || op === 'IS NOT NULL') return `${label} ${op}`;
  const numeric = col ? isNumeric(col) : /^-?\d+([.,]\d+)?$/.test(value ?? '');
  const bool = col ? kindOf(col) === 'bool' : false;
  const literal =
    numeric || bool
      ? String(value ?? '').replace(',', '.')
      : formatSqlLiteral(value ?? '');
  return `${label} ${op} ${literal}`;
};

export function buildSelectSql(
  query: SelectQuery,
  table?: SqlTableNode,
): string {
  const colOf = (name: string) => table?.columns.find((c) => c.name === name);
  const lines: string[] = [];
  lines.push(
    `SELECT ${query.items.length ? query.items.map(itemLabel).join(', ') : '*'}`,
  );
  lines.push(`FROM ${query.table ?? '...'}`);
  if (query.where.length) {
    lines.push(
      `WHERE ${query.where
        .map((w) => conditionSql(colOf(w.column), w.column, w.op, w.value))
        .join(' AND ')}`,
    );
  }
  if (query.groupBy.length) lines.push(`GROUP BY ${query.groupBy.join(', ')}`);
  if (query.having.length) {
    lines.push(
      `HAVING ${query.having
        .map((h) => conditionSql(undefined, `${h.fn}(${h.column})`, h.op, h.value))
        .join(' AND ')}`,
    );
  }
  if (query.orderBy.length) {
    lines.push(
      `ORDER BY ${query.orderBy.map((o) => `${o.column} ${o.direction}`).join(', ')}`,
    );
  }
  if (query.limit !== null) lines.push(`LIMIT ${query.limit}`);
  return `${lines.join('\n')};`;
}

const failSelect = (sql: string, message: string): SimResult => ({
  ok: false,
  command: 'SELECT',
  sql,
  message: `Erro: ${message}`,
  spoken: `Não foi possível executar a consulta. ${message}`,
  highlight: [],
});

const likeToRegex = (pattern: string) =>
  new RegExp(
    `^${pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.')}$`,
  );

// Converte o texto digitado em um valor comparável com a coluna.
const comparable = (col: SqlColumnNode, raw: string): SimValue => {
  const parsed = parseColumnInput(col, raw);
  return parsed.ok ? parsed.value : raw;
};

const compare = (a: SimValue, op: CompareOp, b: SimValue): boolean => {
  if (op === 'IS NULL') return a === null;
  if (op === 'IS NOT NULL') return a !== null;
  if (a === null || b === null) return false; // NULL nunca é igual/maior/menor
  switch (op) {
    case '=':
      return a === b;
    case '<>':
      return a !== b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case 'LIKE':
      return likeToRegex(String(b)).test(String(a));
    default:
      return false;
  }
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

const aggregate = (fn: AggFn, column: string, group: SimRow[]): SimValue => {
  if (fn === 'COUNT') {
    return column === '*'
      ? group.length
      : group.filter((r) => r[column] !== null && r[column] !== undefined).length;
  }
  const values = group
    .map((r) => r[column])
    .filter((v): v is string | number | boolean => v !== null && v !== undefined);
  if (values.length === 0) return null;
  if (fn === 'MIN' || fn === 'MAX') {
    return values.reduce((best, v) =>
      fn === 'MIN' ? (v < best ? v : best) : v > best ? v : best,
    );
  }
  const nums = values.map(Number);
  const sum = nums.reduce((a, b) => a + b, 0);
  // AVG com 2 casas decimais fica mais legível para quem está aprendendo.
  return fn === 'SUM' ? round(sum) : Math.round((sum / nums.length) * 100) / 100;
};

export function simulateSelect(
  _script: SqlScript,
  table: SqlTableNode,
  state: SimState,
  query: SelectQuery,
): SimResult {
  const sql = buildSelectSql(query, table);
  const colOf = (name: string) => table.columns.find((c) => c.name === name);

  // --- Validações (mesmas regras de um banco de verdade) -------------------
  const hasAgg = query.items.some((i) => i.fn) || query.having.length > 0;
  const grouped = hasAgg || query.groupBy.length > 0;

  if (query.items.length === 0 && grouped) {
    return failSelect(
      sql,
      'com GROUP BY ou função agregada, escolha as colunas no SELECT em vez de usar o asterisco.',
    );
  }
  for (const item of query.items) {
    if (item.fn && ['SUM', 'AVG'].includes(item.fn)) {
      const col = colOf(item.column);
      if (!col || !isNumeric(col)) {
        return failSelect(
          sql,
          `${item.fn} só funciona em colunas numéricas, e ${item.column} não é numérica.`,
        );
      }
    }
    if (!item.fn && grouped && !query.groupBy.includes(item.column)) {
      return failSelect(
        sql,
        `a coluna ${item.column} precisa estar no GROUP BY ou dentro de uma função agregada.`,
      );
    }
  }
  for (const h of query.having) {
    if (['SUM', 'AVG'].includes(h.fn)) {
      const col = colOf(h.column);
      if (!col || !isNumeric(col)) {
        return failSelect(
          sql,
          `${h.fn} só funciona em colunas numéricas, e ${h.column} não é numérica.`,
        );
      }
    }
    if (Number.isNaN(Number(h.value.replace(',', '.')))) {
      return failSelect(sql, `o valor "${h.value}" do HAVING precisa ser um número.`);
    }
  }
  for (const w of query.where) {
    const col = colOf(w.column);
    if (!col) {
      return failSelect(sql, `a coluna ${w.column} não existe na tabela ${table.name}.`);
    }
    if (w.op === 'LIKE' && kindOf(col) !== 'text') {
      return failSelect(sql, 'LIKE só funciona em colunas de texto.');
    }
    if (w.op !== 'IS NULL' && w.op !== 'IS NOT NULL') {
      const parsed = parseColumnInput(col, w.value ?? '');
      if (!parsed.ok || parsed.value === null) {
        return failSelect(
          sql,
          `valor inválido no WHERE para ${w.column}: ${parsed.ok ? 'informe um valor.' : parsed.error}`,
        );
      }
    }
  }

  // --- Execução --------------------------------------------------------------
  // WHERE (condições combinadas com AND)
  const source = rowsOf(state, table).filter((row) =>
    query.where.every((w) => {
      const col = colOf(w.column) as SqlColumnNode;
      return compare(row[w.column], w.op, comparable(col, w.value ?? ''));
    }),
  );

  let columns: string[];
  let out: SimRow[] = [];

  if (grouped) {
    const groups = new Map<string, SimRow[]>();
    if (query.groupBy.length === 0) {
      groups.set('all', source); // só agregados: um único grupo
    } else {
      source.forEach((row) => {
        const key = keyOf(row, query.groupBy);
        groups.set(key, [...(groups.get(key) ?? []), row]);
      });
    }
    columns = query.items.map(itemLabel);
    groups.forEach((group) => {
      const havingOk = query.having.every((h) =>
        compare(
          aggregate(h.fn, h.column, group),
          h.op,
          Number(h.value.replace(',', '.')),
        ),
      );
      if (!havingOk) return;
      const row: SimRow = {};
      query.items.forEach((item) => {
        row[itemLabel(item)] = item.fn
          ? aggregate(item.fn, item.column, group)
          : (group[0]?.[item.column] ?? null);
      });
      query.groupBy.forEach((g) => {
        if (!(g in row)) row[`__${g}`] = group[0]?.[g] ?? null;
      });
      out.push(row);
    });
  } else {
    columns =
      query.items.length === 0 || query.items.some((i) => i.column === '*')
        ? table.columns.map((c) => c.name)
        : query.items.map(itemLabel);
    out = source.map((row) => {
      const o: SimRow = {};
      columns.forEach((c) => {
        o[c] = row[c];
      });
      // Colunas originais ficam acessíveis para ORDER BY em coluna não exibida.
      table.columns.forEach((c) => {
        if (!(c.name in o)) o[`__${c.name}`] = row[c.name];
      });
      return o;
    });
  }

  // ORDER BY
  for (const ob of query.orderBy) {
    const available =
      columns.includes(ob.column) || out.some((r) => `__${ob.column}` in r);
    if (!available && out.length > 0) {
      return failSelect(
        sql,
        `o ORDER BY usa ${ob.column}, que precisa estar no GROUP BY ou no SELECT quando há agrupamento.`,
      );
    }
  }
  if (query.orderBy.length > 0) {
    out.sort((a, b) => {
      for (const ob of query.orderBy) {
        const av = ob.column in a ? a[ob.column] : a[`__${ob.column}`];
        const bv = ob.column in b ? b[ob.column] : b[`__${ob.column}`];
        if (av === bv) continue;
        if (av === null) return 1; // NULL no fim
        if (bv === null) return -1;
        const cmp = av < bv ? -1 : 1;
        return ob.direction === 'ASC' ? cmp : -cmp;
      }
      return 0;
    });
  }

  // LIMIT
  if (query.limit !== null) out = out.slice(0, query.limit);

  // Remove as colunas auxiliares.
  const finalRows = out.map((r) => {
    const clean: SimRow = {};
    columns.forEach((c) => {
      clean[c] = r[c];
    });
    return clean;
  });

  if (finalRows.length === 0) {
    return {
      ok: true,
      command: 'SELECT',
      sql,
      message: 'Consulta executada: nenhum registro encontrado.',
      spoken: 'Consulta executada. Nenhum registro encontrado.',
      highlight: [],
      resultSet: { columns, rows: [] },
    };
  }

  const skip = new Set(
    columns.filter((label) => {
      const col = colOf(label);
      return !!col && (kindOf(col) === 'uuid' || kindOf(col) === 'bytes');
    }),
  );
  const listed = finalRows
    .slice(0, 5)
    .map((row, i) => `Registro ${i + 1}: ${speakRow(columns, row, skip)}.`)
    .join(' ');
  const extra =
    finalRows.length > 5
      ? ` E mais ${finalRows.length - 5} registros na tela.`
      : '';
  const count = plural(finalRows.length, 'registro retornado', 'registros retornados');

  return {
    ok: true,
    command: 'SELECT',
    sql,
    message: `Consulta executada: ${count}.`,
    spoken: `Consulta executada: ${count}. ${listed}${extra}`,
    highlight: [],
    resultSet: { columns, rows: finalRows },
  };
}

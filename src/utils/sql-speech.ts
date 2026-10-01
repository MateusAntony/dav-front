// Converte o código SQL técnico em frases próprias para serem FALADAS,
// uma por linha. Os sintetizadores de voz tropeçam em símbolos (parênteses,
// ponto e vírgula, underline), então eles são removidos ou trocados por pausa,
// mas as palavras do código (CREATE TABLE, PRIMARY KEY, REFERENCES...) são
// mantidas exatamente como foram geradas.
export function speakableSql(code: string): string[] {
  const phrases: string[] = [];

  code.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    // Fim de uma tabela: ");"
    if (/^\)\s*;?$/.test(line)) {
      phrases.push('fim da tabela');
      return;
    }

    const spoken = line
      // REFERENCES tabela(coluna) -> "REFERENCES tabela coluna coluna": sem
      // isso, tabela e coluna se misturam quando falados.
      .replace(/REFERENCES\s+(\w+)\s*\((\w+)\)/i, 'REFERENCES $1 coluna $2')
      .replace(/[;,]+$/, '') // vírgula/ponto e vírgula no fim da linha
      .replace(/_/g, ' ') // id_cliente -> id cliente
      .replace(/[()]/g, ' ') // VARCHAR(255) -> VARCHAR 255
      .replace(/\s+/g, ' ')
      .trim();

    if (spoken) phrases.push(spoken);
  });

  return phrases;
}
/**
 * Parser CSV RFC-4180 mínimo e correto.
 *
 * A planilha do ZCG tem títulos de propostas com vírgulas e quebras de linha
 * embutidas em aspas, usa CRLF, e escapa aspas com "". Um split ingênuo por
 * vírgula corromperia valores monetários e títulos — por isso este parser
 * trata campos entre aspas, aspas escapadas e ambos os terminadores de linha.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = input.length;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ",") {
      endField();
      i++;
    } else if (c === "\n") {
      endRow();
      i++;
    } else if (c === "\r") {
      if (input[i + 1] === "\n") i++;
      endRow();
      i++;
    } else {
      field += c;
      i++;
    }
  }

  // Resto pendente (arquivo sem newline final).
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

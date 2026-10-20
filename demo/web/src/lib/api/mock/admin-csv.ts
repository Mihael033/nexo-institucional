// Small RFC 4180 reader: preserves separators and newlines inside quoted cells.
export function parseCsv(text: string): string[][] {
  return parseCsvRecords(text).map(record => record.cells);
}

export function parseCsvRecords(text: string): { cells: string[]; lineNumber: number }[] {
  const source = text.replace(/^\uFEFF/, '');
  const header = source.split(/\r?\n/, 1)[0];
  const separator = (header.match(/;/g)?.length ?? 0) >= (header.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: { cells: string[]; lineNumber: number }[] = [];
  let row: string[] = [], cell = '', quoted = false;
  let lineNumber = 1, rowStart = 1;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === separator && !quoted) { row.push(cell.trim()); cell = ''; }
    else if (char === '\n' || char === '\r') {
      const crlf = char === '\r' && source[i + 1] === '\n';
      if (quoted) cell += crlf ? '\r\n' : char;
      else { row.push(cell.trim()); rows.push({ cells: row, lineNumber: rowStart }); row = []; cell = ''; }
      if (crlf) i++;
      lineNumber++;
      if (!quoted) rowStart = lineNumber;
    } else cell += char;
  }
  if (quoted) throw new Error('El CSV contiene comillas sin cerrar.');
  if (cell || row.length) { row.push(cell.trim()); rows.push({ cells: row, lineNumber: rowStart }); }
  return rows;
}

export function csvCell(value: unknown): string {
  // Protect exported reports from spreadsheet formula execution.
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function validateProduct(input: import('../admin-types').ProductUpsertRequest): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const check = (field: string, valid: boolean, message: string) => { if (!valid) errors[field] = [message]; };
  check('name', input.name.trim().length >= 3 && input.name.length <= 150, 'Ingrese un nombre de 3 a 150 caracteres.');
  check('brand', input.brand.trim().length >= 1 && input.brand.length <= 80, 'Ingrese una marca de hasta 80 caracteres.');
  check('categoryId', input.categoryId > 0, 'Seleccione una categoría.');
  check('priceBs', Number.isFinite(input.priceBs) && Math.abs(input.priceBs * 100 - Math.round(input.priceBs * 100)) < 0.00001 && input.priceBs >= 0 && input.priceBs <= 100_000_000, 'Ingrese un precio entre 0 y 100.000.000 con hasta 2 decimales.');
  check('description', input.description.trim().length >= 10 && input.description.length <= 4000, 'La descripción debe tener entre 10 y 4.000 caracteres.');
  check('slug', !input.slug || (input.slug.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)), 'Use letras minúsculas, números y guiones.');
  check('images', input.images.length >= 1 && input.images.length <= 10 && input.images.every(url => { try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; } }), 'Ingrese de 1 a 10 URL de imágenes http(s).');
  check('attributes', Object.entries(input.attributes).every(([key, value]) => /^[a-zA-Z0-9]{1,40}$/.test(key) && value.length <= 100), 'Los atributos admiten claves alfanuméricas de hasta 40 caracteres y valores de hasta 100.');
  return errors;
}

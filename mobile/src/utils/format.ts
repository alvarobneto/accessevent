const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : DATE_FORMAT.format(parsed);
}

/** Datas vindas da API em `YYYY-MM-DD`, exibidas como `dd/mm/aaaa`. */
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return undefined;

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

const BR_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Converte a data digitada pelo usuário (`dd/mm/aaaa`) para `YYYY-MM-DD`, o
 * formato que a API exige. Devolve `null` quando o texto não é uma data válida
 * — inclusive quando o dia ou o mês não existem no calendário, que é o erro que
 * `new Date` deixaria passar.
 */
export function parseBrDate(value: string): string | null {
  const match = BR_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  const asDate = new Date(Number(year), Number(month) - 1, Number(day));

  const isRealDate =
    asDate.getFullYear() === Number(year) &&
    asDate.getMonth() === Number(month) - 1 &&
    asDate.getDate() === Number(day);

  return isRealDate ? `${year}-${month}-${day}` : null;
}

/** Máscara progressiva de `dd/mm/aaaa`, usada enquanto o usuário digita. */
export function maskBrDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

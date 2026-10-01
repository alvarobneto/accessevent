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

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * `Date` -> `YYYY-MM-DD`, o formato que a API exige.
 *
 * Monta a string com `getFullYear`/`getMonth`/`getDate` em vez de
 * `toISOString`, que converte para UTC: em São Paulo (UTC-3) uma data escolhida
 * depois das 21h voltaria um dia no resultado.
 */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `YYYY-MM-DD` -> `Date` na meia-noite local, o valor que o seletor nativo
 * precisa. Devolve `undefined` quando a string não é uma data completa.
 */
export function fromIsoDate(value: string | null | undefined): Date | undefined {
  const match = value ? ISO_DATE_PATTERN.exec(value) : null;
  if (!match) return undefined;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Período do evento em uma frase, combinando as datas que existem. Devolve
 * `undefined` quando nenhuma foi informada — quem chama decide o que escrever no
 * lugar, porque o resumo do participante pula a linha e a tela de detalhes
 * mostra "Não informado".
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | undefined {
  const start = formatIsoDate(startDate);
  const end = formatIsoDate(endDate);

  if (start && end) return `${start} a ${end}`;
  if (start) return `Começa em ${start}`;
  if (end) return `Termina em ${end}`;
  return undefined;
}

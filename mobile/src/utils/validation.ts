/**
 * Validações de formulário com regra própria, puras para ter teste.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Formata a digitação da data de nascimento para a máscara dd-mm-aaaa.
 */
export function formatBirthDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
}

/**
 * Valida se a string é uma data no formato dd-mm-aaaa e corresponde a um dia de calendário válido no passado.
 */
export function isValidBirthDate(dateStr: string): boolean {
  const trimmed = dateStr.trim();
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (!match) return false;

  const day = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const year = parseInt(match[3]!, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900) return false;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }

  const now = new Date();
  if (date > now) return false;

  return true;
}

/**
 * Converte data do formato DD-MM-AAAA para o formato ISO YYYY-MM-DD.
 */
export function birthDateToISO(dateStr: string): string | null {
  if (!isValidBirthDate(dateStr)) return null;
  const [day, month, year] = dateStr.trim().split('-');
  return `${year}-${month}-${day}`;
}

import { describe, expect, it } from 'vitest';

import { birthDateToISO, formatBirthDateInput, isValidBirthDate, isValidEmail } from './validation';

describe('isValidEmail', () => {
  it('aceita e-mails válidos', () => {
    expect(isValidEmail('ana@exemplo.com')).toBe(true);
    expect(isValidEmail('  ana@exemplo.com  ')).toBe(true);
    expect(isValidEmail('a.b+c@dominio.com.br')).toBe(true);
  });

  it('recusa e-mails inválidos', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('ana')).toBe(false);
    expect(isValidEmail('ana@')).toBe(false);
    expect(isValidEmail('ana@exemplo')).toBe(false);
    expect(isValidEmail('@exemplo.com')).toBe(false);
    expect(isValidEmail('ana exemplo.com')).toBe(false);
  });
});

describe('formatBirthDateInput', () => {
  it('aplica a máscara dd-mm-aaaa progressivamente', () => {
    expect(formatBirthDateInput('1')).toBe('1');
    expect(formatBirthDateInput('12')).toBe('12');
    expect(formatBirthDateInput('121')).toBe('12-1');
    expect(formatBirthDateInput('1210')).toBe('12-10');
    expect(formatBirthDateInput('12101995')).toBe('12-10-1995');
    expect(formatBirthDateInput('12-10-1995')).toBe('12-10-1995');
    expect(formatBirthDateInput('12/10/1995')).toBe('12-10-1995');
  });

  it('limita em 8 dígitos numéricos', () => {
    expect(formatBirthDateInput('121019959999')).toBe('12-10-1995');
  });
});

describe('isValidBirthDate', () => {
  it('aceita datas válidas no formato dd-mm-aaaa no passado', () => {
    expect(isValidBirthDate('15-05-1990')).toBe(true);
    expect(isValidBirthDate('29-02-2000')).toBe(true);
    expect(isValidBirthDate('01-01-2010')).toBe(true);
  });

  it('recusa datas inválidas de calendário ou formato incorreto', () => {
    expect(isValidBirthDate('')).toBe(false);
    expect(isValidBirthDate('31-02-2020')).toBe(false);
    expect(isValidBirthDate('29-02-2021')).toBe(false);
    expect(isValidBirthDate('32-01-2020')).toBe(false);
    expect(isValidBirthDate('15-13-2020')).toBe(false);
    expect(isValidBirthDate('15/05/1990')).toBe(false);
    expect(isValidBirthDate('15-05-1899')).toBe(false);
    expect(isValidBirthDate('15-05-2099')).toBe(false);
  });
});

describe('birthDateToISO', () => {
  it('converte dd-mm-aaaa para yyyy-mm-dd', () => {
    expect(birthDateToISO('15-05-1990')).toBe('1990-05-15');
    expect(birthDateToISO('01-12-2000')).toBe('2000-12-01');
  });

  it('retorna null para data inválida', () => {
    expect(birthDateToISO('invalid')).toBe(null);
    expect(birthDateToISO('31-02-2020')).toBe(null);
  });
});

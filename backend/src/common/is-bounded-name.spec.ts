import {
  checkName,
  DEFAULT_NAME_MAX_LENGTH,
  type NameProblem,
} from './is-bounded-name.js';

/** Motivo da recusa, para as asserções lerem o motivo e não a frase. */
function problemOf(value: unknown, maxLength?: number): NameProblem | null {
  return checkName(value, maxLength);
}

describe('checkName', () => {
  it('accepts a plain name', () => {
    expect(problemOf('Corredor central')).toBeNull();
  });

  it('accepts a name with accents and punctuation', () => {
    expect(problemOf('Térreo — pavilhão A')).toBeNull();
  });

  it('rejects a name that is not text', () => {
    // `null` reprova nos três validadores empilhados ao mesmo tempo; aqui ele
    // reprova uma vez, e o app recebe uma frase só.
    expect(problemOf(null)).toBe('not-a-text');
    expect(problemOf(42)).toBe('not-a-text');
    expect(problemOf(undefined)).toBe('not-a-text');
    expect(problemOf({})).toBe('not-a-text');
  });

  it('rejects an empty name', () => {
    expect(problemOf('')).toBe('empty');
  });

  it('rejects a name made only of spaces', () => {
    expect(problemOf('   ')).toBe('empty');
    expect(problemOf('\t\n')).toBe('empty');
  });

  it('reports emptiness before length, because it is the more useful one', () => {
    expect(problemOf(' '.repeat(DEFAULT_NAME_MAX_LENGTH + 1))).toBe('empty');
  });

  it('accepts a name exactly at the limit', () => {
    expect(problemOf('x'.repeat(DEFAULT_NAME_MAX_LENGTH))).toBeNull();
  });

  it('rejects a name past the limit', () => {
    expect(problemOf('x'.repeat(DEFAULT_NAME_MAX_LENGTH + 1))).toBe('too-long');
  });

  it('measures the length before trimming, like the column does', () => {
    // A coluna é `varchar(120)`: o Postgres conta o que chega, então o service
    // aparar depois não salva um nome que já passou do limite. O limite menor
    // concentra o teste na ordem das regras.
    expect(problemOf('  abc  ', 4)).toBe('too-long');
    expect(problemOf('  abc  ', 7)).toBeNull();
  });

  it('honours a custom limit', () => {
    expect(problemOf('abcde', 4)).toBe('too-long');
    expect(problemOf('abcd', 4)).toBeNull();
  });
});

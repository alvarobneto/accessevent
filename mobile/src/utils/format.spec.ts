import { formatDateTime, formatDistance, formatDuration } from '@/utils/format';

describe('formatDistance', () => {
  it('mostra metros até um quilômetro', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(12.4)).toBe('12 m');
    expect(formatDistance(12.6)).toBe('13 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('passa para quilômetros com duas casas', () => {
    expect(formatDistance(1000)).toBe('1.00 km');
    expect(formatDistance(3450)).toBe('3.45 km');
  });

  it('reduz para uma casa nos valores grandes', () => {
    expect(formatDistance(10_000)).toBe('10.0 km');
    expect(formatDistance(12_349)).toBe('12.3 km');
  });
});

describe('formatDuration', () => {
  it('mostra minutos e segundos com dois dígitos', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(1_000)).toBe('00:01');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(599_000)).toBe('09:59');
  });

  it('soma a hora quando passa de 60 minutos', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('não devolve duração negativa', () => {
    expect(formatDuration(-5_000)).toBe('00:00');
  });
});

describe('formatDateTime', () => {
  it('junta data e hora, que é o que a lista de caminhos mostra', () => {
    // Montado com componentes locais de propósito: um instante em UTC cairia em
    // outro dia dependendo da máquina, e o passaria a medir o fuso de quem roda.
    const recorded = new Date(2026, 8, 2, 15, 30);

    // O separador entre os grupos varia com o ICU ("02/09/2026, 15:30" ou
    // "02/09/2026 15:30"), então o teste casa os dois sem cravar o texto.
    expect(formatDateTime(recorded.toISOString())).toMatch(/02\/09\/2026\D+15:30/);
  });

  it('distingue duas gravações do mesmo dia', () => {
    const morning = new Date(2026, 8, 2, 9, 5);
    const afternoon = new Date(2026, 8, 2, 15, 30);

    expect(formatDateTime(morning.toISOString())).not.toBe(formatDateTime(afternoon.toISOString()));
  });

  it('mostra travessão para data inválida', () => {
    expect(formatDateTime('nao-e-data')).toBe('—');
  });
});

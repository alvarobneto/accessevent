import { describe, expect, it } from 'vitest';

import type { PoiType } from '@/data/types';
import { PoiTypeValues } from '@/data/types';
import {
  GENERIC_MARKER_ICON,
  POI_TYPE_ICONS,
  describePoi,
  hasDistinctPoiIcons,
  poiIcon,
} from '@/utils/poiIcons';

describe('poiIcon', () => {
  it('tem um ícone para cada um dos treze tipos de ponto', () => {
    expect(PoiTypeValues).toHaveLength(13);

    for (const type of PoiTypeValues) {
      expect(POI_TYPE_ICONS[type]).toBeTypeOf('string');
    }
  });

  it('não repete o mesmo desenho entre dois tipos', () => {
    // O compilador garante que a chave existe; não garante que o desenho é
    // distinto. Banheiro e banheiro acessível são justamente o par em que
    // repetir o ícone esconderia a diferença que o participante procura.
    expect(hasDistinctPoiIcons()).toBe(true);
  });

  it('distingue banheiro comum de banheiro acessível', () => {
    expect(poiIcon('Banheiro')).not.toBe(poiIcon('Banheiro acessível'));
  });

  it('dá a "Outro" um ícone que não parece um ponto específico', () => {
    // Um marcador com ícone de banheiro para o tipo "Outro" afirmaria algo que o
    // organizador não informou.
    expect(poiIcon('Outro')).toBe('map-marker-question');
    expect(poiIcon('Outro')).not.toBe(GENERIC_MARKER_ICON);
  });

  it('usa o ícone de entrada e o de saída em direções opostas', () => {
    expect(poiIcon('Entrada')).toBe('entrance');
    expect(poiIcon('Saída')).toBe('exit');
  });

  it('usa símbolos específicos para escadas e elevadores', () => {
    expect(poiIcon('Escada')).toBe('stairs');
    expect(poiIcon('Elevador')).toBe('elevator');
  });
});

describe('describePoi', () => {
  it('fala o nome e o tipo, porque o ícone sozinho não é lido', () => {
    expect(describePoi({ name: 'Portão B', type: 'Entrada' })).toBe('Portão B • Entrada');
  });

  it('não repete o tipo quando o nome do ponto é o próprio tipo', () => {
    expect(describePoi({ name: 'Elevador', type: 'Elevador' })).toBe('Elevador');
  });

  it('não repete o tipo quando o nome do ponto é o tipo com espaço em volta', () => {
    expect(describePoi({ name: '  Elevador  ', type: 'Elevador' })).toBe('Elevador');
  });

  it('diz só o tipo quando o nome veio vazio', () => {
    expect(describePoi({ name: '', type: 'Sala' })).toBe('Sala');
  });
});

describe('GENERIC_MARKER_ICON', () => {
  it('não é o ícone de nenhum tipo de ponto', () => {
    const icons = PoiTypeValues.map((type: PoiType) => POI_TYPE_ICONS[type]);
    expect(icons).not.toContain(GENERIC_MARKER_ICON);
  });
});

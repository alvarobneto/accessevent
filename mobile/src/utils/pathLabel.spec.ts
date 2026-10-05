import { pathLabels } from './pathLabel';

describe('pathLabels', () => {
  it('announces the name the organizer gave', () => {
    const labels = pathLabels({ name: 'Corredor do térreo', distance: 111.2, geometry: [[0, 0]] });

    expect(labels.title).toBe('Corredor do térreo');
  });

  it('keeps distance and point count under the name', () => {
    const labels = pathLabels({
      name: 'Corredor do térreo',
      distance: 111.2,
      geometry: [
        [-23.5505, -46.6333],
        [-23.5506, -46.6334],
        [-23.5507, -46.6335],
      ],
    });

    expect(labels.description).toBe('111 m · 3 pontos no trajeto');
  });

  it('falls back to the distance when there is no name', () => {
    const labels = pathLabels({
      name: null,
      distance: 111.2,
      geometry: [
        [-23.5505, -46.6333],
        [-23.5506, -46.6334],
      ],
    });

    expect(labels).toEqual({
      title: 'Caminho de 111 m',
      description: '2 pontos no trajeto',
    });
  });

  it('treats a blank name as no name', () => {
    const labels = pathLabels({ name: '   ', distance: 111.2, geometry: [[0, 0]] });

    expect(labels.title).toBe('Caminho de 111 m');
  });

  it('trims the name before showing it', () => {
    const labels = pathLabels({
      name: '  Rampada do palco  ',
      distance: 111.2,
      geometry: [[0, 0]],
    });

    expect(labels.title).toBe('Rampada do palco');
  });

  it('says "ponto" in the singular for a one-point geometry', () => {
    const labels = pathLabels({ name: null, distance: 0, geometry: [[-23.5505, -46.6333]] });

    expect(labels.description).toBe('1 ponto no trajeto');
  });
});

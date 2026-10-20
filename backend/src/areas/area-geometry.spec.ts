import { checkAreaGeometry } from './area-geometry.js';

describe('checkAreaGeometry', () => {
  it('accepts an open polygon ring with at least three valid vertices', () => {
    expect(
      checkAreaGeometry([
        [-23.55, -46.63],
        [-23.55, -46.62],
        [-23.56, -46.62],
        [-23.56, -46.63],
      ]),
    ).toBeNull();
  });

  it('requires at least three vertices', () => {
    expect(checkAreaGeometry([[-23.55, -46.63], [-23.56, -46.63]])).toBe('too-few-points');
  });

  it('rejects invalid coordinates and degenerate rings', () => {
    expect(checkAreaGeometry([[91, 0], [0, 1], [1, 0]])).toBe('invalid-coordinate');
    expect(checkAreaGeometry([[0, 0], [0, 1], [0, 2]])).toBe('degenerate');
    expect(checkAreaGeometry([[1, 1], [1, 1], [1, 1]])).toBe('degenerate');
  });

  it('rejects values that are not lists', () => {
    expect(checkAreaGeometry('área')).toBe('not-a-list');
  });
});

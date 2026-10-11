import { describe, expect, it } from 'vitest';

import type { Coordinate } from '@/types/coordinates';

import {
  POI_KIND_META,
  MAX_POI_MARKER_SCALE,
  MIN_POI_MARKER_SCALE,
  createInitialEditorState,
  editorFeedback,
  hasUndo,
  poiEditorReducer,
  poiInArea,
  selectedArea,
  selectedPoi,
  type PoiEditorState,
} from './poiEditor';
import { ringFromCorners } from './areaGeometry';

/** A primeira área da demonstração, um cômodo de ~50 m. */
const room = ringFromCorners([-23.5501, -46.6328], [-23.5506, -46.6338]);
const inside = [-23.55035, -46.6333] as Coordinate;
const outside = [-23.55, -46.63] as Coordinate;

function apply(state: PoiEditorState, ...actions: Parameters<typeof poiEditorReducer>[1][]): PoiEditorState {
  return actions.reduce(poiEditorReducer, state);
}

function drawnArea(state: PoiEditorState): PoiEditorState {
  return apply(state, { type: 'drop-area', kind: 'rectangle', geometry: room });
}

describe('createInitialEditorState', () => {
  it('nasce vazio, sem ferramenta nem item armado', () => {
    const state = createInitialEditorState();

    expect(state.areas).toEqual([]);
    expect(state.pois).toEqual([]);
    expect(state.activeTool).toBe('none');
    expect(state.armedPoiKind).toBeNull();
    expect(hasUndo(state)).toBe(false);
  });
});

describe('select-tool e arm-poi', () => {
  it('tocar na ferramenta armada desarma, e num toque alterna', () => {
    const armed = apply(createInitialEditorState(), { type: 'select-tool', tool: 'rectangle' });

    expect(armed.activeTool).toBe('rectangle');
    expect(apply(armed, { type: 'select-tool', tool: 'rectangle' }).activeTool).toBe('none');
    expect(apply(armed, { type: 'select-tool', tool: 'freehand' }).activeTool).toBe('freehand');
  });

  it('armar um item limpa a ferramenta, e vice-versa', () => {
    const armed = apply(createInitialEditorState(), { type: 'select-tool', tool: 'rectangle' });
    const poiArmed = apply(armed, { type: 'arm-poi', kind: 'entrance' });

    expect(poiArmed.armedPoiKind).toBe('entrance');
    expect(poiArmed.activeTool).toBe('none');
    expect(apply(poiArmed, { type: 'select-tool', tool: 'freehand' }).armedPoiKind).toBeNull();
  });
});

describe('drop-area', () => {
  it('cria a área, seleciona-a e desarma a ferramenta', () => {
    const state = apply(createInitialEditorState(), { type: 'select-tool', tool: 'freehand' });
    const dropped = apply(state, { type: 'drop-area', kind: 'freehand', geometry: room });

    expect(dropped.areas).toHaveLength(1);
    expect(dropped.areas[0]?.kind).toBe('freehand');
    expect(dropped.activeTool).toBe('none');
    expect(dropped.selectedAreaId).toBe(dropped.areas[0]?.id);
    expect(dropped.feedback).toBe(editorFeedback.areaDrawn);
    expect(hasUndo(dropped)).toBe(true);
  });

  it('um anel sem pontos não vira área', () => {
    const state = apply(createInitialEditorState(), { type: 'drop-area', kind: 'rectangle', geometry: [] });

    expect(state.areas).toEqual([]);
  });
});

describe('place-poi', () => {
  it('sem item armado, o toque não faz nada', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'place-poi', position: inside });

    expect(state.pois).toEqual([]);
  });

  it('fora das áreas, a dica avisa e nada é gravado', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'bathroom' });
    const placed = apply(state, { type: 'place-poi', position: outside });

    expect(placed.pois).toEqual([]);
    expect(placed.feedback).toBe(editorFeedback.poiOutsideAreas);
  });

  it('dentro de uma área sem ponto, o item nasce ancorado lá', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'bathroom' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const area = placed.areas[0];
    const poi = placed.pois[0];

    expect(poi).toBeDefined();
    expect(poi?.kind).toBe('bathroom');
    expect(poi?.position).toEqual(inside);
    expect(area?.poiId).toBe(poi?.id);
    expect(placed.selectedPoiId).toBe(poi?.id);
    expect(placed.feedback).toBe(editorFeedback.poiPlaced(POI_KIND_META.bathroom.label));
  });

  it('o mesmo item duas vezes na mesma área avisa do duplicado', () => {
    const armed = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'entrance' });
    const once = apply(armed, { type: 'place-poi', position: inside });
    const twice = apply(once, { type: 'place-poi', position: [-23.5504, -46.6332] });

    expect(twice.pois).toHaveLength(1);
    expect(twice.feedback).toBe(editorFeedback.poiDuplicate(POI_KIND_META.entrance.label));
  });

  it('um item diferente troca o que já estava, sem mudar a área', () => {
    const armed = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'entrance' });
    const once = apply(armed, { type: 'place-poi', position: inside });
    const swapped = apply(once, { type: 'arm-poi', kind: 'elevator' });
    const result = apply(swapped, { type: 'place-poi', position: inside });

    expect(result.pois).toHaveLength(1);
    expect(result.pois[0]?.kind).toBe('elevator');
    expect(result.pois[0]?.position).toEqual(inside);
    expect(result.feedback).toBe(editorFeedback.poiSwapped(POI_KIND_META.elevator.label));
  });
});

describe('swap-poi', () => {
  it('troca o item de uma área apontada (o marcador com item armado)', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'reception' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const areaId = placed.areas[0]?.id ?? '';
    const swapped = apply(placed, { type: 'swap-poi', areaId, kind: 'stairs' });

    expect(swapped.pois[0]?.kind).toBe('stairs');
    expect(swapped.pois[0]?.position).toEqual(inside);
  });

  it('área sem ponto não troca nada', () => {
    const state = drawnArea(createInitialEditorState());
    const swapped = apply(state, { type: 'swap-poi', areaId: state.areas[0]?.id ?? '', kind: 'stairs' });

    expect(swapped).toBe(state);
  });
});

describe('commit de área', () => {
  it('mover a área mantém fixa a posição do ponto associado', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'bathroom' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const areaId = placed.areas[0]?.id ?? '';
    const moved = ringFromCorners([-23.5491, -46.6328], [-23.5496, -46.6338]);
    const result = apply(placed, { type: 'commit-move-area', areaId, geometry: moved });
    const poi = poiInArea(result, areaId);

    expect(result.areas[0]?.geometry).toEqual(moved);
    expect(poi?.position).toEqual(inside);
  });

  it('editar um vértice não reposiciona o ponto associado', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'entrance' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const areaId = placed.areas[0]?.id ?? '';
    const shrank = ringFromCorners([-23.5502, -46.633], [-23.5504, -46.6335]);
    const result = apply(placed, { type: 'commit-edit-area', areaId, geometry: shrank });
    const poi = poiInArea(result, areaId);

    expect(poi?.position).toEqual(inside);
  });
});

describe('commit-move-poi', () => {
  it('leva o ponto para a coordenada pedida, dentro da área', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'elevator' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const poiId = placed.pois[0]?.id ?? '';
    const target: Coordinate = [-23.5502, -46.633];
    const moved = apply(placed, { type: 'commit-move-poi', poiId, position: target });

    expect(moved.pois[0]?.position).toEqual(target);
  });

  it('arrastar para fora da área não move e avisa', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'elevator' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const poiId = placed.pois[0]?.id ?? '';
    const moved = apply(placed, { type: 'commit-move-poi', poiId, position: outside });

    expect(moved.pois[0]?.position).toEqual(inside);
    expect(moved.feedback).toBe(editorFeedback.poiMovedOut);
  });
});

describe('resize-poi-marker', () => {
  it('redimensiona só a apresentação do ponto, sem mover ou recriar o ponto', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'entrance' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const poi = placed.pois[0];
    expect(poi).toBeDefined();

    const resized = apply(placed, {
      type: 'resize-poi-marker',
      poiId: poi?.id ?? '',
      scale: 1.5,
    });

    expect(resized.pois).toHaveLength(placed.pois.length);
    expect(resized.areas).toBe(placed.areas);
    expect(resized.pois[0]).toMatchObject({
      id: poi?.id,
      areaId: poi?.areaId,
      position: inside,
      markerScale: 1.5,
    });
  });

  it('limita o tamanho do ícone ao intervalo permitido', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'entrance' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const poiId = placed.pois[0]?.id ?? '';

    const smaller = apply(placed, { type: 'resize-poi-marker', poiId, scale: 0.1 });
    const larger = apply(placed, { type: 'resize-poi-marker', poiId, scale: 9 });

    expect(MIN_POI_MARKER_SCALE).toBe(0.75);
    expect(MAX_POI_MARKER_SCALE).toBe(1.75);
    expect(smaller.pois[0]?.markerScale).toBe(MIN_POI_MARKER_SCALE);
    expect(larger.pois[0]?.markerScale).toBe(MAX_POI_MARKER_SCALE);
  });
});

describe('remove-selection', () => {
  it('apagar o ponto limpa a área e some o ponto', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'reception' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const poiId = placed.pois[0]?.id ?? '';
    const removed = apply(placed, { type: 'select-poi', poiId }, { type: 'remove-selection' });

    expect(removed.pois).toHaveLength(0);
    expect(removed.areas[0]?.poiId).toBeNull();
    expect(removed.feedback).toBe(editorFeedback.poiDeleted);
  });

  it('apagar a área apaga o ponto dentro dela', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'entrance' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const areaId = placed.areas[0]?.id ?? '';
    const removed = apply(placed, { type: 'select-area', areaId }, { type: 'remove-selection' });

    expect(removed.areas).toHaveLength(0);
    expect(removed.pois).toHaveLength(0);
    expect(removed.feedback).toBe(editorFeedback.areaDeleted);
  });

  it('sem seleção, nada acontece', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'select-area', areaId: null });
    const unselected = apply(state, { type: 'remove-selection' });

    expect(unselected.areas).toHaveLength(1);
  });
});

describe('seleção', () => {
  it('selecionar uma área limpa o ponto e vice-versa', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'bathroom' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const areaId = placed.areas[0]?.id ?? '';
    const poiId = placed.pois[0]?.id ?? '';

    const areaSelected = apply(placed, { type: 'select-area', areaId });
    expect(selectedArea(areaSelected)?.id).toBe(areaId);
    expect(areaSelected.selectedPoiId).toBeNull();

    const poiSelected = apply(areaSelected, { type: 'select-poi', poiId });
    expect(selectedPoi(poiSelected)?.id).toBe(poiId);
    expect(poiSelected.selectedAreaId).toBeNull();
  });
});

describe('undo', () => {
  it('restaura o desenho e a seleção de antes do último passo', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'stairs' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const undone = apply(placed, { type: 'undo' });

    expect(undone.pois).toHaveLength(0);
    expect(undone.areas).toHaveLength(1);
    expect(undone.feedback).toBe(editorFeedback.undo);
    expect(hasUndo(undone)).toBe(true);
  });

  it('desfazer duas vezes volta ao esboço inicial', () => {
    const state = apply(drawnArea(createInitialEditorState()), { type: 'arm-poi', kind: 'stairs' });
    const placed = apply(state, { type: 'place-poi', position: inside });
    const undone = apply(placed, { type: 'undo' });
    const twice = apply(undone, { type: 'undo' });

    expect(undone.pois).toHaveLength(0);
    expect(twice.areas).toHaveLength(0);
    expect(hasUndo(twice)).toBe(false);
  });

  it('com o histórico vazio, não faz nada', () => {
    const state = createInitialEditorState();
    const undone = apply(state, { type: 'undo' });

    expect(undone).toBe(state);
  });

  it('o undo não restaura ferramenta, item armado nem dica', () => {
    const state = apply(
      drawnArea(createInitialEditorState()),
      { type: 'arm-poi', kind: 'entrance' },
      { type: 'place-poi', position: inside },
      { type: 'select-tool', tool: 'freehand' },
    );
    const undone = apply(state, { type: 'undo' });

    expect(undone.activeTool).toBe('freehand');
    expect(undone.pois).toHaveLength(0);
  });
});

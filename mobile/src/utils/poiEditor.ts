import type { Coordinate } from '@/types/coordinates';
import type { IconName } from '@/types/icon';
import {
  boundsOfRing,
  pointInBounds,
  topmostAreaAt,
  type AreaHitTarget,
  type AreaKind,
  type AreaRing,
} from '@/utils/areaGeometry';

/**
 * Estado em memória do editor de áreas e pontos — o desenho do protótipo.
 *
 * Esta tela é um **protótipo navegável**: o organizador desenha áreas, associa
 * um ponto a cada uma e nada é gravado — o botão "Salvar" abre um diálogo de
 * sucesso e a Sprint 9 liga este estado à `PointOfInterest` real. Por isso o
 * domínio é local (dump no `utils/`, testável) e não toca no `repository`.
 *
 * Os tipos espelham o que o `rect` + `anchor` grava na Sprint 7, só que com
 * geometria livre: um cômodo retangular pode virar um `PoiRect`, mas uma área
 * livre precisa de um anel. Quando a persistência chegar,
 * `areaGeometry.rectFromRing` cobre o caso retangular.
 */

/** O catálogo de itens que o organizador coloca nas áreas. */
export type PoiKind = 'entrance' | 'exit' | 'bathroom' | 'stairs' | 'elevator' | 'reception' | 'accessibility';

/** A ordem da paleta — o caminho que os dois mockups compartilham: entra, sai, usa. */
export const POI_KIND_ORDER: readonly PoiKind[] = [
  'entrance',
  'exit',
  'bathroom',
  'stairs',
  'elevator',
  'reception',
  'accessibility',
];

/** Rótulo pt-BR e ícone do catálogo para cada item da paleta. */
export const POI_KIND_META: Record<PoiKind, { label: string; icon: IconName }> = {
  entrance: { label: 'Entrada', icon: 'entrance' },
  exit: { label: 'Saída', icon: 'exit' },
  bathroom: { label: 'Banheiro', icon: 'bathroom' },
  stairs: { label: 'Escada', icon: 'stairs' },
  elevator: { label: 'Elevador', icon: 'elevator' },
  reception: { label: 'Recepção', icon: 'concierge-bell' },
  accessibility: { label: 'Acessibilidade', icon: 'human-wheelchair' },
};

/** Uma área desenhada no canvas. O ponto que ela carrega mora em `poiId`. */
export type AreaDraft = {
  id: string;
  kind: AreaKind;
  geometry: AreaRing;
  /** O ponto dentro desta área, ou `null` enquanto ela não tem um. */
  poiId: string | null;
};

/** Um ponto colocado dentro de uma área. */
export type PoiDraft = {
  id: string;
  kind: PoiKind;
  position: Coordinate;
  areaId: string;
  /** Escala visual do marcador no mapa; local ao protótipo. */
  markerScale?: number;
};

export const MIN_POI_MARKER_SCALE = 0.75;
export const MAX_POI_MARKER_SCALE = 1.75;
export const POI_MARKER_SCALE_STEP = 0.1;

export function clampPoiMarkerScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_POI_MARKER_SCALE), MAX_POI_MARKER_SCALE);
}

/** A ferramenta de desenho armada (ou nenhuma). */
export type ActiveTool = 'none' | 'rectangle' | 'freehand';

/**
 * A interação em curso com o desenho.
 *
 * As três de edição são gestos do canvas (a área se mexe durante o arraste e o
 * `MapCanvas` guarda o preview em estado local); o reducer só registra qual
 * delas está ativa, para os botões da barra refletirem o que acontece e para o
 * toque no mapa saber se deve selecionar ou arrastar.
 */
export type EditorInteraction = 'idle' | 'move-area' | 'edit-area' | 'move-poi' | 'resize-poi';

/** O que o `Desfazer` restaura. Ferramenta, paleta e dicas não entram. */
export type PoiEditorSnapshot = {
  areas: AreaDraft[];
  pois: PoiDraft[];
  selectedAreaId: string | null;
  selectedPoiId: string | null;
};

export type PoiEditorState = {
  areas: AreaDraft[];
  pois: PoiDraft[];
  selectedAreaId: string | null;
  selectedPoiId: string | null;
  activeTool: ActiveTool;
  interaction: EditorInteraction;
  /** O item armado na paleta — sem ele, toque no mapa não coloca ponto. */
  armedPoiKind: PoiKind | null;
  history: PoiEditorSnapshot[];
  /** Dica de sistema (pt-BR). Some sozinha, ver `clear-feedback`. */
  feedback: string | null;
};

export type PoiEditorAction =
  | { type: 'select-tool'; tool: ActiveTool }
  | { type: 'arm-poi'; kind: PoiKind }
  | { type: 'place-poi'; position: Coordinate }
  | { type: 'swap-poi'; areaId: string; kind: PoiKind }
  | { type: 'drop-area'; kind: AreaKind; geometry: AreaRing }
  | { type: 'select-area'; areaId: string | null }
  | { type: 'select-poi'; poiId: string | null }
  | { type: 'commit-move-area'; areaId: string; geometry: AreaRing }
  | { type: 'commit-edit-area'; areaId: string; geometry: AreaRing }
  | { type: 'commit-move-poi'; poiId: string; position: Coordinate }
  | { type: 'resize-poi-marker'; poiId: string; scale: number }
  | { type: 'set-interaction'; interaction: EditorInteraction }
  | { type: 'remove-selection' }
  | { type: 'undo' }
  | { type: 'clear-feedback' };

/**
 * As mensagens de sistema, em pt-BR (RNF04: texto claro e verbo no controle).
 *
 * São mensagens e não dicas do desenho: a dica de ajuda (o que o próximo passo
 * faz) é da tela, e só aparece quando não há feedback.
 */
export const editorFeedback = {
  areaDrawn: 'Área desenhada.',
  poiPlaced: (label: string) => `Ponto adicionado: ${label}.`,
  poiDuplicate: (label: string) => `Esta área já tem um ponto: ${label}. Troque o item ou apague o atual.`,
  poiOutsideAreas: 'Os pontos ficam dentro das áreas desenhadas. Crie uma área e toque dentro dela para posicionar o ponto.',
  poiMovedOut: 'O ponto precisa continuar dentro da área.',
  poiSwapped: (label: string) => `Item trocado para ${label}.`,
  areaDeleted: 'Área apagada com o ponto dentro.',
  poiDeleted: 'Ponto apagado.',
  undo: 'Ação desfeita.',
} as const;

/** Quantos passos de desfazer o editor guarda. Um pavilhão de demonstração nunca chega perto disso. */
const MAX_HISTORY = 30;

/** Invariante do desenho: ponto fora das áreas não existe. */
const ALLOW_POI_OUTSIDE_AREAS = false;

export function createInitialEditorState(): PoiEditorState {
  return {
    areas: [],
    pois: [],
    selectedAreaId: null,
    selectedPoiId: null,
    activeTool: 'none',
    interaction: 'idle',
    armedPoiKind: null,
    history: [],
    feedback: null,
  };
}

export function poiEditorReducer(state: PoiEditorState, action: PoiEditorAction): PoiEditorState {
  switch (action.type) {
    case 'select-tool':
      return selectTool(state, action.tool);

    case 'arm-poi':
      return armPoi(state, action.kind);

    case 'place-poi':
      return placePoi(state, action.position);

    case 'swap-poi':
      return swapAreaItem(state, action.areaId, action.kind);

    case 'drop-area':
      return dropArea(state, action.kind, action.geometry);

    case 'select-area':
      return {
        ...state,
        selectedAreaId: action.areaId,
        selectedPoiId: null,
        interaction: 'idle',
      };

    case 'select-poi':
      return {
        ...state,
        selectedPoiId: action.poiId,
        selectedAreaId: null,
        interaction: 'idle',
      };

    case 'commit-move-area':
      return updateAreaGeometry(state, action.areaId, action.geometry);

    case 'commit-edit-area':
      return updateAreaGeometry(state, action.areaId, action.geometry);

    case 'commit-move-poi':
      return movePoi(state, action.poiId, action.position);

    case 'resize-poi-marker':
      return resizePoiMarker(state, action.poiId, action.scale);

    case 'set-interaction':
      return { ...state, interaction: action.interaction };

    case 'remove-selection':
      return removeSelection(state);

    case 'undo':
      return undo(state);

    case 'clear-feedback':
      return state.feedback === null ? state : { ...state, feedback: null };
  }
}

function selectTool(state: PoiEditorState, tool: ActiveTool): PoiEditorState {
  // Tocar na ferramenta que já está armada desarma — o mesmo toggle da paleta.
  const activeTool = state.activeTool === tool ? 'none' : tool;

  return {
    ...state,
    activeTool,
    armedPoiKind: null,
    interaction: 'idle',
    feedback: null,
  };
}

function armPoi(state: PoiEditorState, kind: PoiKind): PoiEditorState {
  const armedPoiKind = state.armedPoiKind === kind ? null : kind;

  // O item e a ferramenta de desenho não coexistem: o toque no mapa é uma coisa
  // só, e ter os dois armados deixaria o gesto ambíguo.
  return {
    ...state,
    armedPoiKind,
    activeTool: 'none',
    interaction: 'idle',
    feedback: null,
  };
}

function placePoi(state: PoiEditorState, position: Coordinate): PoiEditorState {
  if (!state.armedPoiKind) return state;

  const area = topmostAreaAt(state.areas, position);
  if (!area) {
    if (ALLOW_POI_OUTSIDE_AREAS) return state;
    return withFeedback(state, editorFeedback.poiOutsideAreas);
  }

  const existing = state.pois.find((poi) => poi.id === area.poiId);
  if (existing) {
    if (existing.kind === state.armedPoiKind) {
      return withFeedback(
        { ...state, selectedPoiId: existing.id, selectedAreaId: null, interaction: 'idle' },
        editorFeedback.poiDuplicate(poiLabel(state.armedPoiKind)),
      );
    }
    return swapAreaItem(state, area.id, state.armedPoiKind, position);
  }

  const poi = createPoi(state.armedPoiKind, position, area.id);
  const areas = replaceArea(state.areas, area.id, { poiId: poi.id });

  const next: PoiEditorState = {
    ...state,
    areas,
    pois: [...state.pois, poi],
    selectedPoiId: poi.id,
    selectedAreaId: null,
    interaction: 'idle',
  };

  return withFeedback(commit(state, next), editorFeedback.poiPlaced(poiLabel(poi.kind)));
}

/**
 * Troca o item de uma área por outro.
 *
 * É o mesmo estado para três portas: colocar um item diferente numa área que já
 * tem um (toque no mapa), tocar num marcador com outro item armado, e o botão
 * "Trocar item" da barra de ações. A posição é a que já existia — trocar o tipo
 * não deve mover a marcação que o organizador escolheu.
 */
function swapAreaItem(state: PoiEditorState, areaId: string, kind: PoiKind, position?: Coordinate): PoiEditorState {
  const area = state.areas.find((candidate) => candidate.id === areaId);
  if (!area || !area.poiId) return state;

  const poi = state.pois.find((candidate) => candidate.id === area.poiId);
  if (!poi) return state;

  if (poi.kind === kind) {
    return withFeedback(
      { ...state, selectedPoiId: poi.id, selectedAreaId: null, interaction: 'idle' },
      editorFeedback.poiDuplicate(poiLabel(kind)),
    );
  }

  const swapped: PoiDraft = { ...poi, kind, position: position ?? poi.position };
  const pois = state.pois.map((candidate) => (candidate.id === swapped.id ? swapped : candidate));

  const next: PoiEditorState = {
    ...state,
    pois,
    selectedPoiId: swapped.id,
    selectedAreaId: null,
    interaction: 'idle',
  };

  return withFeedback(commit(state, next), editorFeedback.poiSwapped(poiLabel(kind)));
}

/** Um gesto de desenho terminou: área nova com o ponto ainda por colocar. */
function dropArea(state: PoiEditorState, kind: AreaKind, geometry: AreaRing): PoiEditorState {
  if (geometry.length < 3) return state;

  const area: AreaDraft = { id: createId('area'), kind, geometry, poiId: null };
  const next: PoiEditorState = {
    ...state,
    areas: [...state.areas, area],
    selectedAreaId: area.id,
    selectedPoiId: null,
    // A ferramenta desarma depois de uma área: o próximo passo da demonstração é
    // escolher um item na paleta, e o toque à frente precisa colocar o ponto.
    activeTool: 'none',
    interaction: 'idle',
  };

  return withFeedback(commit(state, next), editorFeedback.areaDrawn);
}

/**
 * Aplica a geometria nova de uma área existente (arraste ou edição de vértice).
 *
 * O gesto altera só os vértices da área. Pontos de interesse associados mantêm
 * suas coordenadas; nenhum outro ponto acompanha ou é puxado para uma borda.
 */
function updateAreaGeometry(state: PoiEditorState, areaId: string, geometry: AreaRing): PoiEditorState {
  const area = state.areas.find((candidate) => candidate.id === areaId);
  if (!area) return state;

  const areas = state.areas.map((candidate) =>
    candidate.id === areaId ? { ...candidate, geometry } : candidate,
  );

  const next: PoiEditorState = { ...state, areas, interaction: 'idle' };
  return commit(state, next);
}

function movePoi(state: PoiEditorState, poiId: string, position: Coordinate): PoiEditorState {
  const poi = state.pois.find((candidate) => candidate.id === poiId);
  if (!poi) return state;

  const area = state.areas.find((candidate) => candidate.id === poi.areaId);
  const bounds = area ? boundsOfRing(area.geometry) : null;
  if (!area || !bounds) {
    return withFeedback(state, editorFeedback.poiMovedOut);
  }

  if (!pointInBounds(position, bounds)) {
    return withFeedback(state, editorFeedback.poiMovedOut);
  }

  const pois = state.pois.map((candidate) => (candidate.id === poiId ? { ...candidate, position } : candidate));

  const next: PoiEditorState = { ...state, pois, interaction: 'idle' };
  return commit(state, next);
}

function resizePoiMarker(state: PoiEditorState, poiId: string, scale: number): PoiEditorState {
  const poi = state.pois.find((candidate) => candidate.id === poiId);
  if (!poi || !Number.isFinite(scale)) return state;

  const markerScale = clampPoiMarkerScale(scale);
  if ((poi.markerScale ?? 1) === markerScale) return state;

  const next: PoiEditorState = {
    ...state,
    pois: state.pois.map((candidate) =>
      candidate.id === poiId ? { ...candidate, markerScale } : candidate,
    ),
    selectedPoiId: poiId,
    selectedAreaId: null,
    interaction: 'idle',
  };

  return commit(state, next);
}

/** Apagar apaga a seleção — e apagar uma área apaga o ponto dentro dela. */
function removeSelection(state: PoiEditorState): PoiEditorState {
  if (state.selectedAreaId) {
    const area = state.areas.find((candidate) => candidate.id === state.selectedAreaId);
    if (!area) return state;

    const keepsPoi = area.poiId !== null;
    const pois = area.poiId ? state.pois.filter((poi) => poi.id !== area.poiId) : state.pois;

    const next: PoiEditorState = {
      ...state,
      areas: state.areas.filter((candidate) => candidate.id !== area.id),
      pois,
      selectedAreaId: null,
      selectedPoiId: null,
      interaction: 'idle',
    };

    return withFeedback(
      commit(state, next),
      keepsPoi ? editorFeedback.areaDeleted : editorFeedback.poiDeleted,
    );
  }

  if (state.selectedPoiId) {
    const poi = state.pois.find((candidate) => candidate.id === state.selectedPoiId);
    if (!poi) return state;

    const areas = replaceArea(state.areas, poi.areaId, { poiId: null });

    const next: PoiEditorState = {
      ...state,
      areas,
      pois: state.pois.filter((candidate) => candidate.id !== poi.id),
      selectedAreaId: null,
      selectedPoiId: null,
      interaction: 'idle',
    };

    return withFeedback(commit(state, next), editorFeedback.poiDeleted);
  }

  return state;
}

function undo(state: PoiEditorState): PoiEditorState {
  const snapshot = state.history[state.history.length - 1];
  if (!snapshot) return state;

  return withFeedback(
    {
      ...state,
      ...snapshot,
      interaction: 'idle',
      history: state.history.slice(0, -1),
    },
    editorFeedback.undo,
  );
}

/**
 * Guarda um passo de desfazer antes da mudança.
 *
 * O snapshot é do estado **anterior** (`previous`): o desfazer tem que voltar
 * para o que estava em pé antes do gesto, e não para o resultado dele. Só entra
 * em quem muda o desenho (áreas, pontos ou seleção) — ferramenta, paleta e
 * dicas ficam de fora. Cada gesto do canvas dispara um `commit` só no fim (no
 * release), então um arraste inteiro é **um** passo no histórico, e não um por
 * frame.
 */
function commit(previous: PoiEditorState, next: PoiEditorState): PoiEditorState {
  return {
    ...next,
    history: [...previous.history, snapshotOf(previous)].slice(-MAX_HISTORY),
  };
}

function snapshotOf(state: PoiEditorState): PoiEditorSnapshot {
  return {
    areas: state.areas,
    pois: state.pois,
    selectedAreaId: state.selectedAreaId,
    selectedPoiId: state.selectedPoiId,
  };
}

function withFeedback(state: PoiEditorState, feedback: string): PoiEditorState {
  return { ...state, feedback };
}

function replaceArea(areas: AreaDraft[], areaId: string, patch: Partial<AreaDraft>): AreaDraft[] {
  return areas.map((area) => (area.id === areaId ? { ...area, ...patch } : area));
}

function createPoi(kind: PoiKind, position: Coordinate, areaId: string): PoiDraft {
  return { id: createId('poi'), kind, position, areaId };
}

let idSeed = 0;

/**
 * Ids locais da sessão de edição.
 *
 * O protótipo não persiste nada, então um contador de módulo basta — e a Sprint
 * 9 substitui a chegada da `PointOfInterest` gravada. No reducer, o contador
 * global mantém ids únicos entre duas telas abertas do editor.
 */
function createId(prefix: 'area' | 'poi'): string {
  idSeed += 1;
  return `${prefix}-${idSeed}`;
}

/** Se existe algo para desfazer — desliga o botão quando não há. */
export function hasUndo(state: PoiEditorState): boolean {
  return state.history.length > 0;
}

/** O rótulo pt-BR de um item da paleta. */
export function poiLabel(kind: PoiKind): string {
  return POI_KIND_META[kind].label;
}

/** O ponto dentro de uma área, ou `null` quando ela ainda não tem um. */
export function poiInArea(state: PoiEditorState, areaId: string | null): PoiDraft | null {
  if (!areaId) return null;
  const area = state.areas.find((candidate) => candidate.id === areaId);
  if (!area || !area.poiId) return null;
  return state.pois.find((poi) => poi.id === area.poiId) ?? null;
}

/** A área que está selecionada (a base de Mover/Editar desenho/Apagar). */
export function selectedArea(state: PoiEditorState): AreaDraft | null {
  if (!state.selectedAreaId) return null;
  return state.areas.find((area) => area.id === state.selectedAreaId) ?? null;
}

/** O ponto que está selecionado. */
export function selectedPoi(state: PoiEditorState): PoiDraft | null {
  if (!state.selectedPoiId) return null;
  return state.pois.find((poi) => poi.id === state.selectedPoiId) ?? null;
}

export type { AreaHitTarget };

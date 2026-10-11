import type { CoordinateTuple } from '../common/is-coordinate.js';
import { isCoordinateTuple } from '../common/is-coordinate.js';

/**
 * O retângulo que marca o ponto de interesse (Sprint 7).
 *
 * São **dois cantos em lat/lng**, não quatro: `northEast` e `southWest`. O
 * retângulo é desenhado na tela arrastando, e num mapa sem rotação nem
 * inclinação — os dois desligados no `EventMap` — um retângulo alinhado aos eixos
 * da tela tem borda de latitude constante e borda de longitude constante. Ou
 * seja: dois cantos determinam os quatro, e guardar quatro corners só criaria
 * quatro chances de o cliente mandar um polígono torto que ninguém pediu.
 *
 * Guardar em coordenada, e não em pixel, é o que faz o desenho **acompanhar o
 * zoom e o movimento do mapa**. Um retângulo guardado em pixels ficaria parado no
 * mesmo ponto da tela enquanto o mapa se move por baixo dele.
 */
export type PoiRect = {
  northEast: CoordinateTuple;
  southWest: CoordinateTuple;
};

/**
 * Onde o ícone do ponto está **dentro** do retângulo, em fração.
 *
 * `u` vai de 0 (oeste) a 1 (leste) e `v` de 0 (sul) a 1 (norte). É a decisão de
 * modelar o ícone como âncora relativa, e não como ponto absoluto: quando o
 * organizador redimensiona o retângulo, o ícone acompanha o redimensionamento em
 * vez de ficar no mesmo metro do mapa. Para uma rampa que ocupa um trecho do
 * corredor, ou um banheiro que ocupa um recinto, o desenho é a área — o ícone é o
 * rótulo dela, e um rótulo que sai do quadro quando o quadro muda de tamanho está
 * errado.
 *
 * Fração em vez de metro também porque é o que sobrevive ao zoom: a mesma
 * âncora descreve o mesmo lugar em qualquer enquadramento.
 */
export type PoiAnchor = {
  u: number;
  v: number;
};

/** Âncora do centro, que é o ponto de partida de um retângulo recém-desenhado. */
export const CENTER_ANCHOR: PoiAnchor = { u: 0.5, v: 0.5 };

/**
 * Aplica a âncora no retângulo e devolve o ponto absoluto.
 *
 * É a função que o resto do app usa para saber onde o ícone está: a câmera, os
 * marcadores e a rota da Sprint 16 falam de ponto absoluto, e ninguém deveria
 * recalcular a geometria do retângulo para desenhar um pino.
 *
 * Interpolação linear, porque entre duas latitudes e duas longitudes o retângulo
 * é uma bilinear — e bilinear com `u` e `v` independentes **é** a interpolação
 * linear em cada eixo. Não é aproximação de Mercator: o retângulo já está em
 * graus, e a projeção do mapa só entra quando ele vira pixel na tela.
 */
export function anchorToPosition(rect: PoiRect, anchor: PoiAnchor): CoordinateTuple {
  const [north, east] = rect.northEast;
  const [south, west] = rect.southWest;

  return [south + (north - south) * anchor.v, west + (east - west) * anchor.u];
}

/**
 * Descobre a âncora de um ponto absoluto dentro do retângulo — o inverso de
 * `anchorToPosition`.
 *
 * É o que a edição precisa quando a pessoa arrasta o ícone: o arrasto entrega um
 * ponto em coordenada, e o que se grava é a fração dele no retângulo.
 *
 * A fração sai **limitada a 0..1** de propósito. O ícone é o rótulo do
 * retângulo, então um ícone fora do quadro é um estado que não existe: se o dedo
 * sair do retângulo, o que limite é o próprio retângulo. E um retângulo degenerado
 * — sem largura ou sem altura, que a validação permite — cai no centro em vez de
 * dividir por zero e gravar `NaN` no banco.
 */
export function positionToAnchor(
  rect: PoiRect,
  position: CoordinateTuple,
): PoiAnchor {
  const [north, east] = rect.northEast;
  const [south, west] = rect.southWest;

  const latitudeSpan = north - south;
  const longitudeSpan = east - west;

  if (latitudeSpan === 0 || longitudeSpan === 0) return CENTER_ANCHOR;

  return {
    u: clamp01((position[1] - west) / longitudeSpan),
    v: clamp01((position[0] - south) / latitudeSpan),
  };
}

/**
 * Coloca os cantos na ordem canônica, com o maior no `northEast`.
 *
 * Quem desenha arrastando pode soltar o dedo em qualquer ordem, e um `northEast`
 * abaixo do `southWest` é um retângulo invertido — que desenharia um polígono
 * de área negativa. Normalizar na entrada deixa o cliente livre de pensar na
 * ordem e garante que o banco só guarda a forma canônica.
 */
export function normalizeRect(rect: PoiRect): PoiRect {
  const [northLat, eastLng] = rect.northEast;
  const [southLat, westLng] = rect.southWest;

  return {
    northEast: [Math.max(northLat, southLat), Math.max(eastLng, westLng)],
    southWest: [Math.min(northLat, southLat), Math.min(eastLng, westLng)],
  };
}

/**
 * O retângulo tem dois cantos em coordenada válida?
 *
 * A ordem **não** é exigida aqui: `normalizeRect` resolve a ordem, e exigir as
 * duas coisas transformaria um erro de convenção do cliente em 400 sem motivo.
 */
export function isPoiRect(value: unknown): value is PoiRect {
  if (typeof value !== 'object' || value === null) return false;

  const rect = value as Partial<PoiRect>;

  return isCoordinateTuple(rect.northEast) && isCoordinateTuple(rect.southWest);
}

/** A âncora é uma fração em 0..1 nos dois eixos? */
export function isPoiAnchor(value: unknown): value is PoiAnchor {
  if (typeof value !== 'object' || value === null) return false;

  const anchor = value as Partial<PoiAnchor>;

  return isFraction(anchor.u) && isFraction(anchor.v);
}

function isFraction(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

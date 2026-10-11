import { describe, expect, it } from 'vitest';

import {
  ACCESSIBILITY_RESIZE_STEP,
  DEFAULT_POI_RECT_SPAN,
  MIN_POI_RECT_SPAN,
  anchorToPosition,
  dragIconTo,
  normalizeRect,
  positionToAnchor,
  rectCorners,
  rectFromCenter,
  resizeRect,
  resizeRectByStep,
  type PoiRect,
} from './poiAnchor';

/**
 * Retângulo de 2 m de lado em cima de São Paulo.
 *
 * A extensão é pequena de propósito, e é por isso que a comparação é com
 * tolerância: um grau vale ~111 km, então 2 m são 2e-5 graus, e a soma de dois
 * números da ordem de -23.55 perde precisão muito antes da última casa.
 */
const rect: PoiRect = {
  northEast: [-23.55002, -46.63002],
  southWest: [-23.55004, -46.63004],
};

const center = anchorToPosition(rect, { u: 0.5, v: 0.5 });

describe('anchorToPosition', () => {
  it('coloca a âncora do meio no meio do retângulo', () => {
    expect(center[0]).toBeCloseTo(-23.55003, 9);
    expect(center[1]).toBeCloseTo(-46.63003, 9);
  });

  it('vai do canto oeste para o leste em u, e do sul para o norte em v', () => {
    expect(anchorToPosition(rect, { u: 0, v: 0.5 })[1]).toBe(-46.63004);
    expect(anchorToPosition(rect, { u: 1, v: 0.5 })[1]).toBe(-46.63002);
    expect(anchorToPosition(rect, { u: 0.5, v: 0 })[0]).toBe(-23.55004);
    expect(anchorToPosition(rect, { u: 0.5, v: 1 })[0]).toBe(-23.55002);
  });

  it('leva o ícone junto quando o retângulo é redimensionado', () => {
    const before = anchorToPosition(rect, { u: 0.5, v: 0.5 });
    const after = anchorToPosition(resizeRect(rect, 'northEast', [-23.54998, -46.62998]), {
      u: 0.5,
      v: 0.5,
    });

    expect(after[0]).not.toBeCloseTo(before[0], 9);
    expect(after[1]).not.toBeCloseTo(before[1], 9);
  });
});

describe('normalizeRect', () => {
  it('coloca o canto maior no northEast mesmo vindo invertido', () => {
    expect(
      normalizeRect({
        northEast: [-23.55004, -46.63004],
        southWest: [-23.55002, -46.63002],
      }),
    ).toEqual(rect);
  });

  it('não mexe num retângulo que já está na ordem', () => {
    expect(normalizeRect(rect)).toEqual(rect);
  });
});

describe('rectCorners', () => {
  it('devolve os quatro cantos em sentido horário a partir do noroeste', () => {
    expect(rectCorners(rect)).toEqual([
      [-23.55002, -46.63004],
      [-23.55002, -46.63002],
      [-23.55004, -46.63002],
      [-23.55004, -46.63004],
    ]);
  });
});

describe('rectFromCenter', () => {
  it('centraliza o retângulo no ponto tocado', () => {
    const created = rectFromCenter(center);

    expect(anchorToPosition(created, { u: 0.5, v: 0.5 })[0]).toBeCloseTo(center[0], 9);
    expect(anchorToPosition(created, { u: 0.5, v: 0.5 })[1]).toBeCloseTo(center[1], 9);
  });

  it('nasce com o lado padrão, maior que o piso', () => {
    const created = rectFromCenter(center);

    expect(DEFAULT_POI_RECT_SPAN).toBeGreaterThan(MIN_POI_RECT_SPAN);
    expect(created.northEast[0] - created.southWest[0]).toBeCloseTo(DEFAULT_POI_RECT_SPAN, 9);
  });
});

describe('resizeRect', () => {
  it('move só o canto arrastado', () => {
    const resized = resizeRect(rect, 'northEast', [-23.5499, -46.63]);

    expect(resized.northEast[0]).toBeCloseTo(-23.5499, 9);
    expect(resized.northEast[1]).toBeCloseTo(-46.63, 9);
    expect(resized.southWest).toEqual(rect.southWest);
  });

  it('não deixa o canto atravessar o lado oposto', () => {
    const resized = resizeRect(rect, 'northEast', [-23.6, -46.7]);

    // A comparação é com tolerância pelo mesmo motivo do resto do arquivo: os
    // cantos são números da ordem de -23.55 somados com diferenças da ordem de
    // 1e-5, e o mínimo exato perde a última casa.
    expect(resized.northEast[0] - resized.southWest[0]).toBeCloseTo(MIN_POI_RECT_SPAN, 9);
    expect(resized.northEast[1] - resized.southWest[1]).toBeCloseTo(MIN_POI_RECT_SPAN, 9);
  });

  it('arrastar o canto para dentro encolhe o quadro em vez de virá-lo', () => {
    const resized = resizeRect(rect, 'northWest', [-23.550039, -46.630039]);

    expect(resized.northEast[0]).toBeGreaterThan(resized.southWest[0]);
    expect(resized.northEast[1]).toBeGreaterThan(resized.southWest[1]);
  });

  // Os quatro casos abaixo existem porque um canto toca **dois** eixos, e o erro
  // de escrever só a latitude não aparece em nenhuma verificação de sanidade: o
  // quadro continua canônico e continua com área. Só o canto arrastado está
  // errado, e ele só é visível se o teste afirmar onde ele foi parar.
  // Os casos de canto usam um quadro **maior** que o mínimo de propósito: o
  // `rect` da primeira linha do arquivo já está com o lado colado no piso, e
  // arrastar um canto que não tem para onde andar só exercita o limite, não o
  // gesto. O erro de escrever só a latitude também não aparece em nenhuma
  // verificação de sanidade — o quadro continua canônico e continua com área —,
  // então o teste precisa afirmar onde o canto arrastado foi parar.
  const roomyRect: PoiRect = {
    northEast: [-23.54996, -46.62996],
    southWest: [-23.55004, -46.63004],
  };

  it('arrastar o noroeste para oeste move a longitude oeste, e não só a latitude', () => {
    const resized = resizeRect(roomyRect, 'northWest', [-23.54996, -46.63002]);

    expect(resized.southWest[1]).toBeCloseTo(-46.63002, 9);
    expect(resized.southWest[0]).toBeCloseTo(roomyRect.southWest[0], 9);
    expect(resized.northEast[1]).toBeCloseTo(roomyRect.northEast[1], 9);
  });

  it('arrastar o noroeste para norte move só a latitude norte', () => {
    const resized = resizeRect(roomyRect, 'northWest', [-23.54998, -46.63004]);

    expect(resized.northEast[0]).toBeCloseTo(-23.54998, 9);
    expect(resized.southWest[1]).toBeCloseTo(roomyRect.southWest[1], 9);
  });

  it('arrastar o sudoeste para oeste move a longitude oeste, e não só a latitude', () => {
    const resized = resizeRect(roomyRect, 'southWest', [-23.55002, -46.63002]);

    expect(resized.southWest[1]).toBeCloseTo(-46.63002, 9);
    expect(resized.southWest[0]).toBeCloseTo(-23.55002, 9);
    expect(resized.northEast[1]).toBeCloseTo(roomyRect.northEast[1], 9);
  });

  it('arrastar o sudeste para sul move só a latitude sul', () => {
    const resized = resizeRect(roomyRect, 'southEast', [-23.55002, -46.62996]);

    expect(resized.southWest[0]).toBeCloseTo(-23.55002, 9);
    // A longitude veio igual ao leste, então nenhuma das duas bordas se mexeu —
    // o `southWest[1]` continua sendo o oeste, e é o `northEast[1]` que guardava o
    // leste. Um canto arrastado para dentro do quadro não pode trocar as bordas.
    expect(resized.southWest[1]).toBeCloseTo(roomyRect.southWest[1], 9);
    expect(resized.northEast[1]).toBeCloseTo(roomyRect.northEast[1], 9);
  });

  it('arrastar um canto para dentro da direção oposta não vira o quadro', () => {
    // Cada canto para dentro do quadro oposto: um gesture que não pode acontecer
    // com um dedo, mas chega por dado velho, por API ou por sincronização. O
    // polígono não pode sair com área negativa.
    const inside = [
      ['northWest', [-23.55003, -46.63002]] as const,
      ['northEast', [-23.55003, -46.63002]] as const,
      ['southEast', [-23.54997, -46.62998]] as const,
      ['southWest', [-23.54997, -46.62998]] as const,
    ] as const;

    for (const [corner, position] of inside) {
      const resized = resizeRect(roomyRect, corner, position);

      expect(resized.northEast[0]).toBeGreaterThan(resized.southWest[0]);
      expect(resized.northEast[1]).toBeGreaterThan(resized.southWest[1]);
    }
  });

  it('cada canto altera o lado que ele toca, e só esse', () => {
    const corners = [
      ['northWest', [-23.54998, -46.63002]] as const,
      ['northEast', [-23.54998, -46.62998]] as const,
      ['southEast', [-23.55002, -46.62998]] as const,
      ['southWest', [-23.55002, -46.63002]] as const,
    ] as const;

    for (const [corner, position] of corners) {
      const resized = resizeRect(roomyRect, corner, position);
      const touchesNorth = resized.northEast[0] !== roomyRect.northEast[0];
      const touchesEast = resized.northEast[1] !== roomyRect.northEast[1];
      const touchesSouth = resized.southWest[0] !== roomyRect.southWest[0];
      const touchesWest = resized.southWest[1] !== roomyRect.southWest[1];

      // O objeto comparado nomeia o canto, para o caso que falhar dizer **qual**
      // deles é, em vez de só dizer que "algo" não bateu.
      expect({ corner, touchesNorth, touchesEast, touchesSouth, touchesWest }).toEqual({
        corner,
        touchesNorth: corner === 'northWest' || corner === 'northEast',
        touchesEast: corner === 'northEast' || corner === 'southEast',
        touchesSouth: corner === 'southEast' || corner === 'southWest',
        touchesWest: corner === 'northWest' || corner === 'southWest',
      });
    }
  });

  it('não deixa um canto do oeste cruzar o lado leste, pelo mínimo do quadro', () => {
    const resized = resizeRect(roomyRect, 'northWest', [-23.54998, -46.6299]);

    expect(resized.northEast[1] - resized.southWest[1]).toBeCloseTo(MIN_POI_RECT_SPAN, 9);
  });
});

describe('resizeRectByStep', () => {
  const roomyRect: PoiRect = {
    northEast: [-23.54996, -46.62996],
    southWest: [-23.55004, -46.63004],
  };

  // A porta de leitor de tela: quem ouve não arrasta, então `increment`/`decrement`
  // precisam crescer e encolher o quadro de verdade, e o par tem que ser reversível
  // — um "aumentar" que não pode ser desfeito com "diminuir" deixa o ponto preso
  // num tamanho que a pessoa escolheu sem querer.
  it('crescer tira o canto do centro, nos dois eixos', () => {
    const grown = resizeRectByStep(roomyRect, 'northWest', 'grow');

    expect(grown.northEast[0] - roomyRect.northEast[0]).toBeCloseTo(ACCESSIBILITY_RESIZE_STEP, 9);
    expect(roomyRect.southWest[1] - grown.southWest[1]).toBeCloseTo(ACCESSIBILITY_RESIZE_STEP, 9);
  });

  it('cada canto cresce para o seu lado, e não para o do vizinho', () => {
    const grown = resizeRectByStep(roomyRect, 'southEast', 'grow');

    // O sudeste é o canto de dentro: ele puxa a borda **sul** (para baixo, e não
    // para cima) e a borda **leste** (para a direita). Crescer para cima seria
    // mexer na aresta oposta, que é o que segura o quadro no lugar.
    expect(grown.northEast[0]).toBeCloseTo(roomyRect.northEast[0], 9);
    expect(grown.northEast[1] - roomyRect.northEast[1]).toBeCloseTo(ACCESSIBILITY_RESIZE_STEP, 9);
    expect(roomyRect.southWest[0] - grown.southWest[0]).toBeCloseTo(ACCESSIBILITY_RESIZE_STEP, 9);
  });

  it('o canto oposto não se mexe, para o quadro crescer a partir dele', () => {
    // Quem redimensiona segura um canto e o outro é a dobradiça. O oposto de um
    // canto é sempre o diagonal, e `rectCorners` já devolve na ordem dos nomes —
    // então o índice do oposto sai do próprio nome, e o laço compara o canto guardado
    // antes e depois. O nome entra no objeto comparado para o caso que falhar dizer
    // **qual** canto se moveu.
    const index: Record<string, number> = { northWest: 0, northEast: 1, southEast: 2, southWest: 3 };
    const corners = ['northWest', 'northEast', 'southEast', 'southWest'] as const;
    const oppositeOf: Record<(typeof corners)[number], (typeof corners)[number]> = {
      northWest: 'southEast',
      northEast: 'southWest',
      southEast: 'northWest',
      southWest: 'northEast',
    };

    for (const corner of corners) {
      const opposite = oppositeOf[corner];
      const kept = rectCorners(roomyRect)[index[opposite]];
      const after = rectCorners(resizeRectByStep(roomyRect, corner, 'grow'))[index[opposite]];

      expect({ corner, kept: after }).toEqual({ corner, kept });
    }
  });

  it('o caminho sem arraste é o mesmo que o arraste com a mesma coordenada', () => {
    // A promessa que o leitor de tela faz é a mesma que o dedo faz: mudar o tamanho
    // é `resizeRect` com outra coordenada. Se um dia os dois divergirem, a pessoa
    // que não arrasta fica com um tamanho que o dedo não alcança.
    // `rectCorners` devolve um array, e a posição de um canto é o nome dele — o
    // par `índice`/`offset` abaixo é o que traduz um no outro.
    const index: Record<string, number> = { northWest: 0, northEast: 1, southEast: 2, southWest: 3 };
    const corners = ['northWest', 'northEast', 'southEast', 'southWest'] as const;
    const offset = {
      northWest: [ACCESSIBILITY_RESIZE_STEP, -ACCESSIBILITY_RESIZE_STEP],
      northEast: [ACCESSIBILITY_RESIZE_STEP, ACCESSIBILITY_RESIZE_STEP],
      southEast: [-ACCESSIBILITY_RESIZE_STEP, ACCESSIBILITY_RESIZE_STEP],
      southWest: [-ACCESSIBILITY_RESIZE_STEP, -ACCESSIBILITY_RESIZE_STEP],
    } as const;

    for (const corner of corners) {
      // A coordenada que o dedo teria de soltar para produzir o mesmo quadro: o
      // canto atual mais um passo para fora. É a conta do `grow`, escrita de novo
      // aqui de propósito — se a implementação mudar para outro lugar, este teste
      // é quem avisa que os dois caminhos deixaram de concordar.
      const current = rectCorners(roomyRect)[index[corner]];
      const dragged = resizeRect(roomyRect, corner, [
        current[0] + offset[corner][0],
        current[1] + offset[corner][1],
      ]);
      const stepped = resizeRectByStep(roomyRect, corner, 'grow');

      expect({ corner, stepped }).toEqual({ corner, stepped: dragged });
    }
  });

  it('diminuir é o caminho inverso de crescer', () => {
    const corners = ['northWest', 'northEast', 'southEast', 'southWest'] as const;

    for (const corner of corners) {
      const shrunk = resizeRectByStep(resizeRectByStep(roomyRect, corner, 'grow'), corner, 'shrink');

      expect(shrunk.northEast[0]).toBeCloseTo(roomyRect.northEast[0], 9);
      expect(shrunk.northEast[1]).toBeCloseTo(roomyRect.northEast[1], 9);
      expect(shrunk.southWest[0]).toBeCloseTo(roomyRect.southWest[0], 9);
      expect(shrunk.southWest[1]).toBeCloseTo(roomyRect.southWest[1], 9);
    }
  });

  it('diminuir para no piso do quadro, sem virar a marcação', () => {
    let current = roomyRect;

    for (let step = 0; step < 10; step += 1) {
      current = resizeRectByStep(current, 'northWest', 'shrink');
    }

    expect(current.northEast[0] - current.southWest[0]).toBeCloseTo(MIN_POI_RECT_SPAN, 9);
    expect(current.northEast[1] - current.southWest[1]).toBeCloseTo(MIN_POI_RECT_SPAN, 9);
  });

  it('o passo é visível, e não o mínimo físico', () => {
    // Um passo de 2 m seria exato e invisível: quem aperta "aumentar" duas vezes não
    // veria diferença. O passo é o lado padrão, que é o quanto o quadro nasce.
    expect(ACCESSIBILITY_RESIZE_STEP).toBe(DEFAULT_POI_RECT_SPAN);
    expect(ACCESSIBILITY_RESIZE_STEP).toBeGreaterThan(MIN_POI_RECT_SPAN);
  });

  it('o ícone fica dentro do quadro depois do passo, com a âncora que já existia', () => {
    // Redimensionar não mexe na âncora: a mesma fração continua descrevendo o mesmo
    // lugar dentro do quadro novo. O ícone se move porque o quadro é que mudou — e
    // o ícone não pode sair de dentro, que é o estado que a interface não explica.
    const anchor = { u: 0.25, v: 0.75 };

    for (const corner of ['northWest', 'northEast', 'southEast', 'southWest'] as const) {
      const grown = resizeRectByStep(roomyRect, corner, 'grow');
      const inside = positionToAnchor(grown, anchorToPosition(grown, anchor));

      // A volta é por fração e cada fração é uma divisão de números da ordem de
      // 1e-5 em 1e-5, então a comparação é com tolerância pelo mesmo motivo do
      // resto do arquivo.
      expect({ corner, u: inside.u, v: inside.v }).toEqual({
        corner,
        u: expect.closeTo(anchor.u, 9),
        v: expect.closeTo(anchor.v, 9),
      });
    }
  });
});

describe('positionToAnchor', () => {
  it('é o inverso de anchorToPosition', () => {
    const anchor = { u: 0.25, v: 0.75 };
    const back = positionToAnchor(rect, anchorToPosition(rect, anchor));

    expect(back.u).toBeCloseTo(anchor.u, 9);
    expect(back.v).toBeCloseTo(anchor.v, 9);
  });

  it('limita a âncora quando o ponto cai fora do retângulo', () => {
    expect(positionToAnchor(rect, [-23.5, -46.63])).toEqual({ u: 1, v: 1 });
    expect(positionToAnchor(rect, [-23.6, -46.7])).toEqual({ u: 0, v: 0 });
  });

  it('caminha para o centro quando o retângulo não tem área', () => {
    const flat: PoiRect = {
      northEast: [-23.55002, -46.63002],
      southWest: [-23.55002, -46.63004],
    };

    expect(positionToAnchor(flat, [-23.55002, -46.63003])).toEqual({ u: 0.5, v: 0.5 });
  });
});

describe('dragIconTo', () => {
  it('leva o ícone ao novo lugar e mantém o tamanho da caixa', () => {
    const result = dragIconTo(rect, [-23.55, -46.63]);
    const icon = anchorToPosition(result.rect, result.anchor);

    expect(icon[0]).toBeCloseTo(-23.55, 9);
    expect(icon[1]).toBeCloseTo(-46.63, 9);
    expect(result.rect.northEast[0] - result.rect.southWest[0]).toBeCloseTo(
      rect.northEast[0] - rect.southWest[0],
      9,
    );
    expect(result.rect.northEast[1] - result.rect.southWest[1]).toBeCloseTo(
      rect.northEast[1] - rect.southWest[1],
      9,
    );
  });

  it('mantém o ícone dentro do retângulo depois do arrasto', () => {
    const result = dragIconTo(rect, [-23.4, -46.5]);

    expect(anchorToPosition(result.rect, result.anchor)[0]).toBeCloseTo(-23.4, 9);
    expect(result.anchor).toEqual({ u: 1, v: 1 });
    expect(result.rect.northEast[0]).toBeCloseTo(-23.4, 9);
  });

  it('não move nada quando o ícone já está no lugar', () => {
    const result = dragIconTo(rect, center);

    expect(result.rect.northEast[0]).toBeCloseTo(rect.northEast[0], 9);
    expect(result.rect.northEast[1]).toBeCloseTo(rect.northEast[1], 9);
    expect(result.rect.southWest[0]).toBeCloseTo(rect.southWest[0], 9);
    expect(result.rect.southWest[1]).toBeCloseTo(rect.southWest[1], 9);
  });
});

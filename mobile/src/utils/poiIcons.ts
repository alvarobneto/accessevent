import { PoiTypeValues, type PoiType } from '@/data/types';
import type { IconName } from '@/types/icon';

/**
 * Ícone de cada tipo de ponto de interesse.
 *
 * Morou dentro do `PoiForm` e dentro do `MapPin` em versões anteriores, o que
 * duplicava o catálogo: a paleta mostrava um ícone e o marcador no mapa mostrava
 * outro, porque cada um tinha a sua lista. O tipo do ponto é o que decide o
 * ícone, então a decisão mora em um lugar só e os dois leem dela.
 *
 * O nome do tipo já é pt-BR porque é o vocabulário do grafo gravado no banco
 * (`PoiTypeValues` no `poi.entity.ts` do backend espelha esta lista), então a
 * leitura para o leitor de tela não precisa de tradução: "Banheiro acessível" é o
 * rótulo e o ícone ao mesmo tempo.
 */
export const POI_TYPE_ICONS: Record<PoiType, IconName> = {
  Entrada: 'entrance',
  Saída: 'exit',
  Banheiro: 'bathroom',
  'Banheiro acessível': 'bathroom-accessible',
  Elevador: 'elevator',
  Escada: 'stairs',
  Rampa: 'ramp',
  Auditório: 'presentation',
  Sala: 'door',
  Alimentação: 'silverware-fork-knife',
  Atendimento: 'concierge-bell',
  'Posto médico': 'medical-bag',
  Outro: 'map-marker-question',
};

/**
 * Ícone de um ponto de interesse.
 *
 * `Outro` cai no círculo de pergunta porque é o tipo em que o organizador não
 * escolheu um dos doze ícones — e a interface precisa dizer isso, não desenhar um
 * marcador que parece tão específico quanto o do banheiro.
 */
export function poiIcon(type: PoiType): IconName {
  return POI_TYPE_ICONS[type];
}

/** Ícone de um marcador que não é um ponto de interesse (contexto, posição em rascunho). */
export const GENERIC_MARKER_ICON: IconName = 'map-marker';

/**
 * Nome do ponto para o leitor de tela, com o tipo junto.
 *
 * O tipo é a informação que o ícone só transmite visualmente: "Entrada", com um
 * ícone de seta, precisa ser dito em voz alta para quem usa leitor de tela, e é
 * também o rótulo quando o organizador não deu nome ao ponto (PRD §19 — os dados
 * são do organizador e o app não inventa descrição).
 */
export function describePoi(poi: { name: string; type: PoiType }): string {
  // Nome e tipo podem ser o mesmo texto quando o organizador não nomeou o ponto e
  // o backend guardou o tipo como nome (ver `PoiForm`). "Elevador • Elevador" lê
  // como bug de interface e é o que o leitor de tela vocalizaria duas vezes.
  const name = poi.name.trim();
  return name.length === 0 || name === poi.type ? poi.type : `${name} • ${poi.type}`;
}

/**
 * Garante que todo tipo de ponto tem ícone.
 *
 * O `Record` acima já faz isso no compilador, e o teste abaixo fecha o outro lado:
 * se a lista de tipos do backend ganhar um valor novo e alguém esquecer a entrada
 * aqui, o `Record` acusa na hora — mas o teste também falha, o que pega o caso de
 * o tipo existir e o ícone apontar para o mesmo desenho de outro tipo, que é erro
 * que o compilador não vê e a interface sente.
 */
export function hasDistinctPoiIcons(): boolean {
  const icons = PoiTypeValues.map((type) => POI_TYPE_ICONS[type]);
  return new Set(icons).size === icons.length;
}

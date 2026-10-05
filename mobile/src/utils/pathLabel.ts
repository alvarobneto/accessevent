import type { Path } from '@/data/types';

import { formatDistance } from './format';

export type PathLabels = {
  /** Título da linha e do diálogo: o nome que a pessoa deu, ou a distância. */
  title: string;
  /** Segunda linha: o que o nome não diz. */
  description: string;
};

/**
 * Como um caminho se anuncia na lista.
 *
 * O nome é do organizador (PRD §23) e é o que torna o caminho reconheível entre
 * duas caminhadas no mesmo dia. Quem não nomeou continua reconhecendo o trajeto
 * pelo que ele é — onde andou e quanto deu — então o título cai para
 * "Caminho de <distância>" em vez de repetir um título vazio ou dizer "sem nome",
 * que é um estado que ninguém escolheu e sim a ausência de um dado.
 *
 * Morou em `utils/` e não no componente porque é regra de apresentação com
 * casos que quebram em silêncio: nome vazio, nome só com espaço, caminho de um
 * ponto só. É o mesmo motivo dos limiares de gravação estarem fora do hook.
 */
export function pathLabels(path: Pick<Path, 'name' | 'distance' | 'geometry'>): PathLabels {
  const distance = formatDistance(path.distance);
  const count = path.geometry.length;
  const points = `${count} ${count === 1 ? 'ponto' : 'pontos'} no trajeto`;
  // A API já devolve o nome aparado, mas um `  ` isolado passaria pelo
  // `if (path.name)` e viraria título em branco.
  const name = path.name?.trim();

  if (!name) {
    return { title: `Caminho de ${distance}`, description: points };
  }

  return { title: name, description: `${distance} · ${points}` };
}

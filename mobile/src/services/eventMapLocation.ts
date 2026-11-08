import * as Location from 'expo-location';

import { repository } from '@/data';
import type { Coordinate } from '@/types/coordinates';
import { isValidCoordinate } from '@/utils/geo';

/** Resolve the event address to the initial center shared by its maps. */
export async function resolveEventMapCenter(eventId: string): Promise<Coordinate> {
  const event = await repository.getEvent(eventId);
  if (!event) throw new Error('Evento não encontrado.');

  const address = event.address?.trim();
  if (!address) {
    throw new Error('Este evento não tem endereço. Edite o evento para informar um endereço.');
  }

  let results: Location.LocationGeocodedLocation[];
  try {
    results = await Location.geocodeAsync(address);
  } catch {
    throw new Error(
      'Não foi possível localizar o endereço do evento. Verifique a conexão e tente novamente.',
    );
  }

  const result = results[0];
  if (!result) {
    throw new Error(
      'Não foi possível localizar o endereço do evento. Confira o endereço cadastrado.',
    );
  }

  const center: Coordinate = [result.latitude, result.longitude];
  if (!isValidCoordinate(center)) {
    throw new Error('O endereço do evento retornou uma localização inválida.');
  }

  return center;
}

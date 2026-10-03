import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { MapPin } from '@/components/map/map-pin';
import { EmptyState } from '@/components/ui';
import { hasGoogleMapsAndroidKey } from '@/config/env';
import { tv } from '@/lib/tv';
import { colors } from '@/theme/tokens';
import type { Coordinate, Coordinates } from '@/types/coordinates';
import type { MapGeometry, MapMarker, MapPolyline, MapTone } from '@/types/map';
import { isValidCoordinate, regionForCoordinate, regionForGeometry, toLatLng } from '@/utils/geo';

/** Cor de cada tom. As três fecham 3:1 ou mais contra o desenho claro do mapa. */
const TONE_COLORS: Record<MapTone, string> = {
  default: colors.primary,
  highlight: colors.successStrong,
  muted: colors.gray500,
};

/** Espessura do trajeto, na grade de 4px do `design.md`. */
const STROKE_WIDTH = 4;

/** Folga que o mapa deixa ao redor do conteúdo ao enquadrar, em pixels. */
const EDGE_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

/** Duração da transição de câmera: uma das três que o `design.md` permite. */
const CAMERA_DURATION = 250;

/**
 * Se o provedor de mapa pode ser montado.
 *
 * O Google Maps no Android exige `com.google.android.geo.API_KEY` no manifesto, e
 * sem a chave o `react-native-maps` mata o processo: `MapsInitializer.initialize`
 * lança na criação do `MapView` e a exceção sobe até o `main`. O iOS não passa
 * por isso porque o provedor de lá é o Apple Maps, que não pede chave nenhuma.
 *
 * Sem chave, o `EventMap` não monta mapa — ele devolve o estado explícito de mapa
 * indisponível e a tela sobrevive. O valor é constante durante a vida do processo
 * (`Platform.OS` e uma variável embutida no build), por isso a guarda é uma
 * fronteira de componente, e não um retorno no meio do corpo de `EventMap`.
 */
const isMapProviderAvailable = Platform.OS !== 'android' || hasGoogleMapsAndroidKey;

export type EventMapProps = {
  /** Pontos a desenhar, os pontos de interesse do mapa. */
  markers?: MapMarker[];
  /** Trajetos a desenhar. */
  polylines?: MapPolyline[];
  /**
   * Posição de quem está usando o app. Só de quem autorizou a localização: quando
   * ela existe, o ponto nativo do mapa também aparece.
   */
  userLocation?: Coordinates | null;
  /**
   * Mantém a câmera sobre a posição de quem está usando o app, a cada leitura do
   * GPS. É o comportamento da gravação de caminho da Sprint 4.
   */
  followUserLocation?: boolean;
  /** Nome do mapa para o leitor de tela; o mapa é um gráfico, não um texto. */
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
};

/**
 * O mapa do evento: base do mapa, marcadores e trajetos.
 *
 * É a única tela que conhece o `react-native-maps`. As telas passam marcadores e
 * polilinhas — o desenho já no formato do banco (`Path.geometry` e a posição dos
 * pontos, PRD §23) — e não tocam em coordenada, provider ou câmera.
 *
 * A guarda do provedor mora aqui e não nas telas porque é o componente que sabe
 * o que o `react-native-maps` exige: ver `isMapProviderAvailable`.
 */
export function EventMap(props: EventMapProps) {
  if (!isMapProviderAvailable) {
    return <UnavailableMap className={props.className} testID={props.testID} />;
  }

  return <DrawnMap {...props} />;
}

/**
 * O estado de mapa indisponível, no lugar do mapa.
 *
 * Fica no mesmo contêiner e com o mesmo `testID` do mapa para a tela não mudar
 * de tamanho nem de posição — quem olha vê o mesmo retângulo, com a explicação
 * do que falta dentro dele.
 */
function UnavailableMap({ className, testID }: Pick<EventMapProps, 'className' | 'testID'>) {
  return (
    <View className={containerVariants({ className: className ?? 'flex-1' })} testID={testID}>
      <View className="h-full w-full items-center justify-center bg-background p-4">
        <EmptyState
          compact
          icon="map-marker-off-outline"
          title="Mapa indisponível no Android"
          description="O Google Maps precisa de uma chave da API configurada no app para desenhar o mapa. O resto da tela continua funcionando."
        />
      </View>
    </View>
  );
}

/**
 * O mapa propriamente dito, separado do `EventMap` para que a guarda do provedor
 * seja uma fronteira de componente e não um retorno no meio do corpo.
 *
 * Enquadramento: o mapa abre mostrando todo o conteúdo e reenquadra quando o
 * conjunto muda, nunca a cada render. Com o mapa vazio, quem mostra a câmera é a
 * tela, não o componente: um `initialRegion` explícito, a localização de quem
 * está usando o app ou o `followUserLocation` da gravação.
 */
function DrawnMap({
  markers = [],
  polylines = [],
  userLocation,
  followUserLocation = false,
  accessibilityLabel = 'Mapa do evento',
  className,
  testID,
}: EventMapProps) {
  const mapRef = useRef<MapView>(null);
  const [isReady, setIsReady] = useState(false);

  /** Conteúdo corrente, lido pelo efeito de enquadramento. */
  const content = useRef<{ markers: MapMarker[]; polylines: MapPolyline[] }>({
    markers,
    polylines,
  });

  const latitude = userLocation?.latitude;
  const longitude = userLocation?.longitude;
  const userPosition = useMemo<Coordinate | null>(
    () => (latitude === undefined || longitude === undefined ? null : [latitude, longitude]),
    [latitude, longitude],
  );

  useEffect(() => {
    content.current = { markers, polylines };
  });

  const contentKey = describeContent(markers, polylines);

  // `initialRegion` só vale na montagem, então pode ser um objeto novo a cada
  // render: o `MapView` ignora mudanças nessa prop depois de montado.
  const initialRegion = regionForGeometry(contentCoordinates(markers, polylines)) ?? undefined;

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map) return;

    const coordinates = validCoordinates(
      contentCoordinates(content.current.markers, content.current.polylines),
    );
    if (coordinates.length === 0) return;

    map.fitToCoordinates(coordinates.map(toLatLng), {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  }, [contentKey, isReady]);

  useEffect(() => {
    if (!followUserLocation || !userPosition || !isReady) return;

    mapRef.current?.animateToRegion(regionForCoordinate(userPosition), CAMERA_DURATION);
  }, [followUserLocation, userPosition, isReady]);

  return (
    <View className={containerVariants({ className: className ?? 'flex-1' })} testID={testID}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setIsReady(true)}
        // O mapa de um local interno é lido de cima: girar e inclinar não acrescenta
        // nada e a rotação da cena é justamente o tipo de movimento que mais causa
        // desconforto (RNF04). O zoom e o arraste continuam liberados.
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={userPosition !== null}
        loadingEnabled
        loadingIndicatorColor={colors.primary}
        accessibilityLabel={accessibilityLabel}
      >
        {polylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            coordinates={validCoordinates(polyline.geometry).map(toLatLng)}
            strokeColor={TONE_COLORS[polyline.tone ?? 'default']}
            strokeWidth={STROKE_WIDTH}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={toLatLng(marker.coordinate)}
            title={marker.label}
            description={marker.description}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            accessibilityLabel={describeMarker(marker)}
          >
            <MapPin tone={marker.tone} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const containerVariants = tv({
  base: 'overflow-hidden',
});

const styles = StyleSheet.create({
  map: { flex: 1 },
});

/** Todos os pontos do mapa, de marcadores e trajetos, na ordem que foram passados. */
function contentCoordinates(markers: MapMarker[], polylines: MapPolyline[]): MapGeometry {
  return [
    ...markers.map((marker) => marker.coordinate),
    ...polylines.flatMap((polyline) => polyline.geometry),
  ];
}

/** Geometria com os pontos descartáveis fora, para nunca desenhar coordenada inválida. */
function validCoordinates(geometry: MapGeometry): MapGeometry {
  return geometry.filter(isValidCoordinate);
}

/**
 * Identidade do conteúdo do mapa. O enquadramento só roda quando essa string
 * muda, então um array novo com o mesmo conteúdo não move a câmera: quem está
 * usando o app continua arrastando o mapa em paz.
 */
function describeContent(markers: MapMarker[], polylines: MapPolyline[]): string {
  return [
    ...markers.map((marker) => `${marker.id}:${marker.coordinate[0]},${marker.coordinate[1]}`),
    ...polylines.map(
      (polyline) => `${polyline.id}:${polyline.geometry.length}:${describeEndpoints(polyline)}`,
    ),
  ].join('|');
}

/** Primeira e última coordenada do trajeto: o suficiente para notar o trajeto mudando. */
function describeEndpoints(polyline: MapPolyline): string {
  const { geometry } = polyline;
  const first = geometry[0];
  const last = geometry[geometry.length - 1];

  if (!first || !last) return '';

  return `${first[0]},${first[1]}>${last[0]},${last[1]}`;
}

/** Nome do marcador para o leitor de tela; o pino em si não é texto. */
function describeMarker(marker: MapMarker): string {
  return marker.description ? `${marker.label}. ${marker.description}` : marker.label;
}

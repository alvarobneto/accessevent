import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  UrlTile,
  type MapPressEvent,
  type MarkerDragEvent,
  type Region,
} from 'react-native-maps';

import { MapPin } from '@/components/map/map-pin';
import {
  PATH_HANDLE_SPACING,
  PathEditOverlay,
  type PathHandle,
} from '@/components/map/path-edit-overlay';
import { RectHandleOverlay } from '@/components/map/poi-rect-handles';
import { EmptyState, IconButton, Text } from '@/components/ui';
import { hasGoogleMapsAndroidKey } from '@/config/env';
import { tv } from '@/lib/tv';
import { colors } from '@/theme/tokens';
import type { Coordinate, Coordinates } from '@/types/coordinates';
import type { MapGeometry, MapMarker, MapPolyline, MapRect, MapTone } from '@/types/map';
import {
  coordinateAtDrop,
  isInsideMap,
  type DropFrame,
  type ScreenPoint,
} from '@/utils/dropCoordinate';
import { retainPathHandleSelection, type PathHandleSelection } from '@/utils/pathGeometry';
import { rectCorners, type PoiRect, type PoiRectCorner } from '@/utils/poiAnchor';
import {
  degreeDistanceInMeters,
  isValidCoordinate,
  regionForCoordinate,
  regionForGeometry,
  toLatLng,
} from '@/utils/geo';
import { OSM_TILE_MAX_ZOOM, OSM_TILE_URL_TEMPLATE, TILE_CACHE_TTL_MS } from '@/utils/tiles';
import {
  INITIAL_CENTER,
  INITIAL_LATITUDE_DELTA,
  ZOOM_FACTOR,
  zoomViewportAt,
} from '@/utils/mapViewport';

/** Cor de cada tom. As três fecham 3:1 ou mais contra o desenho claro do mapa. */
const TONE_COLORS: Record<MapTone, string> = {
  default: colors.primary,
  highlight: colors.successStrong,
  muted: colors.gray500,
};

/** Espessura do trajeto, na grade de 4px do `design.md`. */
const STROKE_WIDTH = 4;

/** Contorno do retângulo do ponto: mesma grade do trajeto, pelo mesmo motivo. */
const RECT_STROKE_WIDTH = 2;

/**
 * Preenchimento do retângulo, em hexadecimal com alfa.
 *
 * O tom do trajeto é uma cor cheia, e o retângulo é a *marcação* do ponto: ele
 * fica atrás do ícone e sob o dedo de quem está arrastando. A 20% de alfa o
 * desenho do mapa continua legível através dele, que é o que um mapa de local
 * interno precisa — a área é pequena e cheia opaca esconderia o que dá para
 * reconhecer em volta.
 */
const RECT_FILL_COLORS: Record<MapTone, string> = {
  default: 'rgba(99, 102, 241, 0.2)',
  highlight: 'rgba(22, 101, 52, 0.2)',
  muted: 'rgba(120, 113, 108, 0.2)',
};

/**
 * Folga padrão que o mapa deixa ao redor do conteúdo ao enquadrar, em pixels.
 *
 * As telas de visualização passam uma folga menor (`fitPadding`) para o
 * território nascer com o mesmo detalhe do editor de áreas; as telas de edição
 * mantêm este respiro para as alças das bordas não ficarem coladas na margem.
 */
const DEFAULT_FIT_PADDING = 48;

/**
 * Lista vazia estável para a camada de interação do trajeto, enquanto a
 * projeção ainda não rodou. Um array novo a cada render recriaria os
 * `PanResponder`s à toa.
 */
const EMPTY_PATH_HANDLES: PathHandle[] = [];

/** Duração da transição de câmera: uma das três que o `design.md` permite. */
const CAMERA_DURATION = 250;

/**
 * Quanto a câmera pode andar sem que a tela seja avisada de novo, em metros.
 *
 * A animação de 250 ms nunca assenta exatamente no centro pedido, então realimentar
 * o efeito a cada quadro seria um laço de animações que não termina.
 */
const CAMERA_SETTLED_TOLERANCE_M = 1;

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

/**
 * O que a tela pode pedir ao mapa já montado.
 *
 * Existe para o arraste de ícone da Sprint 7: soltar um ícone precisa virar
 * coordenada, e a biblioteca não faz essa conversão (ver `coordinateAtDrop`).
 * A tela não recebe o `MapView` — passá-lo quebraria a regra de que este
 * arquivo é o único que conhece o `react-native-maps` — e sim uma pergunta em
 * coordenadas gravadas, que é a mesma linguagem que o resto do mapa usa.
 */
export type EventMapHandle = {
  /**
   * Converte o ponto onde o dedo soltou o ícone em coordenada gravada, ou `null`
   * quando o ponto caiu fora do retângulo do mapa, quando o mapa ainda não tem
   * tamanho, ou quando a conta sai da faixa do globo.
   *
   * **É assíncrono porque a origem é medida na hora.** `measureInWindow` é a
   * única forma de saber onde o mapa está na janela, e ela é assíncrona. Medir
   * uma vez no `onLayout` pareceria suficiente, mas `onLayout` não dispara quando
   * a **tela** rola — o mapa se desloca na janela e o layout interno dele não
   * muda. Depois de rolar até a paleta e arrastar, a origem seria a do scroll
   * antigo e todo ponto nasceria deslocado pela altura da rolagem, sem nenhum
   * erro: a conta fecha, com números certos para o lugar errado. Medir a cada
   * queda custa uma medição por arrasto, que é o que o dedo leva para mudar de
   * posição de qualquer jeito.
   */
  resolveDrop: (point: ScreenPoint) => Promise<Coordinate | null>;
};

export type EventMapProps = {
  /** Pontos a desenhar, os pontos de interesse do mapa. */
  markers?: MapMarker[];
  /** Trajetos a desenhar. */
  polylines?: MapPolyline[];
  /**
   * Retângulos dos pontos de interesse a desenhar.
   *
   * São desenhados com `Polygon` em coordenadas geográficas — as mesmas que o
   * banco guarda. Um retângulo guardado em pixel descolaria do lugar no primeiro
   * zoom da câmera, e o ponto nasceria certo para aparecer errado logo depois.
   */
  rects?: MapRect[];
  /**
   * Coordenada de onde veio o toque no desenho.
   *
   * É a porta de posicionar e mover um ponto: a tela que quer saber "onde a
   * pessoa tocou" recebe a coordenada no mesmo formato gravado — par
   * `[latitude, longitude]` — e não o `LatLng` do `react-native-maps`. O
   * `EventMap` é o único arquivo do app que conhece essa biblioteca, então a
   * conversão acontece uma vez aqui.
   *
   * O toque só chega quando o mapa não tem `onPress` em nenhum filho: tocar num
   * marcador ou num trajeto é tocar naquilo, e não no fundo do desenho.
   */
  onMapPress?: (coordinate: Coordinate) => void;
  /**
   * Posição de quem está usando o app. Só de quem autorizou a localização: quando
   * ela existe, o ponto nativo do mapa também aparece.
   */
  userLocation?: Coordinates | null;
  /**
   * Mantém a câmera sobre a posição de quem está usando o app. É o comportamento
   * da gravação de caminho da Sprint 4, e ele só vale com `cameraToFollow`: ver
   * o comentário do componente sobre quem dirige a câmera.
   */
  followUserLocation?: boolean;
  /**
   * Centro da câmera que a tela quer seguir, em coordenadas gravadas.
   *
   * Quem passa isto dirige a câmera. O componente devolve o centro do
   * enquadramento em `onCameraSettled`, e a tela o realimenta com a posição do
   * GPS: assim o acompanhamento usa a mesma fórmula do `animateToRegion` do
   * componente, e o `degreeDistanceInMeters` — que exige um `LatLng` — fica
   * exercitado sem que o componente precise conhecer a leitura do sensor.
   *
   * A tela que acompanha o GPS também **é** quem enquadra o trajeto, por isso
   * `onCameraSettled` não recebe o que a tela já pediu.
   */
  cameraToFollow?: Coordinate | null;
  /** Notifica o centro do enquadramento quando a câmera para de se mexer. */
  onCameraSettled?: (center: Coordinate) => void;
  /**
   * Ponto de onde a câmera começa, para quando o mapa abre sem conteúdo para
   * enquadrar — a gravação de caminho, que ainda não tem trajeto.
   *
   * Usa a mesma fórmula do acompanhamento, e é a tela que passa o ponto para não
   * duplicar `regionForCoordinate` fora daqui.
   */
  initialFocus?: Coordinate | null;
  /** Nome do mapa para o leitor de tela; o mapa é um gráfico, não um texto. */
  accessibilityLabel?: string;
  /**
   * Folga ao enquadrar o conteúdo, em pixels por lado.
   *
   * As telas de visualização passam uma folga menor que o padrão para o
   * território caber com o mesmo detalhe do `MapCanvas`, que enquadra com ~22 m
   * em volta do que o organizador desenhou.
   */
  fitPadding?: number;
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
 *
 * Aceita `ref` para responder `coordinateAt`, que é como o arraste de ícone
 * converte o ponto de queda sem conhecer a biblioteca.
 */
export const EventMap = forwardRef<EventMapHandle, EventMapProps>(function EventMap(props, ref) {
  if (!isMapProviderAvailable) {
    return <UnavailableMap className={props.className} testID={props.testID} />;
  }

  return <DrawnMap {...props} ref={ref} />;
});

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
 *
 * **Quem dirige a câmera.** São dois jeitos e eles não convivem. Por padrão o
 * componente reenquadra o conteúdo, o que serve para um mapa salvo. Durante a
 * gravação quem manda é a tela, porque o trajeto cresce a cada leitura e o
 * auto-enquadramento puxaria a câmera para o centro do percurso a cada ponto,
 * tirando o mapa da mão de quem está caminhando — foi o que aconteceu na primeira
 * versão do `followUserLocation`. Passando `cameraToFollow`, o reenquadramento
 * automático é desligado e a câmera segue o centro que a tela manda.
 *
 * **O toque tem duas portas e elas não se misturam.** Tocar num marcador ou num
 * trajeto é tocar naquilo — por isso o `onPress` é do marcador e da polilinha, e
 * nunca um callback único no mapa. Tocar no fundo do desenho é o que posiciona ou
 * move um ponto, e chega por `onMapPress`; as telas que não precisam disso não
 * passam o callback e o toque no fundo não faz nada.
 */
const DrawnMap = forwardRef<EventMapHandle, EventMapProps>(function DrawnMap(
  {
    markers = [],
    polylines = [],
    rects = [],
    onMapPress,
    userLocation,
    followUserLocation = false,
    cameraToFollow = null,
    onCameraSettled,
    initialFocus = null,
    accessibilityLabel = 'Mapa do evento',
    fitPadding = DEFAULT_FIT_PADDING,
    className,
    testID,
  },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const containerRef = useRef<View>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasLayout, setHasLayout] = useState(false);

  /**
   * Retângulo do mapa na janela, por `measureInWindow`, e região visível mais
   * recente. Juntos são o que `coordinateAtDrop` precisa para converter o ponto de
   * queda: sem a origem, um ponto de tela é lido a partir do canto da tela e não
   * do canto do mapa; sem a região, não há enquadramento para converter.
   *
   * Ficam em `ref` e não em `state` porque nenhum dos dois deve redesenhar o
   * mapa: a origem muda quando a tela rola e a região muda quando a câmera anda,
   * e o `EventMap` reenquadra quando o conteúdo muda — se o layout entrasse no
   * estado, a animação do efeito de enquadramento brigaria com quem está
   * arrastando o dedo.
   */
  const origin = useRef<ScreenPoint>({ x: 0, y: 0 });
  const size = useRef({ width: 0, height: 0 });
  const visibleRegion = useRef<DropFrame['region'] | null>(null);
  const zoomAnimationRunning = useRef(false);
  const activeZoomRegion = useRef<Region | null>(null);
  const requestedZoomRegion = useRef<Region | null>(null);
  const queuedZoomRegion = useRef<Region | null>(null);

  /**
   * Conteúdo corrente, lido pelo efeito de enquadramento.
   *
   * Os retângulos entram aqui pelo mesmo motivo dos marcadores: o enquadramento
   * automático tem que caber a **caixa** desenhada, não só o ícone. Sem eles, o
   * mapa abriria no ponto e a marcação nasceria cortada na borda.
   */
  const content = useRef<{ markers: MapMarker[]; polylines: MapPolyline[]; rects: MapRect[] }>({
    markers,
    polylines,
    rects,
  });

  /** Último centro reportado pela câmera, para a tolerância do laço de animação. */
  const lastSettledCamera = useRef<Coordinate | null>(null);

  /**
   * Contador de movimento da câmera, só para as alças do retângulo.
   *
   * A região visível mora em `ref` justamente para não redesenhar o mapa, e as
   * alças precisam do contrário: elas são `View`s em pixel e têm de voltar ao
   * lugar onde o canto aparece depois de cada zoom ou pan. Este contador é o que
   * avisa que a câmera mexeu; a região continua em `ref`, e o efeito que lê as
   * duas coisas não está no caminho da animação de enquadramento.
   */
  const [cameraTick, setCameraTick] = useState(0);

  /** O retângulo com alça, quando a tela está editando um ponto. */
  const editable = rects.find((item) => item.editable && item.onResize !== undefined) ?? null;

  const [handlePoints, setHandlePoints] = useState<Record<PoiRectCorner, ScreenPoint> | null>(null);
  const rectProjectionFrame = useRef<number | null>(null);
  const rectProjectionSequence = useRef(0);

  /**
   * O trajeto com alças, quando a tela está ajustando um caminho no mapa.
   *
   * A existência do par `onPreview`/`onCommit` na polilinha é o que marca o
   * trajeto como o editável — e ele é o único, como o retângulo: a camada de
   * interação recebe um trajeto, não um conjunto.
   */
  const editablePath =
    polylines.find((item) => item.editable && item.onPreview && item.onCommit) ?? null;

  const [pathHandles, setPathHandles] = useState<{ pathId: string; handles: PathHandle[] } | null>(
    null,
  );
  const pathHandleSelection = useRef<PathHandleSelection | null>(null);
  const pathProjectionFrame = useRef<number | null>(null);
  const pathProjectionSequence = useRef(0);

  /**
   * Um arraste de trajeto está em curso.
   *
   * Enquanto é `true`, a projeção das alças está **congelada**: o
   * rascunho muda a cada `move`, e reprojectar a geometria inteira a cada quadro
   * (com `pointForCoordinate` para cada um dos centenas de pontos) é o que
   * faria o arraste engasgar. O congelamento é ligado pela própria camada de
   * interação, que é quem sabe quando o gesto começou e terminou.
   */
  const [pathDragging, setPathDragging] = useState(false);
  const pathDraggingRef = useRef(false);

  const latitude = userLocation?.latitude;
  const longitude = userLocation?.longitude;
  const userPosition = useMemo<Coordinate | null>(
    () => (latitude === undefined || longitude === undefined ? null : [latitude, longitude]),
    [latitude, longitude],
  );

  useEffect(() => {
    content.current = { markers, polylines, rects };
  });

  const contentKey = describeContent(markers, polylines, rects);
  const isCameraDriven = followUserLocation && cameraToFollow !== null;
  const initialFocusLatitude = initialFocus?.[0] ?? null;
  const initialFocusLongitude = initialFocus?.[1] ?? null;

  // `initialRegion` só vale na montagem, então pode ser um objeto novo a cada
  // render: o `MapView` ignora mudanças nessa prop depois de montado.
  //
  // Sem foco nem conteúdo, quem enquadra é o mesmo padrão do editor de áreas
  // (`INITIAL_CENTER` + `INITIAL_LATITUDE_DELTA` do `mapViewport.ts`): um mapa
  // vazio abriria no zoom do planeta, e a tela do participante é um mapa vazio —
  // com as duas leituras iguais, a visualização nasce com o mesmo detalhe do
  // cadastro de ponto de interesse. Muito em `useMemo` para a semente de
  // `visibleRegion` não trocar a cada render.
  const initialRegion = useMemo(() => {
    if (initialFocus) return regionForCoordinate(initialFocus);

    const geometryRegion = regionForGeometry(contentCoordinates(markers, polylines, rects));
    if (geometryRegion) {
      return {
        ...geometryRegion,
        latitudeDelta: Math.max(geometryRegion.latitudeDelta, INITIAL_LATITUDE_DELTA),
        longitudeDelta: Math.max(geometryRegion.longitudeDelta, INITIAL_LATITUDE_DELTA),
      };
    }

    return {
      latitude: INITIAL_CENTER[0],
      longitude: INITIAL_CENTER[1],
      latitudeDelta: INITIAL_LATITUDE_DELTA,
      longitudeDelta: INITIAL_LATITUDE_DELTA,
    };
  }, [initialFocus, markers, polylines, rects]);

  // A região nasce do `initialRegion` e não zerada. `onRegionChangeComplete` só
  // dispara quando a câmera _muda_, e num mapa que abre enquadrado e fica parado
  // isso pode não acontecer nunca — sem esta semente, `coordinateAt` ficaria
  // devolvendo `null` num mapa perfeitamente visível.
  useEffect(() => {
    if (!initialRegion || visibleRegion.current) return;

    visibleRegion.current = {
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
      latitudeDelta: initialRegion.latitudeDelta,
      longitudeDelta: initialRegion.longitudeDelta,
    };
  }, [initialRegion]);

  /**
   * O retângulo de agora, ou `null` enquanto falta tamanho ou região. A
   * decomposição em refs existe porque cada peça chega por um evento diferente:
   * o tamanho por `onLayout` e a região por `onRegionChangeComplete` — e esta
   * última só dispara quando a câmera _muda_, o que num mapa enquadrado e parado
   * pode não acontecer nunca. Por isso a região também é semeada do
   * `initialRegion`: sem a semente, `resolveDrop` devolveria `null` num mapa
   * perfeitamente visível.
   *
   * Nenhuma delas é `state` porque nenhum dos dois deve redesenhar o mapa: a
   * origem muda quando a tela rola e a região muda quando a câmera anda, e o
   * `EventMap` reenquadra quando o conteúdo muda — se o layout entrasse no estado,
   * a animação de enquadramento brigaria com quem está arrastando o dedo.
   */
  const currentFrame = useCallback((): DropFrame | null => {
    if (!visibleRegion.current) return null;
    if (size.current.width <= 0 || size.current.height <= 0) return null;

    return { origin: origin.current, size: size.current, region: visibleRegion.current };
  }, []);

  /**
   * A mesma conta, com a origem medida agora.
   *
   * Separar de `currentFrame` é o que permite que `resolveDrop` meça sem que a
   * medição vire efeito colateral de render: `measureInWindow` escreve no `ref`
   * da origem quando resolve, e um `useEffect` que dependesse do layout
   * redesenharia o mapa a cada rolagem.
   */
  const measureFrame = useCallback((): Promise<DropFrame | null> => {
    return new Promise((resolve) => {
      const node = containerRef.current;
      if (!node) {
        resolve(currentFrame());
        return;
      }

      node.measureInWindow((x, y) => {
        origin.current = { x, y };
        resolve(currentFrame());
      });
    });
  }, [currentFrame]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !hasLayout || !map || isCameraDriven) return;

    const coordinates = validCoordinates(
      contentCoordinates(content.current.markers, content.current.polylines, content.current.rects),
    );

    const { width, height } = size.current;
    const aspect = width / height;
    if (coordinates.length === 0) {
      const center = {
        latitude: initialFocusLatitude ?? INITIAL_CENTER[0],
        longitude: initialFocusLongitude ?? INITIAL_CENTER[1],
        latitudeDelta: INITIAL_LATITUDE_DELTA,
        longitudeDelta: INITIAL_LATITUDE_DELTA,
      };
      const latitudeDelta = Math.max(center.latitudeDelta, INITIAL_LATITUDE_DELTA);

      map.animateToRegion(
        {
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta,
          longitudeDelta: latitudeDelta * aspect,
        },
        CAMERA_DURATION,
      );
      return;
    }

    const geometryRegion = regionForGeometry(coordinates);
    if (!geometryRegion) return;

    const availableWidth = Math.max(width - fitPadding * 2, 1);
    const availableHeight = Math.max(height - fitPadding * 2, 1);
    const latitudeDelta = Math.max(
      INITIAL_LATITUDE_DELTA,
      (geometryRegion.latitudeDelta * height) / availableHeight,
      (geometryRegion.longitudeDelta * height) / availableWidth,
    );

    map.animateToRegion(
      {
        ...geometryRegion,
        latitudeDelta,
        longitudeDelta: latitudeDelta * aspect,
      },
      CAMERA_DURATION,
    );
  }, [
    contentKey,
    fitPadding,
    hasLayout,
    initialFocusLatitude,
    initialFocusLongitude,
    isReady,
    isCameraDriven,
  ]);

  useEffect(() => {
    if (!isCameraDriven || !cameraToFollow || !isReady) return;

    mapRef.current?.animateToRegion(regionForCoordinate(cameraToFollow), CAMERA_DURATION);
  }, [isCameraDriven, cameraToFollow, isReady]);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      visibleRegion.current = {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };

      // O mesmo callback termina reenquadramentos automáticos e zooms manuais.
      // Só consumir o próximo toque quando esta região é o destino do zoom ativo;
      // caso contrário um `animateToRegion` do ajuste inicial poderia inverter a
      // sequência de botões.
      if (
        zoomAnimationRunning.current &&
        activeZoomRegion.current &&
        isRegionAtZoomTarget(region, activeZoomRegion.current)
      ) {
        const queuedRegion = queuedZoomRegion.current;
        if (queuedRegion) {
          queuedZoomRegion.current = null;
          activeZoomRegion.current = queuedRegion;
          mapRef.current?.animateToRegion(queuedRegion, CAMERA_DURATION);
        } else {
          zoomAnimationRunning.current = false;
          activeZoomRegion.current = null;
          requestedZoomRegion.current = null;
        }
      }

      const center: Coordinate = [region.latitude, region.longitude];
      const previous = lastSettledCamera.current;

      // Um metro de tolerância: a animação de 250 ms nunca assenta exatamente no
      // mesmo centro, e realimentar o efeito a cada quadro seria um laço de
      // animações que não termina.
      if (
        previous &&
        degreeDistanceInMeters(toLatLng(previous), toLatLng(center)) < CAMERA_SETTLED_TOLERANCE_M
      ) {
        return;
      }

      lastSettledCamera.current = center;
      onCameraSettled?.(center);

      // Invalida projeções intermediárias: as projeções completas abaixo usam a
      // região final e recalculam as alças do retângulo e os vértices do trajeto.
      pathProjectionSequence.current += 1;
      if (pathProjectionFrame.current !== null) {
        cancelAnimationFrame(pathProjectionFrame.current);
        pathProjectionFrame.current = null;
      }
      rectProjectionSequence.current += 1;
      if (rectProjectionFrame.current !== null) {
        cancelAnimationFrame(rectProjectionFrame.current);
        rectProjectionFrame.current = null;
      }

      // Só quando há o que reposicionar em pixel — alça de retângulo ou alças de
      // trajeto. Nas telas de consulta a câmera anda o tempo todo e este estado
      // mudaria sem nada que dependa dele. O aviso não depende de existir
      // `onCameraSettled`: quem assiste a câmera é a projeção, não o laço do GPS.
      if (editable || editablePath) setCameraTick((tick) => tick + 1);
    },
    [editable, editablePath, onCameraSettled],
  );

  /**
   * A câmera reporta a região durante o gesto, não só depois que o dedo solta.
   * Reprojeta as alças atuais em cada frame agrupado para acompanharem o pan em
   * tempo real; ao fim do movimento `cameraTick` atualiza a projeção das mesmas
   * alças persistentes.
   */
  const handleRegionChange = useCallback(
    (region: Region) => {
      visibleRegion.current = {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };

      if (editable) {
        const rect = editable.rect;
        const sequence = ++rectProjectionSequence.current;
        if (rectProjectionFrame.current !== null) {
          cancelAnimationFrame(rectProjectionFrame.current);
        }

        rectProjectionFrame.current = requestAnimationFrame(() => {
          rectProjectionFrame.current = null;
          const map = mapRef.current;
          if (!map) return;

          void Promise.all(
            rectCorners(rect).map((corner) => map.pointForCoordinate(toLatLng(corner))),
          )
            .then((points) => {
              if (sequence !== rectProjectionSequence.current) return;

              const [northWest, northEast, southEast, southWest] = points;
              if (!northWest || !northEast || !southEast || !southWest) return;

              setHandlePoints({ northWest, northEast, southEast, southWest });
            })
            .catch(() => undefined);
        });
      }

      const handles =
        editablePath && pathHandles?.pathId === editablePath.id ? pathHandles.handles : null;
      if (!editablePath || pathDragging || !handles || handles.length === 0) return;

      const sequence = ++pathProjectionSequence.current;
      if (pathProjectionFrame.current !== null) {
        cancelAnimationFrame(pathProjectionFrame.current);
      }

      pathProjectionFrame.current = requestAnimationFrame(() => {
        pathProjectionFrame.current = null;
        const map = mapRef.current;
        if (!map) return;

        void Promise.all(
          handles.map((handle) => {
            const coordinate = editablePath.geometry[handle.index];
            return coordinate
              ? map.pointForCoordinate(toLatLng(coordinate))
              : Promise.resolve(null);
          }),
        )
          .then((points) => {
            if (sequence !== pathProjectionSequence.current || pathDragging) return;

            setPathHandles({
              pathId: editablePath.id,
              handles: handles.map((handle, index) => ({
                ...handle,
                point: points[index] ?? handle.point,
              })),
            });
          })
          .catch(() => undefined);
      });
    },
    [editable, editablePath, pathDragging, pathHandles],
  );

  const handlePathDragStateChange = useCallback((dragging: boolean) => {
    pathDraggingRef.current = dragging;
    if (dragging) {
      pathProjectionSequence.current += 1;
      if (pathProjectionFrame.current !== null) {
        cancelAnimationFrame(pathProjectionFrame.current);
        pathProjectionFrame.current = null;
      }
    }
    setPathDragging(dragging);
  }, []);

  useEffect(
    () => () => {
      pathProjectionSequence.current += 1;
      if (pathProjectionFrame.current !== null) {
        cancelAnimationFrame(pathProjectionFrame.current);
        pathProjectionFrame.current = null;
      }
      rectProjectionSequence.current += 1;
      if (rectProjectionFrame.current !== null) {
        cancelAnimationFrame(rectProjectionFrame.current);
        rectProjectionFrame.current = null;
      }
    },
    [],
  );

  /**
   * `onLayout` dá o tamanho desenhado do mapa, e é ele que fecha o retângulo com a
   * região. Ele **não** dá a origem: `measureInWindow` é o único jeito de saber
   * onde o mapa está na janela, e ela é medida em `measureFrame`, na hora da queda
   * — ver `EventMapHandle.resolveDrop` para por que medir no `onLayout` não
   * bastava.
   */
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    size.current = { width, height };
    setHasLayout(true);
  }, []);

  /**
   * Amplia ou reduz o enquadramento com o mesmo fator do editor de áreas.
   *
   * O passo multiplica (reduzir) ou divide (aumentar) os `delta`s da região
   * visível atual pelo `ZOOM_FACTOR`, mantendo o centro — o equivalente em
   * `animateToRegion` do `zoomViewportAt` do `MapCanvas`. Os limites são os do
   * editor (~22 m a ~5,5 km): abaixo do piso os tiles já não têm mais detalhe, e
   * acima o botão de menos não viraria o mapa num hemisfério. A pinça do mapa
   * continua livre fora dessas portas.
   */
  const zoomBy = useCallback(
    (factor: number) => {
      if (isCameraDriven) return;
      const map = mapRef.current;
      const current = requestedZoomRegion.current ?? visibleRegion.current;
      const { width, height } = size.current;
      if (!map || !current || width <= 0 || height <= 0) return;

      const nextViewport = zoomViewportAt(
        {
          center: [current.latitude, current.longitude],
          latitudeDelta: current.latitudeDelta,
          longitudeDelta: current.longitudeDelta,
        },
        { x: width / 2, y: height / 2 },
        factor,
        { width, height },
      );
      const nextRegion: Region = {
        latitude: nextViewport.center[0],
        longitude: nextViewport.center[1],
        latitudeDelta: nextViewport.latitudeDelta,
        longitudeDelta: nextViewport.longitudeDelta,
      };

      // Um passo no limite não move a câmera e o MapView pode não emitir
      // `onRegionChangeComplete` para ele. Não ocupar a fila com esse no-op:
      // o próximo toque na direção oposta ainda precisa iniciar sua animação.
      if (isRegionAtZoomTarget(nextRegion, current)) return;

      requestedZoomRegion.current = nextRegion;
      if (zoomAnimationRunning.current) {
        queuedZoomRegion.current = nextRegion;
        return;
      }

      zoomAnimationRunning.current = true;
      activeZoomRegion.current = nextRegion;
      map.animateToRegion(nextRegion, CAMERA_DURATION);
    },
    [isCameraDriven],
  );

  useImperativeHandle(
    ref,
    () => ({
      resolveDrop: async (point) => {
        const frame = await measureFrame();
        if (!isInsideMap(point, frame)) return null;

        return coordinateAtDrop(point, frame);
      },
    }),
    [measureFrame],
  );

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      // Um toque que pertence à alça de edição nunca deve cair na lógica de toque
      // do mapa (por exemplo, a colocação de um ponto).
      if (pathDraggingRef.current) return;
      onMapPress?.([event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude]);
    },
    [onMapPress],
  );

  /**
   * O canto do retângulo, projetado no pixel onde ele aparece agora.
   *
   * `pointForCoordinate` é o caminho que a biblioteca oferece para ir de
   * coordenada para pixel — o inverso do `coordinateAtDrop`, que é nosso porque o
   * inverso da biblioteca não existe na versão fixada. Por isso as alças são
   * projeitadas aqui e não dentro do `Polygon`: o desenho é geográfico, e só a
   * camada de toque precisa de pixel.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !editable) {
      setHandlePoints(null);
      return;
    }

    // Antes do `onMapReady` a view nativa ainda não está registrada e
    // `pointForCoordinate` rejeita ("Invalid view returned from registry").
    if (!isReady) return;

    let active = true;

    void (async () => {
      const corners = rectCorners(editable.rect);
      const projected = await Promise.all(
        corners.map((corner) => map.pointForCoordinate(toLatLng(corner))),
      );

      if (!active) return;

      const [northWest, northEast, southEast, southWest] = projected;
      if (!northWest || !northEast || !southEast || !southWest) return;

      setHandlePoints({ northWest, northEast, southEast, southWest });
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [cameraTick, editable, isReady]);

  /**
   * Converte o ponto de arraste de uma alça em coordenada.
   *
   * É a mesma conta do toque no mapa, com a mesma medição: as alças ficam em
   * pixel e o retângulo é geográfico, então o gesto precisa da conversão — e
   * medir na hora é o que mantém a alça certa depois que a tela rola.
   */
  const resolveCoordinate = useCallback(
    async (point: ScreenPoint): Promise<Coordinate | null> => {
      const frame = await measureFrame();
      if (!isInsideMap(point, frame)) return null;

      return coordinateAtDrop(point, frame);
    },
    [measureFrame],
  );

  /**
   * O caminho contrário: coordenada de volta para o pixel onde ela aparece.
   *
   * É como a alça arrastada de um vértice segue o dedo. Sem isto, a alça ficaria
   * parada no ponto onde o gesto começou enquanto a linha dobrava sob o dedo.
   * Custo é uma projeção por `move`, não uma da geometria inteira: a projeção
   * inteira é justamente o que o congelamento evita.
   */
  const projectCoordinate = useCallback(
    async (coordinate: Coordinate): Promise<ScreenPoint | null> => {
      const map = mapRef.current;
      if (!map) return null;

      return await map.pointForCoordinate(toLatLng(coordinate));
    },
    [],
  );

  /**
   * Projeção dos alvos dos vértices editáveis: um subconjunto de alças (a
   * decimação é de `selectHandleIndices`, com o espaçamento
   * que a camada de interação exporta).
   *
   * A geometria do trajeto editável entra aqui como as alças do retângulo entram
   * no efeito delas: o desenho é geográfico, e só a camada de toque precisa de
   * pixel. Enquanto `pathDragging` é `true` o efeito não projeta nada — ele
   * mantém o que está na tela, que é o ponto do congelamento.
   */
  useEffect(() => {
    const map = mapRef.current;

    // Sem trajeto editável a camada de interação nem é renderizada, então os
    // alvos projetados ficam apenas até a próxima projeção — zerar estado aqui
    // dentro seria um `setState` síncrono no corpo do efeito.
    if (!editablePath) return;

    // Mesmo gate do retângulo: antes do `onMapReady` a view nativa não está
    // registrada e a projeção rejeita.
    if (!map || !isReady || pathDragging) return;

    let active = true;

    void (async () => {
      const cachedSelection = pathHandleSelection.current;
      const retainedSelection =
        cachedSelection?.pathId === editablePath.id &&
        cachedSelection.vertexCount === editablePath.geometry.length
          ? cachedSelection
          : null;
      const indicesToProject = retainedSelection
        ? retainedSelection.indices
        : editablePath.geometry.map((_coordinate, index) => index);
      const projected = await Promise.all(
        indicesToProject.map((index) =>
          map.pointForCoordinate(toLatLng(editablePath.geometry[index]!)),
        ),
      );

      if (!active) return;
      if (projected.some((point) => point === null)) return;

      const vertices = projected as ScreenPoint[];
      const selection = retainedSelection
        ? retainedSelection
        : retainPathHandleSelection(
            cachedSelection,
            editablePath.id,
            vertices,
            PATH_HANDLE_SPACING,
          );
      pathHandleSelection.current = selection;

      const handles = selection.indices.map((index, position) => ({
        index,
        point: vertices[retainedSelection ? position : index]!,
      }));

      setPathHandles({ pathId: editablePath.id, handles });
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [cameraTick, editablePath, isReady, pathDragging]);

  return (
    <View
      ref={containerRef}
      className={containerVariants({ className: className ?? 'flex-1' })}
      onLayout={handleLayout}
      testID={testID}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setIsReady(true)}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        // Reposicionamento é um modo exclusivo: enquanto há um trajeto editável,
        // toques no fundo não devem executar callbacks de criação/posicionamento.
        onPress={onMapPress === undefined || editablePath ? undefined : handleMapPress}
        // O mapa de um local interno é lido de cima: girar e inclinar não acrescenta
        // nada e a rotação da cena é justamente o tipo de movimento que mais causa
        // desconforto (RNF04). Zoom e arraste ficam liberados fora da edição de vértice.
        rotateEnabled={false}
        pitchEnabled={false}
        // Durante a edição, a alça é dona do gesto. Desligar pan/zoom nativos
        // evita que o mesmo toque também mova a câmera enquanto o vértice é movido.
        scrollEnabled={!pathDragging}
        zoomEnabled={!pathDragging}
        showsUserLocation={userPosition !== null}
        loadingEnabled
        loadingIndicatorColor={colors.primary}
        accessibilityLabel={accessibilityLabel}
      >
        {/*
          Fundo do OpenStreetMap no lugar da base da Apple/Google. Os tiles são
          opacos, então cobrem a base nativa nas duas plataformas; no iOS o
          `shouldReplaceMapContent` também evita que o MapKit desenhe a base por
          baixo. O `tileCacheMaxAge` acompanha os sete dias exigidos pela política
          do servidor quando o cliente não lê os headers.
        */}
        <UrlTile
          urlTemplate={OSM_TILE_URL_TEMPLATE}
          maximumNativeZ={OSM_TILE_MAX_ZOOM}
          shouldReplaceMapContent={Platform.OS === 'ios'}
          tileCacheMaxAge={TILE_CACHE_TTL_MS / 1000}
        />

        {polylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            coordinates={validCoordinates(polyline.geometry).map(toLatLng)}
            strokeColor={TONE_COLORS[polyline.tone ?? 'default']}
            strokeWidth={STROKE_WIDTH}
            lineCap="round"
            lineJoin="round"
            // `tappable` é o que liga o toque: sem ele o `react-native-maps`
            // ignora o `onPress` da polilinha. Ele só é pedido quando existe
            // callback, para não transformar todo trajeto em área de toque numa
            // tela em que ninguém quer selecionar.
            tappable={polyline.onPress !== undefined && !polyline.editable}
            onPress={polyline.editable ? undefined : polyline.onPress}
          />
        ))}

        {rects.map((item) => (
          <Polygon
            key={item.id}
            coordinates={rectCorners(item.rect).map(toLatLng)}
            fillColor={RECT_FILL_COLORS[item.tone ?? 'default']}
            strokeColor={TONE_COLORS[item.tone ?? 'default']}
            strokeWidth={RECT_STROKE_WIDTH}
          />
        ))}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={toLatLng(marker.coordinate)}
            title={marker.label}
            description={marker.description}
            anchor={{ x: 0.5, y: 0.5 }}
            // O marcador do rascunho tem estado — o tipo escolhido na paleta muda o
            // ícone — e sem `tracksViewChanges` o Android não redesenha o pino até
            // a próxima interação. Os marcadores de contexto são estáticos e ficam
            // com `false`, que é o que evita o redesenho a cada quadro.
            tracksViewChanges={marker.onPress !== undefined || marker.onDrag !== undefined}
            onPress={marker.onPress}
            draggable={marker.onDrag !== undefined}
            onDrag={
              marker.onDrag
                ? (event: MarkerDragEvent) =>
                    marker.onDrag?.([
                      event.nativeEvent.coordinate.latitude,
                      event.nativeEvent.coordinate.longitude,
                    ])
                : undefined
            }
            accessibilityLabel={describeMarker(marker)}
          >
            <MapPin tone={marker.tone} icon={marker.icon} />
          </Marker>
        ))}
      </MapView>

      {editable && editable.onResize ? (
        <RectHandleOverlay
          points={handlePoints}
          rect={editable.rect}
          resolveCoordinate={resolveCoordinate}
          onResize={editable.onResize}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}

      {editablePath?.onPreview && editablePath.onCommit ? (
        <PathEditOverlay
          geometry={editablePath.geometry}
          handles={
            pathHandles?.pathId === editablePath.id ? pathHandles.handles : EMPTY_PATH_HANDLES
          }
          resolveCoordinate={resolveCoordinate}
          projectCoordinate={projectCoordinate}
          onPreview={editablePath.onPreview}
          onCommit={editablePath.onCommit}
          onDragStateChange={handlePathDragStateChange}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}

      {!isCameraDriven ? (
        <View className="absolute right-2 top-2 flex-row gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
          <IconButton
            icon="plus"
            size="sm"
            accessibilityLabel="Aumentar o mapa"
            onPress={() => zoomBy(1 / ZOOM_FACTOR)}
            testID="map-zoom-in"
          />
          <IconButton
            icon="minus"
            size="sm"
            accessibilityLabel="Reduzir o mapa"
            onPress={() => zoomBy(ZOOM_FACTOR)}
            testID="map-zoom-out"
          />
        </View>
      ) : null}

      <Pressable
        className="absolute bottom-2 right-2 min-h-11 justify-center rounded-md border border-border bg-surface px-2 shadow-sm"
        onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}
        accessibilityRole="link"
        accessibilityLabel="Créditos do OpenStreetMap"
        testID="osm-attribution"
      >
        <Text variant="caption" tint="muted">
          © colaboradores do OpenStreetMap
        </Text>
      </Pressable>
    </View>
  );
});

const containerVariants = tv({
  base: 'overflow-hidden',
});

const styles = StyleSheet.create({
  map: { flex: 1 },
});

/**
 * Todos os pontos do mapa, de marcadores, trajetos e retângulos, na ordem em que
 * foram passados.
 *
 * Os **quatro** cantos do retângulo entram, e não só a posição do ícone: quem abre
 * um mapa só com um ponto salvo precisa que a caixa inteira caiba na tela. Uma
 * marcação de 8 m que nasce cortada na borda é o ponto que o organizador desenhou
 * aparecendo pela metade.
 */
function contentCoordinates(
  markers: MapMarker[],
  polylines: MapPolyline[],
  rects: MapRect[],
): MapGeometry {
  return [
    ...markers.map((marker) => marker.coordinate),
    ...polylines.flatMap((polyline) => polyline.geometry),
    ...rects.flatMap((item) => rectCorners(item.rect)),
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
 *
 * O retângulo entra pelo par de cantos, que é o que muda quando o organizador
 * arrasta a alça — contar pontos não serviria, porque o número de cantos é sempre
 * quatro, e quem redesenha a cada arraste perde o lugar na tela.
 */
function describeContent(markers: MapMarker[], polylines: MapPolyline[], rects: MapRect[]): string {
  return [
    ...markers.map((marker) => `${marker.id}:${marker.coordinate[0]},${marker.coordinate[1]}`),
    ...polylines.map((polyline) =>
      // O trajeto em edição fica de fora: o rascunho muda a cada quadro do
      // arraste, e contá-lo aqui dispararia o reenquadramento debaixo do dedo
      // de quem está ajustando — a mesma razão de `content` não redesenhar a
      // câmera a cada render.
      polyline.editable
        ? `${polyline.id}:editing`
        : `${polyline.id}:${polyline.geometry.length}:${describeEndpoints(polyline)}`,
    ),
    ...rects.map((item) => `${item.id}:${describeRect(item.rect)}`),
  ].join('|');
}

/** Os dois cantos de um retângulo em texto, para a identidade do conteúdo. */
function describeRect(rect: PoiRect): string {
  return [rect.northEast[0], rect.northEast[1], rect.southWest[0], rect.southWest[1]].join(',');
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

/** A conclusão pertence à animação de zoom, e não a outro reenquadramento? */
function isRegionAtZoomTarget(region: Region, target: Region): boolean {
  const centerDistance = degreeDistanceInMeters(
    toLatLng([region.latitude, region.longitude]),
    toLatLng([target.latitude, target.longitude]),
  );
  const latitudeTolerance = Math.max(target.latitudeDelta * 0.1, 0.00001);
  const longitudeTolerance = Math.max(target.longitudeDelta * 0.1, 0.00001);

  return (
    centerDistance <= 2 &&
    Math.abs(region.latitudeDelta - target.latitudeDelta) <= latitudeTolerance &&
    Math.abs(region.longitudeDelta - target.longitudeDelta) <= longitudeTolerance
  );
}

import { useCallback, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { DeleteAction } from '@/components/delete-action';
import { EventMap } from '@/components/map';
import type { EventMapHandle } from '@/components/map';
import { PoiPalette } from '@/components/poi-palette';
import { Alert, Button, Card, Input, Text } from '@/components/ui';
import type { PoiType, PointOfInterest } from '@/data/types';
import type { Coordinate } from '@/types/coordinates';
import type { MapMarker, MapPolyline, MapRect } from '@/types/map';
import type { MapGestureTouchHandlers } from '@/hooks/useMapGestureNavigation';
import type { ScreenPoint } from '@/utils/dropCoordinate';
import { toErrorMessage } from '@/utils/errors';
import {
  CENTER_ANCHOR,
  anchorToPosition,
  dragIconTo,
  rectFromCenter,
  type PoiAnchor,
  type PoiRect,
} from '@/utils/poiAnchor';
import { poiIcon } from '@/utils/poiIcons';

const NAME_MAX_LENGTH = 120;

/** Identificador do marcador e do retângulo da posição escolhida, antes de salvar. */
const DRAFT_ID = 'poi-draft';

/** Formulário para editar um ponto de interesse já cadastrado. */
export type PoiFormValues = {
  name: string;
  type: PoiType;
  /** A caixa que marca o ponto; `null` enquanto ninguém escolheu o lugar. */
  rect: PoiRect | null;
  /** Onde o ícone está dentro da caixa. */
  anchor: PoiAnchor;
};

/**
 * O que o formulário grava.
 *
 * **Não leva `description` nem `accessibilityInfo`.** A Sprint 7 tirou os dois da
 * tela, e mandar `null` no `PATCH` **apagava** o que já estivesse gravado — o
 * `UpdatePoiDto` aceita os dois como opcionais, então omitir deixa o valor no banco
 * intocado. O `compact` do `httpRepository` já tira `undefined`, então omitir aqui
 * é o mesmo que não mandar o campo.
 *
 * `name` é o nome **digitado**, e não o que vai para o banco: o fallback para o
 * tipo acontece no `handleSubmit`, que é o único lugar que sabe se o campo ficou
 * vazio.
 */
export type PoiFormSubmission = {
  name: string;
  type: PoiType;
  rect: PoiRect;
  anchor: PoiAnchor;
};

type PoiFormProps = {
  /** Ponto que está sendo editado; ausente na criação. */
  poi?: PointOfInterest;
  /** Pontos já existentes, para dar contexto ao mapa onde a posição é escolhida. */
  contextMarkers?: MapMarker[];
  contextPolylines?: MapPolyline[];
  submitLabel: string;
  submitLoadingLabel: string;
  mapTouchHandlers: MapGestureTouchHandlers;
  onSubmit: (values: PoiFormSubmission) => Promise<void>;
  /** Monta a ação de apagar; só o editor passa, porque só ele tem o que apagar. */
  onDelete?: (poi: PointOfInterest) => Promise<void>;
};

type PoiFormErrors = Partial<Record<'name' | 'rect', string>>;

const EMPTY_VALUES: PoiFormValues = {
  name: '',
  type: 'Entrada',
  rect: null,
  anchor: CENTER_ANCHOR,
};

/**
 * Formulário do ponto de interesse (Sprint 7).
 *
 * **O que se grava é o retângulo e a âncora, nunca a posição.** O retângulo é a
 * marcação que o organizador desenha no mapa e o ícone fica ancorado dentro
 * dele; a API deriva a posição absoluta dos dois, e mandar os três deixaria o
 * banco aceitar uma posição que não corresponde à caixa — o estado que ninguém
 * quis. Ver `utils/poiAnchor.ts` e `backend/src/pois/poi-anchor.ts`.
 *
 * **A caixa e o ícone têm gestos separados, e os dois andam juntos.** O retângulo
 * nasce com o lado padrão quando o ponto é solto no mapa (alguns metros), e quem
 * quiser uma marcação maior ou menor arrasta uma das alças de canto. Arrastar o
 * ícone move o ponto inteiro: a caixa vai junto, porque um ícone fora da caixa é
 * um estado que a interface não consegue explicar. Redimensionar a caixa, por
 * outro lado, move o ícone **dentro** dela, mantendo a âncora — é isso que a
 * âncora existe para fazer.
 *
 * **Três portas para a mesma escolha, e todas ficam.** Arrastar um ícone da paleta
 * até o lugar, tocar no tipo e depois tocar no mapa, e tocar no ponto já colocado
 * e depois tocar no destino. A terceira depende de `onPress` do marcador existir
 * só para ligar o "depois tocar no destino", e ela é o caminho de quem não
 * arrasta: leitor de tela não arrasta, e arraste é o gesto mais difícil para quem
 * tem tremor (RNF04).
 *
 * **O nome é opcional.** O tipo já diz o que o ponto é — "Banheiro acessível" não
 * precisa de nome — e quem não nomeou continua reconhecendo o ponto pelo ícone e
 * pelo tipo. Quando o nome fica vazio, o que vai para a API é o próprio tipo,
 * para o `name` continuar preenchido no banco: um ponto sem nome é ausência de
 * dado, e o banco tem `name` obrigatório. O tipo é a melhor resposta disponível,
 * não um título inventado.
 *
 * **A descrição e a informação de acessibilidade saem da UI desta sprint.** Elas
 * continuam existindo no domínio e na API — a Sprint 10 é a dos atributos de
 * acessibilidade, e o formulário daquela hora vai preencher o que está no banco —
 * mas a Sprint 7 entrega o cadastro do ponto. O que o organizador sabe sobre
 * acessibilidade é dado dele e não é verificado pelo app (PRD §19); nada aqui
 * promete que o ponto é acessível.
 *
 * O mapa também desenha o que já existe — os outros pontos e os caminhos — porque
 * a marcação é escolhida em relação ao que já foi mapeado.
 */
export function PoiForm({
  poi,
  contextMarkers = [],
  contextPolylines = [],
  submitLabel,
  submitLoadingLabel,
  mapTouchHandlers,
  onSubmit,
  onDelete,
}: PoiFormProps) {
  const [values, setValues] = useState<PoiFormValues>(() =>
    poi
      ? {
          // `name` nunca chega vazio da API — o que fica vazio vira o tipo lá no
          // backend — mas um ponto antigo sem nome ainda pode vir `''`, e o campo
          // não pode mostrar o fallback como se o organizador tivesse digitado.
          name: poi.name,
          type: poi.type,
          rect: poi.rect,
          anchor: poi.anchor,
        }
      : EMPTY_VALUES,
  );
  const [errors, setErrors] = useState<PoiFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Se o ponto já colocado está esperando um toque no destino.
   *
   * Sem este estado, tocar no ponto e depois tocar no mapa seria indistinguível de
   * soltar um ponto novo no lugar: as duas coisas terminam num toque no mapa e a
   * tela não teria como saber o que significou. O texto de ajuda muda junto, para
   * o toque seguinte não ser adivinhado.
   *
   * O estado **não decide** se o toque no fundo move o ponto — `handleMapPress`
   * move sempre que há marcação. Ele decide se a tela *diz* que está esperando o
   * destino, porque é o texto que transforma um toque solto em "agora eu sei o que
   * vai acontecer". Quem não lê o texto ainda tem o gesto, que é o que importa.
   */
  const [moving, setMoving] = useState(false);

  /** O mapa responde "onde caiu este ponto?" — é o `EventMap` que sabe converter. */
  const mapHandle = useRef<EventMapHandle>(null);

  const setField = useCallback(
    <K extends keyof PoiFormValues>(field: K, value: PoiFormValues[K]) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    },
    [],
  );

  const validate = (): PoiFormErrors => {
    const next: PoiFormErrors = {};

    if (values.name.trim().length > NAME_MAX_LENGTH) {
      next.name = `O nome do ponto deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
    }

    if (!values.rect) {
      next.rect = 'Escolha o tipo e arraste o ícone até o lugar, ou toque no mapa.';
    }

    return next;
  };

  const handleSubmit = async () => {
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0 || !values.rect) {
      return;
    }

    setSaving(true);
    setSubmitError(null);

    const name = values.name.trim();

    try {
      await onSubmit({
        // Nome opcional na interface, obrigatório no banco: quando o organizador
        // não deu nome, o tipo é o nome. É o que a lista e o marcador mostram
        // quando o ponto é reconhecido pelo que ele é.
        name: name || values.type,
        type: values.type,
        rect: values.rect,
        anchor: values.anchor,
      });
    } catch (error) {
      setSubmitError(toErrorMessage(error, 'Não foi possível salvar o ponto de interesse.'));
      setSaving(false);
    }
  };

  /**
   * Onde o ícone solto virou coordenada, ou `null` quando a queda não pôde ser
   * convertida.
   *
   * A medição mora no `EventMap` porque é ele que conhece o próprio desenho; o
   * formulário só entrega o ponto e recebe a resposta. Não há `measureInWindow`
   * aqui: medir de fora exigiria a `View` interna do mapa, e a tela passaria a
   * conhecer a geometria que é do componente.
   */
  const resolveDrop = useCallback(
    (point: ScreenPoint) => mapHandle.current?.resolveDrop(point) ?? Promise.resolve(null),
    [],
  );

  /**
   * Coloca uma marcação nova no lugar, com o ícone no meio.
   *
   * A âncora volta ao centro **sempre** que uma marcação nasce, e não só na
   * primeira: quem já tinha um ponto com o ícone na borda e arrasta outro ícone
   * para o mapa espera que o ponto novo comece centrado, e não que herde a
   * âncora do ponto anterior — a âncora é da marcação, e a marcação é nova.
   *
   * É um `useCallback` separado porque as três portas de criação (paleta, toque no
   * mapa, toque no tipo seguido de toque no mapa) escrevem a mesma coisa, e
   * escrever `rectFromCenter` + `CENTER_ANCHOR` em cada uma faria a próxima
   * mudança de comportamento aparecer em três lugares.
   */
  const place = useCallback(
    (coordinate: Coordinate) => {
      setValues((current) => ({
        ...current,
        rect: rectFromCenter(coordinate),
        anchor: CENTER_ANCHOR,
      }));
      setErrors((current) => ({ ...current, rect: undefined }));
    },
    [setErrors, setValues],
  );

  /**
   * O ícone solto sobre o mapa.
   *
   * A paleta já resolveu o ponto: `coordinate` é `null` quando o dedo soltou fora
   * do retângulo do mapa, ou quando o mapa ainda não tem tamanho suficiente para
   * converter. Nos dois casos o tipo **continua selecionado**: escolher o tipo é
   * uma intenção que vale mesmo sem posição, e perder a seleção porque o dedo
   * caiu fora faria a pessoa escolher de novo.
   *
   * Por isso o tipo é aplicado **antes** do `if`: a intenção de escolher sobrevive
   * a uma queda que não virou ponto.
   */
  const handleDrop = useCallback(
    (type: PoiType, coordinate: Coordinate | null) => {
      setField('type', type);

      if (coordinate) {
        place(coordinate);
        setMoving(false);
      }
    },
    [place, setField],
  );

  const handleSelectType = useCallback(
    (type: PoiType) => {
      setField('type', type);
    },
    [setField],
  );

  /**
   * Toque no fundo do mapa, com duas leituras.
   *
   * Sem ponto nenhum, o toque **cria** a marcação: uma caixa de lado padrão em
   * volta do lugar tocado, com o ícone no meio. Com ponto já colocado e à espera
   * de destino, o toque **move** o ponto — a caixa inteira vai para lá.
   *
   * As duas coisas escrevem a mesma coisa (`rect`), que é o que o formulário
   * grava. Não há "criar" e "mover" como estados diferentes do ponto: para quem
   * usa a tela, é a mesma pergunta — onde fica o ponto — respondida de duas
   * maneiras.
   */
  const handleMapPress = useCallback(
    (coordinate: Coordinate) => {
      if (!values.rect) {
        place(coordinate);
        return;
      }

      const { rect, anchor } = dragIconTo(values.rect, coordinate);

      setValues((current) => ({ ...current, rect, anchor }));
      setErrors((current) => ({ ...current, rect: undefined }));
      setMoving(false);
    },
    [place, values.rect],
  );

  /** Arrastar o ícone no mapa é a mesma coisa que tocar nele e no destino. */
  const handleDrag = useCallback(
    (coordinate: Coordinate) => {
      setValues((current) => {
        if (!current.rect) return current;

        const { rect, anchor } = dragIconTo(current.rect, coordinate);
        return { ...current, rect, anchor };
      });
      setMoving(false);
    },
    [],
  );

  /** Tocar no ponto colocado liga o "toque no destino"; não o move sozinho. */
  const handlePressDraft = useCallback(() => {
    setMoving(true);
  }, []);

  const iconPosition = values.rect ? anchorToPosition(values.rect, values.anchor) : null;

  const draftMarker: MapMarker | null = iconPosition
    ? {
        id: DRAFT_ID,
        coordinate: iconPosition,
        label: values.name.trim() || values.type,
        description: values.type,
        icon: poiIcon(values.type),
        tone: 'highlight',
        onPress: handlePressDraft,
        onDrag: handleDrag,
      }
    : null;

  const draftRect: MapRect | null = values.rect
    ? {
        id: DRAFT_ID,
        rect: values.rect,
        tone: 'highlight',
        editable: true,
        onResize: (rect) => setField('rect', rect),
      }
    : null;

  // O ponto em edição sai do contexto: ele já é o marcador do rascunho, e o
  // mesmo `id` duas vezes no `MapView` faz o pino reaproveitar o do outro.
  const otherMarkers = useMemo(
    () => contextMarkers.filter((marker) => marker.id !== poi?.id),
    [contextMarkers, poi?.id],
  );

  const markers = draftMarker ? [...otherMarkers, draftMarker] : otherMarkers;
  const rects = draftRect ? [draftRect] : [];

  const rectHint = moving
    ? 'Toque no lugar novo para levar o ponto e a marcação até lá.'
    : values.rect
      ? 'Toque no mapa para mover a marcação, ou arraste as alças para mudar o tamanho.'
      : 'Nenhuma marcação ainda.';

  return (
    <>
      <Card>
        <Text variant="subheading">Marcação no mapa</Text>
        <Text variant="caption">
          Toque no tipo e depois toque no lugar, ou arraste um ícone da lista até o mapa. O que já
          foi mapeado aparece como contexto.
        </Text>

        <View className="h-72" {...mapTouchHandlers}>
          <EventMap
            ref={mapHandle}
            className="h-full rounded-lg border border-border"
            markers={markers}
            polylines={contextPolylines}
            rects={rects}
            onMapPress={handleMapPress}
            accessibilityLabel={
              values.rect
                ? `Mapa da navegação. ${values.type} marcado, com retângulo de ajuste no contorno.`
                : 'Mapa da navegação. Escolha o tipo e toque no mapa para marcar o ponto.'
            }
            testID="poi-position-map"
          />
        </View>

        <Text variant="caption" tint={errors.rect ? 'danger' : 'muted'}>
          {errors.rect ?? rectHint}
        </Text>
      </Card>

      <Card>
        <PoiPalette
          selectedType={values.type}
          onSelectType={handleSelectType}
          onDrop={handleDrop}
          resolveDrop={resolveDrop}
        />
      </Card>

      <Card>
        <Input
          label="Nome do ponto"
          isOptional
          value={values.name}
          onChangeText={(value) => setField('name', value)}
          placeholder={values.type}
          autoCapitalize="sentences"
          returnKeyType="done"
          errorText={errors.name}
          testID="poi-name"
        />

        <Text variant="caption">
          Opcional. Sem nome, o ponto aparece pelo tipo e pelo ícone — {values.type}.
        </Text>
      </Card>

      {submitError ? <Alert tone="error" description={submitError} /> : null}

      <View className="gap-3">
        <Button
          label={submitLabel}
          loading={saving}
          loadingLabel={submitLoadingLabel}
          onPress={() => void handleSubmit()}
          disabled={values.rect === null}
          testID="submit-poi"
        />

        <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
      </View>

      {poi && onDelete ? (
        <DeleteAction
          subject="o ponto de interesse"
          name={poi.name}
          confirmLoadingLabel="Apagando o ponto…"
          errorFallback="Não foi possível apagar o ponto de interesse."
          onDelete={() => onDelete(poi)}
          onDeleted={() => router.back()}
          testID="delete-poi"
        />
      ) : null}
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getCurrentSample,
  requestLocationPermission,
  watchPosition,
} from '@/services/locationService';
import type { Coordinates, LocationSample } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';
import { evaluateSample, gpsSignalFrom, type GpsSignal } from '@/utils/recording';

/** Momento da gravação, do pedido de permissão até o trajeto pronto para revisar. */
export type RecordingStatus =
  /** Nada gravado; a tela mostra o convite a começar. */
  | 'idle'
  /** Pedindo permissão e ligando o GPS. */
  | 'starting'
  /** Recebendo posição. */
  | 'recording'
  /** Trajeto fechado, só para leitura até descartar ou salvar. */
  | 'finished';

/** Erro ou aviso da gravação, com o texto que a tela mostra em pt-BR. */
export type RecordingIssue = {
  tone: 'warning' | 'error';
  title: string;
  description: string;
};

/** De quanto em quanto tempo o tempo decorrido é atualizado, em milissegundos. */
const TICK_MS = 500;

/**
 * Gravação de caminho: a permissão, o GPS e o trajeto que sai do passeio.
 *
 * Toda a máquina de estado fica aqui e a tela só desenha — o que a Sprint 4
 * entrega é o `Path.geometry` em memória, e a Sprint 5 grava. Por isso nada aqui
 * fala com a rede: a gravação não espera nem consulta a API, que é o que faz o
 * RNF05 (perda temporária de conexão não interrompe o mapeamento) valer sem
 * camada de fila.
 *
 * A assinatura do GPS vive para a duração da gravação e é removida em `finish`,
 * em `discard` e no desmonte da tela. Uma gravação esquecida com a tela aberta
 * continuaria consumindo bateria e, em iOS, seria encerrada pelo sistema — por
 * isso a gravação é feita com a tela na frente, e a tela avisa isso.
 *
 * Não há pausa: quem percorre um pavilhão não precisa pausar o trajeto, e a pausa
 * que existia no protótipo só desligava o cronômetro — o GPS continuava gravando
 * por baixo. Interromper é `finish`, e o que não serve é `discard`.
 */
export function usePathRecording() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [geometry, setGeometry] = useState<MapGeometry>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [discardedCount, setDiscardedCount] = useState(0);
  const [signal, setSignal] = useState<GpsSignal | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);
  const [isPrecise, setIsPrecise] = useState<boolean | null>(null);
  const [issue, setIssue] = useState<RecordingIssue | null>(null);

  /** Última leitura aceita: é contra ela que a próxima é medida. */
  const lastSample = useRef<LocationSample | null>(null);
  const startedAt = useRef<number | null>(null);
  const unwatch = useRef<(() => void) | null>(null);

  /**
   * Geração da tentativa.
   *
   * Pedir permissão e ligar o GPS leva segundos, e a tela pode sair nesse meio
   * tempo. Sem esta contagem, a assinatura que a tentativa abandonada criou
   * ficaria viva sem dono — gastando bateria até o app fechar. Cada `start`
   * guarda o número e só segue adiante se ainda for o atual.
   */
  const attempt = useRef(0);

  const stopWatching = useCallback(() => {
    unwatch.current?.();
    unwatch.current = null;
  }, []);

  /**
   * Uma leitura do GPS: filtra, e o que passa vira ponto do trajeto.
   *
   * A distância soma o trecho aceito, e só o trecho aceito: o total mostrado é o
   * comprimento do trajeto desenhado. Ver `evaluateSample` para por que a leitura
   * descartada não entra nele.
   *
   * Só o último ponto *aceito* vira referência do filtro de salto: se a referência
   * fosse o ponto rejeitado, o próximo passo compararia contra um lugar onde
   * ninguém nunca esteve.
   */
  const handlePosition = useCallback((sample: LocationSample) => {
    const evaluation = evaluateSample(lastSample.current, sample);

    setCurrentPosition(sample);
    setAccuracy(sample.accuracy);
    setSignal(gpsSignalFrom(sample.accuracy));

    if (!evaluation.accepted) {
      setDiscardedCount((current) => current + 1);
      return;
    }

    lastSample.current = sample;
    setGeometry((current) => [...current, evaluation.coordinate]);
    setDistanceMeters((current) => current + evaluation.distanceMeters);
  }, []);

  /** O GPS falhou no meio da caminhada: avisa e deixa a gravação seguir. */
  const handleError = useCallback((reason: string) => {
    setIssue({
      tone: 'warning',
      title: 'Sinal do GPS instável',
      description: reason || 'A leitura de posição falhou e o app vai tentar de novo.',
    });
  }, []);

  /** Zera o trajeto antes de uma gravação nova; o descarte usa a mesma base. */
  const reset = useCallback(() => {
    stopWatching();
    attempt.current += 1;
    lastSample.current = null;
    startedAt.current = null;
    setStatus('idle');
    setGeometry([]);
    setDistanceMeters(0);
    setElapsedMs(0);
    setDiscardedCount(0);
    setSignal(null);
    setAccuracy(null);
    setCurrentPosition(null);
    setIsPrecise(null);
    setIssue(null);
  }, [stopWatching]);

  const start = useCallback(async () => {
    setStatus('starting');
    setIssue(null);

    const current = attempt.current + 1;
    attempt.current = current;

    try {
      const state = await requestLocationPermission();

      if (attempt.current !== current) return;

      if (!state.servicesEnabled) {
        setStatus('idle');
        setIssue({
          tone: 'error',
          title: 'Localização desligada',
          description: 'Ligue a localização do aparelho para registrar o caminho.',
        });
        return;
      }

      if (state.permission !== 'granted') {
        setStatus('idle');
        setIssue({
          tone: 'error',
          title: 'Permissão de localização negada',
          description:
            'O app precisa da sua localização para registrar o caminho. A permissão pode ser autorizada nos ajustes do aparelho.',
        });
        return;
      }

      // `reduced` no iOS é posição aproximada: gravar assim produziria um trajeto
      // do tamanho da cidade. A gravação segue, e a tela avisa que o dado é
      // grosseiro — quem decide parar é o organizador.
      setIsPrecise(state.isPrecise);

      lastSample.current = null;
      startedAt.current = Date.now();
      setGeometry([]);
      setDistanceMeters(0);
      setElapsedMs(0);
      setDiscardedCount(0);

      // A primeira posição vem antes da assinatura para o trajeto nascer com um
      // ponto: se ela falhar, a gravação começa assim mesmo e o primeiro ponto
      // chega pela assinatura.
      try {
        handlePosition(await getCurrentSample());
      } catch {
        // Sem ponto inicial não há erro: o GPS entrega o primeiro em segundos.
      }

      const stopWatchingNow = await watchPosition(handlePosition, handleError);

      if (attempt.current !== current) {
        stopWatchingNow();
        return;
      }

      unwatch.current = stopWatchingNow;
      setStatus('recording');
    } catch (error) {
      reset();
      setIssue({
        tone: 'error',
        title: 'Não foi possível iniciar a gravação',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível ligar o GPS. Tente de novo em instantes.',
      });
    }
  }, [handleError, handlePosition, reset]);

  /** Fecha o trajeto. A Sprint 5 troca o resumo pelo `POST /paths`. */
  const finish = useCallback(() => {
    stopWatching();

    if (startedAt.current !== null) {
      setElapsedMs(Date.now() - startedAt.current);
    }

    setStatus('finished');
  }, [stopWatching]);

  useEffect(() => {
    if (status !== 'recording') return;

    const timer = setInterval(() => {
      if (startedAt.current !== null) {
        setElapsedMs(Date.now() - startedAt.current);
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [status]);

  // Sair da tela abandona a tentativa: o `attempt` invalida o que ainda estiver
  // chegando da permissão, e a assinatura que ela vier a criar é removida na hora.
  useEffect(() => {
    return () => {
      attempt.current += 1;
      stopWatching();
    };
  }, [stopWatching]);

  return {
    status,
    geometry,
    distanceMeters,
    elapsedMs,
    discardedCount,
    signal,
    accuracy,
    currentPosition,
    isPrecise,
    issue,
    start,
    finish,
    discard: reset,
  };
}

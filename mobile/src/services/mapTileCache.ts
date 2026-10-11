import { Directory, File, Paths } from 'expo-file-system';

import type { MapTile } from '@/utils/tiles';
import { isTileCacheFresh } from '@/utils/tiles';

type TileSource = Pick<MapTile, 'zoom' | 'x' | 'y' | 'href'>;

/** Identificação estável do app exigida para solicitações ao servidor de tiles OSM. */
const TILE_USER_AGENT = 'AccessEventMobile/1.0';
const TILE_CACHE_DIRECTORY_NAME = 'accessevent-osm-tiles';

const inFlight = new Map<string, Promise<string | null>>();
let cacheDirectoryPromise: Promise<Directory> | null = null;

/**
 * Entrega o URI local do tile, baixando apenas quando ele está visível e não há
 * uma cópia recente no cache do app. A política do servidor público do OSM não
 * permite prefetch/offline; este cache serve somente para reutilizar tiles vistos
 * recentemente e evita pedir a mesma imagem a cada abertura/pan.
 */
export function cachedMapTileUri(tile: TileSource): Promise<string | null> {
  const key = tileKey(tile);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = loadTile(tile).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

async function loadTile(tile: TileSource): Promise<string | null> {
  const directory = await getCacheDirectory();
  const name = `${tile.zoom}-${tile.x}-${tile.y}.png`;
  const cachedFile = new File(directory, name);
  const cachedIsFresh =
    cachedFile.exists && isTileCacheFresh(cachedFile.lastModified, Date.now());

  if (cachedIsFresh) return cachedFile.uri;

  const downloadFile = new File(directory, `${name}.download`);
  if (downloadFile.exists) downloadFile.delete();

  try {
    const downloaded = await File.downloadFileAsync(tile.href, downloadFile, {
      idempotent: true,
      headers: { 'User-Agent': TILE_USER_AGENT },
    });

    if (!downloaded.exists || downloaded.size === 0) {
      downloaded.delete();
      return cachedIsFresh ? cachedFile.uri : null;
    }

    await downloaded.move(cachedFile, { overwrite: true });
    return cachedFile.exists && cachedFile.size > 0 ? cachedFile.uri : null;
  } catch {
    if (downloadFile.exists) downloadFile.delete();
    return cachedIsFresh ? cachedFile.uri : null;
  }
}

function getCacheDirectory(): Promise<Directory> {
  if (!cacheDirectoryPromise) {
    cacheDirectoryPromise = Promise.resolve().then(() => {
      const directory = new Directory(Paths.cache, TILE_CACHE_DIRECTORY_NAME);
      if (!directory.exists) directory.create({ intermediates: true });

      // Remove tiles expired from the local cache so panning through many venues
      // cannot grow the cache indefinitely.
      const now = Date.now();
      for (const entry of directory.list()) {
        if (entry instanceof File && !isTileCacheFresh(entry.lastModified, now)) {
          entry.delete();
        }
      }

      return directory;
    }).catch((error: unknown) => {
      cacheDirectoryPromise = null;
      throw error;
    });
  }

  return cacheDirectoryPromise;
}

function tileKey(tile: Pick<MapTile, 'zoom' | 'x' | 'y'>): string {
  return `${tile.zoom}/${tile.x}/${tile.y}`;
}

import { registerDecorator } from 'class-validator';

import { isPoiAnchor, isPoiRect } from '../pois/poi-anchor.js';

const INVALID_RECT = 'O retângulo deve ter os cantos northeast e southwest em [latitude, longitude].';
const INVALID_ANCHOR = 'A âncora deve ter u e v entre 0 e 1.';

/** Valida o retângulo do POI com `isPoiRect`. */
export function IsPoiRect() {
  return function validatePoiRect(
    target: object,
    propertyName: string | symbol,
  ): void {
    registerDecorator({
      name: 'isPoiRect',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: {},
      validator: {
        validate: (value: unknown) => isPoiRect(value),
        defaultMessage: () => INVALID_RECT,
      },
    });
  };
}

/** Valida a âncora do POI com `isPoiAnchor`. */
export function IsPoiAnchor() {
  return function validatePoiAnchor(
    target: object,
    propertyName: string | symbol,
  ): void {
    registerDecorator({
      name: 'isPoiAnchor',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: {},
      validator: {
        validate: (value: unknown) => isPoiAnchor(value),
        defaultMessage: () => INVALID_ANCHOR,
      },
    });
  };
}

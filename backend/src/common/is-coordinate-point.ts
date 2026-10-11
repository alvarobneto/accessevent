import { registerDecorator } from 'class-validator';

import { isCoordinateTuple } from './is-coordinate.js';

const INVALID_MESSAGE = 'O ponto deve ser um par [latitude, longitude].';

export function IsCoordinatePoint() {
  return function validateCoordinate(
    target: object,
    propertyName: string | symbol,
  ): void {
    registerDecorator({
      name: 'isCoordinatePoint',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: {},
      validator: {
        validate: (value: unknown) => isCoordinateTuple(value),
        defaultMessage: () => INVALID_MESSAGE,
      },
    });
  };
}

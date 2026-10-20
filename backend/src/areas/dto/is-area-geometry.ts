import { registerDecorator } from 'class-validator';

import { areaGeometryMessage, checkAreaGeometry } from '../area-geometry.js';

export function IsAreaGeometry() {
  return function validateAreaGeometry(target: object, propertyName: string | symbol): void {
    registerDecorator({
      name: 'isAreaGeometry',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [],
      options: {},
      validator: {
        validate: (value: unknown) => checkAreaGeometry(value) === null,
        defaultMessage: (args) => {
          const problem = checkAreaGeometry(args?.value);
          return areaGeometryMessage(problem ?? 'invalid-coordinate');
        },
      },
    });
  };
}

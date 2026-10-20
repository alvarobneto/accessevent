import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { IsAreaGeometry } from './is-area-geometry.js';
import { IsBoundedName } from '../../common/is-bounded-name.js';
import type { AreaGeometry } from '../area.entity.js';
import { AreaTypeValues } from '../area.entity.js';

export class CreateAreaDto {
  @IsBoundedName('da área', 120)
  name: string;

  @IsString()
  @IsIn(AreaTypeValues)
  type: (typeof AreaTypeValues)[number];

  @IsAreaGeometry()
  geometry: AreaGeometry;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string;
}

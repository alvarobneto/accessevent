import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { IsAreaGeometry } from './is-area-geometry.js';
import { IsBoundedName } from '../../common/is-bounded-name.js';
import type { AreaGeometry, AreaType } from '../area.entity.js';
import { AreaTypeValues } from '../area.entity.js';

export class UpdateAreaDto {
  @IsOptional()
  @IsBoundedName('da área', 120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(AreaTypeValues)
  type?: AreaType;

  @IsOptional()
  @IsAreaGeometry()
  geometry?: AreaGeometry;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string | null;
}

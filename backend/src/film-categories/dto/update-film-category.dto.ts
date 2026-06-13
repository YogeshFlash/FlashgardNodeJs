import { PartialType } from '@nestjs/mapped-types';
import { CreateFilmCategoryDto } from './create-film-category.dto';

export class UpdateFilmCategoryDto extends PartialType(CreateFilmCategoryDto) {}

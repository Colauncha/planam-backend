import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NoteType } from '@planam/shared';

export class AddBookingNoteDto {
  @IsEnum(NoteType)
  type: NoteType;

  @IsNotEmpty()
  @IsString()
  content: string;
}

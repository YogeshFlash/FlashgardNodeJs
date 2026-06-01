import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('files')
export class FilesController {
  @Post('upload-asset')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const uploadPath = join(process.cwd(), 'uploads', 'assets');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadFile(@UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
      ],
    }),
  ) file: Express.Multer.File) {
    console.log('[FilesController] Received file:', file?.originalname, 'mimetype:', file?.mimetype);
    
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const publicUrl = `/uploads/assets/${file.filename}`;
    console.log('[FilesController] File saved successfully at:', publicUrl);
    // Return the public URL
    return {
      url: publicUrl
    };
  }
}

import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CONFIG } from '../app-config';

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

  @Post('upload-catalog')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCatalog(@UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
      ],
    }),
  ) file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = extname(file.originalname);
    const filename = `${uniqueSuffix}${fileExt}`;

    // Check if S3 credentials are configured
    const s3Config = CONFIG.S3;
    if (s3Config.ACCESS_KEY_ID && s3Config.SECRET_ACCESS_KEY) {
      try {
        console.log(`[FilesController] Uploading ${filename} to AWS S3...`);
        const s3 = new S3Client({
          region: s3Config.REGION,
          credentials: {
            accessKeyId: s3Config.ACCESS_KEY_ID,
            secretAccessKey: s3Config.SECRET_ACCESS_KEY,
          },
        });

        const key = `${s3Config.KEY_PREFIX}${filename}`;
        await s3.send(new PutObjectCommand({
          Bucket: s3Config.BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        
        console.log(`[FilesController] Uploaded successfully to S3 bucket ${s3Config.BUCKET} key: ${key}`);
        return {
          filename: filename,
          url: `${s3Config.CATALOG_IMAGE_BASE_URL}/${filename}`
        };
      } catch (err: any) {
        console.error('[FilesController] S3 upload failed:', err.message);
        throw new BadRequestException(`S3 upload failed: ${err.message}`);
      }
    } else {
      // Local fallback for local development when credentials aren't set
      console.warn('[FilesController] S3 credentials missing. Falling back to local upload.');
      const uploadPath = join(process.cwd(), 'uploads', 'assets');
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      writeFileSync(join(uploadPath, filename), file.buffer);
      return {
        filename: filename,
        url: `/uploads/assets/${filename}`
      };
    }
  }
}

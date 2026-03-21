import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('CLOUDFLARE_R2_ACCOUNT_ID') || '';
    this.bucketName = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || '';
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') || '';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    const key = `${uuidv4()}-${file.originalname.replace(/\s/g, '-')}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return { key, url: `${this.publicUrl}/${key}` };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    }));
  }
}

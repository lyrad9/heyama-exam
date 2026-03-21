import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ObjectsController } from './objects.controller';
import { ObjectsService } from './objects.service';
import { ObjectsGateway } from './objects.gateway';
import { ObjectEntity, ObjectSchema } from './object.schema';
import { S3Service } from '../s3/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ObjectEntity.name, schema: ObjectSchema }]),
  ],
  controllers: [ObjectsController],
  providers: [ObjectsService, ObjectsGateway, S3Service],
})
export class ObjectsModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectEntity, ObjectDocument } from './object.schema';
import { S3Service } from '../s3/s3.service';
import { ObjectsGateway } from './objects.gateway';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectModel(ObjectEntity.name)
    private objectModel: Model<ObjectDocument>,
    private s3Service: S3Service,
    private objectsGateway: ObjectsGateway,
  ) {}

  async create(
    title: string,
    description: string,
    file: Express.Multer.File,
  ): Promise<ObjectDocument> {
    const { url, key } = await this.s3Service.uploadFile(file);
    const saved = await new this.objectModel({ title, description, imageUrl: url, s3Key: key }).save();
    this.objectsGateway.notifyObjectCreated(saved);
    return saved;
  }

  async findAll(): Promise<ObjectDocument[]> {
    return this.objectModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ObjectDocument> {
    const object = await this.objectModel.findById(id).exec();
    if (!object) throw new NotFoundException(`Objet ${id} introuvable`);
    return object;
  }

  async remove(id: string): Promise<void> {
    const object = await this.findOne(id);
    await this.s3Service.deleteFile(object.s3Key);
    await this.objectModel.findByIdAndDelete(id).exec();
    this.objectsGateway.notifyObjectDeleted(id);
  }
}

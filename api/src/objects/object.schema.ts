import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ObjectDocument = ObjectEntity & Document;

@Schema()
export class ObjectEntity {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ObjectSchema = SchemaFactory.createForClass(ObjectEntity);

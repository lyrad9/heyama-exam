# 🏗️ Heyama Exam — Build Guide for Antigravity

> **Instructions pour Antigravity** : Ce document contient tout ce qu'il faut pour construire le projet complet. Construis chaque fichier exactement comme décrit, dans l'ordre indiqué. Ne lance aucune commande d'installation de dépendances — l'utilisateur s'en charge lui-même. Crée tous les fichiers et dossiers décrits ci-dessous.

---

## 📐 Vue d'ensemble du projet

```
heyama-exam/
├── api/        ← NestJS REST API + Socket.IO + MongoDB + Cloudflare R2
├── web/        ← Next.js 16 + Tailwind v4 + shadcn/ui
├── mobile/     ← React Native + Expo SDK 52 + NativeWind v4
└── README.md
```

---

## 📦 Dépendances à installer (par l'utilisateur)

### `api/` — NestJS

```
@nestjs/common ^10.4.15
@nestjs/core ^10.4.15
@nestjs/platform-express ^10.4.15
@nestjs/platform-socket.io ^10.4.15
@nestjs/websockets ^10.4.15
@nestjs/mongoose ^10.1.0
@nestjs/config ^3.3.0
mongoose ^8.9.5
@aws-sdk/client-s3 ^3.726.1
@aws-sdk/lib-storage ^3.726.1
multer ^1.4.5-lts.1
@types/multer ^1.4.12
uuid ^11.0.5
@types/uuid ^10.0.0
socket.io ^4.8.1
reflect-metadata ^0.2.2
rxjs ^7.8.1
```

### `web/` — Next.js 16 + Tailwind v4

```
next ^16.0.0
react ^19.0.0
react-dom ^19.0.0
typescript ^5.7.3
tailwindcss ^4.0.0
@tailwindcss/postcss ^4.0.0
socket.io-client ^4.8.1
axios ^1.7.9
lucide-react ^0.474.0
@types/node ^22.10.7
@types/react ^19.0.7
@types/react-dom ^19.0.3
```

**shadcn/ui — initialiser avec :**
```
npx shadcn@latest init
```
Puis ajouter les composants : `button card input label textarea dialog`

### `mobile/` — Expo + NativeWind v4

```
expo ~52.0.28
react-native 0.76.6
typescript ^5.3.3
nativewind ^4.1.23
tailwindcss ^3.4.17
@react-navigation/native ^6.1.18
@react-navigation/stack ^6.4.1
react-native-screens ^4.4.0
react-native-safe-area-context ^4.12.0
react-native-gesture-handler ^2.21.2
expo-image-picker ~16.0.6
axios ^1.7.9
socket.io-client ^4.8.1
@types/react ^18.3.18
```

> ⚠️ NativeWind v4 utilise Tailwind v3 en interne pour React Native — c'est normal et attendu.

---

## 🗂️ PARTIE 1 — API NestJS

### Structure complète

```
api/
├── .env
├── .gitignore
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── objects/
    │   ├── objects.module.ts
    │   ├── objects.controller.ts
    │   ├── objects.service.ts
    │   ├── objects.gateway.ts
    │   └── object.schema.ts
    └── s3/
        └── s3.service.ts
```

---

### `api/.env`

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/heyama?retryWrites=true&w=majority
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=heyama-bucket
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
PORT=3000
```

---

### `api/.gitignore`

```gitignore
node_modules/
dist/
.env
```

---

### `api/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: false,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API démarrée sur http://localhost:${port}`);
}

bootstrap();
```

---

### `api/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ObjectsModule } from './objects/objects.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ObjectsModule,
  ],
})
export class AppModule {}
```

---

### `api/src/objects/object.schema.ts`

```typescript
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
```

---

### `api/src/objects/objects.gateway.ts`

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ObjectsGateway {
  @WebSocketServer()
  server: Server;

  notifyObjectCreated(object: any) {
    this.server.emit('object:created', object);
  }

  notifyObjectDeleted(id: string) {
    this.server.emit('object:deleted', { id });
  }
}
```

---

### `api/src/s3/s3.service.ts`

```typescript
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
    const accountId = this.configService.get<string>('CLOUDFLARE_R2_ACCOUNT_ID');
    this.bucketName = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
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
```

---

### `api/src/objects/objects.service.ts`

```typescript
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
```

---

### `api/src/objects/objects.controller.ts`

```typescript
import {
  Controller, Get, Post, Delete, Param,
  UploadedFile, UseInterceptors, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ObjectsService } from './objects.service';

@Controller('objects')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async create(
    @Body('title') title: string,
    @Body('description') description: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.objectsService.create(title, description, file);
  }

  @Get()
  async findAll() {
    return this.objectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.objectsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.objectsService.remove(id);
  }
}
```

---

### `api/src/objects/objects.module.ts`

```typescript
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
```

---

## 🌐 PARTIE 2 — Web App Next.js 16

### Structure complète

> ⚠️ Le dossier `app/` est à la **racine** de `web/`, pas dans `src/`.

```
web/
├── .env.local
├── .gitignore
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── objects/
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── ui/              ← généré par shadcn
│   ├── ObjectCard.tsx
│   └── CreateObjectModal.tsx
├── hooks/
│   └── useSocket.ts
├── lib/
│   └── api.ts
└── types/
    └── index.ts
```

---

### `web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

---

### `web/.gitignore`

```gitignore
node_modules/
.next/
.env.local
```

---

### `web/postcss.config.mjs`

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

---

### `web/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
};

export default nextConfig;
```

---

### `web/app/globals.css`

```css
@import "tailwindcss";
```

---

### `web/types/index.ts`

```typescript
export interface ObjectItem {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  s3Key: string;
  createdAt: string;
}
```

---

### `web/lib/api.ts`

```typescript
import axios from 'axios';
import { ObjectItem } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export const getObjects = async (): Promise<ObjectItem[]> => {
  const { data } = await api.get('/objects');
  return data;
};

export const getObject = async (id: string): Promise<ObjectItem> => {
  const { data } = await api.get(`/objects/${id}`);
  return data;
};

export const createObject = async (
  title: string,
  description: string,
  imageFile: File,
): Promise<ObjectItem> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('image', imageFile);
  const { data } = await api.post('/objects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteObject = async (id: string): Promise<void> => {
  await api.delete(`/objects/${id}`);
};
```

---

### `web/hooks/useSocket.ts`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ObjectItem } from '@/types';

interface SocketCallbacks {
  onObjectCreated?: (object: ObjectItem) => void;
  onObjectDeleted?: (data: { id: string }) => void;
}

export const useSocket = (callbacks: SocketCallbacks) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL!);

    socketRef.current.on('connect', () => {
      console.log('✅ Socket.IO web connecté');
    });

    socketRef.current.on('object:created', (object: ObjectItem) => {
      callbacks.onObjectCreated?.(object);
    });

    socketRef.current.on('object:deleted', (data: { id: string }) => {
      callbacks.onObjectDeleted?.(data);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);
};
```

---

### `web/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Heyama Objects',
  description: "Gestionnaire d'objets Heyama",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 min-h-screen">{children}</body>
    </html>
  );
}
```

---

### `web/components/ObjectCard.tsx`

```tsx
'use client';

import { ObjectItem } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  object: ObjectItem;
  onDelete: (id: string) => void;
}

export default function ObjectCard({ object, onDelete }: Props) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="relative h-48 w-full bg-slate-100">
        <Image
          src={object.imageUrl}
          alt={object.title}
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate text-slate-900">
          {object.title}
        </h3>
        <p className="text-slate-500 text-sm mt-1 line-clamp-2">
          {object.description}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {new Date(object.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Link href={`/objects/${object._id}`} className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Eye size={16} />
            Voir
          </Button>
        </Link>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(object._id)}
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

### `web/components/CreateObjectModal.tsx`

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createObject } from '@/lib/api';
import { ObjectItem } from '@/types';
import { Plus, Upload } from 'lucide-react';

interface Props {
  onCreated: (object: ObjectItem) => void;
}

export default function CreateObjectModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !imageFile) {
      setError('Tous les champs sont obligatoires');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const created = await createObject(title, description, imageFile);
      onCreated(created);
      setTitle('');
      setDescription('');
      setImageFile(null);
      setPreview(null);
      setOpen(false);
    } catch {
      setError('Erreur lors de la création. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          Nouvel Objet
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un nouvel objet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Titre</Label>
            <Input
              placeholder="Titre de l'objet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              placeholder="Description de l'objet"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>Image</Label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 transition-colors overflow-hidden">
              {preview ? (
                <img src={preview} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Upload size={24} />
                  <span className="text-sm mt-1">Clique pour choisir une image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Création en cours...' : "Créer l'objet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### `web/app/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ObjectItem } from '@/types';
import { getObjects, deleteObject } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import ObjectCard from '@/components/ObjectCard';
import CreateObjectModal from '@/components/CreateObjectModal';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getObjects().then(setObjects).finally(() => setLoading(false));
  }, []);

  useSocket({
    onObjectCreated: (newObject) => {
      setObjects((prev) => {
        if (prev.find((o) => o._id === newObject._id)) return prev;
        return [newObject, ...prev];
      });
    },
    onObjectDeleted: ({ id }) => {
      setObjects((prev) => prev.filter((o) => o._id !== id));
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet objet ?')) return;
    await deleteObject(id);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Heyama Objects</h1>
            <p className="text-sm text-slate-500">{objects.length} objet(s)</p>
          </div>
          <CreateObjectModal onCreated={(obj) => setObjects((prev) => [obj, ...prev])} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-400" size={40} />
          </div>
        ) : objects.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-medium">Aucun objet pour l'instant</p>
            <p className="text-sm mt-1">Crée ton premier objet !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {objects.map((obj) => (
              <ObjectCard key={obj._id} object={obj} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

---

### `web/app/objects/[id]/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ObjectItem } from '@/types';
import { getObject, deleteObject } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [object, setObject] = useState<ObjectItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getObject(id).then(setObject).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Supprimer cet objet ?')) return;
    await deleteObject(id);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-slate-500">Objet introuvable</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6 gap-2">
          <ArrowLeft size={16} />
          Retour
        </Button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="relative h-72 w-full bg-slate-100">
            <Image
              src={object.imageUrl}
              alt={object.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900">{object.title}</h1>
            <p className="text-slate-600 mt-3 leading-relaxed">{object.description}</p>
            <p className="text-sm text-slate-400 mt-4">
              Créé le{' '}
              {new Date(object.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <Button variant="destructive" onClick={handleDelete} className="mt-6 gap-2">
              <Trash2 size={16} />
              Supprimer cet objet
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

---

## 📱 PARTIE 3 — App Mobile Expo + NativeWind v4

### Structure complète

```
mobile/
├── App.tsx
├── global.css
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── nativewind-env.d.ts
├── tsconfig.json
└── src/
    ├── config.ts
    ├── types/
    │   └── index.ts
    ├── lib/
    │   └── api.ts
    ├── hooks/
    │   └── useSocket.ts
    └── screens/
        ├── ListScreen.tsx
        ├── CreateScreen.tsx
        └── DetailScreen.tsx
```

---

### `mobile/.gitignore`

```gitignore
node_modules/
.expo/
dist/
```

---

### `mobile/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### `mobile/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

### `mobile/babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

---

### `mobile/metro.config.js`

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

---

### `mobile/nativewind-env.d.ts`

```typescript
/// <reference types="nativewind/types" />
```

---

### `mobile/src/config.ts`

```typescript
// ⚠️ Remplace X.X par l'IP locale du PC (pas localhost)
// Windows : ipconfig → IPv4 Address
// Mac/Linux : ifconfig | grep inet
export const API_URL = 'http://192.168.X.X:3000';
export const SOCKET_URL = API_URL;
```

---

### `mobile/src/types/index.ts`

```typescript
export interface ObjectItem {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export type RootStackParamList = {
  List: undefined;
  Create: undefined;
  Detail: { id: string };
};
```

---

### `mobile/src/lib/api.ts`

```typescript
import axios from 'axios';
import { API_URL } from '../config';
import { ObjectItem } from '../types';

const api = axios.create({ baseURL: API_URL });

export const getObjects = async (): Promise<ObjectItem[]> => {
  const { data } = await api.get('/objects');
  return data;
};

export const getObject = async (id: string): Promise<ObjectItem> => {
  const { data } = await api.get(`/objects/${id}`);
  return data;
};

export const createObject = async (
  title: string,
  description: string,
  imageUri: string,
  mimeType: string,
  fileName: string,
): Promise<ObjectItem> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('image', { uri: imageUri, type: mimeType, name: fileName } as any);

  const { data } = await api.post('/objects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteObject = async (id: string): Promise<void> => {
  await api.delete(`/objects/${id}`);
};
```

---

### `mobile/src/hooks/useSocket.ts`

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { ObjectItem } from '../types';

interface SocketCallbacks {
  onObjectCreated?: (object: ObjectItem) => void;
  onObjectDeleted?: (data: { id: string }) => void;
}

export const useSocket = (callbacks: SocketCallbacks) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });

    socketRef.current.on('connect', () => console.log('✅ Socket.IO mobile connecté'));

    socketRef.current.on('object:created', (object: ObjectItem) => {
      callbacks.onObjectCreated?.(object);
    });

    socketRef.current.on('object:deleted', (data: { id: string }) => {
      callbacks.onObjectDeleted?.(data);
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);
};
```

---

### `mobile/src/screens/ListScreen.tsx`

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image,
  TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ObjectItem, RootStackParamList } from '../types';
import { getObjects, deleteObject } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

type NavigationProp = StackNavigationProp<RootStackParamList, 'List'>;

export default function ListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchObjects = useCallback(async () => {
    try {
      const data = await getObjects();
      setObjects(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les objets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchObjects(); }, []);

  useSocket({
    onObjectCreated: (newObject) => {
      setObjects((prev) => {
        if (prev.find((o) => o._id === newObject._id)) return prev;
        return [newObject, ...prev];
      });
    },
    onObjectDeleted: ({ id }) => {
      setObjects((prev) => prev.filter((o) => o._id !== id));
    },
  });

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Veux-tu vraiment supprimer cet objet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await deleteObject(id); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <TouchableOpacity
        className="mx-4 mt-4 mb-2 bg-blue-500 py-4 rounded-xl items-center"
        onPress={() => navigation.navigate('Create')}
      >
        <Text className="text-white font-bold text-base">+ Nouvel Objet</Text>
      </TouchableOpacity>

      {objects.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-400 text-lg font-semibold">Aucun objet pour l'instant</Text>
          <Text className="text-slate-300 text-sm mt-1">Crée ton premier objet !</Text>
        </View>
      ) : (
        <FlatList
          data={objects}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchObjects(); }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white rounded-xl mb-3 flex-row overflow-hidden shadow-sm"
              onPress={() => navigation.navigate('Detail', { id: item._id })}
            >
              <Image
                source={{ uri: item.imageUrl }}
                className="w-24 h-24"
                resizeMode="cover"
              />
              <View className="flex-1 p-3 justify-center">
                <Text className="text-slate-900 font-bold text-base" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-slate-500 text-sm mt-1" numberOfLines={2}>
                  {item.description}
                </Text>
                <Text className="text-slate-400 text-xs mt-1">
                  {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <TouchableOpacity
                className="justify-center px-4"
                onPress={() => handleDelete(item._id)}
              >
                <Text className="text-lg">🗑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
```

---

### `mobile/src/screens/CreateScreen.tsx`

```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { createObject } from '../lib/api';

export default function CreateScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "On a besoin d'accéder à ta galerie");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "On a besoin d'accéder à ta caméra");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleImagePick = () => {
    Alert.alert('Choisir une image', '', [
      { text: '📷 Prendre une photo', onPress: takePhoto },
      { text: '🖼 Depuis la galerie', onPress: pickImage },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !image) {
      Alert.alert('Champs manquants', 'Tous les champs sont obligatoires');
      return;
    }
    setLoading(true);
    try {
      const fileName = image.uri.split('/').pop() || 'image.jpg';
      const mimeType = image.mimeType || 'image/jpeg';
      await createObject(title, description, image.uri, mimeType, fileName);
      Alert.alert('Succès ✅', 'Objet créé avec succès !', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Erreur', "Impossible de créer l'objet. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-sm font-semibold text-gray-700 mt-4 mb-1">Titre *</Text>
        <TextInput
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-base"
          placeholder="Titre de l'objet"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text className="text-sm font-semibold text-gray-700 mt-4 mb-1">Description *</Text>
        <TextInput
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-base h-24"
          placeholder="Description de l'objet"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text className="text-sm font-semibold text-gray-700 mt-4 mb-1">Image *</Text>
        <TouchableOpacity
          className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden h-44 justify-center items-center"
          onPress={handleImagePick}
        >
          {image ? (
            <Image source={{ uri: image.uri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Text className="text-4xl">📷</Text>
              <Text className="text-slate-400 text-sm mt-2">Appuie pour choisir une image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className={`mt-7 py-4 rounded-xl items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-bold">Créer l'objet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

---

### `mobile/src/screens/DetailScreen.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, ObjectItem } from '../types';
import { getObject, deleteObject } from '../lib/api';

type DetailRouteProp = RouteProp<RootStackParamList, 'Detail'>;

export default function DetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { id } = route.params;
  const [object, setObject] = useState<ObjectItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getObject(id)
      .then(setObject)
      .catch(() => Alert.alert('Erreur', 'Objet introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Supprimer', 'Veux-tu vraiment supprimer cet objet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await deleteObject(id); navigation.goBack(); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!object) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-slate-400 text-base">Objet introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Image
        source={{ uri: object.imageUrl }}
        className="w-full h-72 bg-slate-200"
        resizeMode="cover"
      />

      <View className="p-5">
        <Text className="text-2xl font-extrabold text-slate-900">{object.title}</Text>
        <Text className="text-sm text-slate-400 mt-1">
          Créé le{' '}
          {new Date(object.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>

        <View className="h-px bg-slate-200 my-4" />

        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Description
        </Text>
        <Text className="text-base text-slate-700 leading-relaxed">{object.description}</Text>

        <TouchableOpacity
          className="mt-8 bg-red-100 py-4 rounded-xl items-center"
          onPress={handleDelete}
        >
          <Text className="text-red-600 font-bold text-base">🗑 Supprimer cet objet</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

---

### `mobile/App.tsx`

```tsx
import 'react-native-gesture-handler';
import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/types';
import ListScreen from './src/screens/ListScreen';
import CreateScreen from './src/screens/CreateScreen';
import DetailScreen from './src/screens/DetailScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#1e293b',
          headerTitleStyle: { fontWeight: '700' },
          cardStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Stack.Screen name="List" component={ListScreen} options={{ title: 'Heyama Objects' }} />
        <Stack.Screen name="Create" component={CreateScreen} options={{ title: 'Nouvel Objet' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Détail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 📄 `README.md` (racine du repo)

```markdown
# Heyama Exam

## Stack technique
- **API** : NestJS + MongoDB Atlas + Cloudflare R2 + Socket.IO
- **Web** : Next.js 16 + Tailwind v4 + shadcn/ui
- **Mobile** : React Native + Expo SDK 52 + NativeWind v4

## Lancer le projet

### 1. API
cd api && npm run start:dev

### 2. Web App (port 3001)
cd web && npm run dev

### 3. Mobile
cd mobile && npx expo start

## Variables d'environnement
- `api/.env` — MongoDB URI + Cloudflare R2 credentials
- `web/.env.local` — URL de l'API
- `mobile/src/config.ts` — IP locale du PC

## Fonctionnalités
- Créer un objet (titre + description + image)
- Lister tous les objets
- Voir le détail d'un objet
- Supprimer un objet (MongoDB + S3)
- Temps réel Socket.IO (mobile ↔ web)
```

---

## ⚠️ Points d'attention pour Antigravity

1. **Ne pas installer les dépendances** — l'utilisateur s'en charge
2. **Next.js** : le dossier `app/` est à la **racine** de `web/`, **pas dans `src/`**
3. **Tailwind v4** dans le web : utilise `@import "tailwindcss"` dans `globals.css` et `@tailwindcss/postcss` dans `postcss.config.mjs` — il n'y a **pas** de `tailwind.config.js` côté web
4. **NativeWind** : le `tailwind.config.js` côté mobile est **obligatoire** car NativeWind v4 utilise Tailwind v3 en interne
5. **Aucun `StyleSheet.create`** dans le mobile — tout le style passe par `className` avec NativeWind
6. **`App.tsx` mobile** : les deux imports `'react-native-gesture-handler'` et `'./global.css'` doivent être les **toutes premières lignes** du fichier, dans cet ordre
7. **`mobile/src/config.ts`** : laisser le placeholder `192.168.X.X`, l'utilisateur le remplira avec son IP locale
8. **`api/.env`** et **`web/.env.local`** : laisser les placeholders, l'utilisateur les remplira

---

## 🚀 PARTIE 4 — Déploiement

> Cette partie est exécutée par l'utilisateur **après** que le projet soit fonctionnel en local. Antigravity doit créer les fichiers de configuration listés ci-dessous pour préparer le déploiement.

---

### 🗺️ Stratégie de déploiement

| Projet | Plateforme | Raison |
|--------|-----------|--------|
| `api/` | **Railway** | Support natif NestJS, variables d'env, WebSocket, free tier |
| `web/` | **Vercel** | Fait par l'équipe Next.js, déploiement automatique depuis GitHub |
| `mobile/` | **EAS Build (Expo)** | Build APK/IPA officiel, intégré à l'écosystème Expo |

---

### 📁 Fichiers de configuration à créer pour le déploiement

---

#### `api/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

#### `api/railway.toml`

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node dist/main.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

---

#### `api/.env.production`

> ⚠️ Ce fichier ne doit **pas** être commité. C'est une référence pour l'utilisateur des variables à renseigner dans le dashboard Railway.

```env
# À renseigner dans Railway → Variables
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/heyama?retryWrites=true&w=majority
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=heyama-bucket
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
PORT=3000
```

---

#### Mettre à jour `api/.gitignore`

```gitignore
node_modules/
dist/
.env
.env.production
```

---

#### `web/.env.production`

> ⚠️ À renseigner dans le dashboard Vercel → Settings → Environment Variables.

```env
NEXT_PUBLIC_API_URL=https://TON-PROJET.railway.app
NEXT_PUBLIC_SOCKET_URL=https://TON-PROJET.railway.app
```

---

#### `web/vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next"
}
```

> ✅ Ce fichier est dans `web/`. Vercel l'utilisera comme racine du projet Next.js grâce au réglage **Root Directory** défini lors de l'import (voir checklist ci-dessous).

---

#### `mobile/app.json`

> Ce fichier est indispensable pour EAS Build. Il identifie le projet Expo et configure le build.

```json
{
  "expo": {
    "name": "Heyama",
    "slug": "heyama-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#f8fafc"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.heyama.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f8fafc"
      },
      "package": "com.heyama.mobile"
    },
    "plugins": [
      "expo-image-picker"
    ]
  }
}
```

> ⚠️ EAS a besoin d'images placeholder dans `mobile/assets/`. Crée les fichiers suivants avec n'importe quelle image PNG pour l'instant :
> - `mobile/assets/icon.png` (1024×1024)
> - `mobile/assets/splash.png` (1284×2778)
> - `mobile/assets/adaptive-icon.png` (1024×1024)

---

#### `mobile/eas.json`

```json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

#### Mettre à jour `mobile/src/config.ts` pour supporter les deux environnements

```typescript
// Remplace l'IP locale par l'URL Railway avant de faire une EAS build
// En local → IP de ton PC : 'http://192.168.X.X:3000'
// En production → URL Railway : 'https://TON-PROJET.railway.app'

const IS_PRODUCTION = false; // passer à true avant eas build

export const API_URL = IS_PRODUCTION
  ? 'https://TON-PROJET.railway.app'
  : 'http://192.168.X.X:3000';

export const SOCKET_URL = API_URL;
```

---

### 📋 Checklist de déploiement (pour l'utilisateur)

> Suivre dans cet ordre exact.

#### Étape 1 — Déployer l'API sur Railway

> ⚠️ Le repo est un **monorepo**. Railway doit être configuré pour ne déployer **que le sous-dossier `api/`**.

- [ ] Créer un compte sur [railway.app](https://railway.app)
- [ ] Cliquer **"New Project"** → **"Deploy from GitHub repo"** → sélectionner `heyama-exam`
- [ ] ⚠️ Une fois le projet créé, aller dans **Settings** → **Source** → champ **"Root Directory"** → saisir **`api`** → sauvegarder
- [ ] Railway redémarre et détecte le `Dockerfile` dans `api/`
- [ ] Aller dans l'onglet **"Variables"** → cliquer **"Raw Editor"** → coller toutes les variables de `api/.env.production`
- [ ] Aller dans **Settings** → **Networking** → **"Generate Domain"** pour obtenir une URL publique
- [ ] Copier l'URL publique générée (ex: `https://heyama-api-production.up.railway.app`)

#### Étape 2 — Déployer le Web App sur Vercel

> ⚠️ Le repo GitHub est un **monorepo** (`api/` + `web/` + `mobile/`). Vercel doit être configuré pour ne déployer **que le sous-dossier `web/`**. Suivre exactement les étapes ci-dessous.

- [ ] Créer un compte sur [vercel.com](https://vercel.com)
- [ ] Cliquer **"Add New Project"**
- [ ] Cliquer **"Import Git Repository"** → sélectionner le repo `heyama-exam`
- [ ] ⚠️ **Avant de cliquer Deploy**, trouver le champ **"Root Directory"** → cliquer **"Edit"** → saisir **`web`** → cliquer **"Continue"**
- [ ] Vercel détecte automatiquement **Next.js** comme framework
- [ ] Ouvrir la section **"Environment Variables"** → ajouter :
  - `NEXT_PUBLIC_API_URL` → `https://TON-PROJET.railway.app`
  - `NEXT_PUBLIC_SOCKET_URL` → `https://TON-PROJET.railway.app`
- [ ] Cliquer **"Deploy"**
- [ ] Copier l'URL publique générée (ex: `https://heyama-web.vercel.app`)

> 💡 Grâce au **Root Directory = `web/`**, Vercel ignore complètement `api/` et `mobile/` et ne build que le projet Next.js.

#### Étape 3 — Builder l'APK mobile avec EAS

> ⚠️ Contrairement à Railway et Vercel qui ont une UI pour choisir le sous-dossier, **EAS CLI se lance directement depuis le dossier `mobile/`**. Toutes les commandes ci-dessous doivent être exécutées depuis `heyama-exam/mobile/`.

**3.1 — Préparation**
- [ ] Créer un compte sur [expo.dev](https://expo.dev)
- [ ] Installer EAS CLI globalement : `npm install -g eas-cli`
- [ ] Se connecter : `eas login`
- [ ] **Se placer dans le bon dossier** : `cd mobile`

**3.2 — Config production**
- [ ] Dans `mobile/src/config.ts` → passer `IS_PRODUCTION = true`
- [ ] Remplacer `TON-PROJET.railway.app` par l'URL Railway réelle

**3.3 — Initialiser EAS (première fois uniquement)**
- [ ] Lancer : `eas build:configure`
- [ ] EAS met à jour `app.json` avec un `extra.eas.projectId` → c'est normal

**3.4 — Lancer le build APK**
```bash
# Depuis mobile/
eas build --platform android --profile preview
```
- [ ] EAS upload le code sur ses serveurs et build l'APK dans le cloud
- [ ] Suivre la progression sur [expo.dev/accounts/TON_COMPTE/projects](https://expo.dev)
- [ ] Une fois terminé, télécharger l'APK et l'installer sur le téléphone Android

> 💡 Le build se fait **dans le cloud Expo** — pas besoin d'Android Studio ni de JDK installé localement.

---

### 🔌 Socket.IO en production — Configuration CORS

Avant de déployer, mettre à jour `api/src/main.ts` pour autoriser l'URL Vercel :

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    // Remplace par l'URL Vercel réelle après le déploiement
    origin: [
      'http://localhost:3001',
      'https://TON-PROJET.vercel.app',
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: false,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API démarrée sur http://localhost:${port}`);
}

bootstrap();
```

Et mettre à jour `api/src/objects/objects.gateway.ts` :

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'https://TON-PROJET.vercel.app',
    ],
  },
})
export class ObjectsGateway {
  @WebSocketServer()
  server: Server;

  notifyObjectCreated(object: any) {
    this.server.emit('object:created', object);
  }

  notifyObjectDeleted(id: string) {
    this.server.emit('object:deleted', { id });
  }
}
```

---

### 🗂️ Structure finale du repo GitHub

```
heyama-exam/
├── api/
│   ├── Dockerfile
│   ├── railway.toml
│   ├── .env                  ← local uniquement (gitignore)
│   ├── .env.production       ← référence variables (gitignore)
│   └── src/...
├── web/
│   ├── vercel.json
│   ├── .env.local            ← local uniquement (gitignore)
│   ├── .env.production       ← référence variables (gitignore)
│   └── app/...
├── mobile/
│   ├── eas.json
│   └── src/...
└── README.md
```

---

### ⚠️ Points d'attention déploiement pour Antigravity

1. **`api/.env.production`** et **`web/.env.production`** → les créer mais les ajouter au `.gitignore` — ce sont des références, jamais committées
2. **`api/src/main.ts`** et **`api/src/objects/objects.gateway.ts`** → les deux fichiers CORS doivent être mis à jour avec la version production fournie ci-dessus (ils remplacent les versions de la Partie 1)
3. **`mobile/src/config.ts`** → remplace complètement la version de la Partie 3 par la version avec `IS_PRODUCTION`
4. **Les URLs `TON-PROJET`** dans tous les fichiers sont des placeholders — l'utilisateur les remplacera après avoir créé les projets Railway et Vercel

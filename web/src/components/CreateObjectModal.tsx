'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { createObject } from '@/src/lib/api';
import { ObjectItem } from '@/src/types';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const schema = z.object({
  title: z.string().min(3, 'Le titre doit faire au moins 3 caractères').max(100),
  description: z.string().min(10, 'La description doit faire au moins 10 caractères'),
  image: z.instanceof(File, { message: "L'image est obligatoire" }),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onCreated?: (object: ObjectItem) => void;
}

export default function CreateObjectModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '' },
  });

  // Nettoyage de la preview pour éviter les fuites de mémoire
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => createObject(data.title, data.description, data.image),
    onSuccess: (created) => {
      // Met à jour le cache global de TanStack Query
      queryClient.setQueryData<ObjectItem[]>(["objects"], (prev) => {
        if (!prev) return [created];
        return [created, ...prev];
      });
      
      onCreated?.(created);
      handleClose();
    },
  });

  const handleClose = () => {
    reset();
    setPreview(null);
    setOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (preview) URL.revokeObjectURL(preview); // Nettoie l'ancienne preview
      setValue('image', file, { shouldValidate: true });
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              placeholder="Titre de l'objet"
              {...register('title')}
              className={errors.title ? 'border-red-500 ring-red-500' : ''}
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description de l'objet"
              {...register('description')}
              rows={3}
              className={errors.description ? 'border-red-500 ring-red-500' : ''}
            />
            {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <label className="group relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all overflow-hidden">
              {preview ? (
                <>
                  <img src={preview} alt="preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <p className="text-white text-sm font-medium">Changer l'image</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Upload size={28} />
                  <span className="text-sm mt-2 font-medium">Clique pour choisir une image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
            {errors.image && <p className="text-red-500 text-xs">{errors.image.message as string}</p>}
          </div>

          {mutation.isError && (
            <p className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              Erreur lors de la création. Veuillez réessayer.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending} className="w-full h-11">
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Création en cours...
              </>
            ) : (
              "Créer l'objet"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

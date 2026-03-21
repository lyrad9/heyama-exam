'use client';

import { useState } from 'react';
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

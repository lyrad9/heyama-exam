"use client";

import { useEffect, useState } from "react";
import { ObjectItem } from "@/src/types";
import { getObjects, deleteObject } from "@/src/lib/api";
import { useSocket } from "@/src/hooks/useSocket";
import ObjectCard from "@/src/components/ObjectCard";
import CreateObjectModal from "@/src/components/CreateObjectModal";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getObjects()
      .then(setObjects)
      .finally(() => setLoading(false));
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
    if (!confirm("Supprimer cet objet ?")) return;
    await deleteObject(id);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Heyama Objects
            </h1>
            <p className="text-sm text-slate-500">{objects.length} objet(s)</p>
          </div>
          <CreateObjectModal
            onCreated={(obj) =>
              setObjects((prev) => {
                if (prev.find((o) => o._id === obj._id)) return prev;
                return [obj, ...prev];
              })
            }
          />
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

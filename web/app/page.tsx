"use client";

import { ObjectItem } from "@/src/types";
import { getObjects, deleteObject } from "@/src/lib/api";
import { useSocket } from "@/src/hooks/useSocket";
import ObjectCard from "@/src/components/ObjectCard";
import CreateObjectModal from "@/src/components/CreateObjectModal";
import ObjectCardSkeleton from "@/src/components/ObjectCardSkeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/components/ui/button";
import { Eye } from "lucide-react";

export default function HomePage() {
  const queryClient = useQueryClient();

  const { data: objects = [], isLoading: isFetching } = useQuery<ObjectItem[]>({
    queryKey: ["objects"],
    queryFn: getObjects,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteObject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["objects"] });
      const previousObjects = queryClient.getQueryData<ObjectItem[]>([
        "objects",
      ]);
      queryClient.setQueryData<ObjectItem[]>(["objects"], (prev) =>
        prev?.filter((o) => o._id !== id),
      );
      return { previousObjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousObjects) {
        queryClient.setQueryData(["objects"], context.previousObjects);
      }
      alert("Erreur lors de la suppression. Réessaie.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
    },
  });

  useSocket({
    onObjectCreated: (newObject) => {
      queryClient.setQueryData<ObjectItem[]>(["objects"], (prev) => {
        if (!prev) return [newObject];
        if (prev.find((o) => o._id === newObject._id)) return prev;
        return [newObject, ...prev];
      });
    },
    onObjectDeleted: ({ id }) => {
      queryClient.setQueryData<ObjectItem[]>(["objects"], (prev) =>
        prev?.filter((o) => o._id !== id),
      );
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet objet ?")) return;
    deleteMutation.mutate(id);
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
          <div className="flex gap-2">
            <CreateObjectModal />
          </div>
        </div>
      </div>

      <div id="objects-list" className="max-w-6xl mx-auto px-4 py-8">
        {isFetching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <ObjectCardSkeleton key={i} />
            ))}
          </div>
        ) : objects.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-sans">
            <p className="text-lg font-medium">Aucun objet pour l'instant</p>
            <p className="text-sm mt-1">Crée ton premier objet !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {objects.map((obj) => (
              <ObjectCard
                key={obj._id}
                object={obj}
                onDelete={handleDelete}
                isDeleting={
                  deleteMutation.status === "pending" &&
                  deleteMutation.variables === obj._id
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

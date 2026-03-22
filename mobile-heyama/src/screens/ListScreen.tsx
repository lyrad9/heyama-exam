import React from 'react';
import {
  View, Text, FlatList, Image,
  TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react-native';
import { ObjectItem, RootStackParamList } from '@/types';
import { getObjects, deleteObject } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

import { Skeleton } from '@/components/Skeleton';

type NavigationProp = StackNavigationProp<RootStackParamList, 'List'>;

export default function ListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: objects = [], isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['objects'],
    queryFn: getObjects,
  });

  React.useEffect(() => {
    if (objects) {
      console.log("📦 Objets reçus sur mobile (JSON):", JSON.stringify(objects, null, 2));
    }
  }, [objects]);

  React.useEffect(() => {
    if (error) {
      console.error("❌ Erreur de récupération:", error);
      Alert.alert('Erreur', 'Connexion impossible à l\'API. Vérifie ton URL et ta connexion.');
    }
  }, [error]);

  const deleteMutation = useMutation({
    mutationFn: deleteObject,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['objects'] });
      const previousObjects = queryClient.getQueryData<ObjectItem[]>(['objects']);
      queryClient.setQueryData(['objects'], (old: ObjectItem[] | undefined) => 
        old?.filter((obj) => obj._id !== id)
      );
      return { previousObjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousObjects) {
        queryClient.setQueryData(['objects'], context.previousObjects);
      }
      Alert.alert('Erreur', 'Impossible de supprimer');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
  });

  useSocket({
    onObjectCreated: (newObject) => {
      queryClient.setQueryData(['objects'], (oldData: ObjectItem[] | undefined) => {
        if (!oldData) return [newObject];
        if (oldData.find((o) => o._id === newObject._id)) return oldData;
        return [newObject, ...oldData];
      });
    },
    onObjectDeleted: ({ id }) => {
      queryClient.setQueryData(['objects'], (oldData: ObjectItem[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((o) => o._id !== id);
      });
    },
  });

  const handleDelete = (id: string) => {
    Alert.alert('Supprimer', 'Veux-tu vraiment supprimer cet objet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 p-4">
        <Skeleton width="100%" height={56} borderRadius={12} style={{ marginTop: 16, marginBottom: 8 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} className="flex-row bg-white rounded-xl p-3 mb-3 shadow-sm items-center">
            <Skeleton width={80} height={80} borderRadius={8} />
            <View className="flex-1 ml-3">
              <Skeleton width="70%" height={16} borderRadius={4} />
              <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
              <Skeleton width="40%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <TouchableOpacity
        activeOpacity={0.9}
        className="mx-4 mt-4 mb-3 bg-slate-900 h-16 rounded-[24px] items-center flex-row justify-center shadow-lg shadow-slate-300"
        onPress={() => navigation.navigate('Create')}
      >
        <Plus color="white" size={20} strokeWidth={3} style={{ marginRight: 8 }} />
        <Text className="text-white font-bold text-lg tracking-tight">Nouvel Objet</Text>
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
              refreshing={isRefetching}
              onRefresh={refetch}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-white rounded-[24px] mb-4 flex-row p-2 shadow-sm border border-slate-100/50"
              onPress={() => navigation.navigate("Detail", { id: item._id })}
            >
              <View className="rounded-[18px] overflow-hidden shadow-sm bg-slate-100">
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-24 h-24"
                  resizeMode="cover"
                />
              </View>
              <View className="flex-1 px-4 py-1 justify-between">
                <View>
                  <Text
                    className="text-slate-900 font-bold text-lg tracking-tight"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-slate-500 text-[13px] leading-4 mt-1" numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <View className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                      {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => handleDelete(item._id)}
                    activeOpacity={0.6}
                    className="p-2 bg-red-50 rounded-xl"
                  >
                    <Trash2 color="#ef4444" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

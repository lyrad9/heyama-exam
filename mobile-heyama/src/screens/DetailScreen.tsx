import React from 'react';
import {
  View, Text, Image, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList, ObjectItem } from '@/types';
import { Trash2 } from 'lucide-react-native';
import { getObject, deleteObject } from '@/lib/api';

type DetailRouteProp = RouteProp<RootStackParamList, 'Detail'>;

import { Skeleton } from '@/components/Skeleton';

export default function DetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const queryClient = useQueryClient();
  const { id } = route.params;

  const { data: object, isLoading, error } = useQuery({
    queryKey: ['object', id],
    queryFn: () => getObject(id),
  });

  React.useEffect(() => {
    if (error) {
      console.error("❌ Erreur détail:", error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'objet.');
    }
  }, [error]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteObject(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['objects'] });
      const previousObjects = queryClient.getQueryData<ObjectItem[]>(['objects']);
      queryClient.setQueryData(['objects'], (old: ObjectItem[] | undefined) => 
        old?.filter((obj) => obj._id !== id)
      );
      return { previousObjects };
    },
    onSuccess: () => {
      navigation.goBack();
    },
    onError: (_err, _variables, context) => {
      if (context?.previousObjects) {
        queryClient.setQueryData(['objects'], context.previousObjects);
      }
      Alert.alert('Erreur', 'Impossible de supprimer');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
  });

  const handleDelete = () => {
    Alert.alert('Supprimer', 'Veux-tu vraiment supprimer cet objet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50">
        <Skeleton width="100%" height={288} borderRadius={0} />
        <View className="p-5">
          <Skeleton width="60%" height={32} borderRadius={8} />
          <Skeleton width="40%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
          <View className="h-px bg-slate-200 my-4" />
          <Skeleton width="30%" height={12} borderRadius={4} />
          <Skeleton width="100%" height={16} borderRadius={4} style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
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
          className="mt-8 bg-red-100 py-4 rounded-xl items-center flex-row justify-center"
          onPress={handleDelete}
        >
          <Trash2 color="#dc2626" size={20} className="mr-2" />
          <Text className="text-red-600 font-bold text-base">Supprimer cet objet</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

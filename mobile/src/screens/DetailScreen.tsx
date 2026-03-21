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

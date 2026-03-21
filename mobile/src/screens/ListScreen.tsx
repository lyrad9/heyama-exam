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

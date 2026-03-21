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

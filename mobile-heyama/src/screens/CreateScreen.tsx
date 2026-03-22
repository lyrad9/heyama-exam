import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, Image as ImageIcon, Plus } from "lucide-react-native";
import { createObject } from "@/lib/api";
import { ObjectItem, RootStackParamList } from "@/types";

const schema = z.object({
  title: z.string().min(3, "Titre trop court (min 3 chars)"),
  description: z.string().min(10, "Description trop courte (min 10 chars)"),
  image: z.any().refine((val) => !!val, "L'image est obligatoire"),
});

type CreateObjectFormData = z.infer<typeof schema>;

export default function CreateScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateObjectFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      image: undefined,
    },
  });

  const selectedImage = watch("image") as ImagePicker.ImagePickerAsset | undefined;

  const mutation = useMutation({
    mutationFn: (data: CreateObjectFormData) => {
      const img = data.image as ImagePicker.ImagePickerAsset;
      return createObject(
        data.title,
        data.description,
        img.uri,
        img.mimeType || "image/jpeg",
        img.fileName || "upload.jpg",
      );
    },
    onSuccess: (newObject) => {
      queryClient.setQueryData(
        ["objects"],
        (oldData: ObjectItem[] | undefined) => {
          if (!oldData) return [newObject];
          // Évite les doublons avec le socket
          if (oldData.find((o) => o._id === newObject._id)) return oldData;
          return [newObject, ...oldData];
        },
      );
      navigation.goBack();
    },
    onError: (err) => {
      console.error("❌ Erreur création:", err);
      Alert.alert("Erreur", "Impossible de créer l'objet. Vérifie ta connexion.");
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setValue("image", result.assets[0], { shouldValidate: true });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Nous avons besoin de la caméra.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setValue("image", result.assets[0], { shouldValidate: true });
    }
  };

  const onSubmit = (data: CreateObjectFormData) => {
    mutation.mutate(data);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 20 }}
      >
        <View className="mb-6">
          <Text className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Visuel de l'objet
          </Text>
          <TouchableOpacity
            onPress={pickImage}
            activeOpacity={0.7}
            className={`h-64 bg-white rounded-3xl border-2 border-dashed ${errors.image ? "border-red-400" : "border-slate-200"} justify-center items-center overflow-hidden shadow-sm`}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                className="w-full h-full"
              />
            ) : (
              <View className="items-center">
                <View className="bg-slate-50 p-4 rounded-full mb-2">
                  <ImageIcon color="#94a3b8" size={32} />
                </View>
                <Text className="text-slate-400 font-medium">
                  Appuie pour choisir une image
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={takePhoto}
            className="mt-3 bg-white py-3 px-4 rounded-2xl border border-slate-200 flex-row justify-center items-center shadow-sm"
          >
            <Camera color="#64748b" size={20} style={{ marginRight: 8 }} />
            <Text className="text-slate-600 font-semibold">
              Prendre une photo
            </Text>
          </TouchableOpacity>
          {errors.image && (
            <Text className="text-red-500 text-xs mt-2 ml-2">
              {errors.image.message as string}
            </Text>
          )}
        </View>

        <View className="flex gap-y-4">
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Titre
            </Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-white p-4 rounded-2xl border ${errors.title ? "border-red-400" : "border-slate-200"} text-slate-900 text-base shadow-sm`}
                  placeholder="Ex: Ma superbe lampe"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value || ""}
                />
              )}
            />
            {errors.title && (
              <Text className="text-red-500 text-xs mt-1 ml-2">
                {errors.title.message}
              </Text>
            )}
          </View>

          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Description
            </Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-white p-4 rounded-2xl border ${errors.description ? "border-red-400" : "border-slate-200"} text-slate-900 text-base shadow-sm`}
                  placeholder="Décris l'objet en quelques mots..."
                  multiline
                  numberOfLines={4}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value || ""}
                  textAlignVertical="top"
                />
              )}
            />
            {errors.description && (
              <Text className="text-red-500 text-xs mt-1 ml-2">
                {errors.description.message}
              </Text>
            )}
          </View>

          <TouchableOpacity
            className={`mt-8 py-5 rounded-3xl flex-row justify-center items-center shadow-lg ${mutation.isPending ? "bg-blue-300" : "bg-blue-600"}`}
            onPress={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="white" style={{ marginRight: 8 }} />
            ) : (
              <Plus color="white" size={20} strokeWidth={3} style={{ marginRight: 8 }} />
            )}
            <Text className="text-white font-bold text-lg">
              {mutation.isPending ? "Envoi en cours..." : "Créer l'objet"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

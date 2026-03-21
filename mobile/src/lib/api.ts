import axios from 'axios';
import { API_URL } from '../config';
import { ObjectItem } from '../types';

const api = axios.create({ baseURL: API_URL });

export const getObjects = async (): Promise<ObjectItem[]> => {
  const { data } = await api.get('/objects');
  return data;
};

export const getObject = async (id: string): Promise<ObjectItem> => {
  const { data } = await api.get(`/objects/${id}`);
  return data;
};

export const createObject = async (
  title: string,
  description: string,
  imageUri: string,
  mimeType: string,
  fileName: string,
): Promise<ObjectItem> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('image', { uri: imageUri, type: mimeType, name: fileName } as any);

  const { data } = await api.post('/objects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteObject = async (id: string): Promise<void> => {
  await api.delete(`/objects/${id}`);
};

import axios from "axios";
import { ObjectItem } from "@/src/types";

const api = axios.create({
  baseURL: process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.NEXT_PUBLIC_API_URL,
});

export const getObjects = async (): Promise<ObjectItem[]> => {
  const { data } = await api.get("/objects");
  return data;
};

export const getObject = async (id: string): Promise<ObjectItem> => {
  const { data } = await api.get(`/objects/${id}`);
  return data;
};

export const createObject = async (
  title: string,
  description: string,
  imageFile: File,
): Promise<ObjectItem> => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("image", imageFile);
  console.log("formData", formData)
  const { data } = await api.post("/objects", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteObject = async (id: string): Promise<void> => {
  await api.delete(`/objects/${id}`);
};

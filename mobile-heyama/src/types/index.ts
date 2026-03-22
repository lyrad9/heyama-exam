export interface ObjectItem {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export type RootStackParamList = {
  List: undefined;
  Create: undefined;
  Detail: { id: string };
};

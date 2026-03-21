// Remplace l'IP locale par l'URL Railway avant de faire une EAS build
// En local → IP de ton PC : 'http://192.168.X.X:3000'
// En production → URL Railway : 'https://TON-PROJET.railway.app'

const IS_PRODUCTION = false; // passer à true avant eas build

export const API_URL = IS_PRODUCTION
  ? 'https://TON-PROJET.railway.app'
  : 'http://192.168.X.X:3000';

export const SOCKET_URL = API_URL;

// ⚠️ Remplace X.X par l'IP locale du PC (pas localhost)
// Windows : ipconfig → IPv4 Address
// Mac/Linux : ifconfig | grep inet

const IS_PRODUCTION = false; // passer à true avant eas build

export const API_URL = IS_PRODUCTION
  ? 'https://dynamic-integrity-production-8091.up.railway.app'
  : 'http://192.168.1.20:3000'; // IP locale détectée (192.168.1.20)

export const SOCKET_URL = API_URL;

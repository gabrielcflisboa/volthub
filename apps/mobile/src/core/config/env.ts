import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Android Emulator uses 10.0.2.2 to access host machine localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

const getWsUrl = (): string => {
  const base = getBaseUrl();
  return base.replace(/^http/, 'ws') + '/ws';
};

export const env = {
  apiUrl: getBaseUrl(),
  wsUrl: getWsUrl(),
};

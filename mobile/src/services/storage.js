import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@videomakers:access_token',
  REFRESH_TOKEN: '@videomakers:refresh_token',
  USER: '@videomakers:user',
  LOCATION: '@videomakers:location',
};

class StorageService {
  // Token
  async saveTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        [KEYS.ACCESS_TOKEN, accessToken],
        [KEYS.REFRESH_TOKEN, refreshToken],
      ]);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // User
  async saveUser(user) {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  async getUser() {
    try {
      const userString = await AsyncStorage.getItem(KEYS.USER);
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async clearUser() {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  }

  // Location
  async saveLocation(location) {
    try {
      await AsyncStorage.setItem(KEYS.LOCATION, JSON.stringify(location));
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }

  async getLocation() {
    try {
      const locationString = await AsyncStorage.getItem(KEYS.LOCATION);
      return locationString ? JSON.parse(locationString) : null;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  // Clear all
  async clearAll() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

export default new StorageService();

# 📱 Mobile App React Native - Plataforma de Videomakers

## ✅ Estrutura Criada

### 📁 Arquivos Base Implementados

```
/app/mobile/
├── package.json ✅ (dependências configuradas)
├── app.json ✅ (config Android/iOS + Google Maps)
├── babel.config.js ✅
├── metro.config.js ✅
└── src/
    ├── utils/
    │   ├── constants.js ✅ (cores, API_URL, categorias)
    │   └── helpers.js ✅ (formatDate, formatCurrency, etc)
    ├── services/
    │   ├── storage.js ✅ (AsyncStorage wrapper)
    │   └── api.js ✅ (Axios + interceptors JWT)
    ├── context/ (próximo)
    ├── navigation/ (próximo)
    ├── screens/ (próximo)
    └── components/ (próximo)
```

---

## 🚀 Status Atual

### ✅ Implementado:
1. **Configuração Base**
   - package.json com todas dependências
   - Config React Native (babel, metro)
   - Google Maps API configurado
   - Firebase configurado

2. **Serviços**
   - API Service (axios + JWT interceptors)
   - Storage Service (AsyncStorage)
   - Endpoints completos (auth, jobs, proposals, chat, etc)

3. **Utilitários**
   - Constantes (cores, API_URL, categorias)
   - Helpers (formatação de datas, moeda, validações)

### ⏳ Próximos Arquivos Necessários:

#### 1. Context (`src/context/AuthContext.js`)
```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';
import StorageService from '../services/storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await StorageService.getUser();
      const token = await StorageService.getAccessToken();
      if (storedUser && token) {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const { data } = await authAPI.login(credentials);
      await StorageService.saveTokens(data.access_token, data.refresh_token);
      await StorageService.saveUser(data.user);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao fazer login',
      };
    }
  };

  const signup = async (userData) => {
    try {
      const { data } = await authAPI.signup(userData);
      await StorageService.saveTokens(data.access_token, data.refresh_token);
      await StorageService.saveUser(data.user);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao cadastrar',
      };
    }
  };

  const logout = async () => {
    await StorageService.clearAll();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isClient: user?.role === 'client',
        isVideomaker: user?.role === 'videomaker',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

#### 2. Navigation (`src/navigation/AppNavigator.js`)
```javascript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Client Screens
import HomeScreen from '../screens/client/HomeScreen';
import CreateJobScreen from '../screens/client/CreateJobScreen';
import ProposalsScreen from '../screens/client/ProposalsScreen';

// Videomaker Screens
import FeedScreen from '../screens/videomaker/FeedScreen';
import MyJobsScreen from '../screens/videomaker/MyJobsScreen';

// Common Screens
import ChatScreen from '../screens/common/ChatScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ClientTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'CreateJob') iconName = 'add-circle';
        else if (route.name === 'Chat') iconName = 'chatbubbles';
        else if (route.name === 'Profile') iconName = 'person';
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#0E76FF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name=\"Home\" component={HomeScreen} />
    <Tab.Screen name=\"CreateJob\" component={CreateJobScreen} />
    <Tab.Screen name=\"Chat\" component={ChatScreen} />
    <Tab.Screen name=\"Profile\" component={ProfileScreen} />
  </Tab.Navigator>
);

const VideomakerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Feed') iconName = 'list';
        else if (route.name === 'MyJobs') iconName = 'briefcase';
        else if (route.name === 'Chat') iconName = 'chatbubbles';
        else if (route.name === 'Profile') iconName = 'person';
        
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#0E76FF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name=\"Feed\" component={FeedScreen} />
    <Tab.Screen name=\"MyJobs\" component={MyJobsScreen} />
    <Tab.Screen name=\"Chat\" component={ChatScreen} />
    <Tab.Screen name=\"Profile\" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name=\"Login\" component={LoginScreen} />
            <Stack.Screen name=\"Signup\" component={SignupScreen} />
          </>
        ) : user.role === 'client' ? (
          <Stack.Screen name=\"ClientApp\" component={ClientTabs} />
        ) : (
          <Stack.Screen name=\"VideomakerApp\" component={VideomakerTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

#### 3. App.js (Entry Point)
```javascript
import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle=\"dark-content\" backgroundColor=\"#FFFFFF\" />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;
```

#### 4. index.js
```javascript
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

---

## 📱 Telas Principais a Criar

### Auth Screens

#### `SplashScreen.js`
- Logo animado
- Loading indicator
- Verifica autenticação

#### `LoginScreen.js`
- Email + senha
- Botão "Entrar com Google"
- Link para cadastro

#### `SignupScreen.js`
- Form: nome, email, senha, telefone
- Seleção de role (Cliente ou Videomaker)
- Botão cadastrar

### Client Screens

#### `HomeScreen.js`
- Lista de videomakers próximos
- Mapa com pins
- Filtro por categoria
- Card com rating + distância

#### `CreateJobScreen.js`
- Form multi-step:
  1. Título, descrição, categoria
  2. Local (Google Maps)
  3. Data, duração
  4. Extras (checkboxes)
- Preview com valor mínimo calculado
- Botão "Publicar Job"

#### `ProposalsScreen.js`
- Lista de propostas recebidas
- Card com: videomaker, valor, prazo, portfólio
- Botões "Aceitar" / "Recusar"

### Videomaker Screens

#### `FeedScreen.js`
- Jobs próximos (geolocalização)
- Card: título, local, valor mínimo, distância
- Filtro por raio
- Botão "Enviar Proposta"

#### `MyJobsScreen.js`
- Tabs: Pendentes / Em andamento / Concluídos
- Status de propostas
- Botão para chat

### Common Screens

#### `ChatScreen.js`
- Lista de conversas
- Mensagens em tempo real
- Input com moderação
- Anexos (fotos)

#### `ProfileScreen.js`
- Avatar + nome
- Rating (estrelas)
- Portfólio (videomaker)
- Config: raio de atuação
- Botão logout

---

## 🎨 Componentes Reutilizáveis

### `JobCard.js`
```javascript
const JobCard = ({ job, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.header}>
      <Text style={styles.title}>{job.titulo}</Text>
      <Badge>{job.categoria}</Badge>
    </View>
    <Text style={styles.description}>{job.descricao}</Text>
    <View style={styles.footer}>
      <Text style={styles.location}>📍 {job.local.cidade}</Text>
      <Text style={styles.price}>{formatCurrency(job.valor_minimo)}</Text>
    </View>
  </TouchableOpacity>
);
```

### `ProposalCard.js`
- Avatar do videomaker
- Nome + rating
- Valor proposto
- Prazo de entrega
- Botões de ação

### `CustomButton.js`
- Variantes: primary, secondary, outline
- Loading state
- Icon support

---

## 🔧 Configuração Google Maps

### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<application>
  <meta-data
    android:name=\"com.google.android.geo.API_KEY\"
    android:value=\"AIzaSyCBweBXEmEkAR8l_-jpBRoQyeabYx0d0yk\"/>
</application>
```

### iOS (`ios/Podfile`)
```ruby
pod 'GoogleMaps'
pod 'Google-Maps-iOS-Utils'
```

---

## 🔔 Firebase Push Notifications

### Setup
```bash
# Android
# Adicionar google-services.json em android/app/

# iOS  
# Adicionar GoogleService-Info.plist em ios/
```

### Código (`src/services/notifications.js`)
```javascript
import messaging from '@react-native-firebase/messaging';
import StorageService from './storage';

export const requestPermission = async () => {
  const authStatus = await messaging().requestPermission();
  return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
};

export const getFCMToken = async () => {
  const token = await messaging().getToken();
  await StorageService.saveFCMToken(token);
  return token;
};

export const setupNotificationListeners = () => {
  messaging().onMessage(async remoteMessage => {
    console.log('Notification received:', remoteMessage);
    // Mostrar notificação local
  });
  
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background message:', remoteMessage);
  });
};
```

---

## 🔐 Google Sign-In

### Setup
```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: true,
});

export const googleSignIn = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    return userInfo;
  } catch (error) {
    console.error(error);
  }
};
```

---

## 🚀 Como Rodar

### Android
```bash
cd /app/mobile
yarn android
```

### iOS
```bash
cd /app/mobile
cd ios && pod install && cd ..
yarn ios
```

### Dev Mode
```bash
yarn start
```

---

## 📋 Checklist de Desenvolvimento

### Estrutura Base
- [x] package.json com dependências
- [x] Configuração React Native
- [x] Google Maps API key
- [x] Firebase config
- [x] Constants e Helpers
- [x] API Service (axios)
- [x] Storage Service

### Por Implementar
- [ ] AuthContext completo
- [ ] Navigation (Stack + Tabs)
- [ ] Telas de Auth (Login, Signup)
- [ ] Telas Cliente (Home, CreateJob, Proposals)
- [ ] Telas Videomaker (Feed, MyJobs)
- [ ] Chat Screen
- [ ] Profile Screen
- [ ] Componentes (JobCard, ProposalCard, etc)
- [ ] Google Sign-In integration
- [ ] Push Notifications setup
- [ ] Geolocalização (React Native Maps)
- [ ] Build Android (AAB)
- [ ] Build iOS (Archive)

---

## 🎯 Próximos Passos

1. **Criar AuthContext** completo
2. **Implementar Navigation** (Stack + Tabs)
3. **Desenvolver telas de Auth** (Splash, Login, Signup)
4. **Criar HomeScreen** (lista de videomakers + mapa)
5. **Implementar CreateJob** (form multi-step)
6. **Desenvolver Chat** (real-time)

---

## 📚 Documentação Útil

- React Navigation: https://reactnavigation.org/
- React Native Maps: https://github.com/react-native-maps/react-native-maps
- Firebase RN: https://rnfirebase.io/
- Google Sign-In: https://github.com/react-native-google-signin/google-signin

---

**Status**: Estrutura base criada ✅  
**Próximo**: Implementar telas e componentes 📱

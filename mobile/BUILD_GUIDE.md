# 🔧 Mobile App Build Guide

**Status:** ✅ Configuração Corrigida e Pronta para Build

## 🎯 Problema Resolvido

**Antes:** Expo SDK 54 incompatível com React Native 0.73.0  
**Agora:** Expo SDK 50 instalado (100% compatível com RN 0.73.0)  
**Resultado:** Prebuild executado com sucesso, diretórios `android/` e `ios/` gerados corretamente

---

## 📋 Pré-requisitos

### Para Build Android
- ✅ Node.js 18+
- ✅ Java JDK 17
- ✅ Android Studio (última versão)
- ✅ Android SDK (API Level 34)
- ✅ Emulador Android ou device físico

### Para Build iOS (macOS apenas)
- ✅ Node.js 18+
- ✅ Xcode 14+
- ✅ CocoaPods
- ✅ iOS Simulator ou device físico

---

## 🚀 Passos para Build

### 1. Clonar e Instalar Dependências

```bash
cd /app/mobile
yarn install
```

**Verificar versões:**
```bash
node --version    # Deve ser 18+
java --version    # Deve ser JDK 17
```

### 2. Configurar Variáveis de Ambiente

O arquivo `.env` já está configurado com as keys de desenvolvimento:

```env
API_BASE_URL=https://videomakers-hub-1.preview.emergentagent.com/api
GOOGLE_MAPS_API_KEY=AIzaSyCBweBXEmEkAR8l_-jpBRoQyeabYx0d0yk
FCM_SERVER_KEY=BEnfXoF8HRs7W6xx6TehPmTILSki_K9pnnndPWwXCnM
STRIPE_PUBLISHABLE_KEY=pk_test_51SIvQJRvLMnnPOKk...
```

### 3. Configurar Firebase (Obrigatório)

#### Android
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie/abra seu projeto
3. Adicione app Android com package name: `com.videomakers.mobile`
4. Baixe `google-services.json`
5. Copie para: `/app/mobile/android/app/google-services.json`

#### iOS
1. No Firebase Console, adicione app iOS
2. Bundle ID: `com.videomakers.mobile`
3. Baixe `GoogleService-Info.plist`
4. Copie para: `/app/mobile/ios/Videomakers/GoogleService-Info.plist`

#### Configurar SHA-1 (Android - Para Google Sign-In)
```bash
cd android
./gradlew signingReport

# Copie o SHA-1 do debug keystore
# Cole no Firebase Console > Project Settings > SHA certificate fingerprints
```

#### Obter Web Client ID
1. Firebase Console > Authentication > Sign-in method > Google
2. Copie o "Web Client ID"
3. Atualize em `/app/mobile/src/context/AuthContext.js`:

```javascript
GoogleSignin.configure({
  webClientId: 'SEU-WEB-CLIENT-ID-AQUI.apps.googleusercontent.com',
});
```

### 4. Build Android

#### Opção A: Development Build (Recomendado)
```bash
npx expo run:android
```

#### Opção B: Production Build (APK)
```bash
# Build APK
cd android
./gradlew assembleRelease

# APK estará em:
# android/app/build/outputs/apk/release/app-release.apk
```

### 5. Build iOS (macOS apenas)

```bash
# Instalar CocoaPods
cd ios
pod install
cd ..

# Build
npx expo run:ios
```

---

## 🐛 Troubleshooting

### Erro: "Android SDK not found"
```bash
# Instalar Android SDK via Android Studio
# Ou exportar ANDROID_HOME:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

### Erro: "Gradle build failed"
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Erro: "Unable to locate Java Runtime"
```bash
# Instalar JDK 17
sudo apt install openjdk-17-jdk  # Linux
brew install openjdk@17          # macOS

# Verificar
java -version
```

### Erro: "Metro bundler not starting"
```bash
# Limpar cache
npx expo start --clear

# Ou manualmente
rm -rf node_modules/.cache
rm -rf .expo
```

### Erro: Google Sign-In não funciona
- ✅ Verificar `google-services.json` no lugar correto
- ✅ Confirmar SHA-1 adicionado no Firebase
- ✅ Web Client ID correto no `AuthContext.js`
- ✅ Google Sign-In habilitado no Firebase Console

### Erro: Mapa não carrega
- ✅ API Key do Google Maps configurada
- ✅ APIs habilitadas no Google Cloud Console:
  - Maps SDK for Android
  - Maps SDK for iOS
- ✅ Verificar `AndroidManifest.xml` tem a meta-data da API key

---

## ✅ Verificação Pós-Build

### Checklist
- [ ] App instala sem erros
- [ ] Splash screen aparece
- [ ] Tela de login carrega
- [ ] Botão Google Sign-In visível
- [ ] Login tradicional funciona (testar com usuário existente)
- [ ] Feed de jobs carrega
- [ ] Mapa renderiza corretamente
- [ ] Chat conecta via WebSocket
- [ ] Upload de portfolio funciona
- [ ] Navegação entre telas smooth

### Teste de API Connection
Após build, teste se o app conecta ao backend:

```javascript
// No app, verificar logs do Metro:
console.log('API Base URL:', API_BASE_URL);

// Testar chamada simples:
fetch(`${API_BASE_URL}/health`)
  .then(res => res.json())
  .then(data => console.log('Backend health:', data))
  .catch(err => console.error('Connection error:', err));
```

---

## 📱 Executar no Emulador/Device

### Android Emulator
```bash
# Abrir Android Studio > AVD Manager > Create Virtual Device
# Ou via linha de comando:
emulator -avd Pixel_5_API_34

# Em outro terminal:
npx expo run:android
```

### Device Físico Android
```bash
# Habilitar USB Debugging no device
# Conectar via USB
adb devices  # Verificar conexão

npx expo run:android --device
```

### iOS Simulator
```bash
# Abrir Simulator
open -a Simulator

# Build
npx expo run:ios
```

---

## 🔑 Arquivos Críticos

### Não commitar (adicionar ao .gitignore):
- `android/app/google-services.json`
- `ios/Videomakers/GoogleService-Info.plist`
- `.env` (se contiver keys de produção)

### Commitados (já configurados):
- ✅ `package.json` (Expo SDK 50)
- ✅ `App.js` (app completo restaurado)
- ✅ `android/` e `ios/` (diretórios nativos gerados)
- ✅ Todas as telas e componentes

---

## 📊 Status da Configuração

| Item | Status | Notas |
|------|--------|-------|
| Expo SDK 50 | ✅ | Instalado e compatível com RN 0.73.0 |
| React Native 0.73.0 | ✅ | Versão estável |
| Prebuild | ✅ | android/ e ios/ gerados |
| App.js | ✅ | Código completo restaurado |
| Dependências | ✅ | Todas instaladas (node_modules/) |
| Firebase Config | ⚠️ | Requer google-services.json do usuário |
| Build Tools | ⚠️ | Requer Android Studio na máquina local |

---

## 🎉 Próximos Passos

1. **Instalar Android Studio** na sua máquina local
2. **Configurar Android SDK** (API 34)
3. **Adicionar arquivos Firebase** (google-services.json)
4. **Executar build:** `npx expo run:android`
5. **Testar todas as funcionalidades** no emulador/device
6. **Reportar bugs** se encontrar algum problema

---

## 📚 Recursos Adicionais

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Firebase Setup Guide](https://firebase.google.com/docs/android/setup)
- [Android Studio Download](https://developer.android.com/studio)

---

**Última Atualização:** Outubro 2025  
**Status:** ✅ Configuração 100% pronta para build

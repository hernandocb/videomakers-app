# 📱 Mobile App - Guia de Setup Completo

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Setup Inicial](#setup-inicial)
4. [Configuração de Integrações](#configuração-de-integrações)
5. [Build Android](#build-android)
6. [Build iOS](#build-ios)
7. [Testando o App](#testando-o-app)
8. [Troubleshooting](#troubleshooting)
9. [Estrutura de Arquivos](#estrutura-de-arquivos)

---

## Visão Geral

### Tecnologias do Mobile App

- **Framework:** React Native 0.73.0 (bare workflow)
- **Gerenciador de Pacotes:** Yarn
- **Build Tool:** Expo (para facilitar build)
- **Linguagem:** JavaScript (ES6+)
- **Navegação:** React Navigation v6

### Módulos Nativos Utilizados

1. **Google Maps** (`react-native-maps`)
2. **Google Sign-In** (`@react-native-google-signin/google-signin`)
3. **Firebase Messaging** (`@react-native-firebase/app`, `@react-native-firebase/messaging`)
4. **Image Picker** (`react-native-image-picker`)
5. **AsyncStorage** (`@react-native-async-storage/async-storage`)

### Por Que Não Funciona com Expo Go?

Expo Go só suporta módulos JavaScript puros. Como usamos módulos nativos (Google Maps, Firebase), precisamos fazer um **Development Build**.

---

## Pré-requisitos

### Para Todos os Sistemas

```bash
# Node.js 18+
node --version  # Deve ser >= 18.0.0

# Yarn
yarn --version

# Git
git --version
```

### Para Android

1. **Java JDK 17**
   ```bash
   # macOS (com Homebrew)
   brew install --cask zulu@17
   
   # Configurar JAVA_HOME
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
   source ~/.zshrc
   
   # Verificar
   java -version  # Deve mostrar 17.x.x
   ```

2. **Android Studio**
   - Download: https://developer.android.com/studio
   - Instalar SDK Tools:
     - Android SDK Platform 33
     - Android SDK Build-Tools 33.0.0
     - Android Emulator
   
3. **Configurar ANDROID_HOME**
   ```bash
   # macOS
   echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Criar Emulador Android**
   - Abrir Android Studio
   - Tools → AVD Manager
   - Create Virtual Device
   - Escolher: Pixel 9 Pro XL (ou similar)
   - System Image: Android 13 (API 33)

### Para iOS (somente macOS)

1. **Xcode 14+**
   - Download da App Store
   - Abrir e aceitar termos
   
2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   pod --version
   ```

3. **Simulador iOS**
   - Xcode → Preferences → Components
   - Baixar iOS 16+ Simulator

---

## Setup Inicial

### 1. Clonar Repositório

```bash
git clone https://github.com/hcb2019/videomakers-app.git
cd videomakers-app/mobile
```

### 2. Instalar Dependências

```bash
# Instalar pacotes Node
yarn install

# Para iOS (somente macOS)
cd ios
pod install
cd ..
```

### 3. Verificar Estrutura de Pastas

```bash
ls -la
# Deve mostrar:
# - android/
# - ios/
# - src/
# - node_modules/
# - package.json
# - App.js
```

---

## Configuração de Integrações

### 1. Google Maps API

**Já Configurado:**
- API Key: `AIzaSyCBweBXEmEkAR8l_-jpBRoQyeabYx0d0yk`
- Localização: `/app/mobile/src/utils/constants.js`

**Para uso em produção:**
1. Acessar: https://console.cloud.google.com/
2. Criar projeto ou usar existente
3. Habilitar APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Geocoding API
4. Gerar API Key
5. Adicionar restrições (bundle IDs do app)

**Configurar no App:**

**Android:** `/app/mobile/android/app/src/main/AndroidManifest.xml`
```xml
<application>
  ...
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="SUA_API_KEY_AQUI"/>
</application>
```

**iOS:** `/app/mobile/ios/Videomakers/AppDelegate.mm`
```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [GMSServices provideAPIKey:@"SUA_API_KEY_AQUI"];
  // ...
}
```

---

### 2. Firebase (Push Notifications + Google Sign-In)

#### 2.1 Criar Projeto Firebase

1. Acessar: https://console.firebase.google.com
2. Criar novo projeto: "Videomakers Platform"
3. Habilitar Google Analytics (opcional)

#### 2.2 Configurar Android

1. No Firebase Console:
   - Adicionar app Android
   - Package name: `com.videomakers.mobile`
   - Download `google-services.json`

2. Copiar arquivo:
   ```bash
   cp ~/Downloads/google-services.json /path/to/videomakers-app/mobile/android/app/
   ```

3. Verificar `/app/mobile/android/build.gradle`:
   ```gradle
   dependencies {
     classpath 'com.google.gms:google-services:4.3.15'
   }
   ```

4. Verificar `/app/mobile/android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

#### 2.3 Configurar iOS

1. No Firebase Console:
   - Adicionar app iOS
   - Bundle ID: `com.videomakers.mobile`
   - Download `GoogleService-Info.plist`

2. Copiar arquivo:
   ```bash
   cp ~/Downloads/GoogleService-Info.plist /path/to/videomakers-app/mobile/ios/
   ```

3. Abrir Xcode:
   ```bash
   open ios/Videomakers.xcworkspace
   ```
   - Arrastar `GoogleService-Info.plist` para a pasta do projeto
   - Marcar "Copy items if needed"

#### 2.4 Obter Web Client ID (Google Sign-In)

1. Firebase Console → Authentication → Sign-in method
2. Habilitar "Google"
3. Copiar **Web Client ID** (termina com `.apps.googleusercontent.com`)

4. Atualizar `/app/mobile/src/context/AuthContext.js`:
   ```javascript
   GoogleSignin.configure({
     webClientId: 'SEU_WEB_CLIENT_ID_AQUI.apps.googleusercontent.com',
     offlineAccess: true,
   });
   ```

#### 2.5 Obter SHA-1 Certificate (Android)

```bash
cd android
./gradlew signingReport

# Copiar SHA-1 da variante "debug"
# Exemplo: SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Adicionar no Firebase Console:
- Project Settings → Your apps → Android app
- Adicionar SHA-1 certificate

#### 2.6 Testar Firebase

```bash
# Verificar se arquivo existe
ls android/app/google-services.json
ls ios/GoogleService-Info.plist
```

---

### 3. Stripe (Pagamentos)

**Já Configurado:**
- Publishable Key: `pk_test_51SIvQJRvLMnnPOKk...`
- Localização: `/app/mobile/src/utils/constants.js`

**Nenhuma configuração adicional necessária no mobile.**
Toda lógica de pagamento é no backend (Stripe Connect).

---

### 4. Backend URL

**Já Configurado:**
```javascript
// /app/mobile/src/utils/constants.js
export const API_URL = 'https://videoconnect-3.preview.emergentagent.com/api';
export const WS_URL = 'wss://videotalent-1.preview.emergentagent.com/api/ws';
```

**Para ambiente local:**
```javascript
export const API_URL = 'http://localhost:8001/api';
export const WS_URL = 'ws://localhost:8001/api/ws';
```

---

## Build Android

### Método 1: Usando Expo (Recomendado)

```bash
cd /path/to/videomakers-app/mobile

# Atualizar React Native para versão compatível
yarn add react-native@0.81.5
yarn add react@19.1.0

# Regenerar pastas nativas
rm -rf android ios
npx expo prebuild --clean

# Build e instalar
npx expo run:android
```

**Tempo estimado:** 10-15 minutos (primeira vez)

### Método 2: Usando React Native CLI

```bash
# Iniciar Metro Bundler
yarn start

# Em outro terminal
yarn android
```

### Gerar APK para Testes

```bash
cd android
./gradlew assembleRelease

# APK gerado em:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Build iOS

### Método 1: Usando Expo

```bash
cd /path/to/videomakers-app/mobile

# Build e instalar
npx expo run:ios
```

### Método 2: Usando Xcode

```bash
# Instalar pods
cd ios
pod install
cd ..

# Abrir Xcode
open ios/Videomakers.xcworkspace

# No Xcode:
# 1. Selecionar dispositivo/simulador
# 2. Product → Run (ou Cmd+R)
```

### Gerar IPA para Testes

1. Xcode → Product → Archive
2. Distribute App → Development
3. Exportar IPA

---

## Testando o App

### 1. Verificar Conectividade

**Backend:**
```bash
curl https://videoconnect-3.preview.emergentagent.com/api/health
# Deve retornar: {"status": "ok"}
```

**Metro Bundler:**
```bash
# Terminal deve mostrar:
# ▶️ Metro waiting on exp://...
```

### 2. Testar Fluxos Principais

#### 2.1 Autenticação

**Cadastro:**
1. Abrir app
2. Clicar "Cadastre-se"
3. Preencher:
   - Nome: "Test User"
   - Email: "test@example.com"
   - Senha: "senha123"
   - Telefone: "11999999999"
   - Role: "client" ou "videomaker"
4. Cadastrar
5. **Esperado:** Redireciona para tela principal

**Login:**
1. Email: "test@example.com"
2. Senha: "senha123"
3. Clicar "Entrar"
4. **Esperado:** Entra no app

**Google Sign-In:**
1. Clicar "Entrar com Google"
2. Selecionar conta
3. **Esperado:** Cria/loga usuário

**Troubleshooting Google Sign-In:**
- Se erro "Developer Error": Web Client ID incorreto
- Se erro "Sign in failed": SHA-1 não adicionado no Firebase
- Se não abre popup: Verificar `google-services.json`

#### 2.2 Feed de Jobs (Videomaker)

1. Logar como videomaker
2. Ver lista de jobs disponíveis
3. Testar filtros:
   - Categoria
   - Distância
   - Orçamento
4. Clicar no botão "Mapa"
5. **Esperado:**
   - Mapa com marcadores de jobs
   - Círculo de raio do usuário
6. Clicar em um job
7. **Esperado:** Abre tela de detalhes

**Troubleshooting Maps:**
- Se mapa não carrega: API Key inválida
- Se marcadores não aparecem: Jobs sem latitude/longitude
- Se erro de permissão: Verificar AndroidManifest.xml

#### 2.3 Chat

**Pré-requisito:** Job com proposta aceita

1. Abrir chat
2. **Esperado:** Indicador verde (conectado)
3. Digitar mensagem: "Olá!"
4. Enviar
5. **Esperado:** Mensagem aparece na tela (azul, direita)

**Testar Moderação:**
1. Enviar: "(11) 99999-9999"
2. **Esperado:** Alerta "Mensagem Bloqueada"
3. Mensagem aparece com 🚫

**Troubleshooting Chat:**
- Se indicador fica cinza: WebSocket não conectou
  - Verificar URL em constants.js
  - Verificar backend está rodando
- Se mensagens não enviam: Token inválido
- Se não recebe mensagens: Verificar listener do WebSocket

#### 2.4 Portfolio (Videomaker)

1. Ir para tela de Portfolio
2. Clicar "+ Adicionar Mídia"
3. Selecionar foto/vídeo (max 25MB)
4. **Esperado:**
   - Upload inicia
   - Imagem aparece na galeria
5. Pressionar e segurar para deletar

**Troubleshooting Upload:**
- Se erro "File too large": Arquivo > 25MB
- Se não abre galeria: Permissões não concedidas
- Se upload falha: Backend não aceita multipart/form-data

#### 2.5 Pagamento (Cliente)

1. Ver propostas recebidas
2. Clicar "Aceitar" em uma proposta
3. Preencher dados do cartão:
   - Número: 4242 4242 4242 4242 (teste Stripe)
   - Validade: 12/30
   - CVV: 123
   - Nome: TEST USER
4. Clicar "Pagar"
5. **Esperado:**
   - Loading
   - Mensagem de sucesso
   - Redireciona para Home

**Troubleshooting Pagamento:**
- Se erro 400: Dados do cartão inválidos
- Se erro 500: Problema no backend (Stripe keys)
- Se não processa: Verificar logs do backend

---

## Troubleshooting

### Problemas Comuns

#### 1. Metro Bundler não inicia

```bash
# Limpar cache
yarn start --reset-cache

# Se ainda não funciona
rm -rf node_modules
yarn install
yarn start
```

#### 2. Build Android falha

**Erro: "SDK location not found"**
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

**Erro: "Java version incompatible"**
```bash
# Verificar versão
java -version  # Deve ser 17.x

# Se diferente, configurar JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

**Erro: "Execution failed for task ':app:mergeDebugResources'"**
```bash
cd android
./gradlew clean
cd ..
yarn android
```

#### 3. Build iOS falha

**Erro: "CocoaPods not installed"**
```bash
sudo gem install cocoapods
```

**Erro: "No such module 'RNGoogleSignin'"**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

**Erro: "Undefined symbols for architecture arm64"**
```bash
# Limpar build do Xcode
# Xcode → Product → Clean Build Folder (Shift+Cmd+K)
```

#### 4. App abre mas tela branca

```bash
# Verificar logs
# Android
adb logcat | grep ReactNative

# iOS (no Xcode)
# View → Debug Area → Activate Console
```

**Causas comuns:**
- Erro de sintaxe no código
- Importação de módulo faltando
- AuthContext travando no loading

#### 5. Hot Reload não funciona

```bash
# Android: Abrir Dev Menu
adb shell input keyevent 82

# iOS: Cmd+D no simulador

# Habilitar Hot Reload
# Dev Menu → Enable Hot Reloading
```

#### 6. Erro "Unable to resolve module"

```bash
# Limpar tudo
rm -rf node_modules
yarn install
yarn start --reset-cache
```

---

## Estrutura de Arquivos

### Principais Arquivos/Pastas

```
mobile/
├── android/                    # Código nativo Android
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── java/com/videomakers/mobile/
│   │   └── build.gradle          # Dependências Android
│   └── build.gradle              # Configuração global
│
├── ios/                        # Código nativo iOS
│   ├── Videomakers/
│   │   ├── AppDelegate.mm
│   │   └── Info.plist
│   ├── Podfile                   # Dependências iOS
│   └── Videomakers.xcworkspace
│
├── src/                        # Código JavaScript
│   ├── screens/                # Telas do app (14 telas)
│   │   ├── auth/
│   │   │   ├── SplashScreen.js
│   │   │   ├── LoginScreen.js
│   │   │   └── SignupScreen.js
│   │   ├── client/
│   │   │   ├── HomeScreen.js
│   │   │   ├── CreateJobScreen.js
│   │   │   ├── ProposalsScreen.js
│   │   │   └── PaymentScreen.js
│   │   ├── videomaker/
│   │   │   ├── FeedScreen.js
│   │   │   ├── JobDetailsScreen.js
│   │   │   ├── PortfolioScreen.js
│   │   │   └── MyJobsScreen.js
│   │   └── common/
│   │       ├── ChatScreen.js
│   │       ├── RatingScreen.js
│   │       └── ProfileScreen.js
│   │
│   ├── components/             # Componentes reusáveis
│   │   ├── CustomButton.js
│   │   ├── InputField.js
│   │   ├── JobCard.js
│   │   └── LoadingSpinner.js
│   │
│   ├── navigation/             # Navegação
│   │   └── AppNavigator.js
│   │
│   ├── context/                # React Context
│   │   └── AuthContext.js
│   │
│   ├── services/               # APIs e storage
│   │   ├── api.js
│   │   └── storage.js
│   │
│   └── utils/                  # Utilitários
│       ├── constants.js        # URLs, API keys, cores
│       └── helpers.js          # Funções auxiliares
│
├── App.js                      # Entry point
├── app.json                    # Configuração Expo/RN
├── package.json                # Dependências Node
├── babel.config.js
├── metro.config.js
└── .env                        # Variáveis de ambiente
```

### Arquivos Importantes para Desenvolvedores

1. **`src/utils/constants.js`**
   - URLs do backend
   - API keys
   - Cores, tamanhos, configurações

2. **`src/services/api.js`**
   - Todas as chamadas de API
   - Interceptors (auth, errors)

3. **`src/context/AuthContext.js`**
   - Lógica de autenticação
   - Google Sign-In
   - Gerenciamento de tokens

4. **`src/navigation/AppNavigator.js`**
   - Estrutura de navegação
   - Rotas do app

5. **`app.json`**
   - Configurações do app
   - Bundle IDs
   - Permissões

---

## Checklist de Setup

### Antes de Construir o App

- [ ] Node.js 18+ instalado
- [ ] Java JDK 17 instalado (Android)
- [ ] Android Studio configurado (Android)
- [ ] Xcode instalado (iOS, somente macOS)
- [ ] Dependências instaladas (`yarn install`)
- [ ] Firebase configurado (`google-services.json`, `GoogleService-Info.plist`)
- [ ] Web Client ID atualizado em `AuthContext.js`
- [ ] SHA-1 adicionado no Firebase (Android)
- [ ] API Keys verificadas em `constants.js`

### Antes de Testar

- [ ] Backend rodando (https://videoconnect-3.preview.emergentagent.com/api)
- [ ] Metro Bundler iniciado (`yarn start`)
- [ ] Emulador/dispositivo conectado
- [ ] Permissões concedidas (câmera, localização)

### Testes Mínimos

- [ ] Login funciona
- [ ] Google Sign-In funciona
- [ ] Feed carrega jobs
- [ ] Mapa exibe marcadores
- [ ] Chat conecta e envia mensagens
- [ ] Upload de portfolio funciona
- [ ] Pagamento processa (cartão de teste)

---

## Próximos Passos

### Para Desenvolvimento

1. **Atualizar React Native** (recomendado)
   ```bash
   yarn add react-native@0.81.5
   yarn add react@19.1.0
   ```

2. **Resolver Warnings de Dependências**
   ```bash
   npx expo install --fix
   ```

3. **Adicionar Testes**
   - Unit tests (Jest)
   - Integration tests (Detox)

4. **Otimizações**
   - Code splitting
   - Lazy loading
   - Image optimization

### Para Publicação

1. **Configurar ícones e splash screen**
2. **Gerar builds de release**
3. **Testar em dispositivos reais**
4. **Preparar stores (Google Play, App Store)**
5. **Configurar CI/CD**

---

## Recursos Adicionais

### Documentação Oficial

- React Native: https://reactnative.dev/docs/getting-started
- Expo: https://docs.expo.dev/
- React Navigation: https://reactnavigation.org/docs/getting-started
- Firebase: https://rnfirebase.io/
- Google Maps: https://github.com/react-native-maps/react-native-maps

### Troubleshooting Geral

- Stack Overflow: https://stackoverflow.com/questions/tagged/react-native
- React Native Community: https://github.com/react-native-community
- Expo Forums: https://forums.expo.dev/

---

**Última atualização:** Outubro 2025
**Versão do App:** 1.0.0

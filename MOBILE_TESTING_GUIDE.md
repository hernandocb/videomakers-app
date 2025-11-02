# 📱 Guia de Teste - Aplicativo Mobile Videomakers

## 🚀 Como Executar o App

### Pré-requisitos:
- Node.js 18+
- React Native CLI instalado
- Android Studio (para Android) ou Xcode (para iOS)
- Dispositivo físico ou emulador

### Passos para Executar:

```bash
# 1. Navegar para a pasta mobile
cd /app/mobile

# 2. Instalar dependências (se ainda não instalou)
yarn install

# 3. Para Android:
npx react-native run-android

# 4. Para iOS (somente macOS):
cd ios && pod install && cd ..
npx react-native run-ios
```

---

## ✅ Checklist de Testes

### 1. **Autenticação - Email/Senha** ✓

**Teste de Signup:**
- [ ] Abrir o app
- [ ] Clicar em "Cadastre-se"
- [ ] Preencher: nome, email, senha, telefone, role (client/videomaker)
- [ ] Verificar se cadastro foi bem-sucedido
- [ ] Verificar se app navegou para tela principal

**Teste de Login:**
- [ ] Na tela de login, inserir email e senha
- [ ] Clicar em "Entrar"
- [ ] Verificar se login foi bem-sucedido
- [ ] Verificar se token foi salvo (não aparece logout)

---

### 2. **Autenticação - Google Sign-In** 🆕

**IMPORTANTE:** Para testar Google Sign-In, você precisa:

1. **Configurar Firebase Console:**
   - Acesse: https://console.firebase.google.com
   - Criar projeto ou usar existente
   - Habilitar "Google Sign-In" em Authentication
   - Adicionar Android/iOS app no projeto
   - Baixar `google-services.json` (Android) ou `GoogleService-Info.plist` (iOS)

2. **Android - Configuração:**
   ```bash
   # Copiar google-services.json para:
   /app/mobile/android/app/google-services.json
   
   # Adicionar ao android/build.gradle:
   classpath 'com.google.gms:google-services:4.3.15'
   
   # Adicionar ao android/app/build.gradle:
   apply plugin: 'com.google.gms.google-services'
   ```

3. **iOS - Configuração:**
   ```bash
   # Copiar GoogleService-Info.plist para:
   /app/mobile/ios/GoogleService-Info.plist
   ```

4. **Atualizar Web Client ID:**
   No arquivo `/app/mobile/src/context/AuthContext.js`, linha 15:
   ```javascript
   webClientId: 'SEU_WEB_CLIENT_ID.apps.googleusercontent.com'
   ```
   Encontre o Web Client ID no Firebase Console.

**Teste:**
- [ ] Clicar no botão "Entrar com Google"
- [ ] Selecionar conta Google
- [ ] Verificar se login foi bem-sucedido
- [ ] Verificar se usuário foi criado/logado no backend
- [ ] Verificar se foto do perfil Google foi salva

---

### 3. **Chat em Tempo Real (WebSocket)** 🆕

**Pré-requisito:** Ter 2 usuários (client e videomaker) e um job com proposta aceita.

**Setup do Teste:**
1. Criar job como client
2. Criar proposta como videomaker
3. Aceitar proposta
4. Abrir chat

**Teste de Conexão:**
- [ ] Abrir ChatScreen com chatId válido
- [ ] Verificar indicador verde (conectado) no canto superior direito
- [ ] Se desconectar, deve ficar cinza e reconectar automaticamente

**Teste de Envio de Mensagens:**
- [ ] Digitar mensagem no campo de texto
- [ ] Clicar em "Enviar"
- [ ] Verificar se mensagem aparece na tela (azul, lado direito)
- [ ] Verificar timestamp da mensagem

**Teste de Recebimento de Mensagens:**
- [ ] Em outro dispositivo/emulador, logar como o outro usuário
- [ ] Enviar mensagem
- [ ] Verificar se mensagem aparece no primeiro dispositivo (cinza, lado esquerdo)

**Teste de Moderação - Mensagens Bloqueadas:**
- [ ] Tentar enviar número de telefone: "(11) 99999-9999"
- [ ] Deve aparecer alerta: "Mensagem Bloqueada"
- [ ] Mensagem deve aparecer como bloqueada (🚫)

- [ ] Tentar enviar email: "teste@email.com"
- [ ] Deve ser bloqueada

- [ ] Tentar enviar link: "https://google.com"
- [ ] Deve ser bloqueada

**Teste de Reconexão:**
- [ ] Desligar WiFi/dados
- [ ] Indicador deve ficar cinza
- [ ] Religar WiFi/dados
- [ ] Indicador deve voltar verde automaticamente (em ~3s)

---

## 🐛 Problemas Conhecidos

### Google Sign-In não funciona:
- **Solução:** Verificar se Web Client ID está correto
- **Solução:** Verificar se SHA-1 certificate foi adicionado no Firebase (Android)
- **Solução:** Limpar cache: `yarn start --reset-cache`

### Chat não conecta:
- **Solução:** Verificar se backend está rodando
- **Solução:** Verificar URL do WebSocket em constants.js: `wss://videotalent-1.preview.emergentagent.com/api/ws`
- **Solução:** Verificar se chatId é válido

### App não inicia:
- **Solução:** Limpar build: 
  ```bash
  cd android && ./gradlew clean && cd ..
  ```
- **Solução:** Reinstalar node_modules:
  ```bash
  rm -rf node_modules && yarn install
  ```

---

## 📊 Resultados Esperados

### ✅ Sucesso:
- Login com email/senha funciona
- Google Sign-In funciona (após configuração Firebase)
- Chat conecta e envia/recebe mensagens
- Mensagens com números/emails/links são bloqueadas
- Reconexão automática funciona

### ❌ Falha:
- App não inicia (erro de build)
- Google Sign-In falha na autenticação
- Chat não conecta ao WebSocket
- Mensagens não são enviadas/recebidas
- Moderação não funciona (mensagens proibidas passam)

---

## 📝 Como Reportar Problemas

Ao encontrar um problema, forneça:

1. **Descrição:** O que aconteceu vs. o que era esperado
2. **Passos:** Como reproduzir o problema
3. **Screenshots:** Se possível
4. **Logs:** 
   ```bash
   # Android
   adb logcat | grep ReactNative
   
   # iOS
   Veja Console.app
   ```
5. **Ambiente:** Android/iOS, versão, dispositivo/emulador

---

## 🎯 Próximos Testes (Após Implementação)

- Google Maps (seletor de localização)
- Upload de Portfolio
- Pagamento com Stripe
- Sistema de Avaliações
- Feed de Jobs com filtros

---

## 💡 Dicas

- Use React Native Debugger para debug
- Use Flipper para inspecionar rede/Redux
- Logs do backend: `tail -f /var/log/supervisor/backend.*.log`
- Para debug do WebSocket, use console.log no ChatScreen.js

# 🚀 Guia Rápido - Como Testar o App Mobile

## Opção 1: Testar no seu Computador/Emulador (Recomendado)

### Para Android (Windows/Mac/Linux):

**Pré-requisitos:**
- Node.js instalado
- Android Studio instalado
- Emulador Android configurado OU dispositivo Android conectado via USB

**Passos:**

1. **Iniciar o Metro Bundler:**
```bash
cd /app/mobile
yarn install  # Se ainda não instalou as dependências
npx react-native start
```

2. **Em outro terminal, executar o app:**
```bash
cd /app/mobile
npx react-native run-android
```

3. **Aguardar a compilação** (primeira vez pode levar 5-10 minutos)

---

### Para iOS (Somente macOS):

**Pré-requisitos:**
- macOS com Xcode instalado
- CocoaPods instalado (`sudo gem install cocoapods`)

**Passos:**

1. **Instalar dependências iOS:**
```bash
cd /app/mobile/ios
pod install
cd ..
```

2. **Iniciar o Metro Bundler:**
```bash
npx react-native start
```

3. **Em outro terminal, executar o app:**
```bash
npx react-native run-ios
```

---

## Opção 2: Testar no Dispositivo Físico

### Android (USB Debugging):

1. **Habilitar modo desenvolvedor no Android:**
   - Configurações → Sobre o telefone → Toque 7x em "Número da versão"
   - Voltar → Opções do desenvolvedor → Habilitar "Depuração USB"

2. **Conectar via USB e executar:**
```bash
cd /app/mobile
adb devices  # Verificar se dispositivo foi detectado
npx react-native run-android
```

### iOS (Físico):

1. Abrir `/app/mobile/ios/videomakers-mobile.xcworkspace` no Xcode
2. Selecionar seu dispositivo
3. Clicar em "Run" (▶️)

---

## 🧪 O Que Testar (Checklist)

### 1. Autenticação

**Teste 1: Cadastro com Email/Senha**
- [ ] Abrir app → Clicar em "Cadastre-se"
- [ ] Preencher: Nome, Email, Senha, Telefone
- [ ] Escolher role: Client ou Videomaker
- [ ] Verificar se cadastro funciona

**Teste 2: Login**
- [ ] Fazer login com email/senha criado
- [ ] Verificar se entra no app

**Teste 3: Google Sign-In (Requer configuração Firebase)**
- [ ] Clicar em "Entrar com Google"
- [ ] Selecionar conta
- [ ] Verificar se cria/loga usuário

---

### 2. Feed de Jobs (Videomaker)

- [ ] Ver lista de jobs disponíveis
- [ ] Clicar no botão "🗺️ Mapa"
- [ ] Ver jobs no mapa com marcadores
- [ ] Clicar em "🔍 Filtros"
- [ ] Testar filtros: categoria, distância, orçamento
- [ ] Verificar contador de jobs filtrados

---

### 3. Criar Proposta (Videomaker)

- [ ] Clicar em um job no feed
- [ ] Ver detalhes do job (descrição, valor, mapa)
- [ ] Clicar em "Enviar Proposta"
- [ ] Preencher: Valor proposto, Prazo, Mensagem
- [ ] Enviar proposta
- [ ] Verificar mensagem de sucesso

---

### 4. Ver Propostas (Cliente)

- [ ] Ir para aba "Propostas"
- [ ] Ver lista de propostas recebidas
- [ ] Ver detalhes: nome videomaker, rating, valor, prazo
- [ ] Testar "Rejeitar" proposta
- [ ] Testar "Aceitar" proposta (vai para pagamento)

---

### 5. Pagamento (Cliente)

- [ ] Após aceitar proposta, preencher dados do cartão
- [ ] Número: 0000 0000 0000 0000 (mock)
- [ ] Validade: 12/25
- [ ] CVV: 123
- [ ] Nome: TESTE
- [ ] Clicar em "Pagar"
- [ ] Verificar se processa

---

### 6. Chat em Tempo Real

**Setup:** Precisa de 2 usuários (client e videomaker) e job aceito

- [ ] Abrir chat
- [ ] Ver indicador verde (conectado)
- [ ] Enviar mensagem
- [ ] Verificar se aparece na tela
- [ ] Testar mensagem bloqueada: "(11) 99999-9999"
- [ ] Ver alerta de bloqueio

---

### 7. Portfolio (Videomaker)

- [ ] Ir para tela de Portfolio
- [ ] Clicar em "+ Adicionar Mídia"
- [ ] Selecionar foto/vídeo da galeria
- [ ] Verificar upload
- [ ] Ver item na galeria
- [ ] Pressionar e segurar para deletar

---

### 8. Sistema de Avaliações

**Após job concluído:**

- [ ] Abrir tela de avaliação
- [ ] Selecionar estrelas (1-5)
- [ ] Escrever comentário
- [ ] Enviar avaliação
- [ ] Verificar sucesso

---

## 🐛 Problemas Comuns e Soluções

### Erro: "Metro Bundler não conecta"
```bash
npx react-native start --reset-cache
```

### Erro: "Unable to resolve module"
```bash
cd /app/mobile
rm -rf node_modules
yarn install
```

### Erro: Build Android falha
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Erro: "Google Sign-In não funciona"
**Solução:** Precisa configurar Firebase Console:
1. https://console.firebase.google.com
2. Criar projeto
3. Adicionar app Android/iOS
4. Baixar `google-services.json` (Android)
5. Colocar em `/app/mobile/android/app/`
6. Atualizar Web Client ID em `AuthContext.js`

### App abre tela branca
- Verificar se Metro Bundler está rodando
- Apertar "R" duas vezes (reload)
- Verificar logs do Metro Bundler

### Google Maps não aparece
- Verificar se API key está em `constants.js`
- Verificar se API está habilitada no Google Cloud Console

---

## 📱 Testando Backend (Sem Emulador)

Se você não tem ambiente React Native configurado, pode testar apenas o backend:

```bash
# Testar cadastro
curl -X POST https://videoconnect-3.preview.emergentagent.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123",
    "nome": "Teste User",
    "telefone": "11999999999",
    "role": "client"
  }'

# Testar login
curl -X POST https://videoconnect-3.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123"
  }'
```

---

## 💡 Dicas

1. **Hot Reload:** Salve arquivos e o app recarrega automaticamente
2. **Debug Menu:** 
   - Android: Cmd+M (Mac) ou Ctrl+M (Windows/Linux)
   - iOS: Cmd+D
3. **Inspecionar Elemento:** Ativar "Show Inspector" no Debug Menu
4. **Logs:**
   ```bash
   # Android
   adb logcat | grep ReactNative
   
   # iOS
   tail -f ~/Library/Logs/simulator.log
   ```

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. **Descreva o erro:** O que você tentou fazer?
2. **Logs:** Copie os logs do Metro Bundler ou terminal
3. **Screenshots:** Se possível, tire prints do erro
4. **Ambiente:** Android/iOS? Emulador ou físico?

Envie essas informações e eu te ajudo a resolver! 🚀

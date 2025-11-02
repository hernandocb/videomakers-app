# 📱 Plataforma de Videomakers - Documentação Completa

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Backend - FastAPI](#backend---fastapi)
6. [Admin Web - React](#admin-web---react)
7. [Mobile App - React Native](#mobile-app---react-native)
8. [Integrações Externas](#integrações-externas)
9. [Guia de Setup](#guia-de-setup)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### Descrição do Projeto

**Plataforma de Videomakers** é um marketplace (Uber para videomakers) que conecta clientes a profissionais de vídeo. A plataforma permite:

- **Clientes:** Criar jobs, receber propostas, realizar pagamentos via escrow
- **Videomakers:** Buscar jobs por localização, enviar propostas, gerenciar portfolio
- **Admins:** Gerenciar usuários, jobs, pagamentos, moderação de chat

### Funcionalidades Principais

#### Para Clientes:
- ✅ Criar jobs com detalhes (data, duração, localização, extras)
- ✅ Receber e avaliar propostas de videomakers
- ✅ Chat em tempo real com moderação
- ✅ Pagamento via Stripe (escrow)
- ✅ Avaliar videomaker após conclusão

#### Para Videomakers:
- ✅ Buscar jobs por localização (Google Maps + raio)
- ✅ Enviar propostas com valor e prazo
- ✅ Upload de portfolio (fotos/vídeos)
- ✅ Chat em tempo real
- ✅ Receber pagamentos (80% do valor, 20% comissão)

#### Para Admins:
- ✅ Dashboard com KPIs
- ✅ Gestão de usuários, jobs, pagamentos
- ✅ Moderação de chat (regex: bloqueia números, emails, links)
- ✅ Configurações da plataforma (comissão, fórmula de valor mínimo)
- ✅ Resolução de disputas

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
├──────────────────┬──────────────────┬──────────────────────┤
│   Mobile App     │   Admin Web      │   Future: Website    │
│  (React Native)  │    (React)       │                      │
└──────────────────┴──────────────────┴──────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│                   FastAPI Backend                            │
│                 (Python + MongoDB)                           │
├─────────────────────────────────────────────────────────────┤
│  • REST APIs            • WebSocket (Chat)                   │
│  • JWT Auth             • File Upload                        │
│  • Rate Limiting        • LGPD Compliance                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
├──────────────────┬──────────────────┬──────────────────────┤
│  Stripe Connect  │  Google Maps     │  Firebase (Push)     │
│  (Payments)      │  (Geolocation)   │  (Notifications)     │
└──────────────────┴──────────────────┴──────────────────────┘
```

### Fluxo de Dados Principal

1. **Criação de Job:**
   - Cliente cria job via Mobile/Web
   - Backend calcula "Valor Mínimo Sugerido" (R$120/hora + extras)
   - Job fica disponível para videomakers

2. **Proposta:**
   - Videomaker envia proposta (valor, prazo, mensagem)
   - Cliente visualiza e aceita/rejeita

3. **Pagamento (Escrow):**
   - Cliente paga via Stripe ao aceitar proposta
   - Valor fica retido (hold) no Stripe
   - 80% vai para videomaker, 20% comissão da plataforma
   - Liberado após cliente confirmar conclusão

4. **Chat:**
   - WebSocket em tempo real
   - Moderação via regex (bloqueia: números, emails, links)
   - Histórico salvo no MongoDB

---

## Stack Tecnológico

### Backend
- **Framework:** FastAPI 0.104+
- **Linguagem:** Python 3.9+
- **Banco de Dados:** MongoDB (max 25MB storage)
- **Autenticação:** JWT (access + refresh tokens)
- **WebSocket:** FastAPI WebSocket support
- **Validação:** Pydantic v2
- **Rate Limiting:** slowapi

### Frontend Admin Web
- **Framework:** React 18.2
- **Roteamento:** React Router v6
- **UI Library:** Tailwind CSS + shadcn/ui
- **HTTP Client:** Axios
- **Gerenciamento de Estado:** React Context API

### Mobile App
- **Framework:** React Native 0.73.0 (puro, não Expo managed)
- **Navegação:** React Navigation v6
- **Maps:** react-native-maps
- **Auth Social:** @react-native-google-signin/google-signin
- **Push:** @react-native-firebase/messaging
- **Imagens:** react-native-image-picker
- **Storage:** @react-native-async-storage/async-storage

### Serviços Externos
- **Pagamentos:** Stripe Connect (escrow)
- **Mapas:** Google Maps API
- **Push Notifications:** Firebase Cloud Messaging
- **Auth Social:** Google Sign-In

---

## Estrutura do Projeto

```
/app/
├── backend/                 # FastAPI Backend
│   ├── models/              # Pydantic models (MongoDB)
│   ├── routers/             # API endpoints
│   ├── services/            # Business logic
│   ├── middleware/          # Auth, rate limiting
│   ├── utils/               # Helpers, constants
│   ├── server.py            # Main application
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
│
├── frontend/                # Admin Web (React)
│   ├── src/
│   │   ├── pages/admin/     # Admin panel pages
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   └── services/        # API calls
│   ├── package.json
│   └── .env
│
├── mobile/                  # React Native App
│   ├── src/
│   │   ├── screens/         # App screens
│   │   │   ├── auth/        # Login, Signup, Splash
│   │   │   ├── client/      # Client-specific screens
│   │   │   ├── videomaker/  # Videomaker-specific screens
│   │   │   └── common/      # Shared screens
│   │   ├── components/      # Reusable components
│   │   ├── navigation/      # Navigation setup
│   │   ├── context/         # Auth context
│   │   ├── services/        # API, storage
│   │   └── utils/           # Constants, helpers
│   ├── android/             # Android native code
│   ├── ios/                 # iOS native code
│   ├── App.js               # Entry point
│   ├── package.json
│   └── app.json             # Expo/RN config
│
├── tests/                   # Backend tests
├── DOCUMENTACAO_COMPLETA.md # Este arquivo
├── API_REFERENCE.md         # Documentação de APIs
├── MOBILE_SETUP_GUIDE.md    # Guia de setup mobile
└── test_result.md           # Histórico de testes
```

---

## Backend - FastAPI

Ver documentação detalhada em: [API_REFERENCE.md](API_REFERENCE.md)

### Principais Endpoints

- **Auth:** `/api/auth/` - signup, login, refresh, google
- **Users:** `/api/users/` - CRUD, profile
- **Jobs:** `/api/jobs/` - CRUD, search, filters
- **Proposals:** `/api/proposals/` - create, accept, reject
- **Payments:** `/api/payments/` - hold, release, refund
- **Chat:** `/api/ws/{chat_id}` - WebSocket
- **Ratings:** `/api/ratings/` - create, list
- **Admin:** `/api/admin/` - dashboard, config

### Modelos de Dados

Ver detalhes completos em: [API_REFERENCE.md](API_REFERENCE.md)

---

## Admin Web - React

### URL de Acesso
- **Produção:** https://videoconnect-3.preview.emergentagent.com
- **Local:** http://localhost:3000

### Páginas Implementadas

1. **Login** (`/admin/login`)
2. **Dashboard** (`/admin/dashboard`) - KPIs, estatísticas
3. **Usuários** (`/admin/users`) - Lista, edição, ban
4. **Jobs** (`/admin/jobs`) - Lista, status, moderação
5. **Pagamentos** (`/admin/payments`) - Histórico, disputas
6. **Configurações** (`/admin/config`) - Parâmetros da plataforma
7. **Moderação** (`/admin/moderation`) - Chat, regras de bloqueio

### Credenciais Admin Padrão
- **Email:** admin@videomakers.com
- **Senha:** admin123 (trocar após primeiro login)

---

## Mobile App - React Native

Ver guia completo em: [MOBILE_SETUP_GUIDE.md](MOBILE_SETUP_GUIDE.md)

### Telas Implementadas

#### Autenticação (3 telas)
1. **SplashScreen** - Logo, carregamento inicial
2. **LoginScreen** - Email/senha + Google Sign-In
3. **SignupScreen** - Cadastro (client/videomaker)

#### Cliente (4 telas)
4. **HomeScreen** - Lista de jobs criados
5. **CreateJobScreen** - Criar novo job
6. **ProposalsScreen** - Ver propostas recebidas
7. **PaymentScreen** - Pagamento via Stripe

#### Videomaker (4 telas)
8. **FeedScreen** - Jobs disponíveis (lista + mapa)
9. **JobDetailsScreen** - Detalhes + criar proposta
10. **PortfolioScreen** - Upload de fotos/vídeos
11. **MyJobsScreen** - Jobs em andamento

#### Comum (3 telas)
12. **ChatScreen** - Chat em tempo real
13. **RatingScreen** - Avaliar usuário
14. **ProfileScreen** - Perfil do usuário

### Fluxos Principais

#### Fluxo de Criação de Job (Cliente)
```
1. HomeScreen
2. Clicar em "Criar Job" → CreateJobScreen
3. Preencher:
   - Título, descrição
   - Data, duração
   - Localização (Google Maps)
   - Extras (edição, drone, etc)
4. Backend calcula "Valor Mínimo Sugerido"
5. Criar job
6. Job aparece no Feed dos videomakers
```

#### Fluxo de Proposta (Videomaker)
```
1. FeedScreen (ver jobs)
2. Filtrar por: categoria, distância, orçamento
3. Clicar em job → JobDetailsScreen
4. Ver detalhes (mapa, valor sugerido, extras)
5. Clicar "Enviar Proposta"
6. Preencher: valor proposto, prazo, mensagem
7. Enviar
8. Cliente recebe notificação
```

#### Fluxo de Pagamento (Cliente)
```
1. ProposalsScreen
2. Ver propostas recebidas
3. Clicar "Aceitar" em uma proposta
4. Redireciona para PaymentScreen
5. Preencher dados do cartão
6. Pagar (valor vai para escrow no Stripe)
7. Job muda status para "in_progress"
8. Videomaker é notificado
```

#### Fluxo de Chat
```
1. Após proposta aceita, chat é liberado
2. Abrir ChatScreen
3. Mensagens em tempo real via WebSocket
4. Moderação automática:
   - Regex bloqueia: números, emails, links
   - Mensagem fica marcada como "bloqueada"
5. Histórico salvo no MongoDB
```

---

## Integrações Externas

### 1. Stripe Connect

**Propósito:** Pagamentos com escrow (hold → release)

**Fluxo:**
1. Cliente paga ao aceitar proposta
2. Backend chama `POST /api/payments/hold`
3. Stripe retém o valor (escrow)
4. Após conclusão, cliente confirma
5. Backend chama `POST /api/payments/release`
6. Stripe transfere:
   - 80% para videomaker
   - 20% comissão para plataforma

**Chaves:**
- Publishable Key: `pk_test_51SIvQJRvLMnnPOKk...`
- Secret Key: `sk_test_51SIvQJRvLMnnPOKk...`

### 2. Google Maps API

**Propósito:** Geolocalização de jobs e busca por raio

**Features:**
- Seletor de localização ao criar job
- Mapa no FeedScreen com marcadores de jobs
- Círculo de raio do videomaker
- Cálculo de distância (Haversine)

**API Key:** `AIzaSyCBweBXEmEkAR8l_-jpBRoQyeabYx0d0yk`

### 3. Firebase Cloud Messaging

**Propósito:** Push notifications

**Notificações:**
- Nova proposta recebida
- Proposta aceita/rejeitada
- Nova mensagem no chat
- Job concluído
- Pagamento liberado

**Server Key:** `BEnfXoF8HRs7W6xx6TehPmTILSki_K9pnnn...`

### 4. Google Sign-In

**Propósito:** Autenticação social

**Fluxo:**
1. User clica "Entrar com Google"
2. SDK do Google retorna `idToken`
3. Mobile envia token para backend
4. Backend valida com Google e cria/loga usuário
5. Backend retorna JWT tokens

---

## Guia de Setup

Ver guias detalhados:
- [MOBILE_SETUP_GUIDE.md](MOBILE_SETUP_GUIDE.md) - Setup completo do mobile
- [API_REFERENCE.md](API_REFERENCE.md) - Setup do backend

---

## Troubleshooting

Ver [MOBILE_SETUP_GUIDE.md](MOBILE_SETUP_GUIDE.md) seção de Troubleshooting.

---

## Próximos Passos

### Para Desenvolvedor React Native

1. **Setup Inicial (1-2 horas)**
   - Clonar repositório
   - Instalar dependências
   - Configurar Firebase e Google Sign-In
   - Configurar chaves de API

2. **Build do App (2-3 horas)**
   - Atualizar React Native para 0.81.5
   - Resolver dependências nativas
   - Build Android/iOS
   - Testar no dispositivo

3. **Testes (2-3 horas)**
   - Testar fluxos principais
   - Validar integrações
   - Corrigir bugs de UI/UX

### Features Futuras (Opcional)

- [ ] Notificações push implementadas
- [ ] Upload de vídeos no chat
- [ ] Sistema de favoritos
- [ ] Histórico de jobs
- [ ] Filtros avançados
- [ ] Modo offline
- [ ] Deep linking
- [ ] Analytics

---

## Contato e Suporte

Para dúvidas sobre o código:
1. Consultar esta documentação
2. Ver comentários no código
3. Testar endpoints via Postman (collection incluída)
4. Verificar logs do backend

**Backend URL:** https://videoconnect-3.preview.emergentagent.com/api
**Admin Web:** https://videoconnect-3.preview.emergentagent.com

---

**Última atualização:** Outubro 2025
**Versão:** 1.0.0

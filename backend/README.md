# 🎬 Plataforma de Videomakers - Backend API

**O "Uber dos Videomakers"** - Marketplace que conecta clientes a videomakers profissionais.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Rodando Localmente](#rodando-localmente)
- [Endpoints da API](#endpoints-da-api)
- [Testes](#testes)
- [Deployment](#deployment)
- [Segurança & LGPD](#segurança--lgpd)

---

## 🎯 Visão Geral

Plataforma completa de marketplace que permite:

- **Clientes**: Criar jobs (pedidos de gravação), receber propostas, pagar com segurança
- **Videomakers**: Buscar jobs próximos, enviar propostas, receber pagamentos
- **Admin**: Gerenciar plataforma, moderar conteúdo, visualizar estatísticas

### Stack Tecnológica

- **Backend**: FastAPI (Python 3.11+)
- **Banco de Dados**: MongoDB (Motor - async driver)
- **Pagamentos**: Stripe Connect (escrow)
- **Chat**: WebSocket real-time
- **Autenticação**: JWT (access + refresh tokens)
- **Storage**: GridFS (MongoDB) para vídeos/arquivos

---

## ✨ Funcionalidades

### 🔐 Autenticação
- Signup/Login com JWT
- Refresh tokens (7 dias)
- Roles: cliente, videomaker, admin
- Logs de auditoria (LGPD)

### 👥 Usuários
- Perfis completos
- Upload de portfólio (vídeos até 25MB)
- Sistema de avaliações (ratings)
- Busca geolocalizada (raio de atuação)

### 💼 Jobs
- Criação de pedidos de gravação
- Cálculo automático de valor mínimo
- Filtros: cidade, categoria, status
- Extras parametrizáveis (drone, edição, etc)

### 📝 Propostas
- Videomakers enviam propostas
- Cliente aceita/rejeita
- Validação de valor mínimo

### 💰 Pagamentos (Stripe Escrow)
1. Cliente paga → valor retido em escrow
2. Videomaker entrega trabalho
3. Cliente confirma → pagamento liberado
4. Comissão automática para plataforma (20% padrão)

### 💬 Chat
- WebSocket real-time
- Moderação automática (bloqueia números, emails, links)
- Upload de anexos
- Histórico completo

### ⭐ Avaliações
- Rating 1-5 estrelas
- Comentários
- Cálculo automático de média

### 🛡️ Admin
- Gerenciar usuários (ban/unban, verificação)
- Alterar parâmetros (taxa comissão, valor/hora)
- Ver logs de moderação e auditoria
- Dashboard com estatísticas

---

## 🏗️ Arquitetura

```
/app/backend/
├── server.py                 # FastAPI app principal
├── .env                      # Variáveis de ambiente
├── requirements.txt          # Dependências Python
├── models/                   # Modelos Pydantic
│   ├── user.py
│   ├── job.py
│   ├── proposal.py
│   ├── payment.py
│   ├── chat.py
│   ├── rating.py
│   └── config.py
├── routers/                  # Endpoints REST
│   ├── auth.py
│   ├── users.py
│   ├── jobs.py
│   ├── proposals.py
│   ├── payments.py
│   ├── chat.py
│   ├── ratings.py
│   └── admin.py
├── services/                 # Lógica de negócio
│   ├── auth_service.py       # JWT, hashing
│   ├── payment_service.py    # Stripe Connect
│   ├── storage_service.py    # GridFS uploads
│   ├── value_calculator.py   # Cálculo de valores
│   └── geolocation_service.py# Busca por raio
├── middleware/
│   ├── auth_middleware.py    # Verificação JWT
│   └── rate_limiter.py       # Proteção contra abuse
└── utils/
    ├── constants.py          # Constantes
    └── validators.py         # Validações
```

---

## 🚀 Instalação

### Pré-requisitos

- Python 3.11+
- MongoDB 5.0+
- Conta Stripe (modo test)

### Passos

```bash
# Clone o repositório
git clone <repo-url>
cd backend

# Crie ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instale dependências
pip install -r requirements.txt
```

---

## ⚙️ Configuração

### 1. Arquivo `.env`

Crie arquivo `.env` na raiz do backend:

```env
# Banco de Dados
MONGO_URL="mongodb://localhost:27017"
DB_NAME="videomakers_platform"

# CORS
CORS_ORIGINS="*"  # Em produção, use domínio específico

# JWT Secrets (MUDE EM PRODUÇÃO!)
JWT_SECRET_KEY="sua-chave-secreta-super-segura-2024"
JWT_REFRESH_SECRET_KEY="sua-chave-refresh-super-segura-2024"

# Stripe
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
```

### 2. MongoDB

```bash
# Inicie MongoDB localmente
mongod --dbpath /data/db

# Ou use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## 🏃 Rodando Localmente

```bash
# Modo desenvolvimento (hot-reload)
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Acesse:
# API: http://localhost:8001/api/
# Docs: http://localhost:8001/api/docs
# Redoc: http://localhost:8001/api/redoc
```

---

## 📚 Endpoints da API

### 🔐 Autenticação (`/api/auth`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| POST | `/signup` | Cadastro novo usuário |
| POST | `/login` | Login |
| POST | `/refresh` | Renovar access token |

### 👤 Usuários (`/api/users`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| GET | `/me` | Perfil autenticado |
| PUT | `/me` | Atualizar perfil |
| POST | `/portfolio/upload` | Upload vídeo portfólio |
| DELETE | `/portfolio/{file_id}` | Remover vídeo |
| GET | `/videomakers` | Buscar videomakers (geolocalização) |
| GET | `/{user_id}` | Ver perfil público |

### 💼 Jobs (`/api/jobs`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| POST | `/` | Criar job |
| GET | `/` | Listar jobs |
| GET | `/{job_id}` | Ver detalhes |
| PUT | `/{job_id}` | Atualizar |
| DELETE | `/{job_id}` | Cancelar |

### 📝 Propostas (`/api/proposals`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| POST | `/` | Criar proposta |
| GET | `/job/{job_id}` | Ver propostas do job |
| PUT | `/{id}/accept` | Aceitar proposta |
| PUT | `/{id}/reject` | Rejeitar |
| GET | `/my-proposals` | Minhas propostas |

### 💰 Pagamentos (`/api/payments`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| POST | `/hold` | Pagar (escrow) |
| POST | `/{id}/release` | Liberar pagamento |
| POST | `/{id}/refund` | Reembolsar |
| GET | `/{id}` | Ver status |

### 💬 Chat (`/api/chat`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| WS | `/ws/{chat_id}` | WebSocket real-time |
| POST | `/message` | Enviar mensagem (HTTP) |
| GET | `/{chat_id}/messages` | Histórico |
| POST | `/attachment` | Upload arquivo |
| GET | `/my-chats` | Meus chats |

### ⭐ Avaliações (`/api/ratings`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| POST | `/` | Criar avaliação |
| GET | `/user/{user_id}` | Ver avaliações do usuário |
| GET | `/job/{job_id}` | Ver avaliações do job |

### 🛡️ Admin (`/api/admin`)

| Método | Endpoint | Descrição |
|--------|----------|----------|
| GET | `/config` | Ver config plataforma |
| PUT | `/config` | Atualizar config |
| GET | `/users` | Listar usuários |
| PUT | `/users/{id}/ban` | Banir usuário |
| PUT | `/users/{id}/verify` | Verificar usuário |
| GET | `/jobs` | Ver todos jobs |
| GET | `/payments` | Ver pagamentos |
| GET | `/stats` | Estatísticas |
| GET | `/audit-logs` | Logs de auditoria |

---

## 🧪 Testes

### Testes Manuais com cURL

```bash
# 1. Criar usuário
curl -X POST http://localhost:8001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@teste.com",
    "password": "senha123",
    "nome": "João Cliente",
    "telefone": "11999999999",
    "role": "client",
    "cidade": "São Paulo",
    "estado": "SP",
    "latitude": -23.5505,
    "longitude": -46.6333
  }'

# 2. Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@teste.com",
    "password": "senha123"
  }'

# Salve o access_token retornado

# 3. Ver perfil
curl -X GET http://localhost:8001/api/users/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"

# 4. Criar job
curl -X POST http://localhost:8001/api/jobs \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Gravação de Casamento",
    "descricao": "Casamento no sábado, 8h de cobertura",
    "categoria": "casamento",
    "data_gravacao": "2024-12-15T09:00:00Z",
    "duracao_horas": 8,
    "local": {
      "endereco": "Rua das Flores, 123",
      "cidade": "São Paulo",
      "estado": "SP",
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "extras": ["drone", "edicao_avancada"]
  }'
```

### Testes Automatizados (Pytest)

```bash
# Instalar pytest
pip install pytest pytest-asyncio httpx

# Rodar testes
pytest tests/ -v

# Com cobertura
pytest --cov=. --cov-report=html
```

---

## 🔒 Segurança & LGPD

### Implementado

✅ **Autenticação JWT** (access + refresh tokens)  
✅ **Bcrypt** para senhas  
✅ **Rate Limiting** (100 req/min por IP)  
✅ **Logs de Auditoria** (quem fez o quê)  
✅ **Moderação de Chat** (bloqueia contatos diretos)  
✅ **Consentimento LGPD** no cadastro  
✅ **CORS** configurável  
✅ **Validação de dados** (Pydantic)  

### Recomendações para Produção

🔸 Use HTTPS (TLS/SSL)  
🔸 Configure CORS com domínios específicos  
🔸 Use variáveis de ambiente seguras (Vault, AWS Secrets)  
🔸 Monitore com Sentry/DataDog  
🔸 Configure backup automático do MongoDB  
🔸 Use Stripe em modo produção  
🔸 Implemente 2FA para admins  

---

## 🚢 Deployment

### Opção 1: Docker

```bash
# Build
docker build -t videomakers-api .

# Run
docker run -d -p 8001:8001 --env-file .env videomakers-api
```

### Opção 2: Cloud Run (GCP)

```bash
gcloud run deploy videomakers-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Opção 3: Kubernetes

```bash
kubectl apply -f k8s/
```

---

## 📊 Fórmulas & Regras de Negócio

### Cálculo de Valor Mínimo

```python
valor_minimo = (valor_hora_base * duracao_horas) + sum(extras)

# Padrão:
# valor_hora_base = R$ 120
# Extras:
#   - edicao_basica: R$ 50
#   - edicao_avancada: R$ 150
#   - drone: R$ 100
#   - equipamento_especial: R$ 80
#   - iluminacao_profissional: R$ 120
#   - audio_profissional: R$ 90

# Exemplo:
# Job de 8h + drone + edição avançada
# = (120 * 8) + 100 + 150
# = R$ 1.210,00
```

### Comissão da Plataforma

```python
comissao = valor_total * taxa_comissao  # Padrão: 20%
valor_videomaker = valor_total - comissao

# Exemplo:
# Valor total: R$ 1.500
# Comissão (20%): R$ 300
# Videomaker recebe: R$ 1.200
```

---

## 📝 Checklist - Pronto para Deploy

### Backend

- [x] FastAPI com todos os endpoints
- [x] MongoDB com Motor (async)
- [x] JWT auth (access + refresh)
- [x] Stripe Connect (escrow)
- [x] WebSocket chat com moderação
- [x] GridFS para uploads
- [x] Geolocalização (raio de busca)
- [x] Sistema de avaliações
- [x] Rate limiting
- [x] Logs de auditoria
- [x] Swagger/OpenAPI docs
- [x] Variáveis de ambiente

### Testes

- [ ] Testes unitários (≥70% cobertura)
- [ ] Testes de integração
- [ ] Testes de carga (stress test)

### Documentação

- [x] README completo
- [x] Swagger docs
- [ ] Postman collection
- [ ] Diagramas de arquitetura

### DevOps

- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] CI/CD (GitHub Actions)
- [ ] Kubernetes manifests
- [ ] Monitoring (Sentry)

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

MIT License

---

## 📞 Suporte

Dúvidas ou problemas? Abra uma issue no GitHub ou entre em contato:

- Email: suporte@plataformavideomakers.com
- Discord: [Link do servidor]

---

**Desenvolvido com ❤️ para conectar clientes e videomakers profissionais!** 🎥✨

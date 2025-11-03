# 🔥 API Reference - Plataforma de Videomakers

## Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Endpoints](#endpoints)
4. [Modelos de Dados](#modelos-de-dados)
5. [Códigos de Erro](#códigos-de-erro)
6. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

### Base URL

```
Produção: https://videomakers-hub-1.preview.emergentagent.com/api
Local: http://localhost:8001/api
```

### Formato de Requisição/Resposta

- **Content-Type:** `application/json`
- **Authorization:** `Bearer <access_token>` (exceto endpoints públicos)
- **Rate Limit:** 100 requisições por minuto por IP

### Autenticação

A API usa **JWT tokens** com refresh:
- **Access Token:** Expira em 30 minutos
- **Refresh Token:** Expira em 7 dias

**Header de Autenticação:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints

### 1. Autenticação

#### 1.1 Cadastro (Signup)

```http
POST /api/auth/signup
```

**Body:**
```json
{
  "email": "joao@example.com",
  "password": "senha123",
  "nome": "João Silva",
  "telefone": "11999999999",
  "role": "client",  // ou "videomaker"
  "cidade": "São Paulo",
  "estado": "SP",
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

**Response 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "joao@example.com",
    "nome": "João Silva",
    "role": "client",
    "verificado": false,
    "created_at": "2025-10-25T10:00:00"
  }
}
```

#### 1.2 Login

```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Response 200:** (mesmo formato do signup)

#### 1.3 Login com Google

```http
POST /api/auth/google
```

**Body:**
```json
{
  "token": "<google_id_token>",
  "role": "client"  // ou "videomaker"
}
```

**Response 200:** (mesmo formato do signup)

#### 1.4 Refresh Token

```http
POST /api/auth/refresh
```

**Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

### 2. Usuários

#### 2.1 Listar Usuários

```http
GET /api/users/
```

**Query Params:**
- `role` (optional): "client", "videomaker", "admin"
- `skip` (optional): Paginação offset (default: 0)
- `limit` (optional): Items por página (default: 50, max: 100)

**Response 200:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "joao@example.com",
    "nome": "João Silva",
    "telefone": "11999999999",
    "role": "client",
    "cidade": "São Paulo",
    "estado": "SP",
    "verificado": true,
    "rating_medio": 4.8,
    "total_avaliacoes": 12,
    "created_at": "2025-01-15T10:00:00"
  }
]
```

#### 2.2 Obter Perfil

```http
GET /api/users/profile
```

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "maria@example.com",
  "nome": "Maria Santos",
  "telefone": "11988888888",
  "role": "videomaker",
  "cidade": "Rio de Janeiro",
  "estado": "RJ",
  "portfolio_videos": [
    "https://storage.example.com/video1.mp4",
    "https://storage.example.com/video2.mp4"
  ],
  "raio_atuacao_km": 50.0,
  "rating_medio": 4.9,
  "total_avaliacoes": 25,
  "verificado": true
}
```

#### 2.3 Atualizar Perfil

```http
PUT /api/users/profile
```

**Body:**
```json
{
  "nome": "Maria Santos Silva",
  "telefone": "11988888888",
  "cidade": "Rio de Janeiro",
  "raio_atuacao_km": 100.0
}
```

**Response 200:** (retorna perfil atualizado)

#### 2.4 Upload de Portfolio

```http
POST /api/users/portfolio
```

**Content-Type:** `multipart/form-data`

**Body:**
- `file`: Arquivo de imagem/vídeo (max 25MB)

**Response 200:**
```json
{
  "url": "https://storage.example.com/portfolio/video3.mp4",
  "message": "Upload realizado com sucesso"
}
```

---

### 3. Jobs

#### 3.1 Listar Jobs

```http
GET /api/jobs/
```

**Query Params:**
- `status` (optional): "open", "in_progress", "completed", "cancelled"
- `categoria` (optional): "casamento", "evento", "corporativo", etc
- `role` (optional): "client" (meus jobs), "videomaker" (todos disponíveis)
- `skip`, `limit`: Paginação

**Response 200:**
```json
[
  {
    "id": "job-uuid-123",
    "titulo": "Vídeo de Casamento",
    "descricao": "Preciso de videomaker para casamento dia 15/12",
    "categoria": "casamento",
    "data_gravacao": "2025-12-15",
    "duracao_horas": 8,
    "valor_minimo_sugerido": 1200.00,
    "local": {
      "endereco": "Av. Paulista, 1000",
      "cidade": "São Paulo",
      "estado": "SP",
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "extras": ["edicao", "drone", "making_of"],
    "status": "open",
    "client_id": "client-uuid-456",
    "client_nome": "João Silva",
    "created_at": "2025-10-20T14:30:00"
  }
]
```

#### 3.2 Criar Job

```http
POST /api/jobs/
```

**Body:**
```json
{
  "titulo": "Vídeo de Casamento",
  "descricao": "Preciso de videomaker para casamento dia 15/12",
  "categoria": "casamento",
  "data_gravacao": "2025-12-15",
  "duracao_horas": 8,
  "local": {
    "endereco": "Av. Paulista, 1000",
    "cidade": "São Paulo",
    "estado": "SP",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "extras": ["edicao", "drone", "making_of"]
}
```

**Response 201:**
```json
{
  "id": "job-uuid-123",
  "titulo": "Vídeo de Casamento",
  "valor_minimo_sugerido": 1200.00,  // Calculado automaticamente
  "status": "open",
  "created_at": "2025-10-25T15:00:00"
}
```

**Cálculo do Valor Mínimo:**
```
Fórmula: R$120/hora + extras

Exemplo:
- 8 horas = R$960
- Edição = +R$200
- Drone = +R$300
- Making of = +R$100
= R$1.560
```

#### 3.3 Obter Job por ID

```http
GET /api/jobs/{job_id}
```

**Response 200:** (mesmo formato da lista, mas objeto único)

#### 3.4 Atualizar Job

```http
PUT /api/jobs/{job_id}
```

**Body:** (campos opcionais, apenas o que mudar)
```json
{
  "status": "in_progress",
  "videomaker_id": "videomaker-uuid-789"
}
```

#### 3.5 Deletar Job

```http
DELETE /api/jobs/{job_id}
```

**Response 204:** (sem conteúdo)

---

### 4. Propostas

#### 4.1 Criar Proposta

```http
POST /api/proposals/
```

**Body:**
```json
{
  "job_id": "job-uuid-123",
  "valor_proposto": 1500.00,
  "prazo_entrega_dias": 7,
  "mensagem": "Tenho 5 anos de experiência em casamentos. Portfolio disponível."
}
```

**Response 201:**
```json
{
  "id": "proposal-uuid-456",
  "job_id": "job-uuid-123",
  "videomaker_id": "videomaker-uuid-789",
  "videomaker_nome": "Maria Santos",
  "valor_proposto": 1500.00,
  "prazo_entrega_dias": 7,
  "mensagem": "Tenho 5 anos de experiência...",
  "status": "pending",
  "created_at": "2025-10-25T16:00:00"
}
```

#### 4.2 Listar Propostas de um Job

```http
GET /api/proposals/job/{job_id}
```

**Response 200:** (array de propostas)

#### 4.3 Aceitar Proposta

```http
POST /api/proposals/{proposal_id}/accept
```

**Response 200:**
```json
{
  "message": "Proposta aceita com sucesso",
  "proposal": { ... },
  "job": { "status": "in_progress" }
}
```

**Efeitos colaterais:**
- Proposta muda status para "accepted"
- Job muda status para "in_progress"
- Outras propostas do mesmo job são rejeitadas automaticamente
- Chat é criado entre client e videomaker

#### 4.4 Rejeitar Proposta

```http
POST /api/proposals/{proposal_id}/reject
```

**Response 200:**
```json
{
  "message": "Proposta rejeitada",
  "proposal": { "status": "rejected" }
}
```

---

### 5. Pagamentos

#### 5.1 Hold (Reter Pagamento)

```http
POST /api/payments/hold
```

**Body:**
```json
{
  "proposal_id": "proposal-uuid-456",
  "job_id": "job-uuid-123",
  "valor": 1500.00,
  "payment_method": "card"  // Token do Stripe
}
```

**Response 200:**
```json
{
  "id": "payment-uuid-789",
  "status": "held",
  "valor": 1500.00,
  "comissao": 300.00,  // 20%
  "valor_videomaker": 1200.00,  // 80%
  "stripe_payment_intent_id": "pi_123456789",
  "created_at": "2025-10-25T17:00:00"
}
```

#### 5.2 Release (Liberar Pagamento)

```http
POST /api/payments/{payment_id}/release
```

**Response 200:**
```json
{
  "message": "Pagamento liberado com sucesso",
  "payment": {
    "id": "payment-uuid-789",
    "status": "released",
    "released_at": "2025-11-01T10:00:00"
  }
}
```

**Efeitos colaterais:**
- Stripe transfere fundos para videomaker
- Job muda status para "completed"
- Sistema cria solicitação de avaliação

#### 5.3 Refund (Reembolso)

```http
POST /api/payments/{payment_id}/refund
```

**Body:**
```json
{
  "reason": "Job cancelado pelo cliente"
}
```

**Response 200:**
```json
{
  "message": "Reembolso processado",
  "payment": {
    "status": "refunded",
    "refunded_at": "2025-10-26T12:00:00"
  }
}
```

#### 5.4 Listar Pagamentos

```http
GET /api/payments/
```

**Query Params:**
- `status`: "held", "released", "refunded"
- `user_id`: Filtrar por usuário

---

### 6. Chat (WebSocket)

#### 6.1 Conectar ao Chat

```
wss://videotalent-1.preview.emergentagent.com/api/ws/{chat_id}
```

**Headers:**
- `Authorization: Bearer <access_token>`

**Exemplo (JavaScript):**
```javascript
const ws = new WebSocket(
  'wss://videotalent-1.preview.emergentagent.com/api/ws/chat-uuid-123',
  [],
  { headers: { Authorization: 'Bearer <token>' } }
);

ws.onopen = () => {
  console.log('Conectado ao chat');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mensagem recebida:', data);
};
```

#### 6.2 Enviar Mensagem

**Formato:**
```json
{
  "sender_id": "user-uuid-123",
  "content": "Olá, tudo bem?",
  "attachments": []
}
```

**Exemplo:**
```javascript
ws.send(JSON.stringify({
  sender_id: "user-uuid-123",
  content: "Olá, tudo bem?",
  attachments: []
}));
```

#### 6.3 Receber Mensagem

**Formato:**
```json
{
  "type": "message",
  "message": {
    "id": "msg-uuid-456",
    "sender_id": "user-uuid-789",
    "content": "Tudo ótimo!",
    "blocked": false,
    "created_at": "2025-10-25T18:00:00"
  }
}
```

#### 6.4 Mensagem Bloqueada

**Formato:**
```json
{
  "type": "blocked",
  "message": "Mensagem bloqueada pela moderação",
  "reason": "phone_number",
  "hint": "Não é permitido compartilhar números de telefone"
}
```

**Regras de Moderação (Regex):**
- Números de telefone: `(\d{2,3})[\s.-]?\d{4,5}[\s.-]?\d{4}`
- Emails: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- URLs: `https?://[^\s]+`

#### 6.5 Histórico de Mensagens

```http
GET /api/chat/{chat_id}/messages
```

**Query Params:**
- `skip`, `limit`: Paginação

**Response 200:**
```json
[
  {
    "id": "msg-uuid-123",
    "sender_id": "user-uuid-456",
    "content": "Olá!",
    "blocked": false,
    "created_at": "2025-10-25T10:00:00"
  }
]
```

---

### 7. Avaliações

#### 7.1 Criar Avaliação

```http
POST /api/ratings/
```

**Body:**
```json
{
  "job_id": "job-uuid-123",
  "rated_user_id": "videomaker-uuid-789",
  "rating": 5,  // 1-5 estrelas
  "comment": "Excelente profissional! Trabalho impecável."
}
```

**Response 201:**
```json
{
  "id": "rating-uuid-456",
  "job_id": "job-uuid-123",
  "rater_id": "client-uuid-123",
  "rated_user_id": "videomaker-uuid-789",
  "rating": 5,
  "comment": "Excelente profissional!",
  "created_at": "2025-11-02T12:00:00"
}
```

#### 7.2 Listar Avaliações de um Usuário

```http
GET /api/ratings/user/{user_id}
```

**Response 200:**
```json
{
  "user_id": "videomaker-uuid-789",
  "rating_medio": 4.8,
  "total_avaliacoes": 15,
  "ratings": [
    {
      "id": "rating-uuid-123",
      "rater_nome": "João Silva",
      "rating": 5,
      "comment": "Excelente!",
      "created_at": "2025-11-02T12:00:00"
    }
  ]
}
```

---

### 8. Admin

#### 8.1 Dashboard (Estatísticas)

```http
GET /api/admin/dashboard
```

**Headers:** `Authorization: Bearer <admin_token>`

**Response 200:**
```json
{
  "total_users": 1234,
  "total_clients": 890,
  "total_videomakers": 344,
  "total_jobs": 567,
  "jobs_open": 45,
  "jobs_in_progress": 89,
  "jobs_completed": 433,
  "total_payments": 234000.00,
  "comissao_total": 46800.00,
  "rating_medio_plataforma": 4.7
}
```

#### 8.2 Obter Configurações

```http
GET /api/admin/config
```

**Response 200:**
```json
{
  "comissao_percentual": 20.0,
  "valor_hora_base": 120.00,
  "extras": {
    "edicao": 200.00,
    "drone": 300.00,
    "making_of": 100.00,
    "segunda_camera": 150.00
  },
  "raio_padrao_km": 50.0
}
```

#### 8.3 Atualizar Configurações

```http
PUT /api/admin/config
```

**Body:**
```json
{
  "comissao_percentual": 18.0,
  "valor_hora_base": 150.00
}
```

#### 8.4 Banir Usuário

```http
POST /api/admin/users/{user_id}/ban
```

**Body:**
```json
{
  "reason": "Violação dos termos de uso"
}
```

---

## Modelos de Dados

### User

```python
{
  "id": "UUID",
  "email": "string",
  "nome": "string",
  "telefone": "string",
  "role": "client | videomaker | admin",
  "cidade": "string | null",
  "estado": "string | null",
  "latitude": "float | null",
  "longitude": "float | null",
  "profile_picture": "string | null",
  "verificado": "boolean",
  "rating_medio": "float",
  "total_avaliacoes": "int",
  "portfolio_videos": ["string"],  // URLs
  "raio_atuacao_km": "float",  // Videomaker only
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Job

```python
{
  "id": "UUID",
  "titulo": "string",
  "descricao": "string",
  "categoria": "string",
  "data_gravacao": "date",
  "duracao_horas": "int",
  "valor_minimo_sugerido": "float",
  "local": {
    "endereco": "string",
    "cidade": "string",
    "estado": "string",
    "latitude": "float",
    "longitude": "float"
  },
  "extras": ["string"],
  "status": "open | in_progress | completed | cancelled",
  "client_id": "UUID",
  "client_nome": "string",
  "videomaker_id": "UUID | null",
  "videomaker_nome": "string | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Proposal

```python
{
  "id": "UUID",
  "job_id": "UUID",
  "videomaker_id": "UUID",
  "videomaker_nome": "string",
  "videomaker_rating": "float",
  "valor_proposto": "float",
  "prazo_entrega_dias": "int",
  "mensagem": "string",
  "status": "pending | accepted | rejected",
  "created_at": "datetime"
}
```

### Payment

```python
{
  "id": "UUID",
  "job_id": "UUID",
  "proposal_id": "UUID",
  "client_id": "UUID",
  "videomaker_id": "UUID",
  "valor": "float",
  "comissao": "float",
  "valor_videomaker": "float",
  "status": "held | released | refunded | disputed",
  "stripe_payment_intent_id": "string",
  "created_at": "datetime",
  "released_at": "datetime | null"
}
```

### Rating

```python
{
  "id": "UUID",
  "job_id": "UUID",
  "rater_id": "UUID",
  "rater_nome": "string",
  "rated_user_id": "UUID",
  "rating": "int (1-5)",
  "comment": "string",
  "created_at": "datetime"
}
```

---

## Códigos de Erro

### 400 Bad Request
```json
{
  "detail": "Email já cadastrado"
}
```

### 401 Unauthorized
```json
{
  "detail": "Token inválido ou expirado"
}
```

### 403 Forbidden
```json
{
  "detail": "Você não tem permissão para esta ação"
}
```

### 404 Not Found
```json
{
  "detail": "Job não encontrado"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit excedido. Tente novamente em 60 segundos."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Erro interno do servidor"
}
```

---

## Exemplos de Uso

### Exemplo 1: Fluxo Completo de Criação de Job

```bash
# 1. Login
curl -X POST https://videomakers-hub-1.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "senha123"
  }'

# Response: { "access_token": "...", ... }

# 2. Criar Job
curl -X POST https://videomakers-hub-1.preview.emergentagent.com/api/jobs/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Vídeo Corporativo",
    "descricao": "Vídeo institucional da empresa",
    "categoria": "corporativo",
    "data_gravacao": "2025-12-01",
    "duracao_horas": 4,
    "local": {
      "endereco": "Av. Paulista, 1000",
      "cidade": "São Paulo",
      "estado": "SP",
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "extras": ["edicao"]
  }'
```

### Exemplo 2: Videomaker Enviando Proposta

```bash
# 1. Buscar jobs disponíveis
curl -X GET "https://videomakers-hub-1.preview.emergentagent.com/api/jobs/?status=open" \
  -H "Authorization: Bearer <videomaker_token>"

# 2. Enviar proposta
curl -X POST https://videomakers-hub-1.preview.emergentagent.com/api/proposals/ \
  -H "Authorization: Bearer <videomaker_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job-uuid-123",
    "valor_proposto": 800.00,
    "prazo_entrega_dias": 5,
    "mensagem": "Tenho experiência com vídeos corporativos"
  }'
```

### Exemplo 3: Cliente Aceitando Proposta e Pagando

```bash
# 1. Ver propostas
curl -X GET "https://videomakers-hub-1.preview.emergentagent.com/api/proposals/job/job-uuid-123" \
  -H "Authorization: Bearer <client_token>"

# 2. Aceitar proposta
curl -X POST "https://videomakers-hub-1.preview.emergentagent.com/api/proposals/proposal-uuid-456/accept" \
  -H "Authorization: Bearer <client_token>"

# 3. Pagar (hold)
curl -X POST https://videomakers-hub-1.preview.emergentagent.com/api/payments/hold \
  -H "Authorization: Bearer <client_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_id": "proposal-uuid-456",
    "job_id": "job-uuid-123",
    "valor": 800.00,
    "payment_method": "card"
  }'
```

---

## Postman Collection

Uma collection do Postman está disponível em:
```
/app/backend/Postman_Collection.json
```

Importe no Postman para testar facilmente todos os endpoints.

---

**Última atualização:** Outubro 2025

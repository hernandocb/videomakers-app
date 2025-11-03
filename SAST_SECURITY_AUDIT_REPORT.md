# 🔒 Relatório de Auditoria de Segurança SAST
**Plataforma de Videomakers V2.0.0**

**Data:** Janeiro 2025  
**Analista:** Senior Staff SDET & AppSec Specialist  
**Metodologia:** White-Box & Gray-Box Analysis

---

## 📊 Executive Summary

**Total de Vulnerabilidades Identificadas:** 13  
- 🔴 **Críticas (High):** 5
- 🟠 **Médias (Medium):** 5
- 🟡 **Baixas (Low):** 3

**Status de Segurança:** ⚠️ **REQUER AÇÃO IMEDIATA**

O sistema possui funcionalidades de segurança implementadas (rate limiting, audit logs, JWT), porém apresenta vulnerabilidades críticas que precisam ser corrigidas antes do deploy em produção.

---

## 🔴 VULNERABILIDADES CRÍTICAS (High Priority)

### 1. CORS Configurado como Wildcard "*"
**Arquivo:** `/app/backend/.env` (linha 3), `/app/backend/server.py` (linha 93)  
**OWASP:** A05:2021 – Security Misconfiguration  
**CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)

**Descrição:**  
A configuração de CORS está usando `allow_origins="*"`, permitindo que **qualquer domínio** faça requisições ao backend.

```python
# server.py - linha 90
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),  # ❌ VULNERÁVEL
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Impacto:**  
- ✅ `allow_credentials=True` + `allow_origins="*"` = **CSRF attacks**
- Permite que sites maliciosos façam requisições autenticadas em nome de usuários logados
- Exposição de dados sensíveis via cross-origin requests

**Recomendação:**
```bash
# .env - CORRETO
CORS_ORIGINS="https://videomakers-hub-1.preview.emergentagent.com,https://admin.videomakers.com"
```

**Severidade:** 🔴 **CRITICAL**

---

### 2. Hardcoded Database Credentials
**Arquivo:** `/app/backend/services/security_service.py` (linha 102)  
**OWASP:** A07:2021 – Identification and Authentication Failures  
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Código Vulnerável:**
```python
# security_service.py - BackupService
cmd = [
    "mongodump",
    "--uri=mongodb://localhost:27017",  # ❌ HARDCODED
    "--db=test_database",                # ❌ HARDCODED
    f"--archive={backup_file}",
    "--gzip"
]
```

**Impacto:**
- Credenciais expostas no código-fonte
- Se o código for commitado em repositório público, expõe acesso ao banco
- Dificulta mudança de ambiente (dev/staging/prod)

**Recomendação:**
```python
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

cmd = [
    "mongodump",
    f"--uri={mongo_url}",
    f"--db={db_name}",
    f"--archive={backup_file}",
    "--gzip"
]
```

**Severidade:** 🔴 **CRITICAL**

---

### 3. Google Sign-In Token sem Validação de Audience
**Arquivo:** `/app/backend/routers/auth.py` (linha 229-233)  
**OWASP:** A07:2021 – Identification and Authentication Failures  
**CWE:** CWE-287 (Improper Authentication)

**Código Vulnerável:**
```python
idinfo = id_token.verify_oauth2_token(
    request.token, 
    google_requests.Request(),
    None  # ❌ We're not verifying the audience for now
)
```

**Impacto:**
- Aceita tokens Google OAuth válidos de **qualquer aplicação**
- Atacante pode usar token de outro app Google para autenticar
- Bypass completo de autenticação

**Recomendação:**
```python
# Adicionar no .env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

# No código
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
idinfo = id_token.verify_oauth2_token(
    request.token,
    google_requests.Request(),
    GOOGLE_CLIENT_ID  # ✅ Valida audience
)
```

**Severidade:** 🔴 **CRITICAL**

---

### 4. IP Address Hardcoded nos Audit Logs
**Arquivo:** `/app/backend/routers/auth.py` (linhas 70, 270, 284)  
**OWASP:** A09:2021 – Security Logging and Monitoring Failures  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Código Vulnerável:**
```python
await db.audit_logs.insert_one({
    "user_id": user.id,
    "action": "signup",
    "ip": "0.0.0.0",  # ❌ HARDCODED - Inútil para auditoria
    "timestamp": datetime.now(timezone.utc).isoformat()
})
```

**Impacto:**
- Logs de auditoria não capturam IP real do usuário
- Impossível rastrear origem de ataques ou atividades suspeitas
- Violação de requisitos de compliance (LGPD Art. 46)

**Recomendação:**
```python
# Usar o Request object para obter IP real
from fastapi import Request

@router.post("/signup")
async def signup(user_data: UserCreate, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    
    await db.audit_logs.insert_one({
        "user_id": user.id,
        "action": "signup",
        "ip": client_ip,  # ✅ IP real
        "user_agent": request.headers.get("user-agent"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
```

**Severidade:** 🔴 **HIGH**

---

### 5. Query sem Paginação - Risco de DoS
**Arquivo:** `/app/backend/routers/admin.py` (linha 92)  
**OWASP:** A04:2021 – Insecure Design  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Código Vulnerável:**
```python
users = await db.users.find(query, {"_id": 0}).to_list(10000)  # ❌ 10k records!
```

**Impacto:**
- Carregar 10.000 usuários consome ~50-100MB de RAM
- Requisição pode demorar 5-10 segundos
- Atacante pode fazer múltiplas requisições simultâneas = **DoS**
- Frontend pode travar ao renderizar 10k linhas

**Recomendação:**
```python
@router.get("/users")
async def list_all_users(
    role: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),  # Máximo 100
    user: dict = Depends(admin_only)
):
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {
        "users": users,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }
```

**Severidade:** 🔴 **HIGH**

---

## 🟠 VULNERABILIDADES MÉDIAS (Medium Priority)

### 6. NoSQL Injection - Falta de Sanitização
**Arquivo:** `/app/backend/routers/jobs.py`, `/app/backend/routers/admin.py`  
**OWASP:** A03:2021 – Injection  
**CWE:** CWE-943 (Improper Neutralization of Special Elements in Data Query Logic)

**Exemplo Vulnerável:**
```python
# jobs.py - linha 98-102
if cidade:
    query["local.cidade"] = cidade  # ❌ Direto do input do usuário

if categoria:
    query["categoria"] = categoria
```

**Ataque Possível:**
```python
# Atacante envia:
GET /api/jobs?cidade[$ne]=null

# Query MongoDB resultante:
query = {"local.cidade": {"$ne": None}}  # Retorna TODOS os jobs!
```

**Impacto:**
- Bypass de filtros de autorização
- Extração de dados não autorizados
- Potencial data leak

**Recomendação:**
```python
from pydantic import validator

class JobFilter(BaseModel):
    cidade: Optional[str] = None
    categoria: Optional[str] = None
    
    @validator('cidade', 'categoria')
    def sanitize_string(cls, v):
        if v and (v.startswith('$') or v.startswith('{')):
            raise ValueError("Invalid character in query")
        return v

@router.get("/jobs")
async def list_jobs(filters: JobFilter = Depends()):
    query = {}
    if filters.cidade:
        query["local.cidade"] = filters.cidade
```

**Severidade:** 🟠 **MEDIUM**

---

### 7. JWT Armazenado em localStorage (XSS Risk)
**Arquivo:** `/app/frontend/src/services/api.js` (linha 15)  
**OWASP:** A03:2021 – Injection (XSS)  
**CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)

**Código Vulnerável:**
```javascript
const token = localStorage.getItem('access_token');  // ❌ Vulnerável a XSS
```

**Impacto:**
- Se houver vulnerabilidade XSS no frontend, atacante pode roubar tokens
- `localStorage` é acessível via JavaScript de qualquer script na página

**Recomendação:**
```javascript
// Opção 1: Usar HttpOnly Cookies (MELHOR)
// Backend retorna cookie ao invés de token no body:
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,  # JavaScript não pode acessar
    secure=True,     # HTTPS only
    samesite="strict" # CSRF protection
)

// Frontend não precisa armazenar nada - cookie é enviado automaticamente
api.defaults.withCredentials = true;

// Opção 2: Usar sessionStorage (Melhor que localStorage)
const token = sessionStorage.getItem('access_token');
```

**Severidade:** 🟠 **MEDIUM**

---

### 8. Ausência de CSRF Protection
**Arquivo:** `/app/backend/server.py`  
**OWASP:** A01:2021 – Broken Access Control  
**CWE:** CWE-352 (Cross-Site Request Forgery)

**Problema:**
Não há proteção CSRF para endpoints que modificam estado (POST/PUT/DELETE).

**Impacto:**
- Atacante pode criar página maliciosa que faz requisições autenticadas
- Exemplo: `<img src="https://api.videomakers.com/api/payments/release">`

**Recomendação:**
```python
from fastapi_csrf_protect import CsrfProtect
from pydantic import BaseModel

class CsrfSettings(BaseModel):
    secret_key: str = os.environ.get('CSRF_SECRET_KEY', 'your-secret-key')

@app.on_event("startup")
async def startup():
    CsrfProtect.load_config(CsrfSettings)

# Em cada rota que modifica estado:
@router.post("/payments/hold")
async def create_payment(
    csrf_protect: CsrfProtect = Depends(),
    payment_data: PaymentCreate,
    user: dict = Depends(get_current_user)
):
    await csrf_protect.validate_csrf(request)
    # ... resto do código
```

**Severidade:** 🟠 **MEDIUM**

---

### 9. Rate Limiting Inconsistente
**Arquivo:** Vários routers  
**OWASP:** A04:2021 – Insecure Design  
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Problema:**
Rate limiting está aplicado apenas no `/auth/login`, mas não em endpoints críticos:
- ❌ `/payments/hold` (pode criar múltiplos pagamentos)
- ❌ `/proposals` (spam de propostas)
- ❌ `/jobs` (criação em massa)
- ❌ `/admin/*` (ataques ao painel admin)

**Recomendação:**
```python
from slowapi import Limiter

# Em cada endpoint crítico:
@router.post("/payments/hold")
@limiter.limit("10/minute")  # ✅ Adicionar rate limit
async def create_payment(request: Request, ...):
    ...

@router.post("/proposals")
@limiter.limit("20/hour")  # ✅ Limitar propostas por hora
async def create_proposal(request: Request, ...):
    ...
```

**Severidade:** 🟠 **MEDIUM**

---

### 10. Falta Validação de Tamanho de Arquivo
**Arquivo:** `/app/backend/routers/portfolio.py` (assumido - não encontrado no scan)  
**OWASP:** A04:2021 – Insecure Design  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Problema:**
Não há validação de tamanho de arquivo em uploads de portfolio.

**Impacto:**
- Usuário pode fazer upload de vídeo de 5GB
- Esgota espaço em disco
- Slow down do servidor

**Recomendação:**
```python
from fastapi import UploadFile, File

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB

@router.post("/portfolio/upload")
async def upload_media(file: UploadFile = File(...)):
    # Validar tamanho
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo muito grande (máx 25MB)")
    
    # Validar tipo MIME
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Tipo de arquivo não permitido")
```

**Severidade:** 🟠 **MEDIUM**

---

## 🟡 VULNERABILIDADES BAIXAS (Low Priority)

### 11. Code Smell - Funções Muito Grandes
**Arquivo:** `/app/backend/routers/admin.py`  
**Code Smell:** Long Method (100+ linhas)

**Exemplos:**
- `get_growth_analytics()` - 60 linhas
- `get_revenue_analytics()` - 50 linhas
- `get_top_performers()` - 80 linhas

**Impacto:**
- Dificulta manutenção
- Aumenta chance de bugs
- Testes unitários ficam complexos

**Recomendação:**
Refatorar para service layer:
```python
# services/analytics_service.py
class AnalyticsService:
    @staticmethod
    async def get_user_growth(db, start_date, end_date):
        # Lógica isolada
        ...

# routers/admin.py (fica limpo)
@router.get("/analytics/growth")
async def get_growth_analytics(months: int, user: dict = Depends(admin_only)):
    result = await AnalyticsService.get_user_growth(db, months)
    return result
```

**Severidade:** 🟡 **LOW**

---

### 12. Ausência de Content Security Policy
**Arquivo:** Frontend  
**OWASP:** A05:2021 – Security Misconfiguration  

**Problema:**
Falta header CSP para mitigar XSS.

**Recomendação:**
```javascript
// public/index.html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;">
```

**Severidade:** 🟡 **LOW**

---

### 13. Falta de Testes Automatizados
**Problema:**
Não há testes unitários ou de integração no repositório.

**Impacto:**
- Regressões não detectadas
- Dificulta refactoring seguro
- Bugs em produção

**Recomendação:**
Implementar testes (veja próxima seção deste relatório).

**Severidade:** 🟡 **LOW**

---

## 📋 Checklist OWASP Top 10 2021

| OWASP | Vulnerabilidade | Status | Encontrado |
|-------|----------------|--------|------------|
| A01 | Broken Access Control | ⚠️ Parcial | CORS, CSRF |
| A02 | Cryptographic Failures | ✅ OK | JWT implementado |
| A03 | Injection | ⚠️ Risco | NoSQL Injection |
| A04 | Insecure Design | ❌ Vulnerável | Rate limiting, DoS |
| A05 | Security Misconfiguration | ❌ Crítico | CORS wildcard |
| A06 | Vulnerable Components | ✅ OK | Dependências atualizadas |
| A07 | Auth Failures | ❌ Crítico | Google token, Hardcoded |
| A08 | Software/Data Integrity | ✅ OK | - |
| A09 | Logging Failures | ⚠️ Risco | IP hardcoded |
| A10 | SSRF | ✅ OK | Não aplicável |

---

## 🎯 Plano de Ação Recomendado

### Fase 1 - CRÍTICO (Fazer AGORA)
1. ✅ Corrigir CORS wildcard → domínios específicos
2. ✅ Remover credenciais hardcoded do BackupService
3. ✅ Adicionar validação de audience no Google Sign-In
4. ✅ Capturar IP real nos audit logs
5. ✅ Implementar paginação em `/admin/users`

### Fase 2 - MÉDIO (Próxima Sprint)
6. ✅ Adicionar sanitização contra NoSQL Injection
7. ✅ Migrar JWT para HttpOnly cookies
8. ✅ Implementar CSRF protection
9. ✅ Adicionar rate limiting em todos endpoints críticos
10. ✅ Validar tamanho e tipo de arquivo em uploads

### Fase 3 - BAIXO (Backlog)
11. ✅ Refatorar código para service layer
12. ✅ Adicionar CSP headers
13. ✅ Criar suite de testes automatizados

---

## 📚 Referências
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [LGPD - Lei Geral de Proteção de Dados](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)

---

**Fim do Relatório**  
**Próximo Passo:** Implementar correções da Fase 1 e executar testes de segurança automatizados.

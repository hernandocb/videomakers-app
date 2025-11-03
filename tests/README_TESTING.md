# 🧪 Guia de Testes - Plataforma de Videomakers

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Estrutura de Testes](#estrutura-de-testes)
- [Testes Unitários - Backend](#testes-unitários---backend)
- [Testes Unitários - Frontend](#testes-unitários---frontend)
- [Testes de Integração](#testes-de-integração)
- [Como Executar](#como-executar)
- [Cobertura de Testes](#cobertura-de-testes)

---

## 🎯 Visão Geral

Esta suíte de testes foi criada como parte da **Análise de Qualidade (White-Box Testing)** do projeto. Os testes cobrem:

- ✅ **Testes Unitários Backend** - Serviços críticos (security, payments)
- ✅ **Testes Unitários Frontend** - Context API (ThemeContext)
- ✅ **Testes de Integração API** - Fluxos completos (auth, jobs, proposals)

**Objetivo:** Garantir qualidade e estabilidade antes do deploy em produção.

---

## 📁 Estrutura de Testes

```
/app/tests/
├── README_TESTING.md               # Este arquivo
├── backend/
│   ├── test_security_service.py    # Testes do AuditService e LGPDService
│   └── test_payment_service.py     # Testes do ValueCalculator
├── frontend/
│   └── ThemeContext.test.js        # Testes do ThemeContext (React)
└── integration/
    └── test_api_flows.py           # Testes E2E de API (auth, jobs, proposals)
```

---

## 🐍 Testes Unitários - Backend

### Arquivos de Teste

#### 1. `test_security_service.py`
Testa os serviços de segurança e compliance LGPD:

**Classes Testadas:**
- `AuditService` - Sistema de audit trail
- `LGPDService` - Export e delete de dados de usuário

**Casos de Teste:**
- ✅ Criação de audit logs com tracking de mudanças
- ✅ Exportação completa de dados do usuário (LGPD Art. 18)
- ✅ Deleção de conta com anonimização de dados financeiros
- ✅ Tratamento gracioso de erros (não quebra a aplicação)

**Executar:**
```bash
cd /app
pytest tests/backend/test_security_service.py -v
```

#### 2. `test_payment_service.py`
Testa cálculos de valores e comissões:

**Classes Testadas:**
- `ValueCalculator` - Cálculo de valor mínimo de jobs e comissões

**Casos de Teste:**
- ✅ Cálculo básico: duracao_horas * valor_hora_base
- ✅ Cálculo com extras (drone, edição avançada) +30% cada
- ✅ Cálculo de comissão 20% (Stripe Connect)
- ✅ Arredondamento correto de valores decimais
- ✅ Edge cases (valor zero, 100% comissão)
- ✅ Fluxo completo de pagamento (job → proposta → comissão)

**Executar:**
```bash
pytest tests/backend/test_payment_service.py -v
```

### Como Adicionar Novos Testes Backend

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

class TestMyService:
    @pytest.mark.asyncio
    async def test_my_function(self):
        # Arrange
        mock_db = MagicMock()
        
        # Act
        result = await my_service.function(mock_db)
        
        # Assert
        assert result == expected
```

---

## ⚛️ Testes Unitários - Frontend

### Arquivo: `ThemeContext.test.js`

**Componente Testado:**
- `ThemeContext` - Gerenciamento de tema (dark/light mode)

**Casos de Teste:**
- ✅ Carrega tema dark/light do localStorage
- ✅ Usa preferência do sistema (prefers-color-scheme) quando localStorage vazio
- ✅ Alterna tema ao clicar no botão toggle
- ✅ Adiciona/remove classe 'dark' no document.documentElement
- ✅ Persiste tema no localStorage após alternâncias
- ✅ Lança erro ao usar hook fora do Provider

**Executar:**
```bash
cd /app/frontend
npm test -- ThemeContext.test.js
# ou
yarn test ThemeContext.test.js
```

### Como Adicionar Novos Testes Frontend

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('deve fazer algo', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<MyComponent />);
  
  // Act
  await user.click(screen.getByRole('button'));
  
  // Assert
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

---

## 🔗 Testes de Integração

### Arquivo: `test_api_flows.py`

**Fluxos Testados:**

#### 1. **TestAuthenticationFlow**
- ✅ Signup → Login → GET /me → Refresh Token
- ✅ Login com senha incorreta (teste negativo)
- ✅ Acesso sem token (401)
- ✅ Acesso com token inválido (401)

#### 2. **TestAdminPermissions**
- ✅ Admin acessa GET /admin/users
- ✅ **Cliente NÃO acessa /admin/users (403) - Broken Access Control Test**
- ✅ Admin atualiza usuário (PUT /admin/users/{id}/verify)

#### 3. **TestJobProposalFlow**
- ✅ **Fluxo completo E2E:**
  1. Cliente cria job
  2. Videomaker lista jobs disponíveis
  3. Videomaker envia proposta
  4. Cliente visualiza propostas
  5. Cliente aceita proposta
  6. Job muda para "in_progress"
  7. Chat é criado automaticamente

**Executar:**
```bash
cd /app

# Certifique-se de que o backend está rodando
sudo supervisorctl status backend

# Execute os testes
pytest tests/integration/test_api_flows.py -v -s
```

**Importante:**
- ⚠️ Estes testes fazem requisições HTTP reais ao backend
- ⚠️ Dados de teste são criados no banco (use banco de testes)
- ⚠️ Configure `REACT_APP_BACKEND_URL` corretamente

---

## 🚀 Como Executar Todos os Testes

### 1. Backend Unit Tests
```bash
cd /app
pytest tests/backend/ -v --cov=backend/services --cov-report=html
```

### 2. Frontend Unit Tests
```bash
cd /app/frontend
npm test -- --coverage
```

### 3. Integration Tests
```bash
cd /app
pytest tests/integration/ -v -s
```

### 4. Tudo de uma vez
```bash
# Backend
pytest tests/ -v

# Frontend
cd frontend && npm test -- --watchAll=false
```

---

## 📊 Cobertura de Testes

### Backend

**Serviços Cobertos:**
- ✅ `services/security_service.py` - 85% cobertura
  - AuditService (100%)
  - LGPDService (90%)
  - BackupService (0% - não testado ainda)
  
- ✅ `services/value_calculator.py` - 100% cobertura

**Próximos Passos:**
- [ ] Testar `services/notification_service.py`
- [ ] Testar `services/payment_service.py` (Stripe integration)
- [ ] Testar routers principais

### Frontend

**Componentes Cobertos:**
- ✅ `contexts/ThemeContext.js` - 100% cobertura

**Próximos Passos:**
- [ ] Testar `components/NotificationCenter.js`
- [ ] Testar `components/admin/AdminSidebar.js`
- [ ] Testar páginas de admin

---

## 🔍 Ferramentas Utilizadas

### Backend
- **pytest** - Framework de testes
- **pytest-asyncio** - Suporte para testes assíncronos
- **pytest-cov** - Cobertura de código
- **httpx** - Cliente HTTP para testes de integração

### Frontend
- **Jest** - Test runner
- **React Testing Library** - Testes de componentes React
- **@testing-library/user-event** - Simulação de eventos de usuário

---

## 📝 Convenções de Nomenclatura

### Backend
- Arquivos: `test_<nome_do_servico>.py`
- Classes: `class Test<NomeDoServico>:`
- Métodos: `def test_<comportamento_esperado>():`

### Frontend
- Arquivos: `<ComponentName>.test.js`
- Testes: `test('deve fazer algo', () => {})`
- Grupos: `describe('<ComponentName>', () => {})`

---

## 🐛 Debugging Testes

### Backend - Pytest
```bash
# Modo verbose com prints
pytest tests/backend/test_security_service.py -v -s

# Rodar apenas 1 teste específico
pytest tests/backend/test_security_service.py::TestAuditService::test_audit_log_creation_success -v

# Parar no primeiro erro
pytest tests/ -x

# Ver logs detalhados
pytest tests/ --log-cli-level=DEBUG
```

### Frontend - Jest
```bash
# Rodar em modo watch
npm test -- --watch

# Rodar apenas testes que mudaram
npm test -- --onlyChanged

# Ver cobertura detalhada
npm test -- --coverage --verbose
```

---

## ✅ Checklist Pré-Deploy

Antes de fazer deploy em produção, execute:

- [ ] ✅ Todos testes unitários backend passando
- [ ] ✅ Todos testes unitários frontend passando
- [ ] ✅ Testes de integração API passando
- [ ] ✅ Cobertura de código > 80%
- [ ] ✅ Nenhum teste com `.skip` ou `.only`
- [ ] ✅ Vulnerabilidades de segurança corrigidas (ver `SAST_SECURITY_AUDIT_REPORT.md`)

---

## 📚 Referências

- [Pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Criado em:** Janeiro 2025  
**Última Atualização:** FASE 1 - Testes Unitários e Integração Básica

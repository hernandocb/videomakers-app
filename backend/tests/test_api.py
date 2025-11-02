import pytest
from httpx import AsyncClient
from server import app
import os

# Configure test environment
os.environ['DB_NAME'] = 'videomakers_platform_test'

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

class TestAuth:
    """Testes de autenticação"""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Testa se API está respondendo"""
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_signup_client(self, client):
        """Testa cadastro de cliente"""
        user_data = {
            "email": "teste_cliente@example.com",
            "password": "senha123",
            "nome": "João Teste",
            "telefone": "11999999999",
            "role": "client",
            "cidade": "São Paulo",
            "estado": "SP",
            "latitude": -23.5505,
            "longitude": -46.6333
        }
        
        response = await client.post("/api/auth/signup", json=user_data)
        assert response.status_code in [201, 400]  # 400 se já existe
        
        if response.status_code == 201:
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["user"]["email"] == user_data["email"]
    
    @pytest.mark.asyncio
    async def test_signup_videomaker(self, client):
        """Testa cadastro de videomaker"""
        user_data = {
            "email": "teste_videomaker@example.com",
            "password": "senha123",
            "nome": "Maria Videomaker",
            "telefone": "11988888888",
            "role": "videomaker",
            "cidade": "Rio de Janeiro",
            "estado": "RJ",
            "latitude": -22.9068,
            "longitude": -43.1729,
            "raio_atuacao_km": 30.0
        }
        
        response = await client.post("/api/auth/signup", json=user_data)
        assert response.status_code in [201, 400]
        
        if response.status_code == 201:
            data = response.json()
            assert data["user"]["role"] == "videomaker"
    
    @pytest.mark.asyncio
    async def test_login(self, client):
        """Testa login"""
        # Primeiro cria usuário
        signup_data = {
            "email": "teste_login@example.com",
            "password": "senha123",
            "nome": "Teste Login",
            "telefone": "11977777777",
            "role": "client"
        }
        await client.post("/api/auth/signup", json=signup_data)
        
        # Tenta fazer login
        login_data = {
            "email": "teste_login@example.com",
            "password": "senha123"
        }
        
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client):
        """Testa login com senha errada"""
        login_data = {
            "email": "teste_login@example.com",
            "password": "senha_errada"
        }
        
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

class TestJobs:
    """Testes de jobs"""
    
    @pytest.mark.asyncio
    async def test_create_job_requires_auth(self, client):
        """Testa que criar job requer autenticação"""
        job_data = {
            "titulo": "Teste Job",
            "descricao": "Descrição teste",
            "categoria": "evento",
            "data_gravacao": "2024-12-15T09:00:00Z",
            "duracao_horas": 4,
            "local": {
                "endereco": "Rua Teste",
                "cidade": "São Paulo",
                "estado": "SP",
                "latitude": -23.5505,
                "longitude": -46.6333
            },
            "extras": []
        }
        
        response = await client.post("/api/jobs", json=job_data)
        assert response.status_code == 401  # Sem autenticação

class TestValueCalculator:
    """Testes de cálculo de valores"""
    
    def test_calculate_minimum_value_basic(self):
        """Testa cálculo básico sem extras"""
        from services.value_calculator import ValueCalculator
        
        valor = ValueCalculator.calculate_minimum_value(
            duracao_horas=4.0,
            extras=[],
            valor_hora_base=120.0
        )
        
        assert valor == 480.0  # 120 * 4
    
    def test_calculate_minimum_value_with_extras(self):
        """Testa cálculo com extras"""
        from services.value_calculator import ValueCalculator
        
        valor = ValueCalculator.calculate_minimum_value(
            duracao_horas=8.0,
            extras=["drone", "edicao_avancada"],
            valor_hora_base=120.0
        )
        
        # 120*8 + 100(drone) + 150(edição) = 1210
        assert valor == 1210.0
    
    def test_calculate_commission(self):
        """Testa cálculo de comissão"""
        from services.value_calculator import ValueCalculator
        
        result = ValueCalculator.calculate_commission(
            valor_total=1000.0,
            taxa_comissao=0.20
        )
        
        assert result["comissao_plataforma"] == 200.0
        assert result["valor_videomaker"] == 800.0

class TestGeolocation:
    """Testes de geolocalização"""
    
    def test_haversine_distance(self):
        """Testa cálculo de distância entre dois pontos"""
        from services.geolocation_service import haversine
        
        # São Paulo para Rio de Janeiro (aprox. 430km)
        distance = haversine(
            lon1=-46.6333, lat1=-23.5505,  # São Paulo
            lon2=-43.1729, lat2=-22.9068   # Rio de Janeiro
        )
        
        assert 400 < distance < 450  # Aproximadamente 430km
    
    def test_is_within_radius(self):
        """Testa se ponto está dentro do raio"""
        from services.geolocation_service import is_within_radius
        
        # Pontos próximos em São Paulo (dentro de 10km)
        result = is_within_radius(
            user_lat=-23.5505, user_lon=-46.6333,
            target_lat=-23.5489, target_lon=-46.6388,
            radius_km=10
        )
        
        assert result is True

class TestChatModeration:
    """Testes de moderação de chat"""
    
    def test_block_phone_number(self):
        """Testa bloqueio de números de telefone"""
        from utils.validators import contains_blocked_content
        
        is_blocked, reason = contains_blocked_content("Meu telefone é 11987654321")
        assert is_blocked is True
        assert reason == "phone_number"
    
    def test_block_email(self):
        """Testa bloqueio de emails"""
        from utils.validators import contains_blocked_content
        
        is_blocked, reason = contains_blocked_content("Me manda email: teste@example.com")
        assert is_blocked is True
        assert reason == "email"
    
    def test_block_url(self):
        """Testa bloqueio de URLs"""
        from utils.validators import contains_blocked_content
        
        is_blocked, reason = contains_blocked_content("Acesse www.example.com")
        assert is_blocked is True
        assert reason == "url"
    
    def test_allow_normal_message(self):
        """Testa que mensagens normais passam"""
        from utils.validators import contains_blocked_content
        
        is_blocked, reason = contains_blocked_content("Olá, tudo bem? Vamos agendar a gravação?")
        assert is_blocked is False
        assert reason is None

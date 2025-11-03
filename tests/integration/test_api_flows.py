import pytest
import httpx
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001') + '/api'


class TestAuthenticationFlow:
    """Testes de integração para fluxo de autenticação"""
    
    @pytest.mark.asyncio
    async def test_signup_login_refresh_flow(self):
        """
        Testa fluxo completo: signup -> login -> refresh token
        """
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # 1. SIGNUP - Criar novo usuário
            signup_data = {
                "email": f"test_{datetime.now().timestamp()}@test.com",
                "password": "Test@1234",
                "nome": "Test User",
                "telefone": "11999999999",
                "role": "client",
                "cidade": "São Paulo",
                "estado": "SP",
                "latitude": -23.5505,
                "longitude": -46.6333
            }
            
            signup_response = await client.post("/auth/signup", json=signup_data)
            
            # Assert signup
            assert signup_response.status_code == 201
            signup_json = signup_response.json()
            assert "access_token" in signup_json
            assert "refresh_token" in signup_json
            assert signup_json["user"]["email"] == signup_data["email"]
            
            access_token_1 = signup_json["access_token"]
            refresh_token = signup_json["refresh_token"]
            user_id = signup_json["user"]["id"]
            
            # 2. LOGIN - Fazer login com o mesmo usuário
            login_data = {
                "email": signup_data["email"],
                "password": signup_data["password"]
            }
            
            login_response = await client.post("/auth/login", json=login_data)
            
            # Assert login
            assert login_response.status_code == 200
            login_json = login_response.json()
            assert "access_token" in login_json
            assert login_json["user"]["id"] == user_id
            
            access_token_2 = login_json["access_token"]
            
            # 3. GET /users/me - Verificar acesso autenticado
            headers = {"Authorization": f"Bearer {access_token_2}"}
            me_response = await client.get("/users/me", headers=headers)
            
            # Assert /me endpoint
            assert me_response.status_code == 200
            me_json = me_response.json()
            assert me_json["email"] == signup_data["email"]
            assert me_json["role"] == "client"
            
            # 4. REFRESH - Renovar access token
            refresh_response = await client.post(
                "/auth/refresh",
                params={"refresh_token": refresh_token}
            )
            
            # Assert refresh
            assert refresh_response.status_code == 200
            refresh_json = refresh_response.json()
            assert "access_token" in refresh_json
            assert refresh_json["access_token"] != access_token_2  # Novo token
    
    @pytest.mark.asyncio
    async def test_login_with_wrong_password(self):
        """Testa login com senha incorreta"""
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # Tenta fazer login com credenciais inválidas
            login_data = {
                "email": "admin@videomakers.com",
                "password": "wrongpassword"
            }
            
            response = await client.post("/auth/login", json=login_data)
            
            # Assert - Deve retornar 401
            assert response.status_code == 401
            assert "Email ou senha incorretos" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_access_protected_route_without_token(self):
        """Testa acesso a rota protegida sem token"""
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            response = await client.get("/users/me")
            
            # Assert - Deve retornar 401
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_access_protected_route_with_invalid_token(self):
        """Testa acesso com token inválido"""
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            headers = {"Authorization": "Bearer invalid_token_123"}
            response = await client.get("/users/me", headers=headers)
            
            # Assert - Deve retornar 401
            assert response.status_code == 401


class TestAdminPermissions:
    """Testes de integração para permissões de admin"""
    
    @pytest.mark.asyncio
    async def test_admin_can_access_users_endpoint(self):
        """
        Testa que admin consegue acessar GET /admin/users
        """
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # 1. Login como admin
            login_data = {
                "email": "admin@videomakers.com",
                "password": "admin123"
            }
            
            login_response = await client.post("/auth/login", json=login_data)
            assert login_response.status_code == 200
            
            access_token = login_response.json()["access_token"]
            
            # 2. Acessar /admin/users
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get("/admin/users", headers=headers)
            
            # Assert - Admin tem acesso
            assert response.status_code == 200
            users = response.json()
            assert isinstance(users, list)
    
    @pytest.mark.asyncio
    async def test_client_cannot_access_admin_endpoint(self):
        """
        Testa que cliente NÃO consegue acessar endpoints de admin
        TESTE NEGATIVO - Valida Broken Access Control
        """
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # 1. Criar usuário cliente
            signup_data = {
                "email": f"client_{datetime.now().timestamp()}@test.com",
                "password": "Test@1234",
                "nome": "Test Client",
                "telefone": "11999999999",
                "role": "client",
                "cidade": "São Paulo",
                "estado": "SP"
            }
            
            signup_response = await client.post("/auth/signup", json=signup_data)
            access_token = signup_response.json()["access_token"]
            
            # 2. Tentar acessar /admin/users com token de cliente
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get("/admin/users", headers=headers)
            
            # Assert - Deve retornar 403 Forbidden
            assert response.status_code == 403
            assert "Permissão negada" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_admin_can_update_user(self):
        """
        Testa que admin consegue atualizar dados de usuário
        PUT /admin/users/{id}
        """
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # 1. Login como admin
            login_response = await client.post(
                "/auth/login",
                json={"email": "admin@videomakers.com", "password": "admin123"}
            )
            admin_token = login_response.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            
            # 2. Criar usuário para testar
            user_email = f"testuser_{datetime.now().timestamp()}@test.com"
            signup_response = await client.post(
                "/auth/signup",
                json={
                    "email": user_email,
                    "password": "Test@1234",
                    "nome": "Test User Original",
                    "telefone": "11999999999",
                    "role": "client",
                    "cidade": "São Paulo",
                    "estado": "SP"
                }
            )
            user_id = signup_response.json()["user"]["id"]
            
            # 3. Admin verifica o usuário (verifica conta)
            verify_response = await client.put(
                f"/admin/users/{user_id}/verify",
                headers=admin_headers
            )
            
            # Assert - Verificação bem-sucedida
            assert verify_response.status_code == 200
            assert verify_response.json()["success"] is True


class TestJobProposalFlow:
    """Testes de integração para fluxo de Jobs e Propostas"""
    
    @pytest.mark.asyncio
    async def test_full_job_proposal_workflow(self):
        """
        Testa fluxo completo:
        1. Cliente cria job
        2. Videomaker vê o job
        3. Videomaker envia proposta
        4. Cliente aceita proposta
        """
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # Setup: Criar cliente e videomaker
            timestamp = datetime.now().timestamp()
            
            # Cliente
            client_signup = await client.post("/auth/signup", json={
                "email": f"client_{timestamp}@test.com",
                "password": "Test@1234",
                "nome": "Test Client",
                "telefone": "11999999999",
                "role": "client",
                "cidade": "São Paulo",
                "estado": "SP",
                "latitude": -23.5505,
                "longitude": -46.6333
            })
            client_token = client_signup.json()["access_token"]
            client_id = client_signup.json()["user"]["id"]
            
            # Videomaker
            videomaker_signup = await client.post("/auth/signup", json={
                "email": f"videomaker_{timestamp}@test.com",
                "password": "Test@1234",
                "nome": "Test Videomaker",
                "telefone": "11988888888",
                "role": "videomaker",
                "cidade": "São Paulo",
                "estado": "SP",
                "latitude": -23.5505,
                "longitude": -46.6333
            })
            videomaker_token = videomaker_signup.json()["access_token"]
            videomaker_id = videomaker_signup.json()["user"]["id"]
            
            # 1. Cliente cria job
            job_data = {
                "titulo": "Filmagem de Casamento",
                "descricao": "Preciso de um videomaker para casamento",
                "categoria": "casamento",
                "data_gravacao": "2025-12-25T14:00:00",
                "duracao_horas": 4.0,
                "local": {
                    "endereco": "Av. Paulista, 1000",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "latitude": -23.5505,
                    "longitude": -46.6333
                },
                "extras": ["drone", "edicao_avancada"]
            }
            
            job_response = await client.post(
                "/jobs",
                json=job_data,
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            assert job_response.status_code == 201
            job = job_response.json()
            job_id = job["id"]
            valor_minimo = job["valor_minimo"]
            
            # Assert - Job criado com sucesso
            assert job["titulo"] == "Filmagem de Casamento"
            assert job["status"] == "open"
            assert valor_minimo > 0
            
            # 2. Videomaker vê o job
            jobs_list_response = await client.get(
                "/jobs",
                headers={"Authorization": f"Bearer {videomaker_token}"}
            )
            
            assert jobs_list_response.status_code == 200
            jobs = jobs_list_response.json()
            assert any(j["id"] == job_id for j in jobs)
            
            # 3. Videomaker envia proposta
            proposal_data = {
                "job_id": job_id,
                "valor_proposto": valor_minimo + 100,  # Acima do mínimo
                "mensagem": "Tenho experiência com casamentos!",
                "data_entrega_estimada": "2025-12-30T18:00:00"
            }
            
            proposal_response = await client.post(
                "/proposals",
                json=proposal_data,
                headers={"Authorization": f"Bearer {videomaker_token}"}
            )
            
            assert proposal_response.status_code == 201
            proposal = proposal_response.json()
            proposal_id = proposal["id"]
            
            # Assert - Proposta criada
            assert proposal["status"] == "pending"
            assert proposal["videomaker_id"] == videomaker_id
            
            # 4. Cliente vê propostas do job
            proposals_response = await client.get(
                f"/proposals/job/{job_id}",
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            assert proposals_response.status_code == 200
            proposals = proposals_response.json()
            assert len(proposals) >= 1
            assert proposals[0]["id"] == proposal_id
            
            # 5. Cliente aceita proposta
            accept_response = await client.put(
                f"/proposals/{proposal_id}/accept",
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            assert accept_response.status_code == 200
            accept_data = accept_response.json()
            assert accept_data["success"] is True
            assert "chat_id" in accept_data  # Chat foi criado
            
            # 6. Verificar que job mudou para "in_progress"
            job_check = await client.get(
                f"/jobs/{job_id}",
                headers={"Authorization": f"Bearer {client_token}"}
            )
            
            updated_job = job_check.json()
            assert updated_job["status"] == "in_progress"
            assert updated_job["videomaker_id"] == videomaker_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

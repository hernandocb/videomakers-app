import pytest
import sys
import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

from services.security_service import AuditService, LGPDService
from models.security import AuditLog


class TestAuditService:
    """Testes unitários para o serviço de auditoria"""
    
    @pytest.mark.asyncio
    async def test_audit_log_creation_success(self):
        """Testa criação bem-sucedida de log de auditoria"""
        # Arrange
        mock_db = MagicMock()
        mock_db.audit_logs = MagicMock()
        mock_db.audit_logs.insert_one = AsyncMock(return_value=MagicMock(inserted_id="123"))
        
        # Act
        await AuditService.log(
            db=mock_db,
            user_id="user_123",
            user_email="test@test.com",
            user_role="admin",
            action="login",
            resource="auth",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            status="success"
        )
        
        # Assert
        mock_db.audit_logs.insert_one.assert_called_once()
        call_args = mock_db.audit_logs.insert_one.call_args[0][0]
        
        assert call_args["user_id"] == "user_123"
        assert call_args["user_email"] == "test@test.com"
        assert call_args["action"] == "login"
        assert call_args["resource"] == "auth"
        assert call_args["status"] == "success"
        assert call_args["ip_address"] == "192.168.1.1"
    
    @pytest.mark.asyncio
    async def test_audit_log_with_changes_tracking(self):
        """Testa log de auditoria com tracking de mudanças"""
        # Arrange
        mock_db = MagicMock()
        mock_db.audit_logs = MagicMock()
        mock_db.audit_logs.insert_one = AsyncMock()
        
        changes = {
            "before": {"status": "open", "valor": 100.0},
            "after": {"status": "completed", "valor": 150.0}
        }
        
        # Act
        await AuditService.log(
            db=mock_db,
            user_id="admin_456",
            user_email="admin@test.com",
            user_role="admin",
            action="update",
            resource="job",
            resource_id="job_789",
            changes=changes,
            status="success"
        )
        
        # Assert
        call_args = mock_db.audit_logs.insert_one.call_args[0][0]
        assert call_args["changes"] == changes
        assert call_args["resource_id"] == "job_789"
    
    @pytest.mark.asyncio
    async def test_audit_log_handles_exception_gracefully(self):
        """Testa que erros no audit log não quebram a aplicação"""
        # Arrange
        mock_db = MagicMock()
        mock_db.audit_logs = MagicMock()
        mock_db.audit_logs.insert_one = AsyncMock(side_effect=Exception("DB error"))
        
        # Act - não deve lançar exceção
        try:
            await AuditService.log(
                db=mock_db,
                user_id="user_123",
                user_email="test@test.com",
                user_role="client",
                action="login",
                resource="auth"
            )
            # Se chegou aqui, o teste passou
            assert True
        except Exception:
            # Se lançou exceção, o teste falhou
            pytest.fail("AuditService.log should not raise exceptions")


class TestLGPDService:
    """Testes para compliance LGPD"""
    
    @pytest.mark.asyncio
    async def test_export_user_data_complete(self):
        """Testa exportação completa de dados do usuário"""
        # Arrange
        mock_db = MagicMock()
        
        user_data = {
            "id": "user_123",
            "email": "user@test.com",
            "nome": "Test User",
            "telefone": "11999999999",
            "role": "client"
        }
        
        mock_db.users.find_one = AsyncMock(return_value=user_data)
        mock_db.jobs.find = MagicMock()
        mock_db.jobs.find.return_value.to_list = AsyncMock(return_value=[
            {"id": "job_1", "titulo": "Test Job"}
        ])
        
        mock_db.proposals.find = MagicMock()
        mock_db.proposals.find.return_value.to_list = AsyncMock(return_value=[])
        
        mock_db.payments.find = MagicMock()
        mock_db.payments.find.return_value.to_list = AsyncMock(return_value=[])
        
        mock_db.ratings.find = MagicMock()
        mock_db.ratings.find.return_value.to_list = AsyncMock(return_value=[])
        
        mock_db.chats.find = MagicMock()
        mock_db.chats.find.return_value.to_list = AsyncMock(return_value=[])
        
        # Act
        result = await LGPDService.export_user_data(mock_db, "user_123")
        
        # Assert
        assert result is not None
        assert result["user_id"] == "user_123"
        assert result["personal_data"]["email"] == "user@test.com"
        assert len(result["jobs"]) == 1
        assert "data_categories" in result
        assert "export_date" in result
    
    @pytest.mark.asyncio
    async def test_export_user_data_user_not_found(self):
        """Testa exportação quando usuário não existe"""
        # Arrange
        mock_db = MagicMock()
        mock_db.users.find_one = AsyncMock(return_value=None)
        
        # Act
        result = await LGPDService.export_user_data(mock_db, "nonexistent")
        
        # Assert
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_user_account_complete(self):
        """Testa deleção completa de conta de usuário"""
        # Arrange
        mock_db = MagicMock()
        
        # Mock all delete operations
        mock_db.users.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        mock_db.jobs.delete_many = AsyncMock(return_value=MagicMock(deleted_count=2))
        mock_db.proposals.delete_many = AsyncMock(return_value=MagicMock(deleted_count=5))
        mock_db.ratings.delete_many = AsyncMock(return_value=MagicMock(deleted_count=3))
        mock_db.payments.update_many = AsyncMock()
        mock_db.device_tokens.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        mock_db.identity_verifications.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        mock_db.two_factor_secrets.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        
        # Mock chats
        mock_db.chats.find = MagicMock()
        mock_db.chats.find.return_value.to_list = AsyncMock(return_value=[
            {"id": "chat_1"}
        ])
        mock_db.messages.delete_many = AsyncMock(return_value=MagicMock(deleted_count=10))
        mock_db.chats.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        
        # Act
        result = await LGPDService.delete_user_account(mock_db, "user_123")
        
        # Assert
        assert result["success"] is True
        assert result["deleted_count"]["user"] == 1
        assert result["deleted_count"]["jobs"] == 2
        assert result["deleted_count"]["proposals"] == 5
        assert result["deleted_count"]["messages"] == 10
        
        # Verify payments were anonymized, not deleted
        mock_db.payments.update_many.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_user_account_handles_errors(self):
        """Testa tratamento de erro na deleção de conta"""
        # Arrange
        mock_db = MagicMock()
        mock_db.users.delete_one = AsyncMock(side_effect=Exception("DB error"))
        
        # Act
        result = await LGPDService.delete_user_account(mock_db, "user_123")
        
        # Assert
        assert result["success"] is False
        assert "error" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

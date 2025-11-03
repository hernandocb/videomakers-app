import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

from services.value_calculator import ValueCalculator


class TestValueCalculator:
    """Testes unitários para cálculo de valores e comissões"""
    
    def test_calculate_minimum_value_basic(self):
        """Testa cálculo básico de valor mínimo sem extras"""
        # Arrange
        duracao_horas = 2.0
        extras = []
        valor_hora_base = 120.0
        
        # Act
        result = ValueCalculator.calculate_minimum_value(
            duracao_horas, extras, valor_hora_base
        )
        
        # Assert
        expected = 2.0 * 120.0  # 240.0
        assert result == expected
    
    def test_calculate_minimum_value_with_extras(self):
        """Testa cálculo com extras adicionados"""
        # Arrange
        duracao_horas = 3.0
        extras = ["drone", "edicao_avancada"]
        valor_hora_base = 120.0
        
        # Act
        result = ValueCalculator.calculate_minimum_value(
            duracao_horas, extras, valor_hora_base
        )
        
        # Assert
        base_value = 3.0 * 120.0  # 360.0
        # Cada extra adiciona 30% ao valor base
        expected = base_value + (base_value * 0.30 * 2)  # 360 + 216 = 576.0
        assert result == expected
    
    def test_calculate_minimum_value_zero_hours(self):
        """Testa comportamento com duração zero"""
        # Arrange
        duracao_horas = 0.0
        extras = []
        valor_hora_base = 120.0
        
        # Act
        result = ValueCalculator.calculate_minimum_value(
            duracao_horas, extras, valor_hora_base
        )
        
        # Assert
        assert result == 0.0
    
    def test_calculate_commission_20_percent(self):
        """Testa cálculo de comissão de 20% (Stripe Connect)"""
        # Arrange
        valor_total = 1000.0
        taxa_comissao = 0.20  # 20%
        
        # Act
        result = ValueCalculator.calculate_commission(valor_total, taxa_comissao)
        
        # Assert
        assert result["comissao_plataforma"] == 200.0  # 20% de 1000
        assert result["valor_videomaker"] == 800.0    # 80% de 1000
        assert result["valor_total"] == 1000.0
    
    def test_calculate_commission_different_rates(self):
        """Testa cálculo com diferentes taxas de comissão"""
        # Test 15%
        result_15 = ValueCalculator.calculate_commission(1000.0, 0.15)
        assert result_15["comissao_plataforma"] == 150.0
        assert result_15["valor_videomaker"] == 850.0
        
        # Test 25%
        result_25 = ValueCalculator.calculate_commission(1000.0, 0.25)
        assert result_25["comissao_plataforma"] == 250.0
        assert result_25["valor_videomaker"] == 750.0
    
    def test_calculate_commission_rounding(self):
        """Testa arredondamento correto de valores decimais"""
        # Arrange
        valor_total = 333.33
        taxa_comissao = 0.20
        
        # Act
        result = ValueCalculator.calculate_commission(valor_total, taxa_comissao)
        
        # Assert
        # Comissão: 333.33 * 0.20 = 66.666 -> 66.67
        assert round(result["comissao_plataforma"], 2) == 66.67
        # Videomaker: 333.33 * 0.80 = 266.664 -> 266.66
        assert round(result["valor_videomaker"], 2) == 266.66
    
    def test_calculate_commission_edge_case_zero(self):
        """Testa edge case com valor zero"""
        # Act
        result = ValueCalculator.calculate_commission(0.0, 0.20)
        
        # Assert
        assert result["comissao_plataforma"] == 0.0
        assert result["valor_videomaker"] == 0.0
    
    def test_calculate_commission_edge_case_100_percent(self):
        """Testa edge case com comissão de 100%"""
        # Act
        result = ValueCalculator.calculate_commission(1000.0, 1.0)
        
        # Assert
        assert result["comissao_plataforma"] == 1000.0
        assert result["valor_videomaker"] == 0.0


class TestPaymentCalculations:
    """Testes de integração para cálculos de pagamento"""
    
    def test_full_payment_flow_calculation(self):
        """Testa fluxo completo de cálculo de pagamento"""
        # Arrange - Cenário real
        # Job: 3 horas de filmagem + drone + edição avançada
        duracao_horas = 3.0
        extras = ["drone", "edicao_avancada"]
        valor_hora_base = 120.0
        taxa_comissao = 0.20
        
        # Act
        # 1. Cliente cria job, sistema calcula valor mínimo
        valor_minimo = ValueCalculator.calculate_minimum_value(
            duracao_horas, extras, valor_hora_base
        )
        
        # 2. Videomaker faz proposta com valor >= mínimo
        valor_proposta = valor_minimo  # Aceitou o mínimo
        
        # 3. Cliente aceita e vai pagar
        valores_pagamento = ValueCalculator.calculate_commission(
            valor_proposta, taxa_comissao
        )
        
        # Assert
        assert valor_minimo == 576.0  # 3*120 + 60% extras
        assert valores_pagamento["valor_total"] == 576.0
        assert valores_pagamento["comissao_plataforma"] == 115.2  # 20%
        assert valores_pagamento["valor_videomaker"] == 460.8     # 80%
        
        # Verificação: soma deve bater
        assert (
            valores_pagamento["comissao_plataforma"] + 
            valores_pagamento["valor_videomaker"]
        ) == valores_pagamento["valor_total"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

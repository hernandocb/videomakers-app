from utils.constants import EXTRAS, DEFAULT_HOURLY_RATE

class ValueCalculator:
    @staticmethod
    def calculate_minimum_value(duracao_horas: float, extras: list, 
                                valor_hora_base: float = DEFAULT_HOURLY_RATE) -> float:
        """Calcula o valor mínimo sugerido para um job"""
        
        # Valor base por horas
        valor_base = valor_hora_base * duracao_horas
        
        # Soma dos extras
        valor_extras = sum(EXTRAS.get(extra, 0.0) for extra in extras)
        
        # Valor mínimo total
        valor_minimo = valor_base + valor_extras
        
        return round(valor_minimo, 2)
    
    @staticmethod
    def calculate_commission(valor_total: float, taxa_comissao: float) -> dict:
        """Calcula a comissão da plataforma e valor do videomaker"""
        comissao_plataforma = round(valor_total * taxa_comissao, 2)
        valor_videomaker = round(valor_total - comissao_plataforma, 2)
        
        return {
            "comissao_plataforma": comissao_plataforma,
            "valor_videomaker": valor_videomaker
        }

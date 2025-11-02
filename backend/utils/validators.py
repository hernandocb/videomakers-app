import re
from typing import Optional

# Regex para moderação de chat
PHONE_PATTERN = re.compile(r'\d{8,11}')
EMAIL_PATTERN = re.compile(r'\S+@\S+\.\S+')
URL_PATTERN = re.compile(r'http[s]?://|www\.')

def contains_blocked_content(text: str) -> tuple[bool, Optional[str]]:
    """Verifica se o texto contém conteúdo bloqueado (números, emails, links)"""
    if PHONE_PATTERN.search(text):
        return True, "phone_number"
    if EMAIL_PATTERN.search(text):
        return True, "email"
    if URL_PATTERN.search(text):
        return True, "url"
    return False, None

def validate_cpf(cpf: str) -> bool:
    """Validação básica de CPF (apenas formato)"""
    cpf = re.sub(r'\D', '', cpf)
    return len(cpf) == 11

def validate_phone(phone: str) -> bool:
    """Validação de telefone brasileiro"""
    phone = re.sub(r'\D', '', phone)
    return len(phone) in [10, 11]  # DDD + número

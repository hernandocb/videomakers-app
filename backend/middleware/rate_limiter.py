from fastapi import Request, HTTPException, status
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import asyncio

class RateLimiter:
    def __init__(self, requests_per_window: int = 100, window_seconds: int = 60):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.cleanup_task = None
    
    async def check_rate_limit(self, request: Request):
        """Verifica rate limit por IP"""
        client_ip = request.client.host
        now = datetime.now(timezone.utc)
        
        # Remove requisições antigas
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < timedelta(seconds=self.window_seconds)
        ]
        
        # Verifica limite
        if len(self.requests[client_ip]) >= self.requests_per_window:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Limite de requisições excedido. Tente novamente em {self.window_seconds} segundos."
            )
        
        # Adiciona requisição atual
        self.requests[client_ip].append(now)
    
    async def cleanup_old_requests(self):
        """Limpeza periódica de requisições antigas"""
        while True:
            await asyncio.sleep(self.window_seconds)
            now = datetime.now(timezone.utc)
            
            for ip in list(self.requests.keys()):
                self.requests[ip] = [
                    req_time for req_time in self.requests[ip]
                    if now - req_time < timedelta(seconds=self.window_seconds)
                ]
                
                if not self.requests[ip]:
                    del self.requests[ip]

# Instância global
rate_limiter = RateLimiter()

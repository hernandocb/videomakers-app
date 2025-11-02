import stripe
import os
from typing import Optional
from datetime import datetime, timezone

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class PaymentService:
    @staticmethod
    async def create_payment_intent(amount: float, customer_email: str, metadata: dict) -> dict:
        """Cria um PaymentIntent no Stripe para reter valor em escrow"""
        try:
            # Converter para centavos (Stripe usa centavos)
            amount_cents = int(amount * 100)
            
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="brl",
                receipt_email=customer_email,
                capture_method="manual",  # Não captura automaticamente (escrow)
                metadata=metadata,
                description=f"Pagamento Job ID: {metadata.get('job_id')}"
            )
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "status": payment_intent.status
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def capture_payment(payment_intent_id: str, amount: Optional[float] = None) -> dict:
        """Captura o pagamento (libera do escrow)"""
        try:
            params = {}
            if amount:
                params["amount_to_capture"] = int(amount * 100)
            
            payment_intent = stripe.PaymentIntent.capture(payment_intent_id, **params)
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "captured_at": datetime.now(timezone.utc)
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def refund_payment(payment_intent_id: str, amount: Optional[float] = None) -> dict:
        """Reembolsa o pagamento"""
        try:
            params = {"payment_intent": payment_intent_id}
            if amount:
                params["amount"] = int(amount * 100)
            
            refund = stripe.Refund.create(**params)
            
            return {
                "success": True,
                "refund_id": refund.id,
                "status": refund.status,
                "refunded_at": datetime.now(timezone.utc)
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def get_payment_status(payment_intent_id: str) -> dict:
        """Consulta status de um pagamento"""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount": payment_intent.amount / 100,
                "currency": payment_intent.currency
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }

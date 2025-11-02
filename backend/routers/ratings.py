from fastapi import APIRouter, HTTPException, status, Depends
from middleware.auth_middleware import get_current_user
from models.rating import RatingCreate, Rating, RatingResponse
from typing import List
from datetime import datetime, timezone

router = APIRouter(prefix="/ratings", tags=["Avaliações"])

from server import db

@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating_data: RatingCreate,
    user: dict = Depends(get_current_user)
):
    """Cria avaliação após job concluído"""
    
    # Busca job
    job = await db.jobs.find_one({"id": rating_data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica se job está completo
    if job["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas jobs concluídos podem ser avaliados"
        )
    
    # Verifica se usuário participou do job
    if user["sub"] not in [job["client_id"], job.get("videomaker_id")]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não participou deste job"
        )
    
    # Verifica se to_user_id é válido
    if rating_data.to_user_id not in [job["client_id"], job.get("videomaker_id")]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário avaliado não participou deste job"
        )
    
    # Não pode avaliar a si mesmo
    if user["sub"] == rating_data.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode avaliar a si mesmo"
        )
    
    # Verifica se já avaliou
    existing_rating = await db.ratings.find_one({
        "job_id": rating_data.job_id,
        "from_user_id": user["sub"],
        "to_user_id": rating_data.to_user_id
    })
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você já avaliou este usuário para este job"
        )
    
    # Cria avaliação
    rating = Rating(
        job_id=rating_data.job_id,
        from_user_id=user["sub"],
        to_user_id=rating_data.to_user_id,
        rating=rating_data.rating,
        comentario=rating_data.comentario
    )
    
    # Salva no banco
    rating_dict = rating.model_dump()
    rating_dict['created_at'] = rating_dict['created_at'].isoformat()
    
    await db.ratings.insert_one(rating_dict)
    
    # Atualiza rating médio do usuário avaliado
    ratings_list = await db.ratings.find(
        {"to_user_id": rating_data.to_user_id},
        {"_id": 0}
    ).to_list(10000)
    
    if ratings_list:
        rating_medio = sum(r["rating"] for r in ratings_list) / len(ratings_list)
        
        await db.users.update_one(
            {"id": rating_data.to_user_id},
            {"$set": {
                "rating_medio": round(rating_medio, 2),
                "total_avaliacoes": len(ratings_list),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return RatingResponse(
        id=rating.id,
        job_id=rating.job_id,
        from_user_id=rating.from_user_id,
        to_user_id=rating.to_user_id,
        rating=rating.rating,
        comentario=rating.comentario,
        created_at=rating.created_at
    )

@router.get("/user/{user_id}", response_model=List[RatingResponse])
async def get_user_ratings(user_id: str):
    """Obtém todas as avaliações de um usuário"""
    
    ratings = await db.ratings.find(
        {"to_user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    response = []
    for rating_dict in ratings:
        response.append(RatingResponse(
            id=rating_dict["id"],
            job_id=rating_dict["job_id"],
            from_user_id=rating_dict["from_user_id"],
            to_user_id=rating_dict["to_user_id"],
            rating=rating_dict["rating"],
            comentario=rating_dict.get("comentario"),
            created_at=datetime.fromisoformat(rating_dict["created_at"]) if isinstance(rating_dict["created_at"], str) else rating_dict["created_at"]
        ))
    
    return response

@router.get("/job/{job_id}", response_model=List[RatingResponse])
async def get_job_ratings(
    job_id: str,
    user: dict = Depends(get_current_user)
):
    """Obtém avaliações de um job específico"""
    
    ratings = await db.ratings.find(
        {"job_id": job_id},
        {"_id": 0}
    ).to_list(100)
    
    response = []
    for rating_dict in ratings:
        response.append(RatingResponse(
            id=rating_dict["id"],
            job_id=rating_dict["job_id"],
            from_user_id=rating_dict["from_user_id"],
            to_user_id=rating_dict["to_user_id"],
            rating=rating_dict["rating"],
            comentario=rating_dict.get("comentario"),
            created_at=datetime.fromisoformat(rating_dict["created_at"]) if isinstance(rating_dict["created_at"], str) else rating_dict["created_at"]
        ))
    
    return response

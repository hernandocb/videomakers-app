from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from fastapi import UploadFile
from typing import Optional
import io

class StorageService:
    def __init__(self, db):
        self.fs = AsyncIOMotorGridFSBucket(db)
    
    async def upload_file(self, file: UploadFile, metadata: dict = None) -> str:
        """Faz upload de arquivo para GridFS"""
        content = await file.read()
        
        file_metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
        }
        
        if metadata:
            file_metadata.update(metadata)
        
        file_id = await self.fs.upload_from_stream(
            file.filename,
            io.BytesIO(content),
            metadata=file_metadata
        )
        
        return str(file_id)
    
    async def download_file(self, file_id: str) -> Optional[bytes]:
        """Baixa arquivo do GridFS"""
        try:
            from bson import ObjectId
            grid_out = await self.fs.open_download_stream(ObjectId(file_id))
            contents = await grid_out.read()
            return contents
        except Exception as e:
            print(f"Error downloading file: {e}")
            return None
    
    async def delete_file(self, file_id: str) -> bool:
        """Deleta arquivo do GridFS"""
        try:
            from bson import ObjectId
            await self.fs.delete(ObjectId(file_id))
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    async def get_file_metadata(self, file_id: str) -> Optional[dict]:
        """Obtém metadados de um arquivo"""
        try:
            from bson import ObjectId
            grid_out = await self.fs.open_download_stream(ObjectId(file_id))
            return {
                "file_id": str(grid_out._id),
                "filename": grid_out.filename,
                "length": grid_out.length,
                "upload_date": grid_out.upload_date,
                "metadata": grid_out.metadata
            }
        except Exception as e:
            print(f"Error getting file metadata: {e}")
            return None

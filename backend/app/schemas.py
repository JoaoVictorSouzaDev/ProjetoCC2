from pydantic import BaseModel
from typing import Optional

class LeituraCreate(BaseModel):
    estacao_id: int = 1
    temperatura: Optional[float] = 0.0 #Provisório
    umidade: Optional[float] = 0.0 #Provisório
    pressao: float
    qualidade_ar: float
    luminosidade: int

class LeituraResponse(LeituraCreate):
    id: int
    data_hora: str
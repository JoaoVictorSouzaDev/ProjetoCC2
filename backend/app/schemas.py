from pydantic import BaseModel
from typing import Optional

class LeituraCreate(BaseModel):
    estacao_id: int = 1
    temperatura: float
    umidade: float
    pressao: float
    qualidade_ar: float
    luminosidade: float

class LeituraResponse(LeituraCreate):
    id: int
    data_hora: str
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Schema para receber/validar os dados enviados pelo ESP32 (Leituras)
class LeituraCreate(BaseModel):
    estacao_id: int = 1
    temperatura: Optional[float] = 0.0  # Provisório
    umidade: Optional[float] = 0.0      # Provisório
    pressao: float
    qualidade_ar: float
    luminosidade: int

# Schema para retornar os dados de leitura já salvos
class LeituraResponse(LeituraCreate):
    id: int
    data_hora: str

    class Config:
        from_attributes = True

# Novo schema para formatar a resposta da listagem de estações no carrossel
class EstacaoResponse(BaseModel):
    id: int
    nome: str
    latitude: float
    longitude: float
    status: str
    criado: Optional[datetime] = None

    class Config:
        from_attributes = True  # Compatível com Pydantic v2 (ou orm_mode = True se for v1)
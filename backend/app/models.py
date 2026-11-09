from sqlalchemy import Column, Integer, String, Float, TIMESTAMP, ForeignKey # type: ignore[reportMissingImports]
from datetime import datetime
from app.database import Base  # Ajuste conforme o caminho do seu arquivo de banco de dados

class Estacao(Base):
    __tablename__ = "estacoes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default='ativo')
    criado = Column(TIMESTAMP, default=datetime.utcnow)

class Leitura(Base):
    __tablename__ = "leituras" # Ajuste para o nome exato da sua tabela de leituras no MySQL, se for diferente

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    estacao_id = Column(Integer, ForeignKey("estacoes.id"), nullable=False)
    temperatura = Column(Float, nullable=True)
    umidade = Column(Float, nullable=True)
    pressao = Column(Float, nullable=False)
    qualidade_ar = Column(Float, nullable=False)
    luminosidade = Column(Integer, nullable=False)
    data_hora = Column(TIMESTAMP, default=datetime.utcnow)
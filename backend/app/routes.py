from fastapi import APIRouter, HTTPException, Query
from app.database import get_db_connection
from app.schemas import LeituraCreate

router = APIRouter()

@router.post("/leituras", status_code=201)
def registrar_leitura(leitura: LeituraCreate):
    conn = get_db_connection()
    cursor = conn.cursor()


    #Verificação Temperatura
    if leitura.temperatura < -40 or leitura.temperatura > 80:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Temperatura fora dos limites físicos aceitáveis.")

    query = """
        INSERT INTO leituras (estacao_id, temperatura, umidade, pressao, qualidade_ar, luminosidade)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    values = (leitura.estacao_id, leitura.temperatura, leitura.umidade, leitura.pressao, leitura.qualidade_ar, leitura.luminosidade)

    cursor.execute(query, values)
    conn.commit()
    cursor.close()
    conn.close()

    return {"status": "sucesso", "mensagem": "Leitura registrada no MySQL com sucesso."}

@router.get("/estacoes/{estacao_id}/recente")
def obter_leitura_recente(estacao_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM leituras 
        WHERE estacao_id = %s 
        ORDER BY data_hora DESC 
        LIMIT 1
    """, (estacao_id,))
    
    linha = cursor.fetchone()
    cursor.close()
    conn.close()

    if not linha:
        raise HTTPException(status_code=404, detail="Nenhuma leitura registrada para esta estação.")

    return linha

@router.get("/estacoes/{estacao_id}/historico")
def obter_historico_por_data(estacao_id: int, data: str = Query(..., description="Data no formato YYYY-MM-DD")):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, temperatura, umidade, pressao, qualidade_ar, luminosidade, data_hora
        FROM leituras
        WHERE estacao_id = %s AND DATE(data_hora) = %s
        ORDER BY data_hora ASC
    """, (estacao_id, data))

    linhas = cursor.fetchall()
    cursor.close()
    conn.close()

    return linhas
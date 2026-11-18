import os
import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    'host': os.getenv('MYSQLHOST', 'shinkansen.proxy.rlwy.net'),
    'user': os.getenv('MYSQLUSER', 'root'),
    'password': os.getenv('MYSQLPASSWORD', 'KUHfxjizZvLKdmouckeREllcwsBWjSKa'),
    'database': os.getenv('MYSQLDATABASE', 'railway'),
    'port': int(os.getenv('MYSQLPORT', 55800))  # Usando a porta correta do proxy público
}

# 1. ESSA FUNÇÃO PRECISA EXISTIR PARA O ROUTES.PY IMPORTAR
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Erro ao conectar ao MySQL: {e}")
        raise e

# 2. A função que o main.py chama no startup
def init_db():
    try:
        # Conecta sem banco para garantir que o database 'railway' existe
        config_temp = DB_CONFIG.copy()
        config_temp.pop('database', None)
        conn_temp = mysql.connector.connect(**config_temp)
        cursor_temp = conn_temp.cursor()
        cursor_temp.execute("CREATE DATABASE IF NOT EXISTS railway;")
        cursor_temp.close()
        conn_temp.close()

        # Conecta definitivo no banco 'railway'
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS estacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ativo',
            criado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS leituras (
            id INT AUTO_INCREMENT PRIMARY KEY,
            estacao_id INT NOT NULL,
            temperatura FLOAT NULL,
            umidade FLOAT NULL,
            pressao FLOAT NOT NULL,
            qualidade_ar FLOAT NOT NULL,
            luminosidade FLOAT NOT NULL,
            pluviometria FLOAT DEFAULT 0.0,
            data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (estacao_id) REFERENCES estacoes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alertas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            estacao_id INT NOT NULL,
            tipo_alerta VARCHAR(50) NOT NULL,
            mensagem TEXT NOT NULL,
            nivel_critico VARCHAR(20) NOT NULL,
            data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (estacao_id) REFERENCES estacoes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """)

        conn.commit()
        cursor.close()
        conn.close()
        print("Banco de dados no Railway inicializado com sucesso!")

    except Error as e:
        print(f"Erro na inicialização do banco: {e}")
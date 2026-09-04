import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'projetocc2',
    'port': 3306
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Erro ao conectar ao MySQL: {e}")
        raise e

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS estacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ativo',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS leituras (
            id INT AUTO_INCREMENT PRIMARY KEY,
            estacao_id INT NOT NULL,
            temperatura FLOAT NOT NULL,
            umidade FLOAT NOT NULL,
            pressao FLOAT NOT NULL,
            qualidade_ar FLOAT NOT NULL,
            luminosidade FLOAT NOT NULL,
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

        cursor.execute("""
        SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'projetocc2' AND TABLE_NAME = 'leituras' AND INDEX_NAME = 'idx_leituras_data_hora';
        """)
        index_exists = cursor.fetchone()[0]

        if not index_exists:
            cursor.execute("CREATE INDEX idx_leituras_data_hora ON leituras(data_hora);")

        cursor.execute("SELECT COUNT(*) FROM estacoes;")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
            INSERT INTO estacoes (nome, latitude, longitude, status)
            VALUES ('Estação Principal UNIP', -23.4801, -47.4395, 'ativo');
            """)

        conn.commit()
        cursor.close()
        conn.close()
        print("Banco de dados MySQL (projetocc2) inicializado com sucesso!")

    except Error as e:
        print(f"Erro na inicialização do banco: {e}")
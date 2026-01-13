from sqlalchemy import create_engine, text
from app.core.security import verify_password, get_password_hash
import sys
import os

# Adiciona o diretório atual ao path para importar os módulos
sys.path.append(os.getcwd())

# Configuração simples de DB
# Assumindo sqlite
DB_URL = "sqlite:///./carteira_dev.db"
engine = create_engine(DB_URL)

def check_users():
    print("--- Verificando Usuários ---")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, email, hashed_password FROM users"))
        users = result.fetchall()
        
        if not users:
            print("Nenhum usuário encontrado no banco de dados.")
            return

        for user in users:
            print(f"ID: {user.id}, Email: {user.email}")
            print(f"Hash (primeiros 20 chars): {user.hashed_password[:20]}...")
            
            # Teste de verificação manual se a senha for 'admin' ou '123456'
            test_passwords = ['admin', '123456', 'password']
            for pwd in test_passwords:
                try:
                    if verify_password(pwd, user.hashed_password):
                        print(f"SUCCESS: Senha para {user.email} é '{pwd}'")
                    else:
                        print(f"INFO: Senha '{pwd}' incorreta.")
                except Exception as e:
                    print(f"ERROR: Falha ao verificar senha: {e}")

def create_test_user():
    print("\n--- Criando Usuário de Teste ---")
    email = "admin@example.com"
    password = "admin"
    
    hashed = get_password_hash(password)
    
    with engine.connect() as conn:
        # Check existing
        result = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
        if result.fetchone():
            print(f"Usuário {email} já existe.")
            # Update password just in case
            conn.execute(
                text("UPDATE users SET hashed_password = :h WHERE email = :e"),
                {"h": hashed, "e": email}
            )
            conn.commit()
            print(f"Senha de {email} resetada para '{password}'")
        else:
            # Tenta inserir com colunas adicionais que podem ser necessárias
            try:
                conn.execute(
                    text("INSERT INTO users (email, hashed_password, is_active, is_superuser, full_name) VALUES (:e, :h, 1, 1, 'Admin')"),
                    {"e": email, "h": hashed}
                )
            except Exception as e:
                # Se falhar (talvez full_name não exista), tenta só com essenciais
                 conn.execute(
                    text("INSERT INTO users (email, hashed_password, is_active, is_superuser) VALUES (:e, :h, 1, 1)"),
                    {"e": email, "h": hashed}
                )
            conn.commit()
            print(f"Usuário {email} criado com senha '{password}'")

def reset_specific_user():
    email = "teste1@teste.com.br"
    new_pass = "123456"
    print(f"\n--- Resetando senha de {email} ---")
    
    hashed = get_password_hash(new_pass)
    
    with engine.connect() as conn:
        result = conn.execute(text("UPDATE users SET hashed_password = :h WHERE email = :e"), 
                              {"h": hashed, "e": email})
        conn.commit()
        if result.rowcount > 0:
            print(f"Sucesso! Senha de '{email}' alterada para '{new_pass}'")
        else:
            print(f"Usuário '{email}' não encontrado.")

if __name__ == "__main__":
    check_users()
    reset_specific_user()

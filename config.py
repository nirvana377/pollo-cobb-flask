import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Obtener DATABASE_URL de Railway
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    
    # Corregir formato de Railway (mysql:// -> mysql+pymysql://)
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('mysql://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('mysql://', 'mysql+pymysql://', 1)
    
    # Si no hay DATABASE_URL (desarrollo local), usar configuración local
    if not SQLALCHEMY_DATABASE_URI:
        SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost:3306/pollo_cobb_flask'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
    }

config = {
    'development': Config
}
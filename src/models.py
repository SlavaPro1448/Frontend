
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='operator')  # admin/operator
    assigned_operator_name = db.Column(db.String(100), nullable=True)  # Для привязки к Telegram-сессии
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    is_active = db.Column(db.Boolean, default=True)
    is_sso_user = db.Column(db.Boolean, nullable=False, default=False)
    is_anonymous = db.Column(db.Boolean, nullable=False, default=False)
    
    def set_password(self, password):
        """Устанавливает хеш пароля"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Проверяет пароль"""
        return check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        """Проверяет, является ли пользователь админом"""
        return self.role == 'admin'
    
    def is_operator(self):
        """Проверяет, является ли пользователь оператором"""
        return self.role == 'operator'
    
    def get_id(self):
        """Возвращает ID пользователя для Flask-Login"""
        return str(self.id)
    
    def __repr__(self):
        return f'<User {self.username}>'

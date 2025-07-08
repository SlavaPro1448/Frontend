from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from functools import wraps
from models import db, User
from forms import LoginForm, AddUserForm

auth_bp = Blueprint('auth', __name__)

def admin_required(f):
    """Декоратор для проверки прав администратора"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            flash('Доступ запрещен. Требуются права администратора.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def operator_required(f):
    """Декоратор для проверки прав оператора или админа"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Требуется авторизация.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if current_user.is_admin():
            return redirect(url_for('auth.admin_dashboard'))
        else:
            return redirect(url_for('auth.operator_dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data) and user.is_active:
            login_user(user)
            flash(f'Добро пожаловать, {user.username}!', 'success')
            
            # Перенаправляем в зависимости от роли
            if user.is_admin():
                return redirect(url_for('auth.admin_dashboard'))
            else:
                return redirect(url_for('auth.operator_dashboard'))
        else:
            flash('Неверный логин или пароль.', 'error')
    
    return render_template('login.html', form=form)

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы.', 'info')
    return redirect(url_for('auth.login'))

@auth_bp.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    users = User.query.all()
    return render_template('admin_dashboard.html', users=users)

@auth_bp.route('/operator/dashboard')
@operator_required
def operator_dashboard():
    return render_template('operator_dashboard.html')

@auth_bp.route('/admin/add_user', methods=['GET', 'POST'])
@admin_required
def add_user():
    form = AddUserForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            role=form.role.data,
            assigned_operator_name=form.assigned_operator_name.data
        )
        user.set_password(form.password.data)
        
        try:
            db.session.add(user)
            db.session.commit()
            flash(f'Пользователь {user.username} успешно добавлен.', 'success')
            return redirect(url_for('auth.admin_dashboard'))
        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка при добавлении пользователя: {str(e)}', 'error')
    
    return render_template('add_user.html', form=form)

@auth_bp.route('/admin/delete_user/<user_id>')
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.is_admin() and User.query.filter_by(role='admin').count() <= 1:
        flash('Нельзя удалить последнего администратора.', 'error')
        return redirect(url_for('auth.admin_dashboard'))
    
    try:
        db.session.delete(user)
        db.session.commit()
        flash(f'Пользователь {user.username} удален.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Ошибка при удалении пользователя: {str(e)}', 'error')
    
    return redirect(url_for('auth.admin_dashboard'))

"""
Modelos de Base de Datos - SQLAlchemy ORM
Sistema de Gestión de Pollos Cobb 500
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import func

db = SQLAlchemy()


class Lote(db.Model):
    """RF-03: Gestión de Lotes de Pollos"""
    __tablename__ = 'lotes'
    
    id_lote = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre_lote = db.Column(db.String(100), nullable=False)
    cantidad_inicial = db.Column(db.Integer, nullable=False)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_estimada_salida = db.Column(db.Date, nullable=True)
    fecha_cierre = db.Column(db.Date, nullable=True)
    estado = db.Column(db.Enum('activo', 'cerrado'), default='activo')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    capital = db.relationship('CapitalLote', backref='lote', lazy=True, uselist=False)
    movimientos = db.relationship('MovimientoCapital', backref='lote', lazy=True)
    compras = db.relationship('CompraMateriaPrima', backref='lote', lazy=True)
    ventas = db.relationship('Venta', backref='lote', lazy=True)
    
    def to_dict(self):
        return {
            'id_lote': self.id_lote,
            'nombre_lote': self.nombre_lote,
            'cantidad_inicial': self.cantidad_inicial,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_estimada_salida': self.fecha_estimada_salida.isoformat() if self.fecha_estimada_salida else None,
            'fecha_cierre': self.fecha_cierre.isoformat() if self.fecha_cierre else None,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CapitalLote(db.Model):
    """RF-04: Registro de Capital por Lote"""
    __tablename__ = 'capital_lotes'
    
    id_capital = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=False)
    capital_inicial = db.Column(db.Numeric(12, 2), nullable=False)
    capital_actual = db.Column(db.Numeric(12, 2), nullable=False)
    fecha_asignacion = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_capital': self.id_capital,
            'id_lote': self.id_lote,
            'capital_inicial': float(self.capital_inicial),
            'capital_actual': float(self.capital_actual),
            'fecha_asignacion': self.fecha_asignacion.isoformat() if self.fecha_asignacion else None
        }


class MovimientoCapital(db.Model):
    """RF-05: Control de Movimientos de Capital"""
    __tablename__ = 'movimientos_capital'
    
    id_movimiento = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=False)
    tipo_movimiento = db.Column(db.Enum('compra', 'gasto', 'ingreso', 'retiro'), nullable=False)
    valor = db.Column(db.Numeric(12, 2), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_movimiento = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_movimiento': self.id_movimiento,
            'id_lote': self.id_lote,
            'tipo_movimiento': self.tipo_movimiento,
            'valor': float(self.valor),
            'descripcion': self.descripcion,
            'fecha_movimiento': self.fecha_movimiento.isoformat() if self.fecha_movimiento else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CompraMateriaPrima(db.Model):
    """RF-06: Gestión de Compras de Materia Prima"""
    __tablename__ = 'compras_materia_prima'
    
    id_compra = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=False)
    tipo_materia = db.Column(db.String(50), nullable=False)
    cantidad = db.Column(db.Numeric(10, 2), nullable=False)
    unidad = db.Column(db.String(20), nullable=False)
    costo_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    costo_total = db.Column(db.Numeric(12, 2), nullable=False)
    fecha_compra = db.Column(db.Date, nullable=False)
    observaciones = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_compra': self.id_compra,
            'id_lote': self.id_lote,
            'tipo_materia': self.tipo_materia,
            'cantidad': float(self.cantidad),
            'unidad': self.unidad,
            'costo_unitario': float(self.costo_unitario),
            'costo_total': float(self.costo_total),
            'fecha_compra': self.fecha_compra.isoformat() if self.fecha_compra else None,
            'observaciones': self.observaciones
        }


class Cliente(db.Model):
    """RF-07: Gestión de Clientes"""
    __tablename__ = 'clientes'
    
    id_cliente = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=True)
    direccion = db.Column(db.String(200), nullable=True)
    estado = db.Column(db.Enum('activo', 'inactivo'), default='activo')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    ventas = db.relationship('Venta', backref='cliente', lazy=True)
    
    def to_dict(self):
        return {
            'id_cliente': self.id_cliente,
            'nombre': self.nombre,
            'telefono': self.telefono,
            'direccion': self.direccion,
            'estado': self.estado
        }


class Venta(db.Model):
    """RF-08: Registro de Ventas por Lote"""
    __tablename__ = 'ventas'
    
    id_venta = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=False)
    id_cliente = db.Column(db.Integer, db.ForeignKey('clientes.id_cliente'), nullable=False)
    cantidad_pollos = db.Column(db.Integer, nullable=False)
    cantidad_kilos = db.Column(db.Numeric(10, 2), nullable=False)
    precio_kilo = db.Column(db.Numeric(10, 2), nullable=False)
    valor_total = db.Column(db.Numeric(12, 2), nullable=False)
    fecha_venta = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    credito = db.relationship('VentaCredito', backref='venta', lazy=True, uselist=False)
    
    def to_dict(self):
        return {
            'id_venta': self.id_venta,
            'id_lote': self.id_lote,
            'id_cliente': self.id_cliente,
            'cantidad_pollos': self.cantidad_pollos,
            'cantidad_kilos': float(self.cantidad_kilos),
            'precio_kilo': float(self.precio_kilo),
            'valor_total': float(self.valor_total),
            'fecha_venta': self.fecha_venta.isoformat() if self.fecha_venta else None
        }


class VentaCredito(db.Model):
    """RF-09: Control de Ventas a Crédito"""
    __tablename__ = 'ventas_credito'
    
    id_credito = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_venta = db.Column(db.Integer, db.ForeignKey('ventas.id_venta'), nullable=False)
    valor_total = db.Column(db.Numeric(12, 2), nullable=False)
    valor_pagado = db.Column(db.Numeric(12, 2), default=0)
    valor_pendiente = db.Column(db.Numeric(12, 2), nullable=False)
    estado_deuda = db.Column(db.Enum('pendiente', 'parcial', 'pagado'), default='pendiente')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    pagos = db.relationship('PagoCliente', backref='credito', lazy=True)
    
    def to_dict(self):
        return {
            'id_credito': self.id_credito,
            'id_venta': self.id_venta,
            'valor_total': float(self.valor_total),
            'valor_pagado': float(self.valor_pagado),
            'valor_pendiente': float(self.valor_pendiente),
            'estado_deuda': self.estado_deuda
        }


class PagoCliente(db.Model):
    """RF-10: Registro de Pagos de Clientes"""
    __tablename__ = 'pagos_clientes'
    
    id_pago = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_credito = db.Column(db.Integer, db.ForeignKey('ventas_credito.id_credito'), nullable=False)
    valor_pago = db.Column(db.Numeric(12, 2), nullable=False)
    fecha_pago = db.Column(db.Date, nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_pago': self.id_pago,
            'id_credito': self.id_credito,
            'valor_pago': float(self.valor_pago),
            'fecha_pago': self.fecha_pago.isoformat() if self.fecha_pago else None,
            'metodo_pago': self.metodo_pago,
            'observaciones': self.observaciones
        }
    
class EventoCronograma(db.Model):
    """Eventos del cronograma de engorda"""
    __tablename__ = 'eventos_cronograma'
    
    id_evento = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=False)
    tipo_evento = db.Column(db.Enum(
        'inicio_lote', 'vitaminas_dia3', 'cambio_preinicio', 
        'cambio_inicio', 'cambio_engorde', 'aplicacion_melaza', 
        'fecha_estimada_salida'
    ), nullable=False)
    descripcion = db.Column(db.String(255), nullable=False)
    fecha_programada = db.Column(db.Date, nullable=False)
    fecha_ejecutada = db.Column(db.Date, nullable=True)
    estado = db.Column(db.Enum('pendiente', 'completado', 'vencido'), default='pendiente')
    dias_lote = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_evento': self.id_evento,
            'id_lote': self.id_lote,
            'tipo_evento': self.tipo_evento,
            'descripcion': self.descripcion,
            'fecha_programada': self.fecha_programada.isoformat() if self.fecha_programada else None,
            'fecha_ejecutada': self.fecha_ejecutada.isoformat() if self.fecha_ejecutada else None,
            'estado': self.estado,
            'dias_lote': self.dias_lote
        }


class MortalidadLote(db.Model):
    """Registro de mortalidad diaria"""
    __tablename__ = 'mortalidad_lotes'
    
    id_mortalidad = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=False)
    fecha_registro = db.Column(db.Date, nullable=False)
    cantidad_muertos = db.Column(db.Integer, nullable=False)
    cantidad_vivos_actual = db.Column(db.Integer, nullable=False)
    porcentaje_mortalidad = db.Column(db.Numeric(5, 2), nullable=False)
    causa = db.Column(db.String(100), nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_mortalidad': self.id_mortalidad,
            'id_lote': self.id_lote,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'cantidad_muertos': self.cantidad_muertos,
            'cantidad_vivos_actual': self.cantidad_vivos_actual,
            'porcentaje_mortalidad': float(self.porcentaje_mortalidad),
            'causa': self.causa,
            'observaciones': self.observaciones
        }


class Notificacion(db.Model):
    """Sistema de notificaciones"""
    __tablename__ = 'notificaciones'
    
    id_notificacion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_lote = db.Column(db.Integer, db.ForeignKey('lotes.id_lote'), nullable=True)
    tipo_notificacion = db.Column(db.Enum(
        'alerta_edad', 'alerta_fecha_salida', 'alerta_capital_bajo',
        'alerta_mortalidad_alta', 'recordatorio_vitaminas', 
        'recordatorio_cambio_alimento', 'recordatorio_melaza',
        'alerta_credito_vencido'
    ), nullable=False)
    prioridad = db.Column(db.Enum('baja', 'media', 'alta', 'critica'), default='media')
    titulo = db.Column(db.String(200), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    leida = db.Column(db.Boolean, default=False)
    fecha_leida = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id_notificacion': self.id_notificacion,
            'id_lote': self.id_lote,
            'tipo_notificacion': self.tipo_notificacion,
            'prioridad': self.prioridad,
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'leida': self.leida,
            'fecha_leida': self.fecha_leida.isoformat() if self.fecha_leida else None
        }

class ConfiguracionAlertas(db.Model):
    """Configuración de alertas"""
    __tablename__ = 'configuracion_alertas'
    
    id_config = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tipo_alerta = db.Column(db.String(50), nullable=False, unique=True)
    dias_anticipacion = db.Column(db.Integer, nullable=False)
    activa = db.Column(db.Boolean, default=True)
    descripcion = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_config': self.id_config,
            'tipo_alerta': self.tipo_alerta,
            'dias_anticipacion': self.dias_anticipacion,
            'activa': self.activa,
            'descripcion': self.descripcion
        }
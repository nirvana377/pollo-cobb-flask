"""
Sistema de Gestión de Pollos Cobb 500
Backend API con Flask - SOLO API (sin frontend)
"""

from flask import Flask, jsonify, request
import os
from flask_cors import CORS
from datetime import datetime, date, timedelta
from decimal import Decimal
from config import config
from flask import Flask, jsonify, request, send_from_directory
from models import (
    db, Lote, CapitalLote, MovimientoCapital, CompraMateriaPrima, 
    Cliente, Venta, VentaCredito, PagoCliente, EventoCronograma, 
    MortalidadLote, Notificacion, ConfiguracionAlertas
)
from sqlalchemy import func, and_, or_

# Crear aplicación Flask
app = Flask(__name__)
app.config.from_object(config['development'])

# Inicializar extensiones
# CORS habilitado para permitir peticiones desde Netlify
CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
db.init_app(app)

# Helper para convertir Decimal a float en JSON
def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

# ============================================
# RUTA PRINCIPAL - INFO DE LA API
# ============================================

@app.route('/')
def index():
    return jsonify({
        'message': 'API Sistema de Gestión de Pollos Cobb 500',
        'version': '1.0.0',
        'status': 'active',
        'endpoints': {
            'lotes': '/api/lotes',
            'compras': '/api/compras',
            'clientes': '/api/clientes',
            'ventas': '/api/ventas',
            'dashboard': '/api/dashboard/estadisticas',
            'init_db': '/api/init-db'
        }
    })



# ============================================
# ENDPOINTS - LOTES (RF-03)
# ============================================

@app.route('/api/lotes', methods=['GET'])
def obtener_lotes():
    """Obtener todos los lotes"""
    try:
        lotes = Lote.query.order_by(Lote.fecha_inicio.desc()).all()
        return jsonify({
            'success': True,
            'data': [lote.to_dict() for lote in lotes]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/lotes/<int:id_lote>', methods=['GET'])
def obtener_lote(id_lote):
    """Obtener un lote específico"""
    try:
        lote = Lote.query.get_or_404(id_lote)
        return jsonify({
            'success': True,
            'data': lote.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 404


@app.route('/api/lotes', methods=['POST'])
def crear_lote():
    """Crear un nuevo lote"""
    try:
        data = request.get_json()
        
        # Crear lote
        nuevo_lote = Lote(
            nombre_lote=data['nombre_lote'],
            cantidad_inicial=data['cantidad_inicial'],
            fecha_inicio=datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date(),
            fecha_estimada_salida=datetime.strptime(data['fecha_estimada_salida'], '%Y-%m-%d').date() if data.get('fecha_estimada_salida') else None,
            estado='activo'
        )
        
        db.session.add(nuevo_lote)
        db.session.flush()  # Para obtener el ID del lote
        
        # Crear capital del lote (RF-04)
        capital = CapitalLote(
            id_lote=nuevo_lote.id_lote,
            capital_inicial=data['capital_inicial'],
            capital_actual=data['capital_inicial'],
            fecha_asignacion=datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
        )
        
        db.session.add(capital)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lote creado exitosamente',
            'data': {'id_lote': nuevo_lote.id_lote}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/lotes/<int:id_lote>', methods=['PUT'])
def actualizar_lote(id_lote):
    """Actualizar un lote existente"""
    try:
        lote = Lote.query.get_or_404(id_lote)
        data = request.get_json()
        
        if 'nombre_lote' in data:
            lote.nombre_lote = data['nombre_lote']
        if 'cantidad_inicial' in data:
            lote.cantidad_inicial = data['cantidad_inicial']
        if 'fecha_estimada_salida' in data:
            lote.fecha_estimada_salida = datetime.strptime(data['fecha_estimada_salida'], '%Y-%m-%d').date()
        if 'estado' in data:
            lote.estado = data['estado']
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lote actualizado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/lotes/<int:id_lote>/cerrar', methods=['POST'])
def cerrar_lote(id_lote):
    """Cerrar un lote (RF-12)"""
    try:
        lote = Lote.query.get_or_404(id_lote)
        
        # Verificar que tenga ventas
        if not lote.ventas:
            return jsonify({
                'success': False,
                'error': 'No se puede cerrar un lote sin ventas registradas'
            }), 400
        
        lote.estado = 'cerrado'
        lote.fecha_cierre = date.today()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lote cerrado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/lotes/<int:id_lote>', methods=['DELETE'])
def eliminar_lote(id_lote):
    """Eliminar un lote"""
    try:
        lote = Lote.query.get_or_404(id_lote)
        
        # Verificar que no tenga movimientos
        if lote.movimientos or lote.compras or lote.ventas:
            return jsonify({
                'success': False,
                'error': 'No se puede eliminar un lote con movimientos, compras o ventas registradas'
            }), 400
        
        db.session.delete(lote)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lote eliminado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - COMPRAS (RF-06)
# ============================================

@app.route('/api/compras', methods=['POST'])
def registrar_compra():
    """Registrar una compra de materia prima"""
    try:
        data = request.get_json()
        
        # Crear compra
        nueva_compra = CompraMateriaPrima(
            id_lote=data['id_lote'],
            tipo_materia=data['tipo_materia'],
            cantidad=data['cantidad'],
            unidad=data['unidad'],
            costo_unitario=data['costo_unitario'],
            costo_total=Decimal(str(data['cantidad'])) * Decimal(str(data['costo_unitario'])),
            fecha_compra=datetime.strptime(data['fecha_compra'], '%Y-%m-%d').date(),
            observaciones=data.get('observaciones')
        )
        
        db.session.add(nueva_compra)
        
        # Registrar movimiento de capital (RF-05)
        movimiento = MovimientoCapital(
            id_lote=data['id_lote'],
            tipo_movimiento='compra',
            valor=nueva_compra.costo_total,
            descripcion=f"Compra de {data['tipo_materia']}",
            fecha_movimiento=nueva_compra.fecha_compra
        )
        
        db.session.add(movimiento)
        
        # Actualizar capital del lote
        capital = CapitalLote.query.filter_by(id_lote=data['id_lote']).first()
        if capital:
            capital.capital_actual = capital.capital_actual - nueva_compra.costo_total
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Compra registrada exitosamente',
            'data': {'id_compra': nueva_compra.id_compra}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/compras/lote/<int:id_lote>', methods=['GET'])
def obtener_compras_lote(id_lote):
    """Obtener todas las compras de un lote"""
    try:
        compras = CompraMateriaPrima.query.filter_by(id_lote=id_lote).order_by(CompraMateriaPrima.fecha_compra.desc()).all()
        return jsonify({
            'success': True,
            'data': [compra.to_dict() for compra in compras]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    

@app.route('/api/compras/todas', methods=['GET'])
def obtener_todas_compras():
    """Obtener todas las compras con información de lotes"""
    try:
        compras = db.session.query(
            CompraMateriaPrima,
            Lote.nombre_lote
        ).join(
            Lote, CompraMateriaPrima.id_lote == Lote.id_lote
        ).order_by(
            CompraMateriaPrima.fecha_compra.desc()
        ).limit(100).all()
        
        resultado = []
        for compra, nombre_lote in compras:
            compra_dict = compra.to_dict()
            compra_dict['lote_nombre'] = nombre_lote
            resultado.append(compra_dict)
        
        return jsonify({
            'success': True,
            'data': resultado
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/compras/<int:id_compra>', methods=['DELETE'])
def eliminar_compra(id_compra):
    """Eliminar una compra y revertir el movimiento de capital"""
    try:
        compra = CompraMateriaPrima.query.get_or_404(id_compra)
        
        # Revertir el capital
        capital = CapitalLote.query.filter_by(id_lote=compra.id_lote).first()
        if capital:
            capital.capital_actual = capital.capital_actual + compra.costo_total
        
        # Eliminar el movimiento asociado
        movimiento = MovimientoCapital.query.filter_by(
            id_lote=compra.id_lote,
            tipo_movimiento='compra',
            valor=compra.costo_total,
            fecha_movimiento=compra.fecha_compra
        ).first()
        
        if movimiento:
            db.session.delete(movimiento)
        
        db.session.delete(compra)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Compra eliminada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - MOVIMIENTOS DE CAPITAL (RF-05)
# ============================================

@app.route('/api/movimientos/lote/<int:id_lote>', methods=['GET'])
def obtener_movimientos_lote(id_lote):
    """Obtener todos los movimientos de capital de un lote"""
    try:
        movimientos = MovimientoCapital.query.filter_by(id_lote=id_lote).order_by(MovimientoCapital.fecha_movimiento.desc()).all()
        return jsonify({
            'success': True,
            'data': [mov.to_dict() for mov in movimientos]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/movimientos', methods=['POST'])
def registrar_movimiento():
    """Registrar un movimiento de capital manual"""
    try:
        data = request.get_json()
        
        nuevo_movimiento = MovimientoCapital(
            id_lote=data['id_lote'],
            tipo_movimiento=data['tipo_movimiento'],
            valor=data['valor'],
            descripcion=data.get('descripcion'),
            fecha_movimiento=datetime.strptime(data['fecha_movimiento'], '%Y-%m-%d').date()
        )
        
        db.session.add(nuevo_movimiento)
        
        # Actualizar capital
        capital = CapitalLote.query.filter_by(id_lote=data['id_lote']).first()
        if capital:
            if data['tipo_movimiento'] in ['compra', 'gasto', 'retiro']:
                capital.capital_actual = capital.capital_actual - Decimal(str(data['valor']))
            elif data['tipo_movimiento'] == 'ingreso':
                capital.capital_actual = capital.capital_actual + Decimal(str(data['valor']))
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Movimiento registrado exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - CLIENTES (RF-07)
# ============================================

@app.route('/api/clientes', methods=['GET'])
def obtener_clientes():
    """Obtener todos los clientes"""
    try:
        clientes = Cliente.query.filter_by(estado='activo').all()
        return jsonify({
            'success': True,
            'data': [cliente.to_dict() for cliente in clientes]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/clientes/<int:id_cliente>', methods=['GET'])
def obtener_cliente(id_cliente):
    """Obtener un cliente específico"""
    try:
        cliente = Cliente.query.get_or_404(id_cliente)
        return jsonify({
            'success': True,
            'data': cliente.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 404


@app.route('/api/clientes', methods=['POST'])
def crear_cliente():
    """Crear un nuevo cliente"""
    try:
        data = request.get_json()
        
        nuevo_cliente = Cliente(
            nombre=data['nombre'],
            telefono=data.get('telefono'),
            direccion=data.get('direccion'),
            estado='activo'
        )
        
        db.session.add(nuevo_cliente)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente creado exitosamente',
            'data': {'id_cliente': nuevo_cliente.id_cliente}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/clientes/<int:id_cliente>', methods=['PUT'])
def actualizar_cliente(id_cliente):
    """Actualizar un cliente"""
    try:
        cliente = Cliente.query.get_or_404(id_cliente)
        data = request.get_json()
        
        if 'nombre' in data:
            cliente.nombre = data['nombre']
        if 'telefono' in data:
            cliente.telefono = data['telefono']
        if 'direccion' in data:
            cliente.direccion = data['direccion']
        if 'estado' in data:
            cliente.estado = data['estado']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente actualizado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/clientes/<int:id_cliente>', methods=['DELETE'])
def eliminar_cliente(id_cliente):
    """Eliminar un cliente"""
    try:
        cliente = Cliente.query.get_or_404(id_cliente)
        
        # Verificar que no tenga ventas
        if cliente.ventas:
            return jsonify({
                'success': False,
                'error': 'No se puede eliminar un cliente con ventas registradas'
            }), 400
        
        db.session.delete(cliente)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente eliminado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - DASHBOARD Y ESTADÍSTICAS
# ============================================

@app.route('/api/dashboard/estadisticas', methods=['GET'])
def obtener_estadisticas():
    """Obtener estadísticas generales del dashboard"""
    try:
        # Lotes activos
        lotes_activos = Lote.query.filter_by(estado='activo').count()
        
        # Pollos activos
        pollos_activos = db.session.query(db.func.sum(Lote.cantidad_inicial)).filter(Lote.estado == 'activo').scalar() or 0
        
        # Capital total
        capital_total = db.session.query(db.func.sum(CapitalLote.capital_actual)).join(Lote).filter(Lote.estado == 'activo').scalar() or 0
        
        # Gastos del mes actual
        mes_actual = date.today().replace(day=1)
        gastos_mes = db.session.query(db.func.sum(MovimientoCapital.valor)).filter(
            MovimientoCapital.tipo_movimiento.in_(['compra', 'gasto', 'retiro']),
            MovimientoCapital.fecha_movimiento >= mes_actual
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'data': {
                'lotes_activos': lotes_activos,
                'pollos_activos': int(pollos_activos),
                'capital_total': float(capital_total),
                'gastos_mes': float(gastos_mes)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/dashboard/resumen-lotes', methods=['GET'])
def obtener_resumen_lotes():
    """Obtener resumen detallado de lotes (RF-11)"""
    try:
        # Consulta directa a la vista
        query = db.session.execute(db.text("SELECT * FROM vista_resumen_lotes"))
        columns = query.keys()
        results = [dict(zip(columns, row)) for row in query.fetchall()]
        
        # Convertir Decimal a float
        for result in results:
            for key, value in result.items():
                if isinstance(value, Decimal):
                    result[key] = float(value)
                elif isinstance(value, date):
                    result[key] = value.isoformat()
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - VENTAS (RF-08)
# ============================================

@app.route('/api/ventas', methods=['POST'])
def registrar_venta():
    """Registrar una venta"""
    try:
        data = request.get_json()
        
        # Validar que el lote esté activo
        lote = Lote.query.get(data['id_lote'])
        if not lote or lote.estado != 'activo':
            return jsonify({'success': False, 'error': 'Lote no válido o cerrado'}), 400
        
        # Obtener cliente para usar su nombre
        cliente = Cliente.query.get(data['id_cliente'])
        if not cliente:
            return jsonify({'success': False, 'error': 'Cliente no válido'}), 400
        
        # Crear venta
        nueva_venta = Venta(
            id_lote=data['id_lote'],
            id_cliente=data['id_cliente'],
            cantidad_pollos=data['cantidad_pollos'],
            cantidad_kilos=data['cantidad_kilos'],
            precio_kilo=data['precio_kilo'],
            valor_total=Decimal(str(data['cantidad_kilos'])) * Decimal(str(data['precio_kilo'])),
            fecha_venta=datetime.strptime(data['fecha_venta'], '%Y-%m-%d').date()
        )
        
        db.session.add(nueva_venta)
        db.session.flush()
        
        # Determinar tipo de pago
        tipo_pago = data.get('tipo_pago', 'contado')
        
        if tipo_pago == 'credito':
            # Crear registro de crédito (RF-09)
            valor_pagado_inicial = Decimal(str(data.get('valor_pagado_inicial', 0)))
            valor_pendiente = nueva_venta.valor_total - valor_pagado_inicial
            
            credito = VentaCredito(
                id_venta=nueva_venta.id_venta,
                valor_total=nueva_venta.valor_total,
                valor_pagado=valor_pagado_inicial,
                valor_pendiente=valor_pendiente,
                estado_deuda='pendiente' if valor_pendiente == nueva_venta.valor_total else 'parcial'
            )
            
            db.session.add(credito)
            
            # Solo registrar ingreso por lo pagado inicialmente
            if valor_pagado_inicial > 0:
                movimiento = MovimientoCapital(
                    id_lote=data['id_lote'],
                    tipo_movimiento='ingreso',
                    valor=valor_pagado_inicial,
                    descripcion=f"Venta (pago inicial) - Cliente: {cliente.nombre}",
                    fecha_movimiento=nueva_venta.fecha_venta
                )
                db.session.add(movimiento)
                
                # Actualizar capital
                capital = CapitalLote.query.filter_by(id_lote=data['id_lote']).first()
                if capital:
                    capital.capital_actual = capital.capital_actual + valor_pagado_inicial
        else:
            # Pago de contado - registrar ingreso completo
            movimiento = MovimientoCapital(
                id_lote=data['id_lote'],
                tipo_movimiento='ingreso',
                valor=nueva_venta.valor_total,
                descripcion=f"Venta de contado - Cliente: {cliente.nombre}",
                fecha_movimiento=nueva_venta.fecha_venta
            )
            db.session.add(movimiento)
            
            # Actualizar capital
            capital = CapitalLote.query.filter_by(id_lote=data['id_lote']).first()
            if capital:
                capital.capital_actual = capital.capital_actual + nueva_venta.valor_total
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Venta registrada exitosamente',
            'data': {'id_venta': nueva_venta.id_venta}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ventas/lote/<int:id_lote>', methods=['GET'])
def obtener_ventas_lote(id_lote):
    """Obtener todas las ventas de un lote"""
    try:
        ventas = Venta.query.filter_by(id_lote=id_lote).order_by(Venta.fecha_venta.desc()).all()
        
        resultado = []
        for venta in ventas:
            venta_dict = venta.to_dict()
            venta_dict['cliente_nombre'] = venta.cliente.nombre if venta.cliente else 'N/A'
            
            # Agregar info de crédito si existe
            if venta.credito:
                venta_dict['credito'] = venta.credito.to_dict()
            
            resultado.append(venta_dict)
        
        return jsonify({
            'success': True,
            'data': resultado
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ventas', methods=['GET'])
def obtener_todas_ventas():
    """Obtener todas las ventas con filtros opcionales"""
    try:
        ventas = Venta.query.order_by(Venta.fecha_venta.desc()).limit(50).all()
        
        resultado = []
        for venta in ventas:
            venta_dict = venta.to_dict()
            venta_dict['cliente_nombre'] = venta.cliente.nombre if venta.cliente else 'N/A'
            venta_dict['lote_nombre'] = venta.lote.nombre_lote if venta.lote else 'N/A'
            
            if venta.credito:
                venta_dict['credito'] = venta.credito.to_dict()
            
            resultado.append(venta_dict)
        
        return jsonify({
            'success': True,
            'data': resultado
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ventas/<int:id_venta>', methods=['DELETE'])
def eliminar_venta(id_venta):
    """Eliminar una venta y revertir el movimiento de capital"""
    try:
        venta = Venta.query.get_or_404(id_venta)
        
        # Revertir el capital
        capital = CapitalLote.query.filter_by(id_lote=venta.id_lote).first()
        if capital:
            # Si tiene crédito, revertir solo lo pagado
            if venta.credito:
                capital.capital_actual = capital.capital_actual - venta.credito.valor_pagado
            else:
                # Si fue de contado, revertir todo
                capital.capital_actual = capital.capital_actual - venta.valor_total
        
        # Eliminar movimientos asociados
        movimientos = MovimientoCapital.query.filter_by(
            id_lote=venta.id_lote,
            tipo_movimiento='ingreso'
        ).filter(
            MovimientoCapital.descripcion.like(f'%Cliente: {venta.cliente.nombre}%')
        ).all()
        
        for mov in movimientos:
            db.session.delete(mov)
        
        # Si tiene crédito, eliminar pagos y crédito
        if venta.credito:
            for pago in venta.credito.pagos:
                db.session.delete(pago)
            db.session.delete(venta.credito)
        
        db.session.delete(venta)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Venta eliminada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - CRÉDITOS Y PAGOS (RF-09, RF-10)
# ============================================

@app.route('/api/creditos/pendientes', methods=['GET'])
def obtener_creditos_pendientes():
    """Obtener todos los créditos pendientes o parciales"""
    try:
        creditos = VentaCredito.query.filter(
            VentaCredito.estado_deuda.in_(['pendiente', 'parcial'])
        ).all()
        
        resultado = []
        for credito in creditos:
            credito_dict = credito.to_dict()
            credito_dict['venta'] = credito.venta.to_dict()
            credito_dict['cliente_nombre'] = credito.venta.cliente.nombre
            credito_dict['lote_nombre'] = credito.venta.lote.nombre_lote
            resultado.append(credito_dict)
        
        return jsonify({
            'success': True,
            'data': resultado
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/creditos/cliente/<int:id_cliente>', methods=['GET'])
def obtener_creditos_cliente(id_cliente):
    """Obtener créditos de un cliente específico"""
    try:
        creditos = db.session.query(VentaCredito).join(Venta).filter(
            Venta.id_cliente == id_cliente,
            VentaCredito.estado_deuda.in_(['pendiente', 'parcial'])
        ).all()
        
        resultado = []
        for credito in creditos:
            credito_dict = credito.to_dict()
            credito_dict['venta'] = credito.venta.to_dict()
            resultado.append(credito_dict)
        
        return jsonify({
            'success': True,
            'data': resultado
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pagos', methods=['POST'])
def registrar_pago():
    """Registrar un pago de crédito (RF-10)"""
    try:
        data = request.get_json()
        
        # Obtener crédito
        credito = VentaCredito.query.get_or_404(data['id_credito'])
        
        if credito.estado_deuda == 'pagado':
            return jsonify({'success': False, 'error': 'Este crédito ya está pagado'}), 400
        
        valor_pago = Decimal(str(data['valor_pago']))
        
        if valor_pago > credito.valor_pendiente:
            return jsonify({'success': False, 'error': 'El pago excede el saldo pendiente'}), 400
        
        # Crear registro de pago
        nuevo_pago = PagoCliente(
            id_credito=data['id_credito'],
            valor_pago=valor_pago,
            fecha_pago=datetime.strptime(data['fecha_pago'], '%Y-%m-%d').date(),
            metodo_pago=data.get('metodo_pago'),
            observaciones=data.get('observaciones')
        )
        
        db.session.add(nuevo_pago)
        
        # Actualizar crédito
        credito.valor_pagado = credito.valor_pagado + valor_pago
        credito.valor_pendiente = credito.valor_pendiente - valor_pago
        
        if credito.valor_pendiente == 0:
            credito.estado_deuda = 'pagado'
        elif credito.valor_pagado > 0:
            credito.estado_deuda = 'parcial'
        
        # Registrar ingreso en movimientos de capital
        venta = Venta.query.get(credito.id_venta)
        movimiento = MovimientoCapital(
            id_lote=venta.id_lote,
            tipo_movimiento='ingreso',
            valor=valor_pago,
            descripcion=f"Pago de crédito - Cliente: {venta.cliente.nombre}",
            fecha_movimiento=nuevo_pago.fecha_pago
        )
        
        db.session.add(movimiento)
        
        # Actualizar capital del lote
        capital = CapitalLote.query.filter_by(id_lote=venta.id_lote).first()
        if capital:
            capital.capital_actual = capital.capital_actual + valor_pago
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pago registrado exitosamente',
            'data': {
                'saldo_pendiente': float(credito.valor_pendiente),
                'estado': credito.estado_deuda
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pagos/credito/<int:id_credito>', methods=['GET'])
def obtener_pagos_credito(id_credito):
    """Obtener todos los pagos de un crédito"""
    try:
        pagos = PagoCliente.query.filter_by(id_credito=id_credito).order_by(PagoCliente.fecha_pago.desc()).all()
        return jsonify({
            'success': True,
            'data': [pago.to_dict() for pago in pagos]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - CRONOGRAMA (NUEVO)
# ============================================

@app.route('/api/cronograma/lote/<int:id_lote>', methods=['GET'])
def obtener_cronograma_lote(id_lote):
    """Obtener cronograma completo de un lote"""
    try:
        lote = Lote.query.get_or_404(id_lote)
        eventos = EventoCronograma.query.filter_by(id_lote=id_lote).order_by(EventoCronograma.fecha_programada).all()
        
        # Calcular días de edad del lote
        dias_edad = (date.today() - lote.fecha_inicio).days
        
        # Calcular días restantes hasta fecha estimada de salida
        dias_restantes = None
        if lote.fecha_estimada_salida:
            dias_restantes = (lote.fecha_estimada_salida - date.today()).days
        
        return jsonify({
            'success': True,
            'data': {
                'lote': lote.to_dict(),
                'dias_edad': dias_edad,
                'dias_restantes': dias_restantes,
                'eventos': [evento.to_dict() for evento in eventos]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/cronograma/evento/<int:id_evento>/completar', methods=['POST'])
def completar_evento(id_evento):
    """Marcar un evento como completado"""
    try:
        evento = EventoCronograma.query.get_or_404(id_evento)
        data = request.get_json()
        
        evento.estado = 'completado'
        evento.fecha_ejecutada = datetime.strptime(data.get('fecha_ejecutada', date.today().isoformat()), '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Evento completado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/cronograma/eventos-pendientes', methods=['GET'])
def obtener_eventos_pendientes():
    """Obtener todos los eventos pendientes de lotes activos"""
    try:
        eventos = db.session.query(
            EventoCronograma,
            Lote.nombre_lote
        ).join(
            Lote, EventoCronograma.id_lote == Lote.id_lote
        ).filter(
            Lote.estado == 'activo',
            EventoCronograma.estado == 'pendiente',
            EventoCronograma.fecha_programada <= date.today() + timedelta(days=7)
        ).order_by(
            EventoCronograma.fecha_programada
        ).all()
        
        resultado = []
        for evento, nombre_lote in eventos:
            evento_dict = evento.to_dict()
            evento_dict['nombre_lote'] = nombre_lote
            evento_dict['dias_para_evento'] = (evento.fecha_programada - date.today()).days
            resultado.append(evento_dict)
        
        return jsonify({
            'success': True,
            'data': resultado
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - MORTALIDAD (NUEVO)
# ============================================

@app.route('/api/mortalidad', methods=['POST'])
def registrar_mortalidad():
    """Registrar mortalidad diaria"""
    try:
        data = request.get_json()
        
        # Obtener lote
        lote = Lote.query.get_or_404(data['id_lote'])
        
        # Calcular mortalidad acumulada
        mortalidad_anterior = db.session.query(
            func.sum(MortalidadLote.cantidad_muertos)
        ).filter_by(id_lote=data['id_lote']).scalar() or 0
        
        cantidad_vivos_actual = lote.cantidad_inicial - mortalidad_anterior - data['cantidad_muertos']
        
        # Calcular porcentaje de mortalidad del día
        porcentaje_dia = (data['cantidad_muertos'] / (mortalidad_anterior + cantidad_vivos_actual)) * 100
        
        # Crear registro de mortalidad
        nueva_mortalidad = MortalidadLote(
            id_lote=data['id_lote'],
            fecha_registro=datetime.strptime(data.get('fecha_registro', date.today().isoformat()), '%Y-%m-%d').date(),
            cantidad_muertos=data['cantidad_muertos'],
            cantidad_vivos_actual=cantidad_vivos_actual,
            porcentaje_mortalidad=round(porcentaje_dia, 2),
            causa=data.get('causa'),
            observaciones=data.get('observaciones')
        )
        
        db.session.add(nueva_mortalidad)
        
        # Verificar si la mortalidad es alta (>5%) y crear notificación
        if porcentaje_dia > 5:
            notificacion = Notificacion(
                id_lote=data['id_lote'],
                tipo_notificacion='alerta_mortalidad_alta',
                prioridad='alta',
                titulo=f'⚠️ Mortalidad Alta en {lote.nombre_lote}',
                mensaje=f'Se registró una mortalidad del {porcentaje_dia:.2f}% ({data["cantidad_muertos"]} pollos). Revisar el lote inmediatamente.'
            )
            db.session.add(notificacion)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Mortalidad registrada exitosamente',
            'data': {
                'pollos_vivos_actual': cantidad_vivos_actual,
                'porcentaje_mortalidad_dia': round(porcentaje_dia, 2)
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/mortalidad/lote/<int:id_lote>', methods=['GET'])
def obtener_mortalidad_lote(id_lote):
    """Obtener historial de mortalidad de un lote"""
    try:
        mortalidad = MortalidadLote.query.filter_by(id_lote=id_lote).order_by(MortalidadLote.fecha_registro.desc()).all()
        
        # Calcular estadísticas
        lote = Lote.query.get_or_404(id_lote)
        total_muertos = db.session.query(func.sum(MortalidadLote.cantidad_muertos)).filter_by(id_lote=id_lote).scalar() or 0
        pollos_vivos = lote.cantidad_inicial - total_muertos
        porcentaje_total = (total_muertos / lote.cantidad_inicial * 100) if lote.cantidad_inicial > 0 else 0
        
        return jsonify({
            'success': True,
            'data': {
                'registros': [m.to_dict() for m in mortalidad],
                'estadisticas': {
                    'cantidad_inicial': lote.cantidad_inicial,
                    'total_muertos': int(total_muertos),
                    'pollos_vivos': pollos_vivos,
                    'porcentaje_mortalidad_total': round(porcentaje_total, 2)
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/mortalidad/resumen', methods=['GET'])
def obtener_resumen_mortalidad():
    """Obtener resumen de mortalidad de todos los lotes activos"""
    try:
        query = db.session.execute(db.text("SELECT * FROM vista_mortalidad_lotes WHERE estado = 'activo'"))
        columns = query.keys()
        results = [dict(zip(columns, row)) for row in query.fetchall()]
        
        # Convertir Decimal a float
        for result in results:
            for key, value in result.items():
                if isinstance(value, Decimal):
                    result[key] = float(value)
                elif isinstance(value, date):
                    result[key] = value.isoformat()
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINTS - NOTIFICACIONES (NUEVO)
# ============================================

@app.route('/api/notificaciones', methods=['GET'])
def obtener_notificaciones():
    """Obtener todas las notificaciones (filtro opcional por leída/no leída)"""
    try:
        solo_no_leidas = request.args.get('no_leidas', 'false').lower() == 'true'
        
        query = Notificacion.query
        
        if solo_no_leidas:
            query = query.filter_by(leida=False)
        
        notificaciones = query.order_by(
            Notificacion.prioridad.desc(),
            Notificacion.fecha_creacion.desc()
        ).limit(50).all()
        
        # Obtener conteo de no leídas
        count_no_leidas = Notificacion.query.filter_by(leida=False).count()
        
        return jsonify({
            'success': True,
            'data': {
                'notificaciones': [n.to_dict() for n in notificaciones],
                'total_no_leidas': count_no_leidas
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/notificaciones/<int:id_notificacion>/marcar-leida', methods=['POST'])
def marcar_notificacion_leida(id_notificacion):
    """Marcar una notificación como leída"""
    try:
        notificacion = Notificacion.query.get_or_404(id_notificacion)
        notificacion.leida = True
        notificacion.fecha_leida = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notificación marcada como leída'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/notificaciones/marcar-todas-leidas', methods=['POST'])
def marcar_todas_leidas():
    """Marcar todas las notificaciones como leídas"""
    try:
        Notificacion.query.filter_by(leida=False).update({
            'leida': True,
            'fecha_leida': datetime.utcnow()
        })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Todas las notificaciones marcadas como leídas'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/notificaciones/generar-automaticas', methods=['POST'])
def generar_notificaciones_automaticas():
    """Generar notificaciones automáticas basadas en el estado de los lotes"""
    try:
        notificaciones_creadas = 0
        
        # Obtener lotes activos
        lotes_activos = Lote.query.filter_by(estado='activo').all()
        
        # Usar datetime.now() para comparaciones con fecha_creacion
        ahora = datetime.now()
        hoy = date.today()
        
        for lote in lotes_activos:
            # Calcular edad del lote
            dias_edad = (hoy - lote.fecha_inicio).days
            
            # 1. ALERTA DE EDAD (cada 7 días después del día 21)
            if dias_edad >= 21 and dias_edad % 7 == 0:
                # Comparar con datetime, no date
                existe = Notificacion.query.filter(
                    Notificacion.id_lote == lote.id_lote,
                    Notificacion.tipo_notificacion == 'alerta_edad',
                    func.date(Notificacion.fecha_creacion) >= hoy
                ).first()
                
                if not existe:
                    notif = Notificacion(
                        id_lote=lote.id_lote,
                        tipo_notificacion='alerta_edad',
                        prioridad='media',
                        titulo=f'📅 {lote.nombre_lote} tiene {dias_edad} días',
                        mensaje=f'El lote tiene {dias_edad} días de edad. Revisar estado general y planificar venta.'
                    )
                    db.session.add(notif)
                    notificaciones_creadas += 1
            
            # 2. ALERTA DE FECHA DE SALIDA PRÓXIMA
            if lote.fecha_estimada_salida:
                dias_restantes = (lote.fecha_estimada_salida - hoy).days
                
                if dias_restantes == 7 or dias_restantes == 3 or dias_restantes == 1:
                    existe = Notificacion.query.filter(
                        Notificacion.id_lote == lote.id_lote,
                        Notificacion.tipo_notificacion == 'alerta_fecha_salida',
                        func.date(Notificacion.fecha_creacion) >= hoy
                    ).first()
                    
                    if not existe:
                        prioridad = 'alta' if dias_restantes <= 3 else 'media'
                        notif = Notificacion(
                            id_lote=lote.id_lote,
                            tipo_notificacion='alerta_fecha_salida',
                            prioridad=prioridad,
                            titulo=f'⏰ {lote.nombre_lote} - Faltan {dias_restantes} días',
                            mensaje=f'Faltan {dias_restantes} días para la fecha estimada de salida ({lote.fecha_estimada_salida.strftime("%d/%m/%Y")}). Preparar venta.'
                        )
                        db.session.add(notif)
                        notificaciones_creadas += 1
            
            # 3. ALERTA DE CAPITAL BAJO
            capital = CapitalLote.query.filter_by(id_lote=lote.id_lote).first()
            if capital:
                porcentaje_capital = (capital.capital_actual / capital.capital_inicial * 100) if capital.capital_inicial > 0 else 0
                
                if porcentaje_capital < 20:
                    # Comparar con datetime usando timedelta
                    fecha_limite = ahora - timedelta(days=3)
                    existe = Notificacion.query.filter(
                        Notificacion.id_lote == lote.id_lote,
                        Notificacion.tipo_notificacion == 'alerta_capital_bajo',
                        Notificacion.fecha_creacion >= fecha_limite
                    ).first()
                    
                    if not existe:
                        notif = Notificacion(
                            id_lote=lote.id_lote,
                            tipo_notificacion='alerta_capital_bajo',
                            prioridad='alta',
                            titulo=f'💰 Capital Bajo en {lote.nombre_lote}',
                            mensaje=f'El capital actual es {porcentaje_capital:.1f}% del inicial. Capital disponible: ${capital.capital_actual:,.0f}'
                        )
                        db.session.add(notif)
                        notificaciones_creadas += 1
            
            # 4. RECORDATORIOS DE EVENTOS DEL CRONOGRAMA
            eventos_proximos = EventoCronograma.query.filter(
                EventoCronograma.id_lote == lote.id_lote,
                EventoCronograma.estado == 'pendiente',
                EventoCronograma.fecha_programada == hoy
            ).all()
            
            for evento in eventos_proximos:
                existe = Notificacion.query.filter(
                    Notificacion.id_lote == lote.id_lote,
                    Notificacion.mensaje.like(f'%{evento.descripcion}%'),
                    func.date(Notificacion.fecha_creacion) >= hoy
                ).first()
                
                if not existe:
                    tipo_notif = 'recordatorio_vitaminas' if 'vitaminas' in evento.descripcion.lower() else 'recordatorio_cambio_alimento'
                    if 'melaza' in evento.descripcion.lower():
                        tipo_notif = 'recordatorio_melaza'
                    
                    notif = Notificacion(
                        id_lote=lote.id_lote,
                        tipo_notificacion=tipo_notif,
                        prioridad='alta',
                        titulo=f'🔔 {lote.nombre_lote} - ¡Evento Hoy!',
                        mensaje=f'{evento.descripcion} (Día {dias_edad} del ciclo)'
                    )
                    db.session.add(notif)
                    notificaciones_creadas += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{notificaciones_creadas} notificaciones generadas',
            'data': {'notificaciones_creadas': notificaciones_creadas}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/notificaciones/<int:id_notificacion>', methods=['DELETE'])
def eliminar_notificacion(id_notificacion):
    """Eliminar una notificación"""
    try:
        notificacion = Notificacion.query.get_or_404(id_notificacion)
        db.session.delete(notificacion)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notificación eliminada'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# ENDPOINT - INICIALIZAR BD
# ============================================

@app.route('/api/init-db', methods=['POST'])
def init_database():
    """Endpoint temporal para inicializar base de datos"""
    try:
        db.create_all()
        
        # Insertar configuración inicial
        existe_config = ConfiguracionAlertas.query.first()
        
        if not existe_config:
            config1 = ConfiguracionAlertas(
                tipo_alerta='alerta_fecha_salida',
                dias_anticipacion=7,
                activa=True,
                descripcion='Alertar X días antes de la fecha estimada de salida'
            )
            config2 = ConfiguracionAlertas(
                tipo_alerta='alerta_capital_bajo',
                dias_anticipacion=0,
                activa=True,
                descripcion='Alertar cuando capital < 20% del inicial'
            )
            config3 = ConfiguracionAlertas(
                tipo_alerta='alerta_mortalidad_alta',
                dias_anticipacion=0,
                activa=True,
                descripcion='Alertar cuando mortalidad diaria > 5%'
            )
            db.session.add_all([config1, config2, config3])
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Base de datos inicializada correctamente'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================
# RUTA PRINCIPAL
# ============================================

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('static/'):
        return send_from_directory('.', path)
    return send_from_directory('templates', 'index.html')

# ============================================
# EJECUTAR APLICACIÓN
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
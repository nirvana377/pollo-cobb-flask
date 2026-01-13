// ============================================
// CONFIGURACIÓN DE LA API
// ============================================

// Detectar automáticamente la URL de la API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'  // Desarrollo local
    : `${window.location.protocol}//${window.location.host}/api`;  // Producción (Railway)

// Variables globales
let lotesActivos = [];
let clientesActivos = [];
let intervaloNotificaciones = null;

console.log('API URL configurada:', API_URL);  // Para debug

// ... resto del código ...
// ============================================
// INICIALIZACIÓN UNIFICADA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar fecha actual
    mostrarFechaActual();
    
    // Cargar dashboard inicial
    cargarDashboard();
    
    // Configurar navegación del sidebar
    configurarNavegacion();
    
    // Iniciar sistema de notificaciones
    inicializarNotificaciones();
    
    // Configurar fecha actual en formularios
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_inicio').value = hoy;
    document.getElementById('compra_fecha_compra').value = hoy;
    
    // Configurar fecha de mortalidad
    const fechaMortalidad = document.getElementById('mortalidad_fecha');
    if (fechaMortalidad) {
        fechaMortalidad.value = hoy;
    }
    
    // Configurar cálculo automático en compras
    document.getElementById('compra_cantidad').addEventListener('input', calcularTotalCompra);
    document.getElementById('compra_costo_unitario').addEventListener('input', calcularTotalCompra);
    
    // Configurar cálculo automático en ventas
    document.getElementById('venta_cantidad_kilos').addEventListener('input', calcularTotalVenta);
    document.getElementById('venta_precio_kilo').addEventListener('input', calcularTotalVenta);
    
    // Configurar tipo de pago
    document.querySelectorAll('input[name="tipo_pago"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const divPagoInicial = document.getElementById('div_pago_inicial');
            if (this.value === 'credito') {
                divPagoInicial.style.display = 'block';
            } else {
                divPagoInicial.style.display = 'none';
                document.getElementById('venta_valor_pagado_inicial').value = 0;
            }
        });
    });
});

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function mostrarFechaActual() {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fecha = new Date().toLocaleDateString('es-CO', opciones);
    document.getElementById('fecha-actual').textContent = fecha;
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
}

function formatearNumero(valor) {
    return new Intl.NumberFormat('es-CO').format(valor);
}

function mostrarAlerta(mensaje, tipo = 'success') {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alerta.style.zIndex = '9999';
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.remove();
    }, 5000);
}

function formatearTiempo(fechaISO) {
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diff = ahora - fecha;
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function truncarTexto(texto, maxLength) {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
}

// ============================================
// NAVEGACIÓN
// ============================================

function configurarNavegacion() {
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover active de todos
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Agregar active al clickeado
            this.classList.add('active');
            
            // Ocultar todas las secciones
            document.querySelectorAll('.content-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // Mostrar sección seleccionada
            const seccion = this.getAttribute('data-section');
            document.getElementById(`section-${seccion}`).style.display = 'block';
            
            // Cargar datos según sección
            switch(seccion) {
                case 'dashboard':
                    cargarDashboard();
                    break;
                    
                case 'lotes':
                    cargarLotes();
                    break;
                    
                case 'compras':
                    cargarCompras();
                    break;
                    
                case 'clientes':
                    cargarClientes();
                    break;
                    
                case 'ventas':
                    cargarVentas();
                    break;
                    
                case 'notificaciones':
                    cargarNotificaciones();
                    break;
                    
                case 'cronograma':
                    // Cargar lotes para el select
                    cargarLotes().then(() => {
                        const select = document.getElementById('cronograma_id_lote');
                        if (select) {
                            select.innerHTML = '<option value="">-- Seleccionar Lote --</option>';
                            lotesActivos.forEach(lote => {
                                const option = document.createElement('option');
                                option.value = lote.id_lote;
                                option.textContent = `${lote.nombre_lote} (${lote.cantidad_inicial} pollos)`;
                                select.appendChild(option);
                            });
                        }
                    });
                    verEventosPendientesGeneral();
                    break;
                    
                case 'mortalidad':
                    cargarResumenMortalidad();
                    
                    // Cargar lotes para el select del modal
                    cargarLotes().then(() => {
                        const select = document.getElementById('mortalidad_id_lote');
                        if (select) {
                            select.innerHTML = '<option value="">-- Seleccionar --</option>';
                            lotesActivos.forEach(lote => {
                                const option = document.createElement('option');
                                option.value = lote.id_lote;
                                option.textContent = `${lote.nombre_lote} (${lote.cantidad_inicial} pollos)`;
                                select.appendChild(option);
                            });
                        }
                    });
                    break;
            }
        });
    });
}
// ============================================
// DASHBOARD
// ============================================

async function cargarDashboard() {
    try {
        // Cargar estadísticas
        const respuestaStats = await fetch(`${API_URL}/dashboard/estadisticas`);
        const dataStats = await respuestaStats.json();
        
        if (dataStats.success) {
            const stats = dataStats.data;
            document.getElementById('stat-capital').textContent = formatearMoneda(stats.capital_total);
            document.getElementById('stat-lotes').textContent = stats.lotes_activos;
            document.getElementById('stat-pollos').textContent = formatearNumero(stats.pollos_activos);
            document.getElementById('stat-gastos').textContent = formatearMoneda(stats.gastos_mes);
        }
        
        // Cargar resumen de lotes
        const respuestaResumen = await fetch(`${API_URL}/dashboard/resumen-lotes`);
        const dataResumen = await respuestaResumen.json();
        
        if (dataResumen.success) {
            mostrarResumenLotes(dataResumen.data);
        }
        
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        mostrarAlerta('Error al cargar el dashboard', 'danger');
    }
}

function mostrarResumenLotes(lotes) {
    const tbody = document.querySelector('#tabla-resumen-lotes tbody');
    tbody.innerHTML = '';
    
    if (lotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">No hay lotes registrados</td></tr>';
        return;
    }
    
    lotes.forEach(lote => {
        const tr = document.createElement('tr');
        const estadoClass = lote.estado === 'activo' ? 'success' : 'secondary';
        const resultadoClass = lote.resultado_neto >= 0 ? 'text-success-custom' : 'text-danger-custom';
        
        tr.innerHTML = `
            <td>${lote.id_lote}</td>
            <td><strong>${lote.nombre_lote}</strong></td>
            <td>${formatearNumero(lote.cantidad_inicial)}</td>
            <td>${lote.dias_ciclo}</td>
            <td>${formatearMoneda(lote.capital_inicial)}</td>
            <td>${formatearMoneda(lote.capital_actual)}</td>
            <td class="text-danger-custom">${formatearMoneda(lote.total_gastos)}</td>
            <td class="text-success-custom">${formatearMoneda(lote.total_ingresos)}</td>
            <td class="${resultadoClass}"><strong>${formatearMoneda(lote.resultado_neto)}</strong></td>
            <td><span class="badge bg-${estadoClass}">${lote.estado.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="verDetallesLote(${lote.id_lote})">
                    <i class="bi bi-eye"></i>
                </button>
                ${lote.estado === 'activo' ? `
                    <button class="btn btn-sm btn-warning" onclick="cerrarLote(${lote.id_lote})">
                        <i class="bi bi-x-circle"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================
// LOTES
// ============================================

async function cargarLotes() {
    try {
        const respuesta = await fetch(`${API_URL}/lotes`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarLotes(data.data);
            lotesActivos = data.data.filter(l => l.estado === 'activo');
            actualizarSelectLotes();
        }
    } catch (error) {
        console.error('Error al cargar lotes:', error);
        mostrarAlerta('Error al cargar lotes', 'danger');
    }
}

function mostrarLotes(lotes) {
    const tbody = document.querySelector('#tabla-lotes tbody');
    tbody.innerHTML = '';
    
    if (lotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay lotes registrados</td></tr>';
        return;
    }
    
    lotes.forEach(lote => {
        const tr = document.createElement('tr');
        const estadoClass = lote.estado === 'activo' ? 'success' : 'secondary';
        
        tr.innerHTML = `
            <td>${lote.id_lote}</td>
            <td><strong>${lote.nombre_lote}</strong></td>
            <td>${formatearNumero(lote.cantidad_inicial)}</td>
            <td>${lote.fecha_inicio}</td>
            <td>${lote.fecha_estimada_salida || 'No definida'}</td>
            <td><span class="badge bg-${estadoClass}">${lote.estado.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="verDetallesLote(${lote.id_lote})" title="Ver detalles">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick='abrirEditarLote(${JSON.stringify(lote)})' title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="eliminarLote(${lote.id_lote}, '${lote.nombre_lote}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function crearLote() {
    const datos = {
        nombre_lote: document.getElementById('nombre_lote').value,
        cantidad_inicial: parseInt(document.getElementById('cantidad_inicial').value),
        fecha_inicio: document.getElementById('fecha_inicio').value,
        fecha_estimada_salida: document.getElementById('fecha_estimada_salida').value || null,
        capital_inicial: parseFloat(document.getElementById('capital_inicial').value)
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/lotes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Lote creado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalCrearLote')).hide();
            document.getElementById('formCrearLote').reset();
            cargarLotes();
            cargarDashboard();
        } else {
            mostrarAlerta('Error al crear el lote: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al crear el lote', 'danger');
    }
}

async function cerrarLote(idLote) {
    if (!confirm('¿Está seguro de cerrar este lote? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/lotes/${idLote}/cerrar`, {
            method: 'POST'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Lote cerrado exitosamente', 'success');
            cargarDashboard();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cerrar el lote', 'danger');
    }
}

async function eliminarLote(idLote, nombreLote) {
    if (!confirm(`¿Está seguro de eliminar el lote "${nombreLote}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/lotes/${idLote}`, {
            method: 'DELETE'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Lote eliminado exitosamente', 'success');
            cargarLotes();
            cargarDashboard();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar el lote', 'danger');
    }
}

function abrirEditarLote(lote) {
    // Llenar el formulario con los datos actuales
    document.getElementById('edit_id_lote').value = lote.id_lote;
    document.getElementById('edit_nombre_lote').value = lote.nombre_lote;
    document.getElementById('edit_cantidad_inicial').value = lote.cantidad_inicial;
    document.getElementById('edit_fecha_inicio').value = lote.fecha_inicio;
    document.getElementById('edit_fecha_estimada_salida').value = lote.fecha_estimada_salida || '';
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalEditarLote'));
    modal.show();
}

async function actualizarLote() {
    const idLote = document.getElementById('edit_id_lote').value;
    
    const datos = {
        nombre_lote: document.getElementById('edit_nombre_lote').value,
        cantidad_inicial: parseInt(document.getElementById('edit_cantidad_inicial').value),
        fecha_estimada_salida: document.getElementById('edit_fecha_estimada_salida').value || null
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/lotes/${idLote}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Lote actualizado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarLote')).hide();
            cargarLotes();
            cargarDashboard();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar el lote', 'danger');
    }
}

function actualizarSelectLotes() {
    // Select de compras
    const selectCompra = document.getElementById('compra_id_lote');
    if (selectCompra) {
        selectCompra.innerHTML = '<option value="">-- Seleccionar --</option>';
        lotesActivos.forEach(lote => {
            const option = document.createElement('option');
            option.value = lote.id_lote;
            option.textContent = `${lote.nombre_lote} (${lote.cantidad_inicial} pollos)`;
            selectCompra.appendChild(option);
        });
    }
    
    // Select de ventas
    const selectVenta = document.getElementById('venta_id_lote');
    if (selectVenta) {
        selectVenta.innerHTML = '<option value="">-- Seleccionar --</option>';
        lotesActivos.forEach(lote => {
            const option = document.createElement('option');
            option.value = lote.id_lote;
            option.textContent = `${lote.nombre_lote} (${lote.cantidad_inicial} pollos)`;
            selectVenta.appendChild(option);
        });
    }
}

async function verDetallesLote(idLote) {
    try {
        // Obtener detalles del lote
        const respuesta = await fetch(`${API_URL}/lotes/${idLote}`);
        const data = await respuesta.json();
        
        if (!data.success) {
            mostrarAlerta('Error al cargar lote', 'danger');
            return;
        }
        
        const lote = data.data;
        
        // Obtener movimientos del lote
        const respMovimientos = await fetch(`${API_URL}/movimientos/lote/${idLote}`);
        const dataMovimientos = await respMovimientos.json();
        
        // Obtener compras del lote
        const respCompras = await fetch(`${API_URL}/compras/lote/${idLote}`);
        const dataCompras = await respCompras.json();
        
        // Obtener ventas del lote
        const respVentas = await fetch(`${API_URL}/ventas/lote/${idLote}`);
        const dataVentas = await respVentas.json();
        
        // Construir HTML del modal
        let movimientosHTML = '<p class="text-muted">No hay movimientos registrados</p>';
        if (dataMovimientos.success && dataMovimientos.data.length > 0) {
            movimientosHTML = '<ul class="list-group">';
            dataMovimientos.data.slice(0, 5).forEach(mov => {
                const tipoClass = mov.tipo_movimiento === 'ingreso' ? 'success' : 'danger';
                movimientosHTML += `
                    <li class="list-group-item d-flex justify-content-between">
                        <div>
                            <span class="badge bg-${tipoClass}">${mov.tipo_movimiento.toUpperCase()}</span>
                            <span class="ms-2">${mov.descripcion || 'Sin descripción'}</span>
                            <small class="text-muted d-block">${mov.fecha_movimiento}</small>
                        </div>
                        <strong class="text-${tipoClass}">${formatearMoneda(mov.valor)}</strong>
                    </li>
                `;
            });
            movimientosHTML += '</ul>';
            if (dataMovimientos.data.length > 5) {
                movimientosHTML += `<small class="text-muted">Mostrando 5 de ${dataMovimientos.data.length} movimientos</small>`;
            }
        }
        
        // Calcular totales
        let totalCompras = 0;
        if (dataCompras.success) {
            totalCompras = dataCompras.data.reduce((sum, c) => sum + parseFloat(c.costo_total), 0);
        }
        
        let totalVentas = 0;
        if (dataVentas.success) {
            totalVentas = dataVentas.data.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
        }
        
        const modalHTML = `
            <div class="modal fade" id="modalDetalleLote" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-box-seam"></i> Detalles del Lote: ${lote.nombre_lote}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Información General -->
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h6 class="mb-0"><i class="bi bi-info-circle"></i> Información General</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <strong>ID Lote:</strong><br>
                                            <span class="badge bg-primary fs-6">#${lote.id_lote}</span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Cantidad Pollos:</strong><br>
                                            <span class="text-primary fs-5">${formatearNumero(lote.cantidad_inicial)}</span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Fecha Inicio:</strong><br>
                                            ${lote.fecha_inicio}
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Estado:</strong><br>
                                            <span class="badge bg-${lote.estado === 'activo' ? 'success' : 'secondary'} fs-6">
                                                ${lote.estado.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    ${lote.fecha_estimada_salida ? `
                                    <div class="row mt-3">
                                        <div class="col-md-12">
                                            <strong>Fecha Estimada de Salida:</strong> ${lote.fecha_estimada_salida}
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Resumen Financiero -->
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h6 class="mb-0"><i class="bi bi-currency-dollar"></i> Resumen Financiero</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-md-3">
                                            <h6 class="text-muted">Total Compras</h6>
                                            <h4 class="text-danger">${formatearMoneda(totalCompras)}</h4>
                                            <small>${dataCompras.success ? dataCompras.data.length : 0} registros</small>
                                        </div>
                                        <div class="col-md-3">
                                            <h6 class="text-muted">Total Ventas</h6>
                                            <h4 class="text-success">${formatearMoneda(totalVentas)}</h4>
                                            <small>${dataVentas.success ? dataVentas.data.length : 0} registros</small>
                                        </div>
                                        <div class="col-md-3">
                                            <h6 class="text-muted">Total Movimientos</h6>
                                            <h4 class="text-primary">${dataMovimientos.success ? dataMovimientos.data.length : 0}</h4>
                                            <small>registros</small>
                                        </div>
                                        <div class="col-md-3">
                                            <h6 class="text-muted">Balance</h6>
                                            <h4 class="${totalVentas - totalCompras >= 0 ? 'text-success' : 'text-danger'}">
                                                ${formatearMoneda(totalVentas - totalCompras)}
                                            </h4>
                                            <small>${totalVentas - totalCompras >= 0 ? 'Ganancia' : 'Pérdida'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Últimos Movimientos -->
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0"><i class="bi bi-arrow-left-right"></i> Últimos Movimientos</h6>
                                </div>
                                <div class="card-body">
                                    ${movimientosHTML}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal anterior si existe
        const modalAnterior = document.getElementById('modalDetalleLote');
        if (modalAnterior) {
            modalAnterior.remove();
        }
        
        // Agregar nuevo modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleLote'));
        modal.show();
        
    } catch (error) {
        console.error('Error al cargar detalles del lote:', error);
        mostrarAlerta('Error al cargar detalles del lote: ' + error.message, 'danger');
    }
}
// ============================================
// COMPRAS
// ============================================

async function cargarCompras() {
    try {
        // Obtener todas las compras
        const respuesta = await fetch(`${API_URL}/compras/todas`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarHistorialCompras(data.data);
        }
    } catch (error) {
        console.error('Error al cargar compras:', error);
        mostrarAlerta('Error al cargar compras', 'danger');
    }
}

function mostrarHistorialCompras(compras) {
    const tbody = document.querySelector('#tabla-compras tbody');
    tbody.innerHTML = '';
    
    if (compras.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay compras registradas</td></tr>';
        return;
    }
    
    compras.forEach(compra => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${compra.id_compra}</td>
            <td>${compra.lote_nombre || 'Lote #' + compra.id_lote}</td>
            <td>${compra.tipo_materia}</td>
            <td>${formatearNumero(compra.cantidad)} ${compra.unidad}</td>
            <td>${formatearMoneda(compra.costo_unitario)}</td>
            <td class="text-danger-custom"><strong>${formatearMoneda(compra.costo_total)}</strong></td>
            <td>${compra.fecha_compra}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="eliminarCompra(${compra.id_compra})" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calcularTotalCompra() {
    const cantidad = parseFloat(document.getElementById('compra_cantidad').value) || 0;
    const costoUnitario = parseFloat(document.getElementById('compra_costo_unitario').value) || 0;
    const total = cantidad * costoUnitario;
    document.getElementById('compra_costo_total').value = total.toFixed(2);
}

async function registrarCompra() {
    const datos = {
        id_lote: parseInt(document.getElementById('compra_id_lote').value),
        tipo_materia: document.getElementById('compra_tipo_materia').value,
        cantidad: parseFloat(document.getElementById('compra_cantidad').value),
        unidad: document.getElementById('compra_unidad').value,
        costo_unitario: parseFloat(document.getElementById('compra_costo_unitario').value),
        fecha_compra: document.getElementById('compra_fecha_compra').value,
        observaciones: document.getElementById('compra_observaciones').value || null
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/compras`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Compra registrada exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarCompra')).hide();
            document.getElementById('formRegistrarCompra').reset();
            cargarDashboard();
        } else {
            mostrarAlerta('Error al registrar compra: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar la compra', 'danger');
    }
}

async function eliminarCompra(idCompra) {
    if (!confirm('¿Está seguro de eliminar esta compra?\n\nEsto revertirá el capital del lote.')) {
        return;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/compras/${idCompra}`, {
            method: 'DELETE'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Compra eliminada exitosamente', 'success');
            cargarCompras();
            cargarDashboard();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar la compra', 'danger');
    }
}

// ============================================
// CLIENTES
// ============================================

async function cargarClientes() {
    try {
        const respuesta = await fetch(`${API_URL}/clientes`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarClientes(data.data);
            clientesActivos = data.data;
            actualizarSelectClientes();
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        mostrarAlerta('Error al cargar clientes', 'danger');
    }
}

function mostrarClientes(clientes) {
    const tbody = document.querySelector('#tabla-clientes tbody');
    tbody.innerHTML = '';
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay clientes registrados</td></tr>';
        return;
    }
    
    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        const estadoClass = cliente.estado === 'activo' ? 'success' : 'secondary';
        
        tr.innerHTML = `
            <td>${cliente.id_cliente}</td>
            <td><strong>${cliente.nombre}</strong></td>
            <td>${cliente.telefono || 'N/A'}</td>
            <td>${cliente.direccion || 'N/A'}</td>
            <td><span class="badge bg-${estadoClass}">${cliente.estado.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="verDetalleCliente(${cliente.id_cliente})" title="Ver">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick='abrirEditarCliente(${JSON.stringify(cliente)})' title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="eliminarCliente(${cliente.id_cliente}, '${cliente.nombre}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function crearCliente() {
    const datos = {
        nombre: document.getElementById('cliente_nombre').value,
        telefono: document.getElementById('cliente_telefono').value || null,
        direccion: document.getElementById('cliente_direccion').value || null
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Cliente creado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalCrearCliente')).hide();
            document.getElementById('formCrearCliente').reset();
            cargarClientes();
        } else {
            mostrarAlerta('Error al crear cliente: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al crear el cliente', 'danger');
    }
}

async function eliminarCliente(idCliente, nombreCliente) {
    if (!confirm(`¿Está seguro de eliminar el cliente "${nombreCliente}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/clientes/${idCliente}`, {
            method: 'DELETE'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Cliente eliminado exitosamente', 'success');
            cargarClientes();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar el cliente', 'danger');
    }
}

function abrirEditarCliente(cliente) {
    document.getElementById('edit_id_cliente').value = cliente.id_cliente;
    document.getElementById('edit_cliente_nombre').value = cliente.nombre;
    document.getElementById('edit_cliente_telefono').value = cliente.telefono || '';
    document.getElementById('edit_cliente_direccion').value = cliente.direccion || '';
    
    const modal = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
    modal.show();
}

async function actualizarCliente() {
    const idCliente = document.getElementById('edit_id_cliente').value;
    
    const datos = {
        nombre: document.getElementById('edit_cliente_nombre').value,
        telefono: document.getElementById('edit_cliente_telefono').value || null,
        direccion: document.getElementById('edit_cliente_direccion').value || null
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/clientes/${idCliente}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Cliente actualizado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente')).hide();
            cargarClientes();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar el cliente', 'danger');
    }
}

async function verDetalleCliente(idCliente) {
    try {
        const respuesta = await fetch(`${API_URL}/clientes/${idCliente}`);
        const data = await respuesta.json();
        
        if (data.success) {
            const cliente = data.data;
            
            // Mostrar modal con detalles
            const modalHTML = `
                <div class="modal fade" id="modalDetalleCliente" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Detalles del Cliente</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <strong>ID:</strong> ${cliente.id_cliente}
                                </div>
                                <div class="mb-3">
                                    <strong>Nombre:</strong> ${cliente.nombre}
                                </div>
                                <div class="mb-3">
                                    <strong>Teléfono:</strong> ${cliente.telefono || 'No registrado'}
                                </div>
                                <div class="mb-3">
                                    <strong>Dirección:</strong> ${cliente.direccion || 'No registrada'}
                                </div>
                                <div class="mb-3">
                                    <strong>Estado:</strong> 
                                    <span class="badge bg-${cliente.estado === 'activo' ? 'success' : 'secondary'}">
                                        ${cliente.estado.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remover modal anterior si existe
            const modalAnterior = document.getElementById('modalDetalleCliente');
            if (modalAnterior) {
                modalAnterior.remove();
            }
            
            // Agregar nuevo modal
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('modalDetalleCliente'));
            modal.show();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar detalles del cliente', 'danger');
    }
}

function actualizarSelectClientes() {
    const select = document.getElementById('venta_id_cliente');
    if (select) {
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        
        if (clientesActivos && clientesActivos.length > 0) {
            clientesActivos.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id_cliente;
                option.textContent = cliente.nombre;
                select.appendChild(option);
            });
        }
    }
}
// ============================================
// VENTAS
// ============================================

async function cargarVentas() {
    try {
        const respuesta = await fetch(`${API_URL}/ventas`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarVentas(data.data);
        }
        
        // Cargar lotes y clientes
        await cargarLotes();
        await cargarClientes();
        
        // Actualizar selects
        actualizarSelectLotes();
        actualizarSelectClientes();
        
    } catch (error) {
        console.error('Error al cargar ventas:', error);
        mostrarAlerta('Error al cargar ventas', 'danger');
    }
}

function mostrarVentas(ventas) {
    const tbody = document.querySelector('#tabla-ventas tbody');
    tbody.innerHTML = '';
    
    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No hay ventas registradas</td></tr>';
        return;
    }
    
    ventas.forEach(venta => {
        const tr = document.createElement('tr');
        
        let estadoPago = '<span class="badge bg-success">Pagado</span>';
        if (venta.credito) {
            if (venta.credito.estado_deuda === 'pendiente') {
                estadoPago = '<span class="badge bg-danger">Pendiente</span>';
            } else if (venta.credito.estado_deuda === 'parcial') {
                estadoPago = '<span class="badge bg-warning">Parcial</span>';
            }
        }
        
        tr.innerHTML = `
            <td>${venta.id_venta}</td>
            <td>${venta.lote_nombre}</td>
            <td>${venta.cliente_nombre}</td>
            <td>${formatearNumero(venta.cantidad_pollos)}</td>
            <td>${formatearNumero(venta.cantidad_kilos)} kg</td>
            <td>${formatearMoneda(venta.precio_kilo)}</td>
            <td><strong>${formatearMoneda(venta.valor_total)}</strong></td>
            <td>${venta.fecha_venta}</td>
            <td>${estadoPago}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="eliminarVenta(${venta.id_venta})" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calcularTotalVenta() {
    const kilos = parseFloat(document.getElementById('venta_cantidad_kilos').value) || 0;
    const precioKilo = parseFloat(document.getElementById('venta_precio_kilo').value) || 0;
    const total = kilos * precioKilo;
    document.getElementById('venta_valor_total').value = total.toFixed(2);
}

async function abrirModalVenta() {
    // Cargar lotes activos
    await cargarLotes();
    
    // Cargar clientes
    await cargarClientes();
    
    // Actualizar selects
    actualizarSelectLotes();
    actualizarSelectClientes();
    
    // Establecer fecha actual
    document.getElementById('venta_fecha_venta').valueAsDate = new Date();
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalRegistrarVenta'));
    modal.show();
}

async function registrarVenta() {
    const tipoPago = document.querySelector('input[name="tipo_pago"]:checked').value;
    
    const datos = {
        id_lote: parseInt(document.getElementById('venta_id_lote').value),
        id_cliente: parseInt(document.getElementById('venta_id_cliente').value),
        cantidad_pollos: parseInt(document.getElementById('venta_cantidad_pollos').value),
        cantidad_kilos: parseFloat(document.getElementById('venta_cantidad_kilos').value),
        precio_kilo: parseFloat(document.getElementById('venta_precio_kilo').value),
        fecha_venta: document.getElementById('venta_fecha_venta').value,
        tipo_pago: tipoPago
    };
    
    if (tipoPago === 'credito') {
        datos.valor_pagado_inicial = parseFloat(document.getElementById('venta_valor_pagado_inicial').value) || 0;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Venta registrada exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarVenta')).hide();
            document.getElementById('formRegistrarVenta').reset();
            cargarVentas();
            cargarDashboard();
        } else {
            mostrarAlerta('Error al registrar venta: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar la venta', 'danger');
    }
}

async function eliminarVenta(idVenta) {
    if (!confirm('¿Está seguro de eliminar esta venta?\n\nEsto revertirá el capital del lote.')) {
        return;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/ventas/${idVenta}`, {
            method: 'DELETE'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Venta eliminada exitosamente', 'success');
            cargarVentas();
            cargarDashboard();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar la venta', 'danger');
    }
}

// ============================================
// CRÉDITOS Y PAGOS
// ============================================

async function cargarCreditosPendientes() {
    try {
        const respuesta = await fetch(`${API_URL}/creditos/pendientes`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarCreditosPendientes(data.data);
            document.getElementById('card-creditos').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar créditos', 'danger');
    }
}

function mostrarCreditosPendientes(creditos) {
    const tbody = document.querySelector('#tabla-creditos tbody');
    tbody.innerHTML = '';
    
    if (creditos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay créditos pendientes</td></tr>';
        return;
    }
    
    creditos.forEach(credito => {
        const tr = document.createElement('tr');
        const estadoClass = credito.estado_deuda === 'pendiente' ? 'danger' : 'warning';
        
        tr.innerHTML = `
            <td><strong>${credito.cliente_nombre}</strong></td>
            <td>${credito.lote_nombre}</td>
            <td>${formatearMoneda(credito.valor_total)}</td>
            <td class="text-success-custom">${formatearMoneda(credito.valor_pagado)}</td>
            <td class="text-danger-custom"><strong>${formatearMoneda(credito.valor_pendiente)}</strong></td>
            <td><span class="badge bg-${estadoClass}">${credito.estado_deuda.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="abrirModalPago(${credito.id_credito}, '${credito.cliente_nombre}', ${credito.valor_pendiente})">
                    <i class="bi bi-cash"></i> Registrar Pago
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalPago(idCredito, clienteNombre, saldoPendiente) {
    document.getElementById('pago_id_credito').value = idCredito;
    document.getElementById('info_cliente').textContent = clienteNombre;
    document.getElementById('info_saldo_pendiente').textContent = formatearMoneda(saldoPendiente);
    document.getElementById('pago_valor_pago').max = saldoPendiente;
    document.getElementById('pago_fecha_pago').valueAsDate = new Date();
    
    const modal = new bootstrap.Modal(document.getElementById('modalRegistrarPago'));
    modal.show();
}

async function registrarPago() {
    const datos = {
        id_credito: parseInt(document.getElementById('pago_id_credito').value),
        valor_pago: parseFloat(document.getElementById('pago_valor_pago').value),
        fecha_pago: document.getElementById('pago_fecha_pago').value,
        metodo_pago: document.getElementById('pago_metodo_pago').value,
        observaciones: document.getElementById('pago_observaciones').value || null
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/pagos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Pago registrado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarPago')).hide();
            document.getElementById('formRegistrarPago').reset();
            cargarCreditosPendientes();
            cargarDashboard();
        } else {
            mostrarAlerta('Error al registrar pago: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar el pago', 'danger');
    }
}
// ============================================
// MÓDULO DE NOTIFICACIONES
// ============================================

function inicializarNotificaciones() {
    // Cargar notificaciones iniciales
    cargarNotificacionesCampana();
    
    // Auto-actualizar cada 30 segundos
    intervaloNotificaciones = setInterval(() => {
        cargarNotificacionesCampana();
        generarNotificacionesAutomaticas();
    }, 30000);
}

async function cargarNotificacionesCampana() {
    try {
        const respuesta = await fetch(`${API_URL}/notificaciones?no_leidas=true`);
        const data = await respuesta.json();
        
        if (data.success) {
            const noLeidas = data.data.total_no_leidas;
            const notificaciones = data.data.notificaciones;
            
            // Actualizar badge
            const badge = document.getElementById('badge-notificaciones');
            if (noLeidas > 0) {
                badge.textContent = noLeidas > 99 ? '99+' : noLeidas;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
            
            // Actualizar lista en dropdown
            mostrarNotificacionesDropdown(notificaciones);
        }
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
    }
}

function mostrarNotificacionesDropdown(notificaciones) {
    const lista = document.getElementById('lista-notificaciones');
    
    if (notificaciones.length === 0) {
        lista.innerHTML = `
            <li class="text-center p-3 text-muted">
                <i class="bi bi-inbox"></i><br>
                No hay notificaciones nuevas
            </li>
        `;
        return;
    }
    
    lista.innerHTML = '';
    
    notificaciones.slice(0, 5).forEach(notif => {
        const prioridadClass = `prioridad-${notif.prioridad}`;
        const noLeidaClass = notif.leida ? '' : 'no-leida';
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="notificacion-item ${prioridadClass} ${noLeidaClass}" onclick="marcarLeidaYVer(${notif.id_notificacion})">
                <div class="d-flex align-items-start">
                    <span class="prioridad-icon ${notif.prioridad}"></span>
                    <div class="flex-grow-1">
                        <div class="notif-titulo">${notif.titulo}</div>
                        <div class="notif-mensaje">${truncarTexto(notif.mensaje, 80)}</div>
                        <div class="notif-tiempo">
                            <i class="bi bi-clock"></i> ${formatearTiempo(notif.fecha_creacion)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        lista.appendChild(li);
    });
}

async function marcarLeidaYVer(idNotificacion) {
    try {
        // Marcar como leída
        await fetch(`${API_URL}/notificaciones/${idNotificacion}/marcar-leida`, {
            method: 'POST'
        });
        
        // Recargar notificaciones
        cargarNotificacionesCampana();
        
        // Si estamos en la sección de notificaciones, recargar
        const seccionActiva = document.querySelector('.nav-link.active');
        if (seccionActiva && seccionActiva.getAttribute('data-section') === 'notificaciones') {
            cargarNotificaciones();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function marcarTodasLeidas() {
    try {
        const respuesta = await fetch(`${API_URL}/notificaciones/marcar-todas-leidas`, {
            method: 'POST'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Todas las notificaciones marcadas como leídas', 'success');
            cargarNotificacionesCampana();
            
            // Si estamos en la sección de notificaciones, recargar
            const seccionActiva = document.querySelector('.nav-link.active');
            if (seccionActiva && seccionActiva.getAttribute('data-section') === 'notificaciones') {
                cargarNotificaciones();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al marcar notificaciones', 'danger');
    }
}

function verTodasNotificaciones(event) {
    event.preventDefault();
    
    // Cambiar a la sección de notificaciones
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link[data-section="notificaciones"]').classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
    document.getElementById('section-notificaciones').style.display = 'block';
    
    cargarNotificaciones();
}

// ============================================
// SECCIÓN COMPLETA DE NOTIFICACIONES
// ============================================

async function cargarNotificaciones() {
    try {
        const prioridad = document.getElementById('filtro-prioridad')?.value || '';
        const leidas = document.getElementById('filtro-leidas')?.value || 'false';
        
        let url = `${API_URL}/notificaciones?`;
        if (leidas === 'false' || leidas === 'true') {
            url += `no_leidas=${leidas === 'false'}`;
        }
        
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        
        if (data.success) {
            let notificaciones = data.data.notificaciones;
            
            // Filtrar por prioridad si está seleccionado
            if (prioridad) {
                notificaciones = notificaciones.filter(n => n.prioridad === prioridad);
            }
            
            mostrarNotificacionesCompletas(notificaciones);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar notificaciones', 'danger');
    }
}

function mostrarNotificacionesCompletas(notificaciones) {
    const contenedor = document.getElementById('contenedor-notificaciones');
    
    if (notificaciones.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = '';
    
    notificaciones.forEach(notif => {
        const prioridadClass = `prioridad-${notif.prioridad}`;
        const noLeidaClass = notif.leida ? '' : 'no-leida';
        
        const prioridadColor = {
            'critica': 'danger',
            'alta': 'warning',
            'media': 'info',
            'baja': 'secondary'
        };
        
        const card = document.createElement('div');
        card.className = `notificacion-card ${prioridadClass} ${noLeidaClass}`;
        card.innerHTML = `
            <div class="card-body">
                <div class="notif-header">
                    <div class="notif-titulo">
                        <span class="prioridad-icon ${notif.prioridad}"></span>
                        ${notif.titulo}
                    </div>
                    <div class="notif-fecha">
                        <i class="bi bi-clock"></i> ${formatearTiempo(notif.fecha_creacion)}
                    </div>
                </div>
                <div class="notif-mensaje">${notif.mensaje}</div>
                <div class="notif-footer">
                    <span class="badge badge-prioridad bg-${prioridadColor[notif.prioridad]}">
                        ${notif.prioridad.toUpperCase()}
                    </span>
                    <div>
                        ${!notif.leida ? `
                            <button class="btn btn-sm btn-primary btn-notif-action" onclick="marcarNotificacionLeida(${notif.id_notificacion})">
                                <i class="bi bi-check2"></i> Marcar leída
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-danger btn-notif-action" onclick="eliminarNotificacion(${notif.id_notificacion})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

async function marcarNotificacionLeida(idNotificacion) {
    try {
        const respuesta = await fetch(`${API_URL}/notificaciones/${idNotificacion}/marcar-leida`, {
            method: 'POST'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            cargarNotificaciones();
            cargarNotificacionesCampana();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarNotificacion(idNotificacion) {
    if (!confirm('¿Eliminar esta notificación?')) return;
    
    try {
        const respuesta = await fetch(`${API_URL}/notificaciones/${idNotificacion}`, {
            method: 'DELETE'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('Notificación eliminada', 'success');
            cargarNotificaciones();
            cargarNotificacionesCampana();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar', 'danger');
    }
}

async function generarNotificacionesAutomaticas() {
    try {
        const respuesta = await fetch(`${API_URL}/notificaciones/generar-automaticas`, {
            method: 'POST'
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            const cantidad = data.data.notificaciones_creadas;
            if (cantidad > 0) {
                mostrarAlerta(`✅ ${cantidad} notificación(es) nueva(s) generada(s)`, 'info');
                cargarNotificacionesCampana();
            }
        }
    } catch (error) {
        console.error('Error al generar notificaciones:', error);
    }
}
// ============================================
// MÓDULO DE CRONOGRAMA
// ============================================

async function cargarCronogramaLote() {
    const idLote = document.getElementById('cronograma_id_lote').value;
    
    if (!idLote) {
        document.getElementById('cronograma-lote-detalle').style.display = 'none';
        return;
    }
    
    try {
        const respuesta = await fetch(`${API_URL}/cronograma/lote/${idLote}`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarCronogramaLote(data.data);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar cronograma', 'danger');
    }
}

function mostrarCronogramaLote(data) {
    const contenedor = document.getElementById('cronograma-lote-detalle');
    const lote = data.lote;
    const eventos = data.eventos;
    const diasEdad = data.dias_edad;
    const diasRestantes = data.dias_restantes;
    
    // Calcular progreso
    let progreso = 0;
    if (lote.fecha_estimada_salida) {
        const totalDias = Math.abs(new Date(lote.fecha_estimada_salida) - new Date(lote.fecha_inicio)) / (1000 * 60 * 60 * 24);
        progreso = Math.min(100, (diasEdad / totalDias) * 100);
    }
    
    let eventosHTML = '';
    eventos.forEach(evento => {
        const estadoClass = evento.estado;
        const diasParaEvento = Math.ceil((new Date(evento.fecha_programada) - new Date()) / (1000 * 60 * 60 * 24));
        
        let diasLabel = '';
        let diasClass = '';
        if (evento.estado === 'completado') {
            diasLabel = 'Completado';
            diasClass = 'completado';
        } else if (diasParaEvento === 0) {
            diasLabel = '¡HOY!';
            diasClass = 'hoy';
        } else if (diasParaEvento < 0) {
            diasLabel = `Vencido (${Math.abs(diasParaEvento)}d)`;
            diasClass = 'vencido';
        } else if (diasParaEvento <= 3) {
            diasLabel = `En ${diasParaEvento}d`;
            diasClass = 'proximo';
        } else {
            diasLabel = `En ${diasParaEvento}d`;
            diasClass = 'futuro';
        }
        
        // Determinar badge de tipo
        let tipoBadge = '';
        if (evento.tipo_evento.includes('vitaminas')) {
            tipoBadge = '<span class="badge badge-tipo-evento badge-vitaminas">VITAMINAS</span>';
        } else if (evento.tipo_evento.includes('cambio')) {
            tipoBadge = '<span class="badge badge-tipo-evento badge-alimento">ALIMENTO</span>';
        } else if (evento.tipo_evento.includes('melaza')) {
            tipoBadge = '<span class="badge badge-tipo-evento badge-melaza">MELAZA</span>';
        } else if (evento.tipo_evento.includes('salida')) {
            tipoBadge = '<span class="badge badge-tipo-evento badge-salida">SALIDA</span>';
        }
        
        eventosHTML += `
            <div class="evento-item ${estadoClass}">
                <div class="evento-header">
                    <div>
                        <span class="evento-titulo">${evento.descripcion}</span>
                        ${tipoBadge}
                    </div>
                    <span class="evento-dias ${diasClass}">${diasLabel}</span>
                </div>
                <div class="evento-descripcion">
                    <strong>Día del ciclo:</strong> ${evento.dias_lote} | 
                    <strong>Fecha:</strong> ${evento.fecha_programada}
                    ${evento.fecha_ejecutada ? `| <strong>Ejecutado:</strong> ${evento.fecha_ejecutada}` : ''}
                </div>
                ${evento.estado === 'pendiente' ? `
                    <button class="btn btn-sm btn-success btn-completar-evento mt-2" onclick="completarEvento(${evento.id_evento})">
                        <i class="bi bi-check-circle"></i> Marcar Completado
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    contenedor.innerHTML = `
        <div class="card shadow mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-box-seam"></i> ${lote.nombre_lote}</h5>
            </div>
            <div class="card-body">
                <!-- Info Box -->
                <div class="info-box">
                    <div class="row">
                        <div class="col-md-3 info-item">
                            <div class="info-label">Edad del Lote</div>
                            <div class="info-value">${diasEdad}</div>
                            <div class="info-subtitle">días</div>
                        </div>
                        <div class="col-md-3 info-item">
                            <div class="info-label">Pollos</div>
                            <div class="info-value">${formatearNumero(lote.cantidad_inicial)}</div>
                            <div class="info-subtitle">unidades</div>
                        </div>
                        <div class="col-md-3 info-item">
                            <div class="info-label">Días Restantes</div>
                            <div class="info-value">${diasRestantes !== null ? diasRestantes : '--'}</div>
                            <div class="info-subtitle">hasta salida</div>
                        </div>
                        <div class="col-md-3 info-item">
                            <div class="info-label">Progreso</div>
                            <div class="info-value">${progreso.toFixed(0)}%</div>
                            <div class="info-subtitle">del ciclo</div>
                        </div>
                    </div>
                    ${lote.fecha_estimada_salida ? `
                        <div class="mt-3">
                            <div class="progress progress-ciclo">
                                <div class="progress-bar" role="progressbar" style="width: ${progreso}%" aria-valuenow="${progreso}" aria-valuemin="0" aria-valuemax="100">
                                    ${progreso.toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Timeline de Eventos -->
                <h6 class="mb-3"><i class="bi bi-calendar-event"></i> Cronograma de Eventos</h6>
                <div class="cronograma-timeline">
                    ${eventosHTML}
                </div>
            </div>
        </div>
    `;
    
    contenedor.style.display = 'block';
}

async function completarEvento(idEvento) {
    try {
        const respuesta = await fetch(`${API_URL}/cronograma/evento/${idEvento}/completar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_ejecutada: new Date().toISOString().split('T')[0]
            })
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta('✅ Evento completado', 'success');
            cargarCronogramaLote();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al completar evento', 'danger');
    }
}

async function verEventosPendientesGeneral() {
    try {
        const respuesta = await fetch(`${API_URL}/cronograma/eventos-pendientes`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarEventosPendientesGeneral(data.data);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar eventos', 'danger');
    }
}

function mostrarEventosPendientesGeneral(eventos) {
    const contenedor = document.getElementById('eventos-pendientes-general');
    
    if (eventos.length === 0) {
        contenedor.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No hay eventos pendientes próximos
            </div>
        `;
        return;
    }
    
    let eventosHTML = '<div class="card shadow"><div class="card-header"><h6 class="mb-0">Eventos Próximos (próximos 7 días)</h6></div><div class="card-body"><div class="cronograma-timeline">';
    
    eventos.forEach(evento => {
        const diasParaEvento = evento.dias_para_evento;
        let diasClass = diasParaEvento === 0 ? 'hoy' : (diasParaEvento <= 3 ? 'proximo' : 'futuro');
        let diasLabel = diasParaEvento === 0 ? '¡HOY!' : `En ${diasParaEvento}d`;
        
        eventosHTML += `
            <div class="evento-item pendiente">
                <div class="evento-header">
                    <div>
                        <span class="evento-titulo">${evento.nombre_lote}</span>
                        <small class="text-muted ms-2">${evento.descripcion}</small>
                    </div>
                    <span class="evento-dias ${diasClass}">${diasLabel}</span>
                </div>
                <div class="evento-fecha">
                    <i class="bi bi-calendar"></i> ${evento.fecha_programada}
                </div>
            </div>
        `;
    });
    
    eventosHTML += '</div></div></div>';
    contenedor.innerHTML = eventosHTML;
}
// ============================================
// MÓDULO DE MORTALIDAD
// ============================================

async function cargarResumenMortalidad() {
    try {
        const respuesta = await fetch(`${API_URL}/mortalidad/resumen`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarResumenMortalidad(data.data);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar mortalidad', 'danger');
    }
}

function mostrarResumenMortalidad(lotes) {
    const tbody = document.querySelector('#tabla-resumen-mortalidad tbody');
    tbody.innerHTML = '';
    
    if (lotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay datos de mortalidad</td></tr>';
        return;
    }
    
    lotes.forEach(lote => {
        const porcentaje = parseFloat(lote.porcentaje_mortalidad_total);
        let badgeClass = 'mortalidad-baja';
        let graphClass = 'baja';
        
        if (porcentaje > 10) {
            badgeClass = 'mortalidad-alta';
            graphClass = 'alta';
        } else if (porcentaje > 5) {
            badgeClass = 'mortalidad-media';
            graphClass = 'media';
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${lote.nombre_lote}</strong></td>
            <td>${formatearNumero(lote.cantidad_inicial)}</td>
            <td class="text-danger">${formatearNumero(lote.total_muertos)}</td>
            <td class="text-success">${formatearNumero(lote.pollos_vivos_actuales)}</td>
            <td>
                <span class="mortalidad-badge ${badgeClass}">${porcentaje.toFixed(2)}%</span>
                <div class="mortalidad-graph mt-1">
                    <div class="mortalidad-graph-fill ${graphClass}" style="width: ${Math.min(porcentaje, 100)}%"></div>
                </div>
            </td>
            <td>${lote.ultima_fecha_registro || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="verDetalleMortalidad(${lote.id_lote})">
                    <i class="bi bi-eye"></i> Ver Detalle
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function registrarMortalidad() {
    const datos = {
        id_lote: parseInt(document.getElementById('mortalidad_id_lote').value),
        cantidad_muertos: parseInt(document.getElementById('mortalidad_cantidad').value),
        fecha_registro: document.getElementById('mortalidad_fecha').value,
        causa: document.getElementById('mortalidad_causa').value || null,
        observaciones: document.getElementById('mortalidad_observaciones').value || null
    };
    
    try {
        const respuesta = await fetch(`${API_URL}/mortalidad`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarAlerta(`✅ Mortalidad registrada. Pollos vivos: ${data.data.pollos_vivos_actual}`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistrarMortalidad')).hide();
            document.getElementById('formRegistrarMortalidad').reset();
            cargarResumenMortalidad();
        } else {
            mostrarAlerta('Error: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al registrar mortalidad', 'danger');
    }
}

async function verDetalleMortalidad(idLote) {
    try {
        const respuesta = await fetch(`${API_URL}/mortalidad/lote/${idLote}`);
        const data = await respuesta.json();
        
        if (data.success) {
            mostrarModalDetalleMortalidad(data.data);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar detalle', 'danger');
    }
}

function mostrarModalDetalleMortalidad(data) {
    const registros = data.registros;
    const stats = data.estadisticas;
    
    let registrosHTML = '';
    registros.forEach(reg => {
        registrosHTML += `
            <tr>
                <td>${reg.fecha_registro}</td>
                <td class="text-danger">${reg.cantidad_muertos}</td>
                <td>${reg.cantidad_vivos_actual}</td>
                <td>${reg.porcentaje_mortalidad}%</td>
                <td>${reg.causa || 'N/A'}</td>
            </tr>
        `;
    });
    
    const modalHTML = `
        <div class="modal fade" id="modalDetalleMortalidad" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-heartbreak"></i> Detalle de Mortalidad</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-3 text-center">
                                <h6 class="text-muted">Cantidad Inicial</h6>
                                <h4>${formatearNumero(stats.cantidad_inicial)}</h4>
                            </div>
                            <div class="col-md-3 text-center">
                                <h6 class="text-muted">Total Muertos</h6>
                                <h4 class="text-danger">${formatearNumero(stats.total_muertos)}</h4>
                            </div>
                            <div class="col-md-3 text-center">
                                <h6 class="text-muted">Pollos Vivos</h6>
                                <h4 class="text-success">${formatearNumero(stats.pollos_vivos)}</h4>
                            </div>
                            <div class="col-md-3 text-center">
                                <h6 class="text-muted">% Mortalidad</h6>
                                <h4>${stats.porcentaje_mortalidad_total.toFixed(2)}%</h4>
                            </div>
                        </div>
                        <hr>
                        <h6>Historial de Registros</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Muertos</th>
                                        <th>Vivos</th>
                                        <th>% Día</th>
                                        <th>Causa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${registrosHTML}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalAnterior = document.getElementById('modalDetalleMortalidad');
    if (modalAnterior) modalAnterior.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleMortalidad'));
    modal.show();
}
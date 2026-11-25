/**
 * app.js - Lógica Interactiva Profesional DentalCare Pro
 * Soporte Multi-Arcada (Superior e Inferior 32 piezas FDI), RBAC y Supabase Cloud
 */

document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    currentModule: 'control', // 'control' | 'progreso' | 'agendar' | 'pagar'
    currentCurp: null,
    currentPatient: null,
    treatments: [],
    odontogram: [],
    appointments: [],
    selectedDiente: null,
    agendaDoctorFilter: ''
  };

  // 1. Inicializar eventos y comprobar sesión
  setupAuthEvents();
  setupDbModalEvents();
  checkUserSession();

  // ==============================================================
  // CONTROL DE SESIÓN Y RBAC (ADMINISTRADOR VS DOCTOR)
  // ==============================================================

  function checkUserSession() {
    const user = window.StorageAdapter.getCurrentUser();
    const loginSec = document.getElementById('loginSection');
    const appSec = document.getElementById('mainAppSection');

    if (!user) {
      if (loginSec) loginSec.style.display = 'flex';
      if (appSec) appSec.style.display = 'none';
    } else {
      if (loginSec) loginSec.style.display = 'none';
      if (appSec) appSec.style.display = 'block';
      applyRbacPermissions(user);
      initAppForUser();
    }
  }

  function applyRbacPermissions(user) {
    // Insignias en Encabezado
    const avatarEl = document.getElementById('headerUserAvatar');
    const nameEl = document.getElementById('headerUserName');
    const roleTagEl = document.getElementById('headerRoleTag');

    if (avatarEl) avatarEl.textContent = user.nombre.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.nombre;
    if (roleTagEl) {
      roleTagEl.textContent = user.rol.toUpperCase();
      roleTagEl.className = `role-badge ${user.rol}`;
    }

    // Permisos por Rol
    const navBtnPagar = document.getElementById('navBtnPagar');
    const doctorBanner = document.getElementById('doctorNoticeBanner');
    const bannerConsultorio = document.getElementById('bannerDocConsultorio');
    const adminAgendaBox = document.getElementById('adminAgendaFilterBox');

    if (window.StorageAdapter.isDoctor()) {
      if (navBtnPagar) navBtnPagar.classList.add('restricted');
      if (doctorBanner) doctorBanner.style.display = 'flex';
      if (bannerConsultorio) bannerConsultorio.textContent = user.consultorio || '#3';
      if (adminAgendaBox) adminAgendaBox.style.display = 'none';

      if (state.currentModule === 'pagar') {
        switchModule('control');
      }
    } else {
      if (navBtnPagar) navBtnPagar.classList.remove('restricted');
      if (doctorBanner) doctorBanner.style.display = 'none';
      if (adminAgendaBox) adminAgendaBox.style.display = 'block';
      populateAgendaDoctorFilter();
    }

    populateDoctorSelectors(user);
  }

  function populateDoctorSelectors(user) {
    const doctores = window.StorageAdapter.getDoctores();
    const inpSelect = document.getElementById('inpDentistaSelect');
    const citaSelect = document.getElementById('citaDentistaSelect');
    const isDoc = window.StorageAdapter.isDoctor();

    [inpSelect, citaSelect].forEach(select => {
      if (!select) return;
      select.innerHTML = '';

      if (isDoc) {
        const opt = document.createElement('option');
        opt.value = user.nombre;
        opt.textContent = `${user.nombre} (${user.especialidad || 'Consultorio ' + user.consultorio})`;
        select.appendChild(opt);
        select.disabled = true;
      } else {
        select.disabled = false;
        doctores.forEach(doc => {
          const opt = document.createElement('option');
          opt.value = doc.nombre;
          opt.textContent = `${doc.nombre} - ${doc.especialidad || 'Consultorio ' + doc.consultorio}`;
          select.appendChild(opt);
        });
      }
    });

    const inpConsultorio = document.getElementById('inpConsultorio');
    const citaConsultorio = document.getElementById('citaConsultorioInp');

    if (isDoc) {
      if (inpConsultorio) { inpConsultorio.value = user.consultorio || '#3'; inpConsultorio.readOnly = true; }
      if (citaConsultorio) { citaConsultorio.value = user.consultorio || '#3'; citaConsultorio.readOnly = true; }
    } else {
      if (inpConsultorio) inpConsultorio.readOnly = false;
      if (citaConsultorio) citaConsultorio.readOnly = false;

      if (inpSelect) {
        inpSelect.onchange = (e) => {
          const d = doctores.find(doc => doc.nombre === e.target.value);
          if (d && inpConsultorio) inpConsultorio.value = d.consultorio || '#3';
        };
      }
      if (citaSelect) {
        citaSelect.onchange = (e) => {
          const d = doctores.find(doc => doc.nombre === e.target.value);
          if (d && citaConsultorio) citaConsultorio.value = d.consultorio || '#3';
        };
      }
    }
  }

  function populateAgendaDoctorFilter() {
    const filterSelect = document.getElementById('filterAgendaDoctorSelect');
    if (!filterSelect) return;

    const doctores = window.StorageAdapter.getDoctores();
    filterSelect.innerHTML = '<option value="">Todos los doctores (Clínica completa)</option>';
    doctores.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.nombre;
      opt.textContent = `${doc.nombre} (${doc.consultorio})`;
      filterSelect.appendChild(opt);
    });

    filterSelect.onchange = async (e) => {
      state.agendaDoctorFilter = e.target.value;
      await renderAppointmentDetails();
    };
  }

  async function initAppForUser() {
    updateDbStatusBadge();
    const pacientes = await window.StorageAdapter.getPacientes();

    if (pacientes.length > 0) {
      state.currentCurp = pacientes[0].curp;
    } else {
      state.currentCurp = 'MORG850912HMCRRL01';
    }

    await loadPatientData(state.currentCurp);
    setupNavigationEvents();
    setupFormEvents();

    if (window.StorageAdapter.isAdmin()) {
      await renderAdminMetrics();
    }
  }

  // ==============================================================
  // AUTENTICACIÓN & EVENTOS LOGIN
  // ==============================================================

  function setupAuthEvents() {
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;

        const res = await window.StorageAdapter.login(email, pass);
        if (res.success) {
          showToast(`¡Bienvenido(a), ${res.user.nombre}!`, 'ok');
          checkUserSession();
        } else {
          showToast(res.error || 'Credenciales inválidas', 'bad');
        }
      };
    }

    // Botones Demo 1-Clic
    document.querySelectorAll('.quick-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const email = btn.dataset.email;
        const pass = btn.dataset.pass;
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = pass;

        const res = await window.StorageAdapter.login(email, pass);
        if (res.success) {
          showToast(`Acceso exitoso: ${res.user.nombre} (${res.user.rol.toUpperCase()})`, 'ok');
          checkUserSession();
        } else {
          showToast(res.error, 'bad');
        }
      };
    });

    // Cerrar sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.onclick = () => {
        if (confirm('¿Deseas cerrar tu sesión?')) {
          window.StorageAdapter.logout();
          showToast('Sesión finalizada', 'ok');
          checkUserSession();
        }
      };
    }
  }

  // ==============================================================
  // CARGA Y RENDERIZADO DE DATOS DEL PACIENTE
  // ==============================================================

  async function loadPatientData(curp) {
    if (!curp) return;
    state.currentCurp = curp.toUpperCase();

    document.querySelectorAll('.curp-display-val').forEach(el => {
      el.textContent = state.currentCurp;
    });

    state.currentPatient = await window.StorageAdapter.getPaciente(state.currentCurp);
    state.treatments = await window.StorageAdapter.getTratamientos(state.currentCurp);
    state.odontogram = await window.StorageAdapter.getOdontograma(state.currentCurp);
    state.appointments = await window.StorageAdapter.getCitas(state.currentCurp);

    renderPatientSelector();
    renderPatientDetails();
    renderHistorialCards();
    renderOdontograma();
    renderAppointmentDetails();
    renderPaymentDetails();

    if (window.StorageAdapter.isAdmin()) {
      await renderAdminMetrics();
    }
  }

  async function renderPatientSelector() {
    const selector = document.getElementById('quickPatientSelector');
    if (!selector) return;
    const pacientes = await window.StorageAdapter.getPacientes();
    selector.innerHTML = '';

    if (pacientes.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Sin pacientes asignados';
      selector.appendChild(opt);
      return;
    }

    pacientes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.curp;
      opt.textContent = `${p.nombre} (${p.curp})`;
      if (p.curp === state.currentCurp) opt.selected = true;
      selector.appendChild(opt);
    });
  }

  function renderPatientDetails() {
    const p = state.currentPatient;
    if (!p) return;

    setText('viewNombre', p.nombre || '-');
    setText('viewEdad', (p.edad ? p.edad + ' años' : '-'));
    setText('viewTelefono', p.telefono || '-');
    setText('viewCorreo', p.correo || '-');
    setText('viewDireccion', p.direccion || '-');
    setText('viewNss', p.nss || '-');
    setText('viewCurp', p.curp || '-');
    setText('viewDentista', p.dentista || 'Dr. Ramón');
    setText('viewConsultorio', p.consultorio || '#3');
  }

  function renderHistorialCards() {
    const containers = [
      document.getElementById('historialListContainer'),
      document.getElementById('historialOdontogramContainer')
    ];

    containers.forEach(container => {
      if (!container) return;
      container.innerHTML = '';

      if (!state.treatments || state.treatments.length === 0) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:#64748B;font-size:13px">Sin tratamientos registrados</div>';
        return;
      }

      state.treatments.forEach(t => {
        const item = document.createElement('div');
        item.className = 'historial-item';

        const realizadoPill = t.realizado 
          ? '<span class="pill ok"><i></i>Realizado</span>' 
          : '<span class="pill warn"><i></i>Pendiente</span>';

        const pagadoPill = t.pagado 
          ? '<span class="pill ok"><i></i>Pagado</span>' 
          : '<span class="pill bad"><i></i>No pagado</span>';

        item.innerHTML = `
          <div>
            <div class="t-name">${t.nombre}</div>
            <div class="t-meta">Dr(a). ${t.dentista || 'Clínico'} &middot; Costo: $${Number(t.costo).toFixed(2)} MXN &middot; ${t.fecha || 'Fecha programada'}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            ${realizadoPill}
            ${pagadoPill}
          </div>
        `;
        container.appendChild(item);
      });
    });
  }

  // ==============================================================
  // ODONTOGRAMA 360° (AMBAS ARCADAS: SUPERIOR E INFERIOR)
  // ==============================================================

  function renderOdontograma() {
    const overlaySuperior = document.getElementById('markersOverlaySuperior');
    const overlayInferior = document.getElementById('markersOverlayInferior');

    if (!overlaySuperior || !overlayInferior) return;
    overlaySuperior.innerHTML = '';
    overlayInferior.innerHTML = '';

    state.odontogram.forEach(d => {
      const mk = document.createElement('div');
      mk.className = `tooth-marker ${d.estado}`;
      mk.style.left = `${d.x}px`;
      mk.style.top = `${d.y}px`;
      mk.textContent = d.id; // Número FDI de la pieza dental
      mk.title = `${d.nombre}: ${d.estado === 'realizado' ? 'Realizado' : 'Pendiente'} (${d.notas || 'Sin notas'})`;
      mk.dataset.id = d.id;

      mk.onclick = () => openToothDetailModal(d);

      if (d.arch === 'superior') {
        overlaySuperior.appendChild(mk);
      } else {
        overlayInferior.appendChild(mk);
      }
    });
  }

  function openToothDetailModal(diente) {
    state.selectedDiente = diente;
    const modal = document.getElementById('toothDetailModal');
    if (!modal) return;

    setText('modalToothName', `${diente.nombre}`);
    setText('modalToothCoord', `Arcada: ${diente.arch.toUpperCase()} | Pieza FDI #${diente.id} | Posición (${diente.x}, ${diente.y})`);

    const selectEstado = document.getElementById('modalToothState');
    if (selectEstado) selectEstado.value = diente.estado;
    const inputNotas = document.getElementById('modalToothNotes');
    if (inputNotas) inputNotas.value = diente.notas || '';

    modal.classList.add('open');
  }

  // ==============================================================
  // CITAS MÉDICAS & AGENDA
  // ==============================================================

  async function renderAppointmentDetails() {
    const p = state.currentPatient;

    let citasFiltradas = state.appointments;
    if (window.StorageAdapter.isAdmin() && state.agendaDoctorFilter) {
      citasFiltradas = await window.StorageAdapter.getCitas(null, state.agendaDoctorFilter);
    }

    const activeCita = (citasFiltradas && citasFiltradas.length > 0) ? citasFiltradas[0] : null;

    if (activeCita) {
      setText('citaSearchDentista', activeCita.dentista);
      setText('citaSearchConsultorio', activeCita.consultorio);
      setText('citaSearchTratamiento', activeCita.siguiente_tratamiento);
      setText('citaSearchCosto', `$${Number(activeCita.costo).toFixed(2)} MXN`);
      setText('citaSearchFechaHora', `${activeCita.fecha} a las ${activeCita.hora} (${activeCita.estado.toUpperCase()})`);

      const cancelBtn = document.getElementById('btnCancelarCita');
      if (cancelBtn) {
        cancelBtn.disabled = (activeCita.estado === 'cancelada');
        cancelBtn.textContent = (activeCita.estado === 'cancelada') ? 'Cita Cancelada' : 'Cancelar Cita';
      }
    } else {
      setText('citaSearchDentista', p ? p.dentista : 'Dr. Ramón');
      setText('citaSearchConsultorio', p ? p.consultorio : '#3');
      setText('citaSearchTratamiento', 'Sin citas programadas');
      setText('citaSearchCosto', '$0.00 MXN');
      setText('citaSearchFechaHora', 'Ninguna');
    }
  }

  // ==============================================================
  // CAJA & FINANZAS (ADMIN)
  // ==============================================================

  function renderPaymentDetails() {
    if (!window.StorageAdapter.isAdmin()) return;

    const p = state.currentPatient;
    if (!p) return;

    setText('payDentista', p.dentista || 'Dr. Ramón');
    setText('payConsultorio', p.consultorio || '#3');
    setText('paySaldoDisplay', `$${Number(p.saldo || 0).toFixed(2)}`);

    const unpaidTreatments = (state.treatments || []).filter(t => !t.pagado);
    const pillsContainer = document.getElementById('payUnpaidPills');
    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      if (unpaidTreatments.length === 0) {
        pillsContainer.innerHTML = '<span class="pill ok"><i></i>Al corriente (Sin adeudos)</span>';
      } else {
        unpaidTreatments.forEach(t => {
          const span = document.createElement('span');
          span.className = 'pill bad';
          span.innerHTML = `<i></i>${t.nombre} ($${t.costo})`;
          pillsContainer.appendChild(span);
        });
      }
    }

    const totalCost = unpaidTreatments.reduce((acc, curr) => acc + Number(curr.costo || 0), 0);
    const costBreakdown = unpaidTreatments.map(t => `$${t.costo}`).join(' + ');
    setText('payCostoCalculo', unpaidTreatments.length > 0 ? `${costBreakdown} = $${totalCost.toFixed(2)}` : '$0.00');

    const btnPagarSaldo = document.getElementById('btnPagarSaldo');
    if (btnPagarSaldo) {
      btnPagarSaldo.disabled = (Number(p.saldo || 0) < totalCost || totalCost === 0);
    }
  }

  async function renderAdminMetrics() {
    if (!window.StorageAdapter.isAdmin()) return;
    const metrics = await window.StorageAdapter.getMetricasFinancieras();
    if (!metrics) return;

    setText('metricTotalCobrado', `$${metrics.totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    setText('metricTotalPendiente', `$${metrics.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    setText('metricCitasHoy', String(metrics.citasHoy));
    setText('metricTotalPacientes', String(metrics.totalPacientes));
  }

  // ==============================================================
  // NAVEGACIÓN ENTRE MÓDULOS & SUB-TABS
  // ==============================================================

  function setupNavigationEvents() {
    // Módulos Principales
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        const mod = btn.dataset.module;
        if (mod === 'pagar' && !window.StorageAdapter.isAdmin()) {
          showToast('Acceso restringido: Módulo exclusivo para Administradores', 'bad');
          return;
        }
        switchModule(mod);
      };
    });

    // Subtabs de Expediente
    const subOption1 = document.getElementById('subtabOption1');
    const subOption2 = document.getElementById('subtabOption2');

    if (subOption1 && subOption2) {
      subOption1.onclick = () => switchSubtab('nuevo');
      subOption2.onclick = () => switchSubtab('buscar');
    }

    // Botones "Ver progreso / Odontograma"
    document.querySelectorAll('.btn-ver-progreso').forEach(btn => {
      btn.onclick = () => switchModule('progreso');
    });

    // Selector rápido de paciente
    const patientSelector = document.getElementById('quickPatientSelector');
    if (patientSelector) {
      patientSelector.onchange = async (e) => {
        await loadPatientData(e.target.value);
        showToast('Paciente activo: ' + (state.currentPatient ? state.currentPatient.nombre : e.target.value));
      };
    }

    // Búsqueda manual de CURP
    const btnBuscarCurp = document.getElementById('btnBuscarCurpInput');
    const inputBuscarCurp = document.getElementById('inputCurpSearch');
    if (btnBuscarCurp && inputBuscarCurp) {
      btnBuscarCurp.onclick = async () => {
        const val = inputBuscarCurp.value.trim().toUpperCase();
        if (!val) {
          showToast('Introduce una CURP válida', 'warn');
          return;
        }
        const found = await window.StorageAdapter.getPaciente(val);
        if (found) {
          if (window.StorageAdapter.isDoctor() && (found.dentista || '').toLowerCase() !== window.StorageAdapter.getCurrentUser().nombre.toLowerCase()) {
            showToast('Acceso restringido: Este paciente pertenece a otro doctor', 'bad');
            return;
          }
          await loadPatientData(val);
          showToast('Paciente encontrado: ' + found.nombre, 'ok');
          inputBuscarCurp.value = '';
        } else {
          showToast('No se encontró paciente con esa CURP', 'bad');
        }
      };
    }
  }

  function switchModule(moduleName) {
    state.currentModule = moduleName;

    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.module === moduleName);
    });

    document.querySelectorAll('.module-content-pane').forEach(pane => {
      pane.style.display = (pane.dataset.module === moduleName) ? 'block' : 'none';
    });

    const subbar = document.querySelector('.module-subbar');
    const subtabs = document.getElementById('dynamicSubtabs');
    if (subtabs) {
      subtabs.style.display = (moduleName === 'control') ? 'flex' : 'none';
    }

    if (moduleName === 'progreso') renderOdontograma();
    if (moduleName === 'agendar') renderAppointmentDetails();
    if (moduleName === 'pagar') {
      renderPaymentDetails();
      renderAdminMetrics();
    }
  }

  function switchSubtab(subtabName) {
    const sub1 = document.getElementById('subtabOption1');
    const sub2 = document.getElementById('subtabOption2');
    if (sub1 && sub2) {
      sub1.classList.toggle('on', subtabName === 'nuevo');
      sub2.classList.toggle('on', subtabName === 'buscar');
    }

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.style.display = (pane.dataset.subtab === subtabName) ? 'block' : 'none';
    });
  }

  // ==============================================================
  // FORMULARIOS & ACCIONES CLÍNICAS
  // ==============================================================

  function setupFormEvents() {
    // Formulario Registrar Paciente
    const formNuevoPaciente = document.getElementById('formNuevoPaciente');
    if (formNuevoPaciente) {
      formNuevoPaciente.onsubmit = async (e) => {
        e.preventDefault();
        const curpVal = document.getElementById('inpCurp').value.trim().toUpperCase();
        const nombreVal = document.getElementById('inpNombre').value.trim();

        if (!curpVal || curpVal.length < 10) {
          showToast('Introduce una CURP válida (mínimo 10 caracteres)', 'warn');
          return;
        }

        const currentUser = window.StorageAdapter.getCurrentUser();
        const dentistaVal = window.StorageAdapter.isDoctor() 
          ? currentUser.nombre 
          : (document.getElementById('inpDentistaSelect').value || 'Dr. Ramón');

        const consultorioVal = window.StorageAdapter.isDoctor()
          ? currentUser.consultorio
          : (document.getElementById('inpConsultorio').value || '#3');

        const nuevo = {
          curp: curpVal,
          nombre: nombreVal,
          edad: Number(document.getElementById('inpEdad').value) || 0,
          telefono: document.getElementById('inpTelefono').value.trim(),
          correo: document.getElementById('inpCorreo').value.trim(),
          direccion: document.getElementById('inpDireccion').value.trim(),
          nss: document.getElementById('inpNss').value.trim(),
          dentista: dentistaVal,
          consultorio: consultorioVal,
          saldo: 0.00
        };

        await window.StorageAdapter.savePaciente(nuevo);
        showToast('¡Paciente registrado con éxito!', 'ok');
        formNuevoPaciente.reset();

        await loadPatientData(curpVal);
        switchSubtab('buscar');
      };
    }

    // Formulario Agendar Cita
    const formNuevaCita = document.getElementById('formNuevaCita');
    if (formNuevaCita) {
      formNuevaCita.onsubmit = async (e) => {
        e.preventDefault();
        if (!state.currentCurp) {
          showToast('Selecciona un paciente primero', 'warn');
          return;
        }

        const currentUser = window.StorageAdapter.getCurrentUser();
        const dentistaVal = window.StorageAdapter.isDoctor()
          ? currentUser.nombre
          : (document.getElementById('citaDentistaSelect').value || 'Dr. Ramón');

        const consultorioVal = window.StorageAdapter.isDoctor()
          ? currentUser.consultorio
          : (document.getElementById('citaConsultorioInp').value || '#3');

        const nuevaCita = {
          curp_paciente: state.currentCurp,
          paciente_nombre: state.currentPatient ? state.currentPatient.nombre : '',
          dentista: dentistaVal,
          consultorio: consultorioVal,
          siguiente_tratamiento: document.getElementById('citaTratamientoInp').value.trim() || 'Consulta general',
          costo: Number(document.getElementById('citaCostoInp').value) || 0,
          fecha: document.getElementById('citaFechaInp').value || new Date().toISOString().split('T')[0],
          hora: document.getElementById('citaHoraInp').value || '10:00 AM',
          estado: 'agendada'
        };

        await window.StorageAdapter.saveCita(nuevaCita);
        showToast('¡Cita agendada exitosamente!', 'ok');

        await window.StorageAdapter.addTratamiento({
          curp_paciente: state.currentCurp,
          nombre: nuevaCita.siguiente_tratamiento,
          costo: nuevaCita.costo,
          realizado: false,
          pagado: false,
          fecha: nuevaCita.fecha,
          dentista: nuevaCita.dentista
        });

        await loadPatientData(state.currentCurp);
      };
    }

    // Cancelar Cita
    const btnCancelarCita = document.getElementById('btnCancelarCita');
    if (btnCancelarCita) {
      btnCancelarCita.onclick = async () => {
        if (!state.appointments || state.appointments.length === 0) return;
        const c = state.appointments[0];
        if (confirm(`¿Cancelar la cita para ${c.siguiente_tratamiento}?`)) {
          await window.StorageAdapter.updateEstadoCita(c.id, 'cancelada');
          showToast('Cita cancelada correctamente', 'ok');
          await loadPatientData(state.currentCurp);
        }
      };
    }

    // Ir a Pagar desde Cita
    const btnIrAPagarCita = document.getElementById('btnIrAPagarCita');
    if (btnIrAPagarCita) {
      btnIrAPagarCita.onclick = () => {
        if (!window.StorageAdapter.isAdmin()) {
          showToast('Solo el Administrador puede procesar cobros', 'bad');
          return;
        }
        switchModule('pagar');
      };
    }

    // Botones de Cobro / Caja (Admin)
    const btnPagarSaldo = document.getElementById('btnPagarSaldo');
    const btnPagarFisico = document.getElementById('btnPagarFisico');
    const btnPagarDespues = document.getElementById('btnPagarDespues');

    async function ejecutarPago(metodo) {
      if (!window.StorageAdapter.isAdmin()) {
        showToast('Permiso denegado: Función exclusiva para Administración', 'bad');
        return;
      }

      const unpaid = (state.treatments || []).filter(t => !t.pagado);
      if (unpaid.length === 0 && metodo !== 'despues') {
        showToast('El paciente no tiene adeudos pendientes', 'ok');
        return;
      }

      const montoTotal = unpaid.reduce((a, b) => a + Number(b.costo || 0), 0);
      const ids = unpaid.map(u => u.id);

      try {
        const res = await window.StorageAdapter.procesarPago(state.currentCurp, montoTotal, metodo, ids);
        showToast(res.message, 'ok');
        await loadPatientData(state.currentCurp);
        await renderAdminMetrics();
      } catch (err) {
        showToast(err.message, 'bad');
      }
    }

    if (btnPagarSaldo) btnPagarSaldo.onclick = () => ejecutarPago('saldo');
    if (btnPagarFisico) btnPagarFisico.onclick = () => ejecutarPago('fisico');
    if (btnPagarDespues) btnPagarDespues.onclick = () => ejecutarPago('despues');

    // Modal de Diente: Guardar diagnóstico
    const btnGuardarDiente = document.getElementById('btnSaveToothModal');
    if (btnGuardarDiente) {
      btnGuardarDiente.onclick = async () => {
        if (!state.selectedDiente) return;
        const nuevoEstado = document.getElementById('modalToothState').value;
        const nuevasNotas = document.getElementById('modalToothNotes').value;

        await window.StorageAdapter.updateDiente(
          state.currentCurp,
          state.selectedDiente.id,
          nuevoEstado,
          nuevasNotas
        );

        showToast(`${state.selectedDiente.nombre} actualizada`, 'ok');
        document.getElementById('toothDetailModal').classList.remove('open');
        await loadPatientData(state.currentCurp);
      };
    }

    // Modal de Diente: Cerrar
    const btnCloseTooth = document.getElementById('btnCloseToothModal');
    const btnCancelTooth = document.getElementById('btnCancelToothModal');
    [btnCloseTooth, btnCancelTooth].forEach(b => {
      if (b) b.onclick = () => document.getElementById('toothDetailModal').classList.remove('open');
    });
  }

  // ==============================================================
  // CONFIGURACIÓN SUPABASE & MODAL
  // ==============================================================

  function updateDbStatusBadge() {
    const badge = document.getElementById('dbStatusBadge');
    if (!badge) return;

    if (window.StorageAdapter && window.StorageAdapter.isCloudConnected()) {
      badge.className = 'db-status-pill cloud';
      badge.innerHTML = '<span class="status-dot"></span> Supabase Cloud';
    } else {
      badge.className = 'db-status-pill';
      badge.innerHTML = '<span class="status-dot"></span> Modo Local';
    }
  }

  function setupDbModalEvents() {
    const modal = document.getElementById('dbConfigModal');
    const badge = document.getElementById('dbStatusBadge');
    const closeBtn = document.getElementById('btnCloseDbModal');

    if (badge && modal) {
      badge.onclick = () => {
        const cfg = window.StorageAdapter.loadConfig();
        const urlInp = document.getElementById('dbSupabaseUrl');
        const keyInp = document.getElementById('dbSupabaseKey');
        if (urlInp) urlInp.value = cfg.supabaseUrl || '';
        if (keyInp) keyInp.value = cfg.supabaseKey || '';
        modal.classList.add('open');
      };
    }

    if (closeBtn && modal) {
      closeBtn.onclick = () => modal.classList.remove('open');
    }

    // Probar conexión
    const btnTest = document.getElementById('btnTestSupabase');
    if (btnTest) {
      btnTest.onclick = async () => {
        const url = document.getElementById('dbSupabaseUrl').value.trim();
        const key = document.getElementById('dbSupabaseKey').value.trim();
        if (!url || !key) {
          showToast('Introduce la URL y Anon Key', 'warn');
          return;
        }
        btnTest.disabled = true;
        btnTest.textContent = 'Probando...';
        const res = await window.StorageAdapter.testConnection(url, key);
        btnTest.disabled = false;
        btnTest.textContent = 'Probar Conexión';

        if (res.success) {
          showToast(res.message, 'ok');
        } else {
          showToast('Error de conexión: ' + res.error, 'bad');
        }
      };
    }

    // Guardar credenciales
    const btnSaveDb = document.getElementById('btnSaveDbConfig');
    if (btnSaveDb) {
      btnSaveDb.onclick = async () => {
        const url = document.getElementById('dbSupabaseUrl').value.trim();
        const key = document.getElementById('dbSupabaseKey').value.trim();

        window.StorageAdapter.saveConfig({
          supabaseUrl: url,
          supabaseKey: key,
          activeBackend: (url && key) ? 'supabase' : 'local'
        });

        updateDbStatusBadge();
        showToast('Credenciales guardadas', 'ok');
        modal.classList.remove('open');
        await loadPatientData(state.currentCurp);
      };
    }

    // Modo local
    const btnUseLocal = document.getElementById('btnUseLocalDb');
    if (btnUseLocal) {
      btnUseLocal.onclick = async () => {
        window.StorageAdapter.saveConfig({
          supabaseUrl: '',
          supabaseKey: '',
          activeBackend: 'local'
        });
        updateDbStatusBadge();
        showToast('Modo Local activado', 'ok');
        modal.classList.remove('open');
        await loadPatientData(state.currentCurp);
      };
    }

    // Exportar JSON
    const btnExport = document.getElementById('btnExportJson');
    if (btnExport) {
      btnExport.onclick = () => {
        const json = window.StorageAdapter.exportDataJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dentalcare_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Copia de seguridad descargada', 'ok');
      };
    }

    // Reset Demo
    const btnReset = document.getElementById('btnResetDemoData');
    if (btnReset) {
      btnReset.onclick = async () => {
        if (confirm('¿Restablecer datos clínicos iniciales?')) {
          window.StorageAdapter.resetDemoData();
          showToast('Datos de muestra restablecidos', 'ok');
          modal.classList.remove('open');
          await loadPatientData('MORG850912HMCRRL01');
        }
      };
    }
  }

  // ==============================================================
  // HELPERS
  // ==============================================================

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showToast(msg, type = 'ok') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-pill ${type}`;
    toast.textContent = msg;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
});

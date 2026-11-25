/**
 * app.js - Lógica interactiva de la aplicación Control Paciente Dental
 * Incluye Sistema de Autenticación, RBAC (Admin vs Doctor) y Sincronización Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Estado global de la aplicación
  const state = {
    currentModule: 'control', // 'control' | 'progreso' | 'agendar' | 'pagar'
    currentTab: {
      control: 'nuevo',       // 'nuevo' | 'buscar'
      progreso: 'actual',     // 'actual' | 'actualizar'
      agendar: 'nueva',       // 'nueva' | 'buscar'
      pagar: 'buscar'         // 'buscar'
    },
    currentCurp: null,
    currentPatient: null,
    treatments: [],
    odontogram: [],
    appointments: [],
    selectedDiente: null,
    agendaDoctorFilter: ''
  };

  // Inicializar fecha en header
  updateHeaderDate();

  // Configurar eventos de autenticación
  setupAuthEvents();

  // Escuchar modal de configuración de BD
  setupDbModalEvents();

  // Comprobar sesión actual
  checkUserSession();

  // ===================== CONTROL DE SESIÓN Y RBAC =====================

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
    // 1. Actualizar Badge de Perfil en Header
    const avatarEl = document.getElementById('headerUserAvatar');
    const nameEl = document.getElementById('headerUserName');
    const roleTagEl = document.getElementById('headerRoleTag');

    if (avatarEl) avatarEl.textContent = user.nombre.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.nombre;
    if (roleTagEl) {
      roleTagEl.textContent = user.rol.toUpperCase();
      roleTagEl.className = `role-tag ${user.rol}`;
    }

    // 2. Control de Acceso: Doctor vs Admin
    const navBtnPagar = document.getElementById('navBtnPagar');
    const doctorBanner = document.getElementById('doctorNoticeBanner');
    const bannerConsultorio = document.getElementById('bannerDocConsultorio');
    const adminAgendaBox = document.getElementById('adminAgendaFilterBox');

    if (window.StorageAdapter.isDoctor()) {
      // DOCTOR: Restringir pagos
      if (navBtnPagar) navBtnPagar.classList.add('restricted');
      if (doctorBanner) doctorBanner.style.display = 'flex';
      if (bannerConsultorio) bannerConsultorio.textContent = user.consultorio || '#3';
      if (adminAgendaBox) adminAgendaBox.style.display = 'none';

      // Si estaba en módulo pagar, forzar cambio a control
      if (state.currentModule === 'pagar') {
        switchModule('control');
      }
    } else {
      // ADMINISTRADOR: Acceso total
      if (navBtnPagar) navBtnPagar.classList.remove('restricted');
      if (doctorBanner) doctorBanner.style.display = 'none';
      if (adminAgendaBox) adminAgendaBox.style.display = 'flex';
      populateAgendaDoctorFilter();
    }

    // 3. Poblar selectores de doctores en formularios
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

    // Sincronizar consultorio automático
    const inpConsultorio = document.getElementById('inpConsultorio');
    const citaConsultorio = document.getElementById('citaConsultorioInp');

    if (isDoc) {
      if (inpConsultorio) {
        inpConsultorio.value = user.consultorio || '#3';
        inpConsultorio.readOnly = true;
      }
      if (citaConsultorio) {
        citaConsultorio.value = user.consultorio || '#3';
        citaConsultorio.readOnly = true;
      }
    } else {
      if (inpConsultorio) inpConsultorio.readOnly = false;
      if (citaConsultorio) citaConsultorio.readOnly = false;

      if (inpSelect) {
        inpSelect.addEventListener('change', (e) => {
          const d = doctores.find(doc => doc.nombre === e.target.value);
          if (d && inpConsultorio) inpConsultorio.value = d.consultorio || '#3';
        });
      }
      if (citaSelect) {
        citaSelect.addEventListener('change', (e) => {
          const d = doctores.find(doc => doc.nombre === e.target.value);
          if (d && citaConsultorio) citaConsultorio.value = d.consultorio || '#3';
        });
      }
    }
  }

  function populateAgendaDoctorFilter() {
    const filterSelect = document.getElementById('filterAgendaDoctorSelect');
    if (!filterSelect) return;

    const doctores = window.StorageAdapter.getDoctores();
    filterSelect.innerHTML = '<option value="">Todos los doctores</option>';
    doctores.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.nombre;
      opt.textContent = `${doc.nombre} (${doc.consultorio})`;
      filterSelect.appendChild(opt);
    });

    filterSelect.addEventListener('change', async (e) => {
      state.agendaDoctorFilter = e.target.value;
      await renderAppointmentDetails();
    });
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

    // Escuchar eventos de navegación
    setupNavigationEvents();

    // Escuchar formularios y botones de acción
    setupFormEvents();

    // Actualizar métricas si es admin
    if (window.StorageAdapter.isAdmin()) {
      await renderAdminMetrics();
    }
  }

  // ===================== EVENTOS DE AUTENTICACIÓN =====================

  function setupAuthEvents() {
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
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
      });
    }

    // Botones de acceso rápido (Demo)
    document.querySelectorAll('.quick-pill-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        const pass = btn.dataset.pass;
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = pass;

        const res = await window.StorageAdapter.login(email, pass);
        if (res.success) {
          showToast(`Acceso exitoso como ${res.user.rol.toUpperCase()}: ${res.user.nombre}`, 'ok');
          checkUserSession();
        } else {
          showToast(res.error, 'bad');
        }
      });
    });

    // Cerrar sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('¿Deseas cerrar tu sesión?')) {
          window.StorageAdapter.logout();
          showToast('Sesión finalizada', 'ok');
          checkUserSession();
        }
      });
    }
  }

  // ===================== FUNCIONES DE RENDER =====================

  function updateHeaderDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;
    document.querySelectorAll('.live-date').forEach(el => {
      el.textContent = dateFormatted;
    });
  }

  function updateDbStatusBadge() {
    const badge = document.getElementById('dbStatusBadge');
    if (!badge) return;

    if (window.StorageAdapter && window.StorageAdapter.isCloudConnected()) {
      badge.className = 'db-badge cloud';
      badge.innerHTML = '<span class="status-dot"></span> Supabase Conectado';
    } else {
      badge.className = 'db-badge local';
      badge.innerHTML = '<span class="status-dot"></span> Modo Local / Demo';
    }
  }

  async function loadPatientData(curp) {
    if (!curp) return;
    state.currentCurp = curp.toUpperCase();

    // Actualizar badges de CURP en todos los módulos
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
    const listContainers = document.querySelectorAll('.historial-list-container');
    listContainers.forEach(container => {
      container.innerHTML = '';
      if (!state.treatments || state.treatments.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#6B8590;font-size:14px">Sin historial clínico registrado</div>';
        return;
      }

      state.treatments.forEach((t) => {
        const row = document.createElement('div');
        row.className = 'hist-r';

        const realizadoPill = t.realizado 
          ? '<span class="pill ok"><i></i>Realizado</span>' 
          : '<span class="pill warn"><i></i>No realizado</span>';

        const pagadoPill = t.pagado 
          ? '<span class="pill ok"><i></i>Pagado</span>' 
          : '<span class="pill bad"><i></i>No pagado</span>';

        row.innerHTML = `
          <div class="n">${t.nombre}</div>
          <div class="p">
            ${realizadoPill}
            ${pagadoPill}
          </div>
        `;
        container.appendChild(row);
      });
    });
  }

  function renderOdontograma() {
    const containerActual = document.getElementById('odontogramMarkersContainer');
    const containerUpdate = document.getElementById('odontogramUpdateMarkers');

    // 1. Render en Modo Actual
    if (containerActual) {
      containerActual.innerHTML = '';
      state.odontogram.forEach(d => {
        const mk = document.createElement('div');
        mk.className = 'mk';
        mk.style.left = `${d.x}px`;
        mk.style.top = `${d.y}px`;
        mk.title = `${d.nombre}: ${d.estado} (${d.notas || 'Sin notas'})`;
        mk.dataset.id = d.id;
        mk.style.background = (d.estado === 'realizado') ? '#2FB380' : '#F6A93B';

        mk.addEventListener('click', () => {
          openToothDetailModal(d);
        });
        containerActual.appendChild(mk);
      });
    }

    // 2. Render en Modo Actualizar (Split interactivo)
    if (containerUpdate) {
      containerUpdate.innerHTML = '';
      state.odontogram.forEach(d => {
        const mk = document.createElement('div');
        mk.className = 'mk';
        mk.style.left = `${d.x}px`;
        mk.style.top = `${d.y}px`;
        mk.title = `Clic para editar: ${d.nombre}`;
        mk.dataset.id = d.id;
        mk.innerHTML = `<s style="background:#2FB380"></s><s style="background:#F6A93B"></s>`;

        mk.addEventListener('click', () => {
          openToothDetailModal(d);
        });
        containerUpdate.appendChild(mk);
      });
    }
  }

  function openToothDetailModal(diente) {
    state.selectedDiente = diente;
    const modal = document.getElementById('toothDetailModal');
    if (!modal) return;

    setText('modalToothName', diente.nombre);
    setText('modalToothCoord', `Pieza #${diente.id} | Posición clínica: (${diente.x}, ${diente.y})`);
    const selectEstado = document.getElementById('modalToothState');
    if (selectEstado) selectEstado.value = diente.estado;
    const inputNotas = document.getElementById('modalToothNotes');
    if (inputNotas) inputNotas.value = diente.notas || '';

    modal.classList.add('open');
  }

  async function renderAppointmentDetails() {
    const p = state.currentPatient;

    // Obtener citas según el filtro si es admin
    let citasFiltradas = state.appointments;
    if (window.StorageAdapter.isAdmin() && state.agendaDoctorFilter) {
      citasFiltradas = await window.StorageAdapter.getCitas(null, state.agendaDoctorFilter);
    }

    const activeCita = (citasFiltradas && citasFiltradas.length > 0)
      ? citasFiltradas[0]
      : null;

    if (activeCita) {
      setText('citaSearchDentista', activeCita.dentista);
      setText('citaSearchConsultorio', activeCita.consultorio);
      setText('citaSearchTratamiento', activeCita.siguiente_tratamiento);
      setText('citaSearchCosto', `$${Number(activeCita.costo).toFixed(2)} MXN`);
      setText('citaSearchFechaHora', `${activeCita.fecha} a las ${activeCita.hora} (${activeCita.estado.toUpperCase()})`);

      const cancelBtn = document.getElementById('btnCancelarCita');
      if (cancelBtn) {
        cancelBtn.disabled = (activeCita.estado === 'cancelada');
        cancelBtn.textContent = (activeCita.estado === 'cancelada') ? 'Cita Cancelada' : 'Cancelar cita';
      }
    } else {
      setText('citaSearchDentista', p ? p.dentista : 'Dr. Ramón');
      setText('citaSearchConsultorio', p ? p.consultorio : '#3');
      setText('citaSearchTratamiento', 'Sin cita programada');
      setText('citaSearchCosto', '$0.00');
      setText('citaSearchFechaHora', 'Ninguna');
    }
  }

  function renderPaymentDetails() {
    if (!window.StorageAdapter.isAdmin()) return;

    const p = state.currentPatient;
    if (!p) return;

    setText('payDentista', p.dentista || 'Dr. Ramón');
    setText('payConsultorio', p.consultorio || '#3');
    setText('paySaldoDisplay', `$${Number(p.saldo || 0).toFixed(2)}`);

    // Citas / Tratamientos sin pagar
    const unpaidTreatments = (state.treatments || []).filter(t => !t.pagado);
    const pillsContainer = document.getElementById('payUnpaidPills');
    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      if (unpaidTreatments.length === 0) {
        pillsContainer.innerHTML = '<span class="pill ok"><i></i>Al corriente (Sin deudas pendientes)</span>';
      } else {
        unpaidTreatments.forEach(t => {
          const span = document.createElement('span');
          span.className = 'pill bad';
          span.innerHTML = `<i></i>${t.nombre} ($${t.costo})`;
          pillsContainer.appendChild(span);
        });
      }
    }

    // Costo total pendiente
    const totalCost = unpaidTreatments.reduce((acc, curr) => acc + Number(curr.costo || 0), 0);
    const costBreakdown = unpaidTreatments.map(t => `$${t.costo}`).join(' + ');
    setText('payCostoCalculo', unpaidTreatments.length > 0 ? `${costBreakdown} = $${totalCost.toFixed(2)}` : '$0.00');

    // Deshabilitar botón de pagar saldo si no alcanza o no hay deuda
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

  // ===================== EVENTOS DE NAVEGACIÓN =====================

  function setupNavigationEvents() {
    // Menú principal de módulos
    document.querySelectorAll('.main-nav-btn').forEach(btn => {
      btn.onclick = () => {
        const targetModule = btn.dataset.module;
        if (targetModule === 'pagar' && !window.StorageAdapter.isAdmin()) {
          showToast('Acceso restringido: Módulo exclusivo para Administradores', 'bad');
          return;
        }
        switchModule(targetModule);
      };
    });

    // Sub-pestañas dentro de cada módulo
    document.querySelectorAll('.sub-tab').forEach(tab => {
      tab.onclick = () => {
        const mod = tab.dataset.module;
        const targetTab = tab.dataset.tab;
        switchTab(mod, targetTab);
      };
    });

    // Botones "Ver progreso →"
    document.querySelectorAll('.btn-ver-progreso').forEach(btn => {
      btn.onclick = () => {
        switchModule('progreso');
        switchTab('progreso', 'actual');
      };
    });

    // Selector rápido de paciente
    const patientSelector = document.getElementById('quickPatientSelector');
    if (patientSelector) {
      patientSelector.onchange = async (e) => {
        await loadPatientData(e.target.value);
        showToast('Paciente seleccionado: ' + (state.currentPatient ? state.currentPatient.nombre : e.target.value));
      };
    }

    // Botón de búsqueda manual de CURP
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
          // Si es doctor, verificar si es su paciente
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

    // Actualizar botones de navegación principal
    document.querySelectorAll('.main-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.module === moduleName);
    });

    // Mostrar sección correspondiente
    document.querySelectorAll('.module-section').forEach(sec => {
      sec.style.display = (sec.dataset.module === moduleName) ? 'block' : 'none';
    });

    // Título dinámico
    const titles = {
      control: 'Control paciente',
      progreso: 'Progreso clínico y odontograma',
      agendar: 'Agendar cita médica',
      pagar: 'Caja y cobranza'
    };
    setText('headerModuleTitle', titles[moduleName] || 'Control paciente');

    // Refrescar vistas pertinentes
    if (moduleName === 'progreso') renderOdontograma();
    if (moduleName === 'agendar') renderAppointmentDetails();
    if (moduleName === 'pagar') {
      renderPaymentDetails();
      renderAdminMetrics();
    }
  }

  function switchTab(mod, tabName) {
    state.currentTab[mod] = tabName;

    document.querySelectorAll(`.sub-tab[data-module="${mod}"]`).forEach(t => {
      t.classList.toggle('on', t.dataset.tab === tabName);
    });

    document.querySelectorAll(`.tab-view[data-module="${mod}"]`).forEach(v => {
      v.style.display = (v.dataset.tab === tabName) ? 'flex' : 'none';
    });

    if (mod === 'progreso') renderOdontograma();
  }

  // ===================== FORMULARIOS Y ACCIONES =====================

  function setupFormEvents() {
    // Formulario Nuevo Paciente
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
        if (!nombreVal) {
          showToast('El nombre del paciente es obligatorio', 'warn');
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

        // Cambiar a vista de buscar paciente del nuevo paciente registrado
        await loadPatientData(curpVal);
        switchTab('control', 'buscar');
      };
    }

    // Formulario Agendar Cita
    const formNuevaCita = document.getElementById('formNuevaCita');
    if (formNuevaCita) {
      formNuevaCita.onsubmit = async (e) => {
        e.preventDefault();
        if (!state.currentCurp) {
          showToast('Selecciona o busca un paciente primero', 'warn');
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

        // Agregar también tratamiento pendiente para historial clínico
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
        switchTab('agendar', 'buscar');
      };
    }

    // Cancelar cita
    const btnCancelarCita = document.getElementById('btnCancelarCita');
    if (btnCancelarCita) {
      btnCancelarCita.onclick = async () => {
        if (!state.appointments || state.appointments.length === 0) return;
        const c = state.appointments[0];
        if (confirm(`¿Estás seguro de cancelar la cita para ${c.siguiente_tratamiento}?`)) {
          await window.StorageAdapter.updateEstadoCita(c.id, 'cancelada');
          showToast('Cita cancelada correctamente', 'ok');
          await loadPatientData(state.currentCurp);
        }
      };
    }

    // Botón "Pagar cita" en Módulo Agendar
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

    // Botones de pago en Módulo Pagar Cita (Exclusivo Admin)
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

    // Modal de Diente: Guardar cambios
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

        showToast(`Pieza dental ${state.selectedDiente.nombre} actualizada`, 'ok');
        document.getElementById('toothDetailModal').classList.remove('open');
        await loadPatientData(state.currentCurp);
      };
    }

    // Modal de Diente: Cerrar
    const btnCloseTooth = document.getElementById('btnCloseToothModal');
    if (btnCloseTooth) {
      btnCloseTooth.onclick = () => {
        document.getElementById('toothDetailModal').classList.remove('open');
      };
    }
  }

  // ===================== MODAL DE CONFIGURACIÓN DE BD =====================

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
      closeBtn.onclick = () => {
        modal.classList.remove('open');
      };
    }

    // Probar conexión a Supabase
    const btnTest = document.getElementById('btnTestSupabase');
    if (btnTest) {
      btnTest.onclick = async () => {
        const url = document.getElementById('dbSupabaseUrl').value.trim();
        const key = document.getElementById('dbSupabaseKey').value.trim();
        if (!url || !key) {
          showToast('Introduce tanto la URL como la Anon Key de Supabase', 'warn');
          return;
        }
        btnTest.disabled = true;
        btnTest.textContent = 'Probando conexión...';
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

    // Guardar configuración Supabase
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
        showToast('Configuración de base de datos guardada', 'ok');
        modal.classList.remove('open');
        await loadPatientData(state.currentCurp);
      };
    }

    // Desconectar / Usar Modo Local
    const btnUseLocal = document.getElementById('btnUseLocalDb');
    if (btnUseLocal) {
      btnUseLocal.onclick = async () => {
        window.StorageAdapter.saveConfig({
          supabaseUrl: '',
          supabaseKey: '',
          activeBackend: 'local'
        });
        updateDbStatusBadge();
        showToast('Modo Local / Demo activado', 'ok');
        modal.classList.remove('open');
        await loadPatientData(state.currentCurp);
      };
    }

    // Exportar Datos JSON
    const btnExport = document.getElementById('btnExportJson');
    if (btnExport) {
      btnExport.onclick = () => {
        const json = window.StorageAdapter.exportDataJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `control_pacientes_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Copia de seguridad descargada', 'ok');
      };
    }

    // Importar Datos JSON
    const inpImport = document.getElementById('inputImportJson');
    if (inpImport) {
      inpImport.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const success = window.StorageAdapter.importDataJson(evt.target.result);
          if (success) {
            showToast('Datos importados con éxito', 'ok');
            await loadPatientData(state.currentCurp);
            modal.classList.remove('open');
          } else {
            showToast('Archivo JSON inválido o corrupto', 'bad');
          }
        };
        reader.readAsText(file);
      };
    }

    // Reset Demo Data
    const btnReset = document.getElementById('btnResetDemoData');
    if (btnReset) {
      btnReset.onclick = async () => {
        if (confirm('¿Restablecer datos de muestra? Se sobrescribirán los cambios locales.')) {
          window.StorageAdapter.resetDemoData();
          showToast('Datos de muestra restablecidos', 'ok');
          modal.classList.remove('open');
          await loadPatientData('MORG850912HMCRRL01');
        }
      };
    }
  }

  // ===================== HELPERS =====================

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showToast(msg, type = 'ok') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.textContent = msg;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
});

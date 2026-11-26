/**
 * app.js - Lógica Integral DentalCare Pro
 * Vistas Totalmente Diferenciadas: Panel de Control Administrativo vs Estación Clínica del Doctor
 * Diseño 100% Responsive, Acordeón Deslizable de Expedientes y Odontograma Proporcional
 */

document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    currentUser: null,
    currentCurp: null,
    currentPatient: null,
    activeAdminDoctorFilter: 'all',
    selectedDiente: null
  };

  // Inicializar autenticación y comprobar sesión
  setupAuthEvents();
  setupDbModalEvents();
  checkUserSession();

  // ==============================================================
  // 1. SESIÓN Y CONTROL DE ACCESO (ADMIN VS DOCTOR)
  // ==============================================================

  function checkUserSession() {
    state.currentUser = window.StorageAdapter.getCurrentUser();
    const loginSec = document.getElementById('loginSection');
    const mainAppSec = document.getElementById('mainAppSection');
    const adminView = document.getElementById('adminViewContainer');
    const doctorView = document.getElementById('doctorViewContainer');

    if (!state.currentUser) {
      if (loginSec) loginSec.style.display = 'flex';
      if (mainAppSec) mainAppSec.style.display = 'none';
      return;
    }

    if (loginSec) loginSec.style.display = 'none';
    if (mainAppSec) mainAppSec.style.display = 'block';

    // Renderizar Badge de Usuario en Header
    const avatarEl = document.getElementById('headerUserAvatar');
    const nameEl = document.getElementById('headerUserName');
    const roleTagEl = document.getElementById('headerRoleTag');
    const brandIcon = document.getElementById('headerBrandIcon');
    const mainTitle = document.getElementById('headerMainTitle');
    const subTitle = document.getElementById('headerSubTitle');

    if (avatarEl) {
      avatarEl.textContent = state.currentUser.nombre.charAt(0).toUpperCase();
      avatarEl.className = `user-avatar-circle ${state.currentUser.rol === 'admin' ? 'admin-avatar' : ''}`;
    }
    if (nameEl) nameEl.textContent = state.currentUser.nombre;
    if (roleTagEl) {
      roleTagEl.textContent = state.currentUser.rol.toUpperCase();
      roleTagEl.className = `role ${state.currentUser.rol}`;
    }

    if (state.currentUser.rol === 'admin') {
      // MODO ADMINISTRADOR: PANEL DE CONTROL EJECUTIVO
      if (adminView) adminView.style.display = 'flex';
      if (doctorView) doctorView.style.display = 'none';
      if (brandIcon) brandIcon.className = 'brand-icon admin-theme';
      if (mainTitle) mainTitle.textContent = 'Panel de Control';
      if (subTitle) subTitle.textContent = 'DIRECCIÓN GENERAL & ADMINISTRACIÓN';

      initAdminDashboard();
    } else {
      // MODO DOCTOR: ESTACIÓN CLÍNICA DENTAL
      if (adminView) adminView.style.display = 'none';
      if (doctorView) doctorView.style.display = 'flex';
      if (brandIcon) brandIcon.className = 'brand-icon';
      if (mainTitle) mainTitle.textContent = 'DentalCare Pro';
      if (subTitle) subTitle.textContent = `CONSULTORIO ${state.currentUser.consultorio || '#3'} - ${state.currentUser.especialidad || 'ODONTOLOGÍA'}`;

      // Etiqueta automática en formulario del doctor
      const docAutoInp = document.getElementById('docInpDoctorAuto');
      if (docAutoInp) docAutoInp.value = `${state.currentUser.nombre} (${state.currentUser.consultorio || '#3'})`;

      initDoctorWorkplace();
    }
  }

  // ==============================================================
  // 2. PANEL DE CONTROL ADMINISTRATIVO (ADMIN VIEW)
  // ==============================================================

  async function initAdminDashboard() {
    setupAdminNavigation();
    setupAdminForms();
    await reloadAdminData();
  }

  async function reloadAdminData() {
    const metrics = await window.StorageAdapter.getMetricasFinancieras();
    const allPatients = await window.StorageAdapter.getPacientes(false);
    const allCitas = await window.StorageAdapter.getCitas(null, null);

    // 1. Renderizar KPIs Principales
    if (metrics) {
      setText('adminTotalCobrado', `$${metrics.totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      setText('adminTotalPendiente', `$${metrics.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      setText('adminTotalPacientes', String(metrics.totalPacientes));
      setText('adminCitasHoy', String(metrics.citasHoy));
    }

    // 2. Renderizar Tarjetas de Doctores (Directorio)
    renderAdminDoctorCards(metrics ? metrics.porDoctor : {});

    // 3. Renderizar Tabla de Adeudos Prioritarios
    renderAdminDebtorsTable(allPatients);

    // 4. Renderizar Tabla de Pacientes por Doctor
    renderAdminPatientsTable(allPatients);

    // 5. Renderizar Agenda Global
    renderAdminAgendaTable(allCitas);

    // 6. Poblar selects para caja y citas
    populateAdminSelects(allPatients);
  }

  function renderAdminDoctorCards(porDoctor) {
    const container = document.getElementById('adminDoctorsGrid');
    if (!container) return;
    const doctores = window.StorageAdapter.getDoctores();

    container.innerHTML = '';
    doctores.forEach(doc => {
      const stats = porDoctor[doc.nombre] || { totalPacientes: 0, totalCobrado: 0, totalPendiente: 0, citasHoy: 0 };
      const card = document.createElement('div');
      card.className = 'doctor-team-card';
      const initials = doc.nombre.replace('Dr. ', '').replace('Dra. ', '').substring(0, 2).toUpperCase();
      card.innerHTML = `
        <div class="doctor-badge-avatar">${initials}</div>
        <div class="doc-meta">
          <h3>${doc.nombre}</h3>
          <div class="spec">${doc.especialidad} &middot; Consultorio <strong>${doc.consultorio}</strong></div>
          <div class="doc-stats-mini">
            <div class="stat">
              <span>Pacientes:</span>
              <strong>${stats.totalPacientes}</strong>
            </div>
            <div class="stat">
              <span>Citas Hoy:</span>
              <strong>${stats.citasHoy}</strong>
            </div>
            <div class="stat">
              <span>Pendiente:</span>
              <strong style="color:#DC2626">$ ${stats.totalPendiente.toFixed(0)}</strong>
            </div>
          </div>
          <button type="button" class="btn-action secondary sm btn-filter-doc-patients" data-doctor="${doc.nombre}">
            Ver Pacientes Asignados &rarr;
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-filter-doc-patients').forEach(btn => {
      btn.onclick = () => {
        const docName = btn.dataset.doctor;
        switchAdminTab('pacientes');
        filterAdminPatientsByDoctor(docName);
      };
    });
  }

  async function renderAdminDebtorsTable(patients) {
    const tbody = document.getElementById('tableDebtorsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const local = window.StorageAdapter.getLocalData();
    const treatments = local.tratamientos || [];

    let count = 0;
    for (const p of patients) {
      const unpaid = treatments.filter(t => t.curp_paciente.toUpperCase() === p.curp.toUpperCase() && !t.pagado);
      if (unpaid.length > 0) {
        count++;
        const totalDebt = unpaid.reduce((acc, t) => acc + Number(t.costo || 0), 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${p.nombre}</strong></td>
          <td><span class="pill" style="background:#F1F5F9;color:#334155;font-family:monospace;">${p.curp}</span></td>
          <td><span class="pill ok">${p.dentista}</span></td>
          <td>${p.consultorio}</td>
          <td><strong style="color:#DC2626;">$${totalDebt.toFixed(2)}</strong></td>
          <td>$${Number(p.saldo || 0).toFixed(2)}</td>
          <td>
            <button type="button" class="btn-action indigo sm btn-cobrar-debtor" data-curp="${p.curp}">
              Cobrar en Caja
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    }

    if (count === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#64748B;">No hay pacientes con adeudos pendientes.</td></tr>';
    }

    tbody.querySelectorAll('.btn-cobrar-debtor').forEach(b => {
      b.onclick = () => {
        const curp = b.dataset.curp;
        switchAdminTab('caja');
        const select = document.getElementById('adminCajaPacienteSelect');
        if (select) {
          select.value = curp;
          select.dispatchEvent(new Event('change'));
        }
      };
    });
  }

  function renderAdminPatientsTable(patients) {
    const tbody = document.getElementById('tableAdminPatientsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let list = patients;
    if (state.activeAdminDoctorFilter !== 'all') {
      list = list.filter(p => (p.dentista || '').toLowerCase() === state.activeAdminDoctorFilter.toLowerCase());
    }

    const searchVal = (document.getElementById('searchAdminPatients')?.value || '').trim().toLowerCase();
    if (searchVal) {
      list = list.filter(p => 
        p.nombre.toLowerCase().includes(searchVal) || 
        p.curp.toLowerCase().includes(searchVal) ||
        (p.telefono || '').includes(searchVal)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#64748B;">No se encontraron pacientes para este filtro.</td></tr>';
      return;
    }

    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.nombre}</strong></td>
        <td><span class="pill" style="background:#F1F5F9;font-family:monospace;">${p.curp}</span></td>
        <td>${p.edad ? p.edad + ' años' : '-'} &middot; ${p.telefono || '-'}</td>
        <td><span class="pill ok">${p.dentista}</span></td>
        <td>${p.consultorio}</td>
        <td><strong style="color:#059669;">$${Number(p.saldo || 0).toFixed(2)}</strong></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-action secondary sm btn-inspect-patient" data-curp="${p.curp}" title="Ver Odontograma">
              Odontograma
            </button>
            <button type="button" class="btn-action indigo sm btn-caja-patient" data-curp="${p.curp}" title="Cobrar / Saldo">
              Caja
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-inspect-patient').forEach(b => {
      b.onclick = () => {
        const curp = b.dataset.curp;
        switchAdminTab('expediente');
        const sel = document.getElementById('adminInspectPatientSelect');
        if (sel) {
          sel.value = curp;
          sel.dispatchEvent(new Event('change'));
        }
      };
    });

    tbody.querySelectorAll('.btn-caja-patient').forEach(b => {
      b.onclick = () => {
        const curp = b.dataset.curp;
        switchAdminTab('caja');
        const sel = document.getElementById('adminCajaPacienteSelect');
        if (sel) {
          sel.value = curp;
          sel.dispatchEvent(new Event('change'));
        }
      };
    });
  }

  function renderAdminAgendaTable(citas) {
    const tbody = document.getElementById('tableAdminAgendaBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filterDoc = document.getElementById('filterAdminAgendaDoc')?.value || '';
    let filtered = citas;
    if (filterDoc) {
      filtered = filtered.filter(c => (c.dentista || '').toLowerCase() === filterDoc.toLowerCase());
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748B;">Sin citas programadas para este filtro.</td></tr>';
      return;
    }

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      const pillClass = c.estado === 'completada' ? 'ok' : (c.estado === 'cancelada' ? 'bad' : 'warn');
      tr.innerHTML = `
        <td><strong>${c.fecha}</strong> a las ${c.hora}</td>
        <td>${c.paciente_nombre || c.curp_paciente}</td>
        <td><span class="pill ok">${c.dentista} (${c.consultorio})</span></td>
        <td>${c.siguiente_tratamiento}</td>
        <td><strong>$${Number(c.costo).toFixed(2)}</strong></td>
        <td><span class="pill ${pillClass}"><i></i>${c.estado.toUpperCase()}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function populateAdminSelects(patients) {
    const doctores = window.StorageAdapter.getDoctores();

    const citaPacSel = document.getElementById('adminCitaPacienteSelect');
    const citaDocSel = document.getElementById('adminCitaDoctorSelect');
    const cajaPacSel = document.getElementById('adminCajaPacienteSelect');
    const inspectPacSel = document.getElementById('adminInspectPatientSelect');
    const nuevoPacDocSel = document.getElementById('adminNuevoDoctorSelect');

    [citaPacSel, cajaPacSel, inspectPacSel].forEach(sel => {
      if (!sel) return;
      sel.innerHTML = '';
      patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.curp;
        opt.textContent = `${p.nombre} (${p.dentista} - ${p.curp})`;
        sel.appendChild(opt);
      });
    });

    [citaDocSel, nuevoPacDocSel].forEach(sel => {
      if (!sel) return;
      sel.innerHTML = '';
      doctores.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.nombre;
        opt.textContent = `${d.nombre} (${d.especialidad} - Cons. ${d.consultorio})`;
        sel.appendChild(opt);
      });
    });

    if (cajaPacSel) {
      cajaPacSel.onchange = () => updateAdminCajaView(cajaPacSel.value);
      if (patients.length > 0) updateAdminCajaView(patients[0].curp);
    }

    if (inspectPacSel) {
      inspectPacSel.onchange = () => updateAdminInspectView(inspectPacSel.value);
      if (patients.length > 0) updateAdminInspectView(patients[0].curp);
    }

    if (citaDocSel) {
      citaDocSel.onchange = (e) => {
        const found = doctores.find(d => d.nombre === e.target.value);
        const consInp = document.getElementById('adminCitaConsultorio');
        if (found && consInp) consInp.value = found.consultorio || '#3';
      };
    }

    if (nuevoPacDocSel) {
      nuevoPacDocSel.onchange = (e) => {
        const found = doctores.find(d => d.nombre === e.target.value);
        const consInp = document.getElementById('adminNuevoConsultorio');
        if (found && consInp) consInp.value = found.consultorio || '#3';
      };
    }
  }

  async function updateAdminCajaView(curp) {
    if (!curp) return;
    const p = await window.StorageAdapter.getPaciente(curp);
    if (!p) return;

    setText('adminCajaDoc', p.dentista || 'Dr. Ramón');
    setText('adminCajaCons', p.consultorio || '#3');
    setText('adminCajaCurpVal', p.curp);
    setText('adminCajaSaldoVal', `$${Number(p.saldo || 0).toFixed(2)} MXN`);

    const treatments = await window.StorageAdapter.getTratamientos(p.curp);
    const unpaid = treatments.filter(t => !t.pagado);
    const pillsContainer = document.getElementById('adminCajaTratamientosPills');

    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      if (unpaid.length === 0) {
        pillsContainer.innerHTML = '<span class="pill ok"><i></i>Al corriente (Sin adeudos pendientes)</span>';
      } else {
        unpaid.forEach(t => {
          const pill = document.createElement('span');
          pill.className = 'pill bad';
          pill.innerHTML = `<i></i>${t.nombre} ($${t.costo})`;
          pillsContainer.appendChild(pill);
        });
      }
    }

    const totalDebt = unpaid.reduce((a, b) => a + Number(b.costo || 0), 0);
    setText('adminCajaTotal', `$${totalDebt.toFixed(2)} MXN`);

    const btnSaldo = document.getElementById('btnAdminCobrarSaldo');
    if (btnSaldo) {
      btnSaldo.disabled = (Number(p.saldo || 0) < totalDebt || totalDebt === 0);
    }
  }

  async function updateAdminInspectView(curp) {
    if (!curp) return;
    const p = await window.StorageAdapter.getPaciente(curp);
    if (!p) return;

    setText('adminInspectDoctorBadge', `Doctor Asignado: ${p.dentista} (${p.consultorio})`);
    const odontogram = await window.StorageAdapter.getOdontograma(curp);

    renderArchesToOverlay(
      odontogram,
      document.getElementById('adminMarkersSuperior'),
      document.getElementById('adminMarkersInferior'),
      curp
    );
  }

  function setupAdminNavigation() {
    document.querySelectorAll('.admin-nav-tab').forEach(tab => {
      tab.onclick = () => {
        const target = tab.dataset.tab;
        switchAdminTab(target);
      };
    });

    document.querySelectorAll('.doc-filter-btn').forEach(btn => {
      btn.onclick = () => {
        const filter = btn.dataset.filter;
        filterAdminPatientsByDoctor(filter);
      };
    });

    const searchInp = document.getElementById('searchAdminPatients');
    if (searchInp) {
      searchInp.oninput = async () => {
        const allPatients = await window.StorageAdapter.getPacientes(false);
        renderAdminPatientsTable(allPatients);
      };
    }

    const agendaDocFilter = document.getElementById('filterAdminAgendaDoc');
    if (agendaDocFilter) {
      agendaDocFilter.onchange = async () => {
        const allCitas = await window.StorageAdapter.getCitas(null, null);
        renderAdminAgendaTable(allCitas);
      };
    }

    const btnModalNuevo = document.getElementById('btnAdminNuevoPacienteModal');
    const modalNuevo = document.getElementById('modalAdminNuevoPaciente');
    const btnCloseModal = document.getElementById('btnCloseAdminPacienteModal');
    const btnCancelModal = document.getElementById('btnCancelAdminPacienteModal');

    if (btnModalNuevo && modalNuevo) {
      btnModalNuevo.onclick = () => modalNuevo.classList.add('open');
    }
    [btnCloseModal, btnCancelModal].forEach(b => {
      if (b) b.onclick = () => modalNuevo.classList.remove('open');
    });
  }

  function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });

    document.querySelectorAll('.admin-pane').forEach(p => {
      p.classList.toggle('active', p.id === `pane-${tabName}`);
    });
  }

  function filterAdminPatientsByDoctor(docFilter) {
    state.activeAdminDoctorFilter = docFilter;
    document.querySelectorAll('.doc-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === docFilter);
    });
    const title = document.getElementById('adminPatientsTableTitle');
    if (title) {
      title.textContent = docFilter === 'all' 
        ? 'Lista de Pacientes de la Clínica' 
        : `Pacientes Asignados a ${docFilter}`;
    }
    window.StorageAdapter.getPacientes(false).then(renderAdminPatientsTable);
  }

  function setupAdminForms() {
    const formAdminPaciente = document.getElementById('formAdminNuevoPaciente');
    if (formAdminPaciente) {
      formAdminPaciente.onsubmit = async (e) => {
        e.preventDefault();
        const curpVal = document.getElementById('adminNuevoCurp').value.trim().toUpperCase();
        const nombreVal = document.getElementById('adminNuevoNombre').value.trim();
        const docVal = document.getElementById('adminNuevoDoctorSelect').value;
        const consVal = document.getElementById('adminNuevoConsultorio').value.trim();

        if (!curpVal || curpVal.length < 10) {
          showToast('Introduce una CURP válida', 'warn');
          return;
        }

        const nuevo = {
          curp: curpVal,
          nombre: nombreVal,
          edad: Number(document.getElementById('adminNuevoEdad').value) || 0,
          telefono: document.getElementById('adminNuevoTel').value.trim(),
          correo: '',
          direccion: '',
          nss: '',
          dentista: docVal, // Etiqueta del doctor asignado
          consultorio: consVal,
          saldo: 0.00
        };

        await window.StorageAdapter.savePaciente(nuevo);
        showToast(`Paciente registrado y asignado a ${docVal}`, 'ok');
        formAdminPaciente.reset();
        document.getElementById('modalAdminNuevoPaciente').classList.remove('open');
        await reloadAdminData();
      };
    }

    const formAdminCita = document.getElementById('formAdminNuevaCita');
    if (formAdminCita) {
      formAdminCita.onsubmit = async (e) => {
        e.preventDefault();
        const curpVal = document.getElementById('adminCitaPacienteSelect').value;
        const docVal = document.getElementById('adminCitaDoctorSelect').value;
        const consVal = document.getElementById('adminCitaConsultorio').value.trim();
        const tratVal = document.getElementById('adminCitaTratamiento').value.trim();
        const fechaVal = document.getElementById('adminCitaFecha').value;
        const horaVal = document.getElementById('adminCitaHora').value;
        const costoVal = Number(document.getElementById('adminCitaCosto').value) || 0;

        const paciente = await window.StorageAdapter.getPaciente(curpVal);

        const nuevaCita = {
          curp_paciente: curpVal,
          paciente_nombre: paciente ? paciente.nombre : '',
          dentista: docVal,
          consultorio: consVal,
          siguiente_tratamiento: tratVal,
          costo: costoVal,
          fecha: fechaVal,
          hora: horaVal,
          estado: 'agendada'
        };

        await window.StorageAdapter.saveCita(nuevaCita);
        await window.StorageAdapter.addTratamiento({
          curp_paciente: curpVal,
          nombre: tratVal,
          costo: costoVal,
          realizado: false,
          pagado: false,
          fecha: fechaVal,
          dentista: docVal
        });

        showToast('Cita programada con éxito en agenda', 'ok');
        formAdminCita.reset();
        await reloadAdminData();
      };
    }

    const btnCobrarSaldo = document.getElementById('btnAdminCobrarSaldo');
    const btnCobrarFisico = document.getElementById('btnAdminCobrarFisico');
    const btnPagarDespues = document.getElementById('btnAdminPagarDespues');

    async function ejecutarCobroAdmin(metodo) {
      const curp = document.getElementById('adminCajaPacienteSelect').value;
      if (!curp) return;

      const treatments = await window.StorageAdapter.getTratamientos(curp);
      const unpaid = treatments.filter(t => !t.pagado);

      if (unpaid.length === 0 && metodo !== 'despues') {
        showToast('El paciente no tiene adeudos pendientes', 'ok');
        return;
      }

      const monto = unpaid.reduce((a, b) => a + Number(b.costo || 0), 0);
      const ids = unpaid.map(u => u.id);

      try {
        const res = await window.StorageAdapter.procesarPago(curp, monto, metodo, ids);
        showToast(res.message, 'ok');
        await reloadAdminData();
        await updateAdminCajaView(curp);
      } catch (err) {
        showToast(err.message, 'bad');
      }
    }

    if (btnCobrarSaldo) btnCobrarSaldo.onclick = () => ejecutarCobroAdmin('saldo');
    if (btnCobrarFisico) btnCobrarFisico.onclick = () => ejecutarCobroAdmin('fisico');
    if (btnPagarDespues) btnPagarDespues.onclick = () => ejecutarCobroAdmin('despues');
  }

  // ==============================================================
  // 3. ESTACIÓN CLÍNICA DEL DOCTOR (DOCTOR VIEW & ACORDEÓN)
  // ==============================================================

  async function initDoctorWorkplace() {
    setupDoctorNavigation();
    setupDoctorForms();

    const titleEl = document.getElementById('docClinicalTitle');
    const subEl = document.getElementById('docClinicalSubtitle');
    if (titleEl) {
      titleEl.innerHTML = `
        <svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
        ${state.currentUser.nombre} - Estación de Trabajo Clínica
      `;
    }
    if (subEl) subEl.textContent = `Consultorio ${state.currentUser.consultorio || '#3'} &middot; Especialidad: ${state.currentUser.especialidad || 'Odontología'}`;

    await reloadDoctorData();
  }

  async function reloadDoctorData() {
    const myPatients = await window.StorageAdapter.getPacientes(true);
    const quickSel = document.getElementById('docQuickPatientSelect');

    if (quickSel) {
      quickSel.innerHTML = '';
      if (myPatients.length === 0) {
        quickSel.innerHTML = '<option>Sin pacientes asignados</option>';
      } else {
        myPatients.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.curp;
          opt.textContent = `${p.nombre} (${p.curp})`;
          quickSel.appendChild(opt);
        });

        if (!state.currentCurp || !myPatients.some(p => p.curp === state.currentCurp)) {
          state.currentCurp = myPatients[0].curp;
        }
        quickSel.value = state.currentCurp;
      }
    }

    // Renderizar Acordeón de Expedientes Clínicos Deslizables
    renderDoctorExpedientesAccordion(myPatients);

    if (state.currentCurp) {
      await loadDoctorPatientOdontogram(state.currentCurp);
    }

    const myCitas = await window.StorageAdapter.getCitas(null, null);
    renderDoctorAgendaTable(myCitas);
  }

  /**
   * Renderiza la lista de expedientes clínicos en formato Acordeón:
   * Inicialmente SOLO se ve: Nombre, Edad y Etiqueta del Doctor que lo registró.
   * Al hacer clic, se deslizan suavemente todos los datos completos.
   */
  function renderDoctorExpedientesAccordion(patients) {
    const container = document.getElementById('docExpedientesAccordionList');
    if (!container) return;
    container.innerHTML = '';

    if (patients.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#64748B;">No tienes pacientes registrados en tu consultorio.</div>';
      return;
    }

    patients.forEach((p) => {
      const card = document.createElement('div');
      card.className = `patient-accordion-card ${p.curp === state.currentCurp ? 'open' : ''}`;
      card.dataset.curp = p.curp;

      // Header: Únicamente Nombre, Edad y Etiqueta del Doctor que lo registró
      card.innerHTML = `
        <div class="accordion-summary">
          <div class="patient-summary-left">
            <span class="patient-name-title">${p.nombre}</span>
            <span class="patient-age-tag">${p.edad ? p.edad + ' años' : 'Edad no reg.'}</span>
            <span class="patient-doctor-tag">
              <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
              ${p.dentista} (${p.consultorio})
            </span>
          </div>
          <div class="accordion-chevron-icon">
            <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div class="accordion-details-drawer">
          <div class="accordion-drawer-inner">
            <div class="info-row"><span class="lbl">Teléfono de contacto:</span><span class="val">${p.telefono || 'Sin teléfono'}</span></div>
            <div class="info-row"><span class="lbl">Correo electrónico:</span><span class="val">${p.correo || 'Sin correo'}</span></div>
            <div class="info-row"><span class="lbl">Domicilio particular:</span><span class="val">${p.direccion || 'Sin domicilio'}</span></div>
            <div class="info-row"><span class="lbl">CURP (Identificador):</span><span class="val" style="font-family:monospace;">${p.curp}</span></div>
            <div class="info-row"><span class="lbl">Seguro Social (NSS):</span><span class="val">${p.nss || 'No especificado'}</span></div>
            <div class="info-row"><span class="lbl">Consultorio Asignado:</span><span class="val">${p.consultorio}</span></div>
            <div class="info-row"><span class="lbl">Saldo disponible a favor:</span><span class="val" style="color:#059669;font-weight:800;">$${Number(p.saldo || 0).toFixed(2)} MXN</span></div>
            
            <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
              <button type="button" class="btn-action primary sm btn-acc-ver-odontograma" data-curp="${p.curp}">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C9 2 7 3.5 7 6c0 2 .5 4 1 6 .6 2.4 1 6 2 8 1 2 2 2 2 0 0-2 .5-4 1-5 .5 1 1 3 1 5 0 2 1 2 2 0 1-2 1.4-5.6 2-8 .5-2 1-4 1-6 0-2.5-2-4-5-4-1 0-1.5.5-2 .8C13.5 2.5 13 2 12 2z"/></svg>
                Abrir Odontograma 360°
              </button>
              <button type="button" class="btn-action secondary sm btn-acc-agendar-cita" data-curp="${p.curp}">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Agendar Consulta
              </button>
            </div>
          </div>
        </div>
      `;

      // Evento de clic para deslizar / expandir acordeón
      const summaryHeader = card.querySelector('.accordion-summary');
      summaryHeader.onclick = () => {
        const isOpen = card.classList.contains('open');
        container.querySelectorAll('.patient-accordion-card').forEach(c => c.classList.remove('open'));
        if (!isOpen) {
          card.classList.add('open');
          state.currentCurp = p.curp;
          state.currentPatient = p;
          const quickSel = document.getElementById('docQuickPatientSelect');
          if (quickSel) quickSel.value = p.curp;
          loadDoctorPatientOdontogram(p.curp);
        }
      };

      // Botón interno: Abrir Odontograma
      const btnOdon = card.querySelector('.btn-acc-ver-odontograma');
      if (btnOdon) {
        btnOdon.onclick = (e) => {
          e.stopPropagation();
          state.currentCurp = p.curp;
          const tabOdontograma = document.querySelector('.doctor-nav-tab[data-tab="doc-odontograma"]');
          if (tabOdontograma) tabOdontograma.click();
          loadDoctorPatientOdontogram(p.curp);
        };
      }

      // Botón interno: Agendar Consulta
      const btnAgenda = card.querySelector('.btn-acc-agendar-cita');
      if (btnAgenda) {
        btnAgenda.onclick = (e) => {
          e.stopPropagation();
          state.currentCurp = p.curp;
          const tabAgenda = document.querySelector('.doctor-nav-tab[data-tab="doc-agenda"]');
          if (tabAgenda) tabAgenda.click();
        };
      }

      container.appendChild(card);
    });
  }

  async function loadDoctorPatientOdontogram(curp) {
    state.currentCurp = curp;
    state.currentPatient = await window.StorageAdapter.getPaciente(curp);
    if (!state.currentPatient) return;

    const odontogram = await window.StorageAdapter.getOdontograma(curp);
    renderArchesToOverlay(
      odontogram,
      document.getElementById('docMarkersSuperior'),
      document.getElementById('docMarkersInferior'),
      curp
    );

    const treatments = await window.StorageAdapter.getTratamientos(curp);
    const container = document.getElementById('docHistorialContainer');
    if (container) {
      container.innerHTML = '';
      if (treatments.length === 0) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:#64748B;">Sin procedimientos clínicos registrados para este paciente.</div>';
      } else {
        treatments.forEach(t => {
          const item = document.createElement('div');
          item.className = 'info-row';
          item.style.padding = '12px 16px';
          item.style.background = '#F8FAFC';
          item.style.borderRadius = '10px';
          item.style.marginBottom = '6px';
          item.innerHTML = `
            <div>
              <div style="font-weight:700;color:#0F172A;">${t.nombre}</div>
              <div style="font-size:11px;color:#64748B;">Fecha: ${t.fecha} &middot; Costo: $${Number(t.costo).toFixed(2)} MXN &middot; Doctor: ${t.dentista}</div>
            </div>
            <div>
              <span class="pill ${t.realizado ? 'ok' : 'warn'}"><i></i>${t.realizado ? 'Realizado' : 'Pendiente'}</span>
            </div>
          `;
          container.appendChild(item);
        });
      }
    }
  }

  function renderDoctorAgendaTable(citas) {
    const tbody = document.getElementById('tableDocAgendaBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (citas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748B;">No tienes consultas programadas.</td></tr>';
      return;
    }

    citas.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.fecha}</strong> &middot; ${c.hora}</td>
        <td>${c.paciente_nombre || c.curp_paciente}</td>
        <td>${c.siguiente_tratamiento}</td>
        <td><span class="pill ${c.estado === 'completada' ? 'ok' : 'warn'}"><i></i>${c.estado.toUpperCase()}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function setupDoctorNavigation() {
    document.querySelectorAll('.doctor-nav-tab').forEach(tab => {
      tab.onclick = () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.doctor-nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.doctor-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPane = document.getElementById(`pane-${target}`);
        if (targetPane) targetPane.classList.add('active');
      };
    });

    const quickSel = document.getElementById('docQuickPatientSelect');
    if (quickSel) {
      quickSel.onchange = () => {
        state.currentCurp = quickSel.value;
        loadDoctorPatientOdontogram(quickSel.value);
        showToast('Paciente en consulta actualizado', 'ok');
      };
    }
  }

  function setupDoctorForms() {
    // Formulario Registrar Paciente Doctor (Coloca etiqueta automática al doctor que lo registró)
    const formDocPaciente = document.getElementById('formDocNuevoPaciente');
    if (formDocPaciente) {
      formDocPaciente.onsubmit = async (e) => {
        e.preventDefault();
        const curpVal = document.getElementById('docInpCurp').value.trim().toUpperCase();
        const nombreVal = document.getElementById('docInpNombre').value.trim();
        const edadVal = Number(document.getElementById('docInpEdad').value) || 0;
        const telVal = document.getElementById('docInpTel').value.trim();
        const correoVal = document.getElementById('docInpCorreo').value.trim();
        const dirVal = document.getElementById('docInpDireccion').value.trim();

        if (!curpVal || curpVal.length < 10) {
          showToast('Introduce una CURP válida', 'warn');
          return;
        }

        // Se le asigna automáticamente la etiqueta del doctor activo
        const nuevo = {
          curp: curpVal,
          nombre: nombreVal,
          edad: edadVal,
          telefono: telVal,
          correo: correoVal,
          direccion: dirVal,
          nss: '',
          dentista: state.currentUser.nombre,
          consultorio: state.currentUser.consultorio || '#3',
          saldo: 0.00
        };

        await window.StorageAdapter.savePaciente(nuevo);
        showToast(`Paciente registrado con etiqueta ${state.currentUser.nombre}`, 'ok');
        formDocPaciente.reset();
        state.currentCurp = curpVal;
        await reloadDoctorData();
      };
    }

    // Formulario Agendar Cita Doctor
    const formDocCita = document.getElementById('formDocNuevaCita');
    if (formDocCita) {
      formDocCita.onsubmit = async (e) => {
        e.preventDefault();
        if (!state.currentCurp) {
          showToast('Selecciona un paciente primero', 'warn');
          return;
        }

        const tratVal = document.getElementById('docCitaTratamiento').value.trim();
        const fechaVal = document.getElementById('docCitaFecha').value;
        const horaVal = document.getElementById('docCitaHora').value;
        const costoVal = Number(document.getElementById('docCitaCosto').value) || 0;

        const nuevaCita = {
          curp_paciente: state.currentCurp,
          paciente_nombre: state.currentPatient ? state.currentPatient.nombre : '',
          dentista: state.currentUser.nombre,
          consultorio: state.currentUser.consultorio || '#3',
          siguiente_tratamiento: tratVal,
          costo: costoVal,
          fecha: fechaVal,
          hora: horaVal,
          estado: 'agendada'
        };

        await window.StorageAdapter.saveCita(nuevaCita);
        await window.StorageAdapter.addTratamiento({
          curp_paciente: state.currentCurp,
          nombre: tratVal,
          costo: costoVal,
          realizado: false,
          pagado: false,
          fecha: fechaVal,
          dentista: state.currentUser.nombre
        });

        showToast('Consulta agendada con éxito', 'ok');
        formDocCita.reset();
        await reloadDoctorData();
      };
    }
  }

  // ==============================================================
  // 4. MOTOR DEL ODONTOGRAMA (32 PIEZAS - COORDENADAS PORCENTUALES)
  // ==============================================================

  function renderArchesToOverlay(odontogram, overlaySup, overlayInf, curp) {
    if (!overlaySup || !overlayInf) return;
    overlaySup.innerHTML = '';
    overlayInf.innerHTML = '';

    odontogram.forEach(d => {
      const mk = document.createElement('div');
      mk.className = `tooth-marker ${d.estado}`;
      
      // Coordenadas Porcentuales Proporcionales (Aspect Ratio 596 / 424)
      mk.style.left = ((d.x / 596) * 100).toFixed(2) + '%';
      mk.style.top = ((d.y / 424) * 100).toFixed(2) + '%';
      
      mk.textContent = d.id;
      mk.title = `${d.nombre}: ${d.estado === 'realizado' ? 'Realizado' : 'Pendiente'} (${d.notas || 'Sin notas'})`;
      mk.dataset.id = d.id;

      mk.onclick = () => openToothModal(d, curp);

      if (d.arch === 'superior') {
        overlaySup.appendChild(mk);
      } else {
        overlayInf.appendChild(mk);
      }
    });
  }

  function openToothModal(diente, curp) {
    state.selectedDiente = { ...diente, curp };
    const modal = document.getElementById('toothDetailModal');
    if (!modal) return;

    setText('modalToothName', diente.nombre);
    setText('modalToothCoord', `Pieza #${diente.id} &middot; Arcada ${diente.arch.toUpperCase()} &middot; Paciente: ${curp}`);

    const selectEstado = document.getElementById('modalToothState');
    if (selectEstado) selectEstado.value = diente.estado;
    const inputNotas = document.getElementById('modalToothNotes');
    if (inputNotas) inputNotas.value = diente.notas || '';

    modal.classList.add('open');
  }

  const btnSaveTooth = document.getElementById('btnSaveToothModal');
  if (btnSaveTooth) {
    btnSaveTooth.onclick = async () => {
      if (!state.selectedDiente) return;
      const nuevoEstado = document.getElementById('modalToothState').value;
      const nuevasNotas = document.getElementById('modalToothNotes').value;

      await window.StorageAdapter.updateDiente(
        state.selectedDiente.curp,
        state.selectedDiente.id,
        nuevoEstado,
        nuevasNotas
      );

      showToast(`Pieza dental #${state.selectedDiente.id} actualizada`, 'ok');
      document.getElementById('toothDetailModal').classList.remove('open');

      if (state.currentUser.rol === 'admin') {
        await updateAdminInspectView(state.selectedDiente.curp);
      } else {
        await loadDoctorPatientOdontogram(state.selectedDiente.curp);
      }
    };
  }

  const btnCloseTooth = document.getElementById('btnCloseToothModal');
  const btnCancelTooth = document.getElementById('btnCancelToothModal');
  [btnCloseTooth, btnCancelTooth].forEach(b => {
    if (b) b.onclick = () => document.getElementById('toothDetailModal').classList.remove('open');
  });

  // ==============================================================
  // 5. EVENTOS GENERALES & HELPERS
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
          showToast(`Bienvenido(a), ${res.user.nombre}`, 'ok');
          checkUserSession();
        } else {
          showToast(res.error || 'Credenciales inválidas', 'bad');
        }
      };
    }

    document.querySelectorAll('.quick-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const email = btn.dataset.email;
        const pass = btn.dataset.pass;
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = pass;

        const res = await window.StorageAdapter.login(email, pass);
        if (res.success) {
          showToast(`Acceso exitoso: ${res.user.nombre}`, 'ok');
          checkUserSession();
        } else {
          showToast(res.error, 'bad');
        }
      };
    });

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
    if (closeBtn && modal) closeBtn.onclick = () => modal.classList.remove('open');

    const btnTest = document.getElementById('btnTestSupabase');
    if (btnTest) {
      btnTest.onclick = async () => {
        const url = document.getElementById('dbSupabaseUrl').value.trim();
        const key = document.getElementById('dbSupabaseKey').value.trim();
        btnTest.disabled = true;
        btnTest.textContent = 'Probando...';
        const res = await window.StorageAdapter.testConnection(url, key);
        btnTest.disabled = false;
        btnTest.textContent = 'Probar Conexión';
        showToast(res.message || res.error, res.success ? 'ok' : 'bad');
      };
    }

    const btnSaveDb = document.getElementById('btnSaveDbConfig');
    if (btnSaveDb) {
      btnSaveDb.onclick = () => {
        const url = document.getElementById('dbSupabaseUrl').value.trim();
        const key = document.getElementById('dbSupabaseKey').value.trim();
        window.StorageAdapter.saveConfig({ supabaseUrl: url, supabaseKey: key, activeBackend: (url && key) ? 'supabase' : 'local' });
        showToast('Credenciales guardadas', 'ok');
        modal.classList.remove('open');
      };
    }

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
        showToast('Copia descargada', 'ok');
      };
    }
  }

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

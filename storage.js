/**
 * StorageAdapter - Capa de Persistencia Híbrida (Supabase BaaS + LocalStorage Fallback)
 * Con Autenticación y Control de Acceso Basado en Roles (RBAC: Admin vs Doctor)
 */

const STORAGE_KEY_CONFIG = 'cp_dental_config';
const STORAGE_KEY_DATA = 'cp_dental_data_v2';
const STORAGE_KEY_SESSION = 'cp_dental_session';

// Cuentas y datos iniciales de demostración
const DEFAULT_DEMO_DATA = {
  usuarios: [
    {
      id: 'u-1',
      email: 'admin@clinicadental.com',
      password: 'admin123',
      nombre: 'Lic. Patricia Vega',
      rol: 'admin',
      consultorio: 'Dirección / Caja',
      especialidad: 'Administración y Finanzas'
    },
    {
      id: 'u-2',
      email: 'ramon@clinicadental.com',
      password: 'doctor123',
      nombre: 'Dr. Ramón',
      rol: 'doctor',
      consultorio: '#3',
      especialidad: 'Endodoncia y Prótesis'
    },
    {
      id: 'u-3',
      email: 'sofia@clinicadental.com',
      password: 'doctor123',
      nombre: 'Dra. Sofía',
      rol: 'doctor',
      consultorio: '#1',
      especialidad: 'Ortodoncia y Estética'
    }
  ],
  pacientes: [
    {
      curp: 'MORG850912HMCRRL01',
      nombre: 'María González Ramírez',
      edad: 39,
      telefono: '5541239876',
      correo: 'maria.gonzalez@gmail.com',
      direccion: 'Av. Insurgentes Sur 452, Col. Roma, CDMX',
      nss: '1285093412',
      dentista: 'Dr. Ramón',
      consultorio: '#3',
      saldo: 1250.00,
      created_at: new Date().toISOString()
    },
    {
      curp: 'HERJ880719HMCRRL05',
      nombre: 'Juan Carlos Hernández',
      edad: 36,
      telefono: '5533221100',
      correo: 'juan.hernandez@gmail.com',
      direccion: 'Col. Nápoles, Benito Juárez, CDMX',
      nss: '5588071900',
      dentista: 'Dr. Ramón',
      consultorio: '#3',
      saldo: 800.00,
      created_at: new Date().toISOString()
    },
    {
      curp: 'PEAR900325HMCRRN02',
      nombre: 'Alejandro Pérez Ramos',
      edad: 34,
      telefono: '5589765432',
      correo: 'alejandro.perez@gmail.com',
      direccion: 'Calle Reforma 102, Guadalajara, JAL',
      nss: '3490038765',
      dentista: 'Dra. Sofía',
      consultorio: '#1',
      saldo: 0.00,
      created_at: new Date().toISOString()
    }
  ],
  tratamientos: [
    {
      id: 't-1',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Tratamiento 1: Limpieza y Profilaxis',
      costo: 500.00,
      realizado: true,
      pagado: true,
      fecha: '2026-10-15',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-2',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Tratamiento 2: Resina Estética Pieza 14',
      costo: 650.00,
      realizado: true,
      pagado: true,
      fecha: '2026-10-28',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-3',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Tratamiento 3: Endodoncia Molar 26',
      costo: 1800.00,
      realizado: true,
      pagado: false,
      fecha: '2026-11-10',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-4',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Tratamiento 4: Corona de Porcelana',
      costo: 2500.00,
      realizado: false,
      pagado: false,
      fecha: '2026-11-20',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-5',
      curp_paciente: 'HERJ880719HMCRRL05',
      nombre: 'Tratamiento 1: Extracción Tercer Molar',
      costo: 1200.00,
      realizado: true,
      pagado: false,
      fecha: '2026-11-22',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-6',
      curp_paciente: 'PEAR900325HMCRRN02',
      nombre: 'Tratamiento 1: Ajuste de Brackets',
      costo: 800.00,
      realizado: true,
      pagado: true,
      fecha: '2026-11-18',
      dentista: 'Dra. Sofía'
    }
  ],
  odontograma: {
    'MORG850912HMCRRL01': [
      { id: 1,  nombre: 'Molar 18', x: 128.8, y: 67.6,  estado: 'realizado',   notas: 'Tratamiento concluido' },
      { id: 2,  nombre: 'Molar 17', x: 137.7, y: 131.3, estado: 'realizado',   notas: 'Sin anomalías' },
      { id: 3,  nombre: 'Molar 16', x: 156.6, y: 193.2, estado: 'realizado',   notas: 'Sellador aplicado' },
      { id: 4,  nombre: 'Premolar 15', x: 168.4, y: 245.6, estado: 'no_realizado', notas: 'Sensibilidad reportada' },
      { id: 5,  nombre: 'Premolar 14', x: 187.3, y: 279.1, estado: 'no_realizado', notas: 'Requiere valoración' },
      { id: 6,  nombre: 'Canino 13', x: 211.3, y: 312.1, estado: 'no_realizado', notas: 'Pendiente' },
      { id: 7,  nombre: 'Incisivo 12', x: 243.8, y: 327.5, estado: 'no_realizado', notas: 'Profilaxis pendiente' },
      { id: 8,  nombre: 'Incisivo 11', x: 271.8, y: 337.0, estado: 'no_realizado', notas: 'Corona recomendada' },
      { id: 9,  nombre: 'Incisivo 21', x: 303.4, y: 337.0, estado: 'no_realizado', notas: 'Carilla estética' },
      { id: 10, nombre: 'Incisivo 22', x: 335.0, y: 329.7, estado: 'no_realizado', notas: 'Pendiente' },
      { id: 11, nombre: 'Canino 23', x: 366.6, y: 312.1, estado: 'no_realizado', notas: 'Pendiente' },
      { id: 12, nombre: 'Premolar 24', x: 391.8, y: 279.1, estado: 'no_realizado', notas: 'Obturación previa' },
      { id: 13, nombre: 'Premolar 25', x: 406.8, y: 243.2, estado: 'no_realizado', notas: 'Control' },
      { id: 14, nombre: 'Molar 26', x: 425.7, y: 192.0, estado: 'realizado',   notas: 'Endodoncia efectuada' },
      { id: 15, nombre: 'Molar 27', x: 437.9, y: 132.1, estado: 'realizado',   notas: 'Sano' },
      { id: 16, nombre: 'Molar 28', x: 447.4, y: 67.3,  estado: 'realizado',   notas: 'Sano' }
    ]
  },
  citas: [
    {
      id: 'c-1',
      curp_paciente: 'MORG850912HMCRRL01',
      paciente_nombre: 'María González Ramírez',
      dentista: 'Dr. Ramón',
      consultorio: '#3',
      siguiente_tratamiento: 'Tratamiento 4: Corona de Porcelana',
      costo: 2500.00,
      fecha: new Date().toISOString().split('T')[0],
      hora: '10:00 AM',
      estado: 'agendada'
    },
    {
      id: 'c-2',
      curp_paciente: 'HERJ880719HMCRRL05',
      paciente_nombre: 'Juan Carlos Hernández',
      dentista: 'Dr. Ramón',
      consultorio: '#3',
      siguiente_tratamiento: 'Revisión Post-Extracción',
      costo: 400.00,
      fecha: new Date().toISOString().split('T')[0],
      hora: '12:30 PM',
      estado: 'agendada'
    },
    {
      id: 'c-3',
      curp_paciente: 'PEAR900325HMCRRN02',
      paciente_nombre: 'Alejandro Pérez Ramos',
      dentista: 'Dra. Sofía',
      consultorio: '#1',
      siguiente_tratamiento: 'Control de Ortodoncia',
      costo: 800.00,
      fecha: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      hora: '04:00 PM',
      estado: 'agendada'
    }
  ]
};

class StorageAdapter {
  constructor() {
    this.config = this.loadConfig();
    this.currentUser = this.loadSession();
    this.supabaseClient = null;
    this.initSupabase();
  }

  // ===================== SESIÓN & AUTENTICACIÓN =====================

  loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading session', e);
    }
    return null;
  }

  saveSession(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.rol === 'admin';
  }

  isDoctor() {
    return this.currentUser && this.currentUser.rol === 'doctor';
  }

  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Probar en Supabase si está conectado
    if (this.isCloudConnected()) {
      try {
        const { data, error } = await this.supabaseClient
          .from('usuarios')
          .select('*')
          .eq('email', cleanEmail)
          .eq('password_hash', cleanPass)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const userSession = {
            id: data.id,
            email: data.email,
            nombre: data.nombre,
            rol: data.rol,
            consultorio: data.consultorio,
            especialidad: data.especialidad
          };
          this.saveSession(userSession);
          return { success: true, user: userSession };
        }
      } catch (err) {
        console.warn('Fallo login en Supabase, verificando local:', err);
      }
    }

    // 2. Probar en base local
    const local = this.getLocalData();
    const users = local.usuarios || DEFAULT_DEMO_DATA.usuarios;
    const found = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === cleanPass);

    if (found) {
      const userSession = {
        id: found.id,
        email: found.email,
        nombre: found.nombre,
        rol: found.rol,
        consultorio: found.consultorio,
        especialidad: found.especialidad
      };
      this.saveSession(userSession);
      return { success: true, user: userSession };
    }

    return { success: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
  }

  logout() {
    this.saveSession(null);
  }

  // ===================== CONFIGURACIÓN SUPABASE =====================

  loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading config from localStorage', e);
    }
    return {
      supabaseUrl: '',
      supabaseKey: '',
      activeBackend: 'local'
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
    this.initSupabase();
  }

  initSupabase() {
    if (this.config.supabaseUrl && this.config.supabaseKey && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(
          this.config.supabaseUrl.trim(),
          this.config.supabaseKey.trim()
        );
        this.config.activeBackend = 'supabase';
      } catch (err) {
        console.error('Error instantiating Supabase client:', err);
        this.supabaseClient = null;
        this.config.activeBackend = 'local';
      }
    } else {
      this.supabaseClient = null;
      this.config.activeBackend = 'local';
    }
  }

  isCloudConnected() {
    return !!(this.supabaseClient && this.config.activeBackend === 'supabase');
  }

  getLocalData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DATA);
      if (!raw) {
        this.setLocalData(DEFAULT_DEMO_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA));
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading local data:', e);
      return JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA));
    }
  }

  setLocalData(data) {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('Error writing local data:', e);
    }
  }

  // ===================== PACIENTES (RBAC) =====================
  async getPacientes(filterByDoctor = true) {
    let list = [];

    if (this.isCloudConnected()) {
      try {
        let query = this.supabaseClient.from('pacientes').select('*');
        if (filterByDoctor && this.isDoctor()) {
          query = query.eq('dentista', this.currentUser.nombre);
        }
        const { data, error } = await query.order('nombre', { ascending: true });
        if (error) throw error;
        if (data) list = data;
      } catch (err) {
        console.warn('Fallo Supabase getPacientes:', err);
      }
    }

    if (list.length === 0) {
      const local = this.getLocalData();
      list = local.pacientes || [];
      if (filterByDoctor && this.isDoctor()) {
        const docName = this.currentUser.nombre.toLowerCase();
        list = list.filter(p => (p.dentista || '').toLowerCase() === docName);
      }
    }

    return list;
  }

  async getPaciente(curp) {
    if (!curp) return null;
    const cleanCurp = curp.trim().toUpperCase();

    if (this.isCloudConnected()) {
      try {
        const { data, error } = await this.supabaseClient
          .from('pacientes')
          .select('*')
          .eq('curp', cleanCurp)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Fallo Supabase getPaciente:', err);
      }
    }
    const local = this.getLocalData();
    return local.pacientes.find(p => p.curp.toUpperCase() === cleanCurp) || null;
  }

  async savePaciente(paciente) {
    const cleanCurp = paciente.curp.trim().toUpperCase();
    const pacienteData = {
      ...paciente,
      curp: cleanCurp,
      saldo: Number(paciente.saldo) || 0
    };

    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('pacientes').upsert(pacienteData);
      } catch (err) {
        console.warn('Error al guardar en Supabase, guardando local:', err);
      }
    }

    const local = this.getLocalData();
    const idx = local.pacientes.findIndex(p => p.curp.toUpperCase() === cleanCurp);
    if (idx >= 0) {
      local.pacientes[idx] = { ...local.pacientes[idx], ...pacienteData };
    } else {
      local.pacientes.push(pacienteData);
    }
    this.setLocalData(local);
    return pacienteData;
  }

  // ===================== TRATAMIENTOS =====================
  async getTratamientos(curp) {
    if (!curp) return [];
    const cleanCurp = curp.trim().toUpperCase();

    if (this.isCloudConnected()) {
      try {
        let query = this.supabaseClient.from('tratamientos').select('*').eq('curp_paciente', cleanCurp);
        if (this.isDoctor()) {
          query = query.eq('dentista', this.currentUser.nombre);
        }
        const { data, error } = await query.order('fecha', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Fallo Supabase getTratamientos:', err);
      }
    }
    const local = this.getLocalData();
    let res = local.tratamientos.filter(t => t.curp_paciente.toUpperCase() === cleanCurp);
    if (this.isDoctor()) {
      const docName = this.currentUser.nombre.toLowerCase();
      res = res.filter(t => (t.dentista || '').toLowerCase() === docName);
    }
    return res;
  }

  async addTratamiento(tratamiento) {
    const item = {
      id: tratamiento.id || 't-' + Date.now(),
      curp_paciente: tratamiento.curp_paciente.toUpperCase(),
      nombre: tratamiento.nombre,
      costo: Number(tratamiento.costo) || 0,
      realizado: !!tratamiento.realizado,
      pagado: !!tratamiento.pagado,
      fecha: tratamiento.fecha || new Date().toISOString().split('T')[0],
      dentista: tratamiento.dentista || (this.currentUser ? this.currentUser.nombre : 'Dr. Ramón')
    };

    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('tratamientos').insert(item);
      } catch (err) {
        console.warn('Error guardando tratamiento en Supabase:', err);
      }
    }

    const local = this.getLocalData();
    local.tratamientos.push(item);
    this.setLocalData(local);
    return item;
  }

  async updateTratamiento(id, changes) {
    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('tratamientos').update(changes).eq('id', id);
      } catch (err) {
        console.warn('Error actualizando tratamiento en Supabase:', err);
      }
    }

    const local = this.getLocalData();
    const idx = local.tratamientos.findIndex(t => t.id === id);
    if (idx >= 0) {
      local.tratamientos[idx] = { ...local.tratamientos[idx], ...changes };
      this.setLocalData(local);
      return local.tratamientos[idx];
    }
    return null;
  }

  // ===================== ODONTOGRAMA =====================
  async getOdontograma(curp) {
    if (!curp) return [];
    const cleanCurp = curp.trim().toUpperCase();

    if (this.isCloudConnected()) {
      try {
        const { data, error } = await this.supabaseClient
          .from('odontograma')
          .select('*')
          .eq('curp_paciente', cleanCurp)
          .order('diente_num', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Fallo Supabase getOdontograma:', err);
      }
    }

    const local = this.getLocalData();
    if (local.odontograma && local.odontograma[cleanCurp]) {
      return local.odontograma[cleanCurp];
    }

    const defaultDientes = JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA.odontograma['MORG850912HMCRRL01']));
    if (!local.odontograma) local.odontograma = {};
    local.odontograma[cleanCurp] = defaultDientes;
    this.setLocalData(local);
    return defaultDientes;
  }

  async updateDiente(curp, dienteId, estado, notas = '') {
    const cleanCurp = curp.trim().toUpperCase();

    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('odontograma').upsert({
          curp_paciente: cleanCurp,
          diente_num: Number(dienteId),
          estado: estado,
          notas: notas,
          updated_at: new Date().toISOString()
        }, { onConflict: 'curp_paciente,diente_num' });
      } catch (err) {
        console.warn('Error al actualizar diente en Supabase:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.odontograma) local.odontograma = {};
    if (!local.odontograma[cleanCurp]) {
      local.odontograma[cleanCurp] = JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA.odontograma['MORG850912HMCRRL01']));
    }

    const item = local.odontograma[cleanCurp].find(d => d.id === Number(dienteId));
    if (item) {
      item.estado = estado;
      if (notas) item.notas = notas;
    }
    this.setLocalData(local);
    return item;
  }

  // ===================== CITAS (AGENDA ADMIN VS DOCTOR) =====================
  async getCitas(curp = null, filterDoctor = null, onlyToday = false) {
    let list = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (this.isCloudConnected()) {
      try {
        let query = this.supabaseClient.from('citas').select('*');
        if (curp) query = query.eq('curp_paciente', curp.toUpperCase());
        if (filterDoctor) query = query.eq('dentista', filterDoctor);
        if (this.isDoctor()) query = query.eq('dentista', this.currentUser.nombre);
        if (onlyToday) query = query.eq('fecha', todayStr);

        const { data, error } = await query.order('fecha', { ascending: false });
        if (error) throw error;
        if (data) list = data;
      } catch (err) {
        console.warn('Fallo Supabase getCitas:', err);
      }
    }

    if (list.length === 0) {
      const local = this.getLocalData();
      list = local.citas || [];
      if (curp) list = list.filter(c => c.curp_paciente.toUpperCase() === curp.toUpperCase());
      if (filterDoctor) list = list.filter(c => c.dentista === filterDoctor);
      if (this.isDoctor()) {
        const docName = this.currentUser.nombre.toLowerCase();
        list = list.filter(c => (c.dentista || '').toLowerCase() === docName);
      }
      if (onlyToday) {
        list = list.filter(c => c.fecha === todayStr);
      }
    }

    return list;
  }

  async saveCita(cita) {
    const item = {
      id: cita.id || 'c-' + Date.now(),
      curp_paciente: cita.curp_paciente.toUpperCase(),
      paciente_nombre: cita.paciente_nombre || '',
      dentista: cita.dentista || (this.isDoctor() ? this.currentUser.nombre : 'Dr. Ramón'),
      consultorio: cita.consultorio || (this.isDoctor() ? this.currentUser.consultorio : '#3'),
      siguiente_tratamiento: cita.siguiente_tratamiento || 'Consulta general',
      costo: Number(cita.costo) || 0,
      fecha: cita.fecha || new Date().toISOString().split('T')[0],
      hora: cita.hora || '10:00 AM',
      estado: cita.estado || 'agendada'
    };

    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('citas').upsert({
          curp_paciente: item.curp_paciente,
          dentista: item.dentista,
          consultorio: item.consultorio,
          tratamiento: item.siguiente_tratamiento,
          costo: item.costo,
          fecha: item.fecha,
          hora: item.hora,
          estado: item.estado
        });
      } catch (err) {
        console.warn('Error guardando cita en Supabase:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.citas) local.citas = [];
    const idx = local.citas.findIndex(c => c.id === item.id);
    if (idx >= 0) {
      local.citas[idx] = item;
    } else {
      local.citas.unshift(item);
    }
    this.setLocalData(local);
    return item;
  }

  async updateEstadoCita(id, nuevoEstado) {
    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('citas').update({ estado: nuevoEstado }).eq('id', id);
      } catch (err) {
        console.warn('Error al actualizar estado de cita en Supabase:', err);
      }
    }

    const local = this.getLocalData();
    const c = (local.citas || []).find(it => it.id === id);
    if (c) {
      c.estado = nuevoEstado;
      this.setLocalData(local);
      return c;
    }
    return null;
  }

  // ===================== PAGOS & MÉTRICAS (SOLO ADMIN) =====================
  async procesarPago(curp, monto, metodo, tratamientosIds = []) {
    if (!this.isAdmin()) {
      throw new Error('Permiso denegado: Solo el personal administrativo tiene autorización para cobrar y gestionar pagos.');
    }

    const paciente = await this.getPaciente(curp);
    if (!paciente) throw new Error('Paciente no encontrado');

    let nuevoSaldo = Number(paciente.saldo || 0);

    if (metodo === 'saldo') {
      if (nuevoSaldo < monto) {
        throw new Error('Saldo insuficiente. Saldo disponible: $' + nuevoSaldo.toFixed(2));
      }
      nuevoSaldo -= monto;
    } else if (metodo === 'fisico') {
      // Pago en efectivo o terminal
    } else if (metodo === 'despues') {
      return { success: true, message: 'Pago registrado para liquidación posterior', nuevoSaldo };
    }

    paciente.saldo = nuevoSaldo;
    await this.savePaciente(paciente);

    if (tratamientosIds && tratamientosIds.length > 0) {
      for (const tId of tratamientosIds) {
        await this.updateTratamiento(tId, { pagado: true });
      }
    }

    return { success: true, message: 'Pago registrado exitosamente (' + metodo + ')', nuevoSaldo };
  }

  async getMetricasFinancieras() {
    if (!this.isAdmin()) return null;

    const local = this.getLocalData();
    const tratamientos = local.tratamientos || [];
    const pacientes = local.pacientes || [];
    const citas = local.citas || [];
    const todayStr = new Date().toISOString().split('T')[0];

    const totalCobrado = tratamientos.filter(t => t.pagado).reduce((sum, t) => sum + Number(t.costo || 0), 0);
    const totalPendiente = tratamientos.filter(t => !t.pagado).reduce((sum, t) => sum + Number(t.costo || 0), 0);
    const citasHoy = citas.filter(c => c.fecha === todayStr && c.estado !== 'cancelada').length;
    const totalPacientes = pacientes.length;

    return {
      totalCobrado,
      totalPendiente,
      citasHoy,
      totalPacientes
    };
  }

  // ===================== DOCTORES DISPONIBLES =====================
  getDoctores() {
    const local = this.getLocalData();
    const users = local.usuarios || DEFAULT_DEMO_DATA.usuarios;
    return users.filter(u => u.rol === 'doctor');
  }

  // ===================== UTILIDADES =====================
  async testConnection(url, key) {
    if (!window.supabase) {
      return { success: false, error: 'Librería de Supabase no cargada en el navegador' };
    }
    try {
      const client = window.supabase.createClient(url.trim(), key.trim());
      const { data, error } = await client.from('pacientes').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, message: '¡Conexión a Supabase exitosa!' };
    } catch (err) {
      return { success: false, error: err.message || 'Error de conexión a Supabase' };
    }
  }

  exportDataJson() {
    return JSON.stringify(this.getLocalData(), null, 2);
  }

  importDataJson(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.pacientes && parsed.tratamientos) {
        this.setLocalData(parsed);
        return true;
      }
      throw new Error('Estructura de datos inválida');
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  resetDemoData() {
    this.setLocalData(DEFAULT_DEMO_DATA);
    return true;
  }
}

window.StorageAdapter = new StorageAdapter();

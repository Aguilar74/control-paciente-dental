/**
 * StorageAdapter - Capa de Persistencia Híbrida (Supabase BaaS + LocalStorage)
 * Con Autenticación y Control de Acceso Basado en Roles (RBAC: Admin vs Doctor)
 * Proyecto Supabase: https://qidwrxlfovuchxgzcdln.supabase.co
 */

const STORAGE_KEY_CONFIG = 'cp_dental_config_v3';
const STORAGE_KEY_DATA = 'cp_dental_data_v3';
const STORAGE_KEY_SESSION = 'cp_dental_session_v3';

// 32 Piezas Dentales Permanentes (Norma FDI Internacional)
// Arcada Superior: 18 al 28 (16 piezas) | Arcada Inferior: 48 al 38 (16 piezas)
const DEFAULT_32_TEETH = [
  // --- ARCADA SUPERIOR (MAXILAR) ---
  { id: 18, arch: 'superior', nombre: 'Pieza 18: 3er Molar Sup. Der.', x: 136.6, y: 278.9, estado: 'realizado', notas: 'Tratamiento concluido' },
  { id: 17, arch: 'superior', nombre: 'Pieza 17: 2do Molar Sup. Der.', x: 133.1, y: 336.9, estado: 'realizado', notas: 'Sano' },
  { id: 16, arch: 'superior', nombre: 'Pieza 16: 1er Molar Sup. Der.', x: 146.0, y: 222.4, estado: 'realizado', notas: 'Corona recomendada' },
  { id: 15, arch: 'superior', nombre: 'Pieza 15: 2do Premolar Sup. Der.', x: 158.3, y: 175.3, estado: 'no_realizado', notas: 'Sensibilidad en frío' },
  { id: 14, arch: 'superior', nombre: 'Pieza 14: 1er Premolar Sup. Der.', x: 177.2, y: 141.4, estado: 'no_realizado', notas: 'Requiere valoración de resina' },
  { id: 13, arch: 'superior', nombre: 'Pieza 13: Canino Sup. Der.', x: 196.1, y: 107.5, estado: 'no_realizado', notas: 'Sin anomalías' },
  { id: 12, arch: 'superior', nombre: 'Pieza 12: Incisivo Lat. Sup. Der.', x: 224.4, y: 76.9, estado: 'no_realizado', notas: 'Profilaxis pendiente' },
  { id: 11, arch: 'superior', nombre: 'Pieza 11: Incisivo Central Sup. Der.', x: 262.8, y: 58.0, estado: 'no_realizado', notas: 'Carilla estética' },
  { id: 21, arch: 'superior', nombre: 'Pieza 21: Incisivo Central Sup. Izq.', x: 314.6, y: 58.0, estado: 'no_realizado', notas: 'Blanqueamiento indicado' },
  { id: 22, arch: 'superior', nombre: 'Pieza 22: Incisivo Lat. Sup. Izq.', x: 352.9, y: 76.9, estado: 'no_realizado', notas: 'Control' },
  { id: 23, arch: 'superior', nombre: 'Pieza 23: Canino Sup. Izq.', x: 379.6, y: 107.5, estado: 'no_realizado', notas: 'Sano' },
  { id: 24, arch: 'superior', nombre: 'Pieza 24: 1er Premolar Sup. Izq.', x: 398.4, y: 141.4, estado: 'no_realizado', notas: 'Obturación previa' },
  { id: 25, arch: 'superior', nombre: 'Pieza 25: 2do Premolar Sup. Izq.', x: 418.7, y: 175.3, estado: 'no_realizado', notas: 'Revisión periódica' },
  { id: 26, arch: 'superior', nombre: 'Pieza 26: 1er Molar Sup. Izq.', x: 428.1, y: 222.4, estado: 'realizado', notas: 'Endodoncia efectuada' },
  { id: 27, arch: 'superior', nombre: 'Pieza 27: 2do Molar Sup. Izq.', x: 437.6, y: 278.9, estado: 'realizado', notas: 'Sin caries activa' },
  { id: 28, arch: 'superior', nombre: 'Pieza 28: 3er Molar Sup. Izq.', x: 437.6, y: 336.9, estado: 'realizado', notas: 'Erupción completa' },

  // --- ARCADA INFERIOR (MANDÍBULA) ---
  { id: 48, arch: 'inferior', nombre: 'Pieza 48: 3er Molar Inf. Der.', x: 128.8, y: 67.6, estado: 'realizado', notas: 'Extracción quirúrgica' },
  { id: 47, arch: 'inferior', nombre: 'Pieza 47: 2do Molar Inf. Der.', x: 137.7, y: 131.3, estado: 'realizado', notas: 'Sellador aplicado' },
  { id: 46, arch: 'inferior', nombre: 'Pieza 46: 1er Molar Inf. Der.', x: 156.6, y: 193.2, estado: 'realizado', notas: 'Incrustación estética' },
  { id: 45, arch: 'inferior', nombre: 'Pieza 45: 2do Premolar Inf. Der.', x: 168.4, y: 245.6, estado: 'no_realizado', notas: 'Caries oclusal incipiente' },
  { id: 44, arch: 'inferior', nombre: 'Pieza 44: 1er Premolar Inf. Der.', x: 187.3, y: 279.1, estado: 'no_realizado', notas: 'Sensibilidad térmica' },
  { id: 43, arch: 'inferior', nombre: 'Pieza 43: Canino Inf. Der.', x: 211.3, y: 312.1, estado: 'no_realizado', notas: 'Sano' },
  { id: 42, arch: 'inferior', nombre: 'Pieza 42: Incisivo Lat. Inf. Der.', x: 243.8, y: 327.5, estado: 'no_realizado', notas: 'Alineación pendiente' },
  { id: 41, arch: 'inferior', nombre: 'Pieza 41: Incisivo Central Inf. Der.', x: 271.8, y: 337.0, estado: 'no_realizado', notas: 'Higiene adecuada' },
  { id: 31, arch: 'inferior', nombre: 'Pieza 31: Incisivo Central Inf. Izq.', x: 303.4, y: 337.0, estado: 'no_realizado', notas: 'Control de sarro' },
  { id: 32, arch: 'inferior', nombre: 'Pieza 32: Incisivo Lat. Inf. Izq.', x: 335.0, y: 329.7, estado: 'no_realizado', notas: 'Sin patologías' },
  { id: 33, arch: 'inferior', nombre: 'Pieza 33: Canino Inf. Izq.', x: 366.6, y: 312.1, estado: 'no_realizado', notas: 'Sano' },
  { id: 34, arch: 'inferior', nombre: 'Pieza 34: 1er Premolar Inf. Izq.', x: 391.8, y: 279.1, estado: 'no_realizado', notas: 'Tratamiento preventivo' },
  { id: 35, arch: 'inferior', nombre: 'Pieza 35: 2do Premolar Inf. Izq.', x: 406.8, y: 243.2, estado: 'no_realizado', notas: 'Control semestral' },
  { id: 36, arch: 'inferior', nombre: 'Pieza 36: 1er Molar Inf. Izq.', x: 425.7, y: 192.0, estado: 'realizado', notas: 'Resina compuesta concluida' },
  { id: 37, arch: 'inferior', nombre: 'Pieza 37: 2do Molar Inf. Izq.', x: 437.9, y: 132.1, estado: 'realizado', notas: 'Sin fisuras' },
  { id: 38, arch: 'inferior', nombre: 'Pieza 38: 3er Molar Inf. Izq.', x: 447.4, y: 67.3, estado: 'realizado', notas: 'Pieza asintomática' }
];

const DEFAULT_DEMO_DATA = {
  usuarios: [
    {
      id: 'u-1',
      email: 'admin@clinicadental.com',
      password: 'admin123',
      nombre: 'Lic. Patricia Vega',
      rol: 'admin',
      consultorio: 'Dirección General / Caja',
      especialidad: 'Administración y Finanzas'
    },
    {
      id: 'u-2',
      email: 'ramon@clinicadental.com',
      password: 'doctor123',
      nombre: 'Dr. Ramón',
      rol: 'doctor',
      consultorio: '#3',
      especialidad: 'Endodoncia y Prótesis Fija'
    },
    {
      id: 'u-3',
      email: 'sofia@clinicadental.com',
      password: 'doctor123',
      nombre: 'Dra. Sofía',
      rol: 'doctor',
      consultorio: '#1',
      especialidad: 'Ortodoncia y Estética Dental'
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
      nombre: 'Limpieza y Profilaxis Ultrasónica',
      costo: 500.00,
      realizado: true,
      pagado: true,
      fecha: '2026-10-15',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-2',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Resina Estética Pieza 14',
      costo: 650.00,
      realizado: true,
      pagado: true,
      fecha: '2026-10-28',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-3',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Endodoncia Molar 26',
      costo: 1800.00,
      realizado: true,
      pagado: false,
      fecha: '2026-11-10',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-4',
      curp_paciente: 'MORG850912HMCRRL01',
      nombre: 'Corona de Porcelana Zirconia Pieza 16',
      costo: 2500.00,
      realizado: false,
      pagado: false,
      fecha: '2026-11-20',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-5',
      curp_paciente: 'HERJ880719HMCRRL05',
      nombre: 'Extracción Tercer Molar Pieza 48',
      costo: 1200.00,
      realizado: true,
      pagado: false,
      fecha: '2026-11-22',
      dentista: 'Dr. Ramón'
    },
    {
      id: 't-6',
      curp_paciente: 'PEAR900325HMCRRN02',
      nombre: 'Ajuste de Brackets Metálicos',
      costo: 800.00,
      realizado: true,
      pagado: true,
      fecha: '2026-11-18',
      dentista: 'Dra. Sofía'
    }
  ],
  odontograma: {
    'MORG850912HMCRRL01': JSON.parse(JSON.stringify(DEFAULT_32_TEETH))
  },
  citas: [
    {
      id: 'c-1',
      curp_paciente: 'MORG850912HMCRRL01',
      paciente_nombre: 'María González Ramírez',
      dentista: 'Dr. Ramón',
      consultorio: '#3',
      siguiente_tratamiento: 'Corona de Porcelana Zirconia Pieza 16',
      costo: 2500.00,
      fecha: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      hora: '10:00 AM',
      estado: 'agendada'
    },
    {
      id: 'c-2',
      curp_paciente: 'HERJ880719HMCRRL05',
      paciente_nombre: 'Juan Carlos Hernández',
      dentista: 'Dr. Ramón',
      consultorio: '#3',
      siguiente_tratamiento: 'Revisión y Retiro de Suturas',
      costo: 350.00,
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
      fecha: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
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

    // 1. Probar en Supabase si está disponible
    if (this.isCloudConnected()) {
      try {
        const { data, error } = await this.supabaseClient
          .from('usuarios')
          .select('*')
          .eq('email', cleanEmail)
          .eq('password_hash', cleanPass)
          .maybeSingle();

        if (data && !error) {
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
        console.warn('Supabase login check:', err);
      }
    }

    // 2. Probar en almacenamiento local
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
      console.warn('Error reading config', e);
    }
    // Credenciales oficiales de Supabase proporcionadas por el usuario
    return {
      supabaseUrl: 'https://qidwrxlfovuchxgzcdln.supabase.co',
      supabaseKey: 'sb_publishable_8z6Zj-VJTcTKjDdZzs1baQ_mLoApdBO',
      activeBackend: 'supabase'
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
        if (!error && data && data.length > 0) list = data;
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
        if (!error && data) return data;
      } catch (err) {
        console.warn('Fallo Supabase getPaciente:', err);
      }
    }
    const local = this.getLocalData();
    return (local.pacientes || []).find(p => p.curp.toUpperCase() === cleanCurp) || null;
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
        console.warn('Supabase savePaciente:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.pacientes) local.pacientes = [];
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
        const { data, error } = await query.order('fecha', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTratamientos:', err);
      }
    }
    const local = this.getLocalData();
    let res = (local.tratamientos || []).filter(t => t.curp_paciente.toUpperCase() === cleanCurp);
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
        console.warn('Supabase addTratamiento:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.tratamientos) local.tratamientos = [];
    local.tratamientos.push(item);
    this.setLocalData(local);
    return item;
  }

  async updateTratamiento(id, changes) {
    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('tratamientos').update(changes).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateTratamiento:', err);
      }
    }

    const local = this.getLocalData();
    const idx = (local.tratamientos || []).findIndex(t => t.id === id);
    if (idx >= 0) {
      local.tratamientos[idx] = { ...local.tratamientos[idx], ...changes };
      this.setLocalData(local);
      return local.tratamientos[idx];
    }
    return null;
  }

  // ===================== ODONTOGRAMA (32 PIEZAS) =====================
  async getOdontograma(curp) {
    if (!curp) return DEFAULT_32_TEETH;
    const cleanCurp = curp.trim().toUpperCase();

    if (this.isCloudConnected()) {
      try {
        const { data, error } = await this.supabaseClient
          .from('odontograma')
          .select('*')
          .eq('curp_paciente', cleanCurp);
        if (!error && data && data.length > 0) {
          // Unir con posiciones base
          return DEFAULT_32_TEETH.map(base => {
            const row = data.find(r => r.diente_num === base.id);
            return row ? { ...base, estado: row.estado, notas: row.notas } : base;
          });
        }
      } catch (err) {
        console.warn('Supabase getOdontograma:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.odontograma) local.odontograma = {};
    if (!local.odontograma[cleanCurp]) {
      local.odontograma[cleanCurp] = JSON.parse(JSON.stringify(DEFAULT_32_TEETH));
      this.setLocalData(local);
    }
    return local.odontograma[cleanCurp];
  }

  async updateDiente(curp, dienteId, estado, notas = '') {
    const cleanCurp = curp.trim().toUpperCase();
    const dienteNum = Number(dienteId);

    if (this.isCloudConnected()) {
      try {
        const base = DEFAULT_32_TEETH.find(d => d.id === dienteNum);
        await this.supabaseClient.from('odontograma').upsert({
          curp_paciente: cleanCurp,
          diente_num: dienteNum,
          arcada: base ? base.arch : 'superior',
          nombre_pieza: base ? base.nombre : `Pieza ${dienteNum}`,
          pos_x: base ? base.x : 0,
          pos_y: base ? base.y : 0,
          estado: estado,
          notas: notas,
          updated_at: new Date().toISOString()
        }, { onConflict: 'curp_paciente,diente_num' });
      } catch (err) {
        console.warn('Supabase updateDiente:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.odontograma) local.odontograma = {};
    if (!local.odontograma[cleanCurp]) {
      local.odontograma[cleanCurp] = JSON.parse(JSON.stringify(DEFAULT_32_TEETH));
    }

    const item = local.odontograma[cleanCurp].find(d => d.id === dienteNum);
    if (item) {
      item.estado = estado;
      if (notas !== undefined) item.notas = notas;
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
        if (!error && data && data.length > 0) list = data;
      } catch (err) {
        console.warn('Supabase getCitas:', err);
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
        await this.supabaseClient.from('citas').insert({
          curp_paciente: item.curp_paciente,
          paciente_nombre: item.paciente_nombre,
          dentista: item.dentista,
          consultorio: item.consultorio,
          tratamiento: item.siguiente_tratamiento,
          costo: item.costo,
          fecha: item.fecha,
          hora: item.hora,
          estado: item.estado
        });
      } catch (err) {
        console.warn('Supabase saveCita:', err);
      }
    }

    const local = this.getLocalData();
    if (!local.citas) local.citas = [];
    local.citas.unshift(item);
    this.setLocalData(local);
    return item;
  }

  async updateEstadoCita(id, nuevoEstado) {
    if (this.isCloudConnected()) {
      try {
        await this.supabaseClient.from('citas').update({ estado: nuevoEstado }).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateEstadoCita:', err);
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
      throw new Error('Permiso denegado: Solo el personal administrativo tiene autorización para cobrar y gestionar caja.');
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
      // Pago presencial liquidado
    } else if (metodo === 'despues') {
      return { success: true, message: 'Pago programado para liquidación posterior', nuevoSaldo };
    }

    paciente.saldo = nuevoSaldo;
    await this.savePaciente(paciente);

    if (tratamientosIds && tratamientosIds.length > 0) {
      for (const tId of tratamientosIds) {
        await this.updateTratamiento(tId, { pagado: true });
      }
    }

    return { success: true, message: 'Pago registrado exitosamente (' + metodo.toUpperCase() + ')', nuevoSaldo };
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
      if (error && error.code !== 'PGRST205') throw error;
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

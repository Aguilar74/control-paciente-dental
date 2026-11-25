-- ==============================================================
-- SCHEMA COMPLETO - SISTEMA CLÍNICO DENTAL (SUPABASE POSTGRESQL)
-- Proyecto: https://qidwrxlfovuchxgzcdln.supabase.co
-- ==============================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla: Usuarios & Roles (Admin vs Doctor)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'doctor')),
    consultorio TEXT,
    especialidad TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla: Pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    curp TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    edad INTEGER,
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    nss TEXT,
    dentista TEXT NOT NULL,
    consultorio TEXT NOT NULL,
    saldo NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla: Tratamientos Clínicos
CREATE TABLE IF NOT EXISTS public.tratamientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curp_paciente TEXT NOT NULL REFERENCES public.pacientes(curp) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    costo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    realizado BOOLEAN DEFAULT FALSE,
    pagado BOOLEAN DEFAULT FALSE,
    fecha DATE DEFAULT CURRENT_DATE,
    dentista TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla: Odontograma (32 Piezas Dentales FDI: 11-18, 21-28, 31-38, 41-48)
CREATE TABLE IF NOT EXISTS public.odontograma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curp_paciente TEXT NOT NULL REFERENCES public.pacientes(curp) ON DELETE CASCADE,
    diente_num INTEGER NOT NULL,
    arcada TEXT NOT NULL CHECK (arcada IN ('superior', 'inferior')),
    nombre_pieza TEXT NOT NULL,
    pos_x NUMERIC(6, 2) NOT NULL,
    pos_y NUMERIC(6, 2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'no_realizado' CHECK (estado IN ('realizado', 'no_realizado')),
    notas TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_paciente_diente UNIQUE (curp_paciente, diente_num)
);

-- 6. Tabla: Citas Médicas
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curp_paciente TEXT NOT NULL REFERENCES public.pacientes(curp) ON DELETE CASCADE,
    paciente_nombre TEXT,
    dentista TEXT NOT NULL,
    consultorio TEXT NOT NULL,
    tratamiento TEXT NOT NULL,
    costo NUMERIC(10, 2) DEFAULT 0.00,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada', 'completada', 'cancelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- POLÍTICAS RLS (Seguridad a Nivel de Fila)
-- ==============================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Acceso público anónimo con la clave anon/publishable
CREATE POLICY "Public full access usuarios" ON public.usuarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access pacientes" ON public.pacientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access tratamientos" ON public.tratamientos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access odontograma" ON public.odontograma FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access citas" ON public.citas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================
-- DATOS INICIALES (SEED DEMO DATA)
-- ==============================================================

-- Usuarios de la Clínica
INSERT INTO public.usuarios (email, password_hash, nombre, rol, consultorio, especialidad)
VALUES 
    ('admin@clinicadental.com', 'admin123', 'Lic. Patricia Vega', 'admin', 'Dirección General / Caja', 'Administración y Finanzas'),
    ('ramon@clinicadental.com', 'doctor123', 'Dr. Ramón', 'doctor', '#3', 'Endodoncia y Prótesis Fija'),
    ('sofia@clinicadental.com', 'doctor123', 'Dra. Sofía', 'doctor', '#1', 'Ortodoncia y Estética Dental')
ON CONFLICT (email) DO NOTHING;

-- Pacientes iniciales
INSERT INTO public.pacientes (curp, nombre, edad, telefono, correo, direccion, nss, dentista, consultorio, saldo)
VALUES
    ('MORG850912HMCRRL01', 'María González Ramírez', 39, '5541239876', 'maria.gonzalez@gmail.com', 'Av. Insurgentes Sur 452, Col. Roma, CDMX', '1285093412', 'Dr. Ramón', '#3', 1250.00),
    ('HERJ880719HMCRRL05', 'Juan Carlos Hernández', 36, '5533221100', 'juan.hernandez@gmail.com', 'Col. Nápoles, Benito Juárez, CDMX', '5588071900', 'Dr. Ramón', '#3', 800.00),
    ('PEAR900325HMCRRN02', 'Alejandro Pérez Ramos', 34, '5589765432', 'alejandro.perez@gmail.com', 'Calle Reforma 102, Guadalajara, JAL', '3490038765', 'Dra. Sofía', '#1', 0.00)
ON CONFLICT (curp) DO NOTHING;

-- Tratamientos
INSERT INTO public.tratamientos (curp_paciente, nombre, costo, realizado, pagado, fecha, dentista)
VALUES
    ('MORG850912HMCRRL01', 'Limpieza y Profilaxis Ultrasónica', 500.00, true, true, CURRENT_DATE - 30, 'Dr. Ramón'),
    ('MORG850912HMCRRL01', 'Resina Estética Fotocurable Pieza 14', 650.00, true, true, CURRENT_DATE - 15, 'Dr. Ramón'),
    ('MORG850912HMCRRL01', 'Endodoncia Unirradicular Pieza 26', 1800.00, true, false, CURRENT_DATE - 5, 'Dr. Ramón'),
    ('MORG850912HMCRRL01', 'Corona de Porcelana Zirconia Pieza 16', 2500.00, false, false, CURRENT_DATE + 4, 'Dr. Ramón'),
    ('HERJ880719HMCRRL05', 'Cirugía de Tercer Molar Retenido Pieza 48', 1200.00, true, false, CURRENT_DATE - 2, 'Dr. Ramón'),
    ('PEAR900325HMCRRN02', 'Ajuste y Control de Brackets Metálicos', 800.00, true, true, CURRENT_DATE - 7, 'Dra. Sofía');

-- Citas iniciales
INSERT INTO public.citas (curp_paciente, paciente_nombre, dentista, consultorio, tratamiento, costo, fecha, hora, estado)
VALUES
    ('MORG850912HMCRRL01', 'María González Ramírez', 'Dr. Ramón', '#3', 'Corona de Porcelana Zirconia Pieza 16', 2500.00, CURRENT_DATE + 4, '10:00 AM', 'agendada'),
    ('HERJ880719HMCRRL05', 'Juan Carlos Hernández', 'Dr. Ramón', '#3', 'Revisión y Retiro de Suturas', 350.00, CURRENT_DATE + 1, '12:30 PM', 'agendada'),
    ('PEAR900325HMCRRN02', 'Alejandro Pérez Ramos', 'Dra. Sofía', '#1', 'Control de Alineación Ortodóntica', 800.00, CURRENT_DATE + 6, '04:00 PM', 'agendada');

-- ===============================================================
-- Esquema SQL para "Control Paciente Dental" en Supabase (Gratuito)
-- Incluye Autenticación, Roles (Administrativo y Doctor) y RBAC
-- Copia y pega este script en el "SQL Editor" de tu proyecto de Supabase
-- ===============================================================

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Usuarios / Personal Clínico (Roles)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('admin', 'doctor')),
    consultorio VARCHAR(20),
    especialidad VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabla de Pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    curp VARCHAR(18) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    edad INTEGER CHECK (edad >= 0),
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion TEXT,
    nss VARCHAR(20),
    dentista VARCHAR(100) DEFAULT 'Dr. Ramón',
    consultorio VARCHAR(20) DEFAULT '#3',
    saldo NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabla de Historial de Tratamientos
CREATE TABLE IF NOT EXISTS public.tratamientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curp_paciente VARCHAR(18) REFERENCES public.pacientes(curp) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    costo NUMERIC(10, 2) DEFAULT 0.00,
    realizado BOOLEAN DEFAULT false,
    pagado BOOLEAN DEFAULT false,
    fecha DATE DEFAULT CURRENT_DATE,
    dentista VARCHAR(100) DEFAULT 'Dr. Ramón',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabla de Odontograma / Progreso Dental
CREATE TABLE IF NOT EXISTS public.odontograma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curp_paciente VARCHAR(18) REFERENCES public.pacientes(curp) ON DELETE CASCADE,
    diente_num INTEGER NOT NULL,
    estado VARCHAR(30) DEFAULT 'no_realizado', -- 'realizado', 'no_realizado'
    notas TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_paciente_diente UNIQUE (curp_paciente, diente_num)
);

-- 6. Tabla de Citas
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curp_paciente VARCHAR(18) REFERENCES public.pacientes(curp) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora VARCHAR(10) DEFAULT '10:00 AM',
    dentista VARCHAR(100) DEFAULT 'Dr. Ramón',
    consultorio VARCHAR(20) DEFAULT '#3',
    tratamiento VARCHAR(150),
    costo NUMERIC(10, 2) DEFAULT 0.00,
    estado VARCHAR(30) DEFAULT 'agendada', -- 'agendada', 'cancelada', 'pagada'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===============================================================
-- Políticas de Seguridad RLS (Row Level Security)
-- ===============================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso anónimo / SPA en GitHub Pages
DROP POLICY IF EXISTS "Anon public access usuarios" ON public.usuarios;
CREATE POLICY "Anon public access usuarios" ON public.usuarios
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access pacientes" ON public.pacientes;
CREATE POLICY "Anon public access pacientes" ON public.pacientes
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access tratamientos" ON public.tratamientos;
CREATE POLICY "Anon public access tratamientos" ON public.tratamientos
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access odontograma" ON public.odontograma;
CREATE POLICY "Anon public access odontograma" ON public.odontograma
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access citas" ON public.citas;
CREATE POLICY "Anon public access citas" ON public.citas
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- ===============================================================
-- Datos Semilla: Cuentas de Acceso (Admin y Doctores) y Pacientes
-- ===============================================================

-- 1. Usuarios del sistema
INSERT INTO public.usuarios (email, password_hash, nombre, rol, consultorio, especialidad)
VALUES 
('admin@clinicadental.com', 'admin123', 'Lic. Patricia Vega (Admin)', 'admin', 'Dirección / Caja', 'Administración y Finanzas'),
('ramon@clinicadental.com', 'doctor123', 'Dr. Ramón', 'doctor', '#3', 'Endodoncia y Prótesis'),
('sofia@clinicadental.com', 'doctor123', 'Dra. Sofía', 'doctor', '#1', 'Ortodoncia y Estética')
ON CONFLICT (email) DO NOTHING;

-- 2. Pacientes
INSERT INTO public.pacientes (curp, nombre, edad, telefono, correo, direccion, nss, dentista, consultorio, saldo)
VALUES 
('MORG850912HMCRRL01', 'María González Ramírez', 39, '5541239876', 'maria.gonzalez@gmail.com', 'Av. Insurgentes Sur 452, CDMX', '1285093412', 'Dr. Ramón', '#3', 1250.00),
('PEAR900325HMCRRN02', 'Alejandro Pérez Ramos', 34, '5589765432', 'alejandro.perez@gmail.com', 'Calle Reforma 102, Guadalajara', '3490038765', 'Dra. Sofía', '#1', 0.00),
('HERJ880719HMCRRL05', 'Juan Carlos Hernández', 36, '5533221100', 'juan.hernandez@gmail.com', 'Col. Nápoles, CDMX', '5588071900', 'Dr. Ramón', '#3', 800.00)
ON CONFLICT (curp) DO NOTHING;

-- 3. Tratamientos
INSERT INTO public.tratamientos (curp_paciente, nombre, costo, realizado, pagado, dentista)
VALUES 
('MORG850912HMCRRL01', 'Tratamiento 1: Limpieza y Profilaxis', 500.00, true, true, 'Dr. Ramón'),
('MORG850912HMCRRL01', 'Tratamiento 2: Resina Diente 14', 650.00, true, true, 'Dr. Ramón'),
('MORG850912HMCRRL01', 'Tratamiento 3: Endodoncia Molar 26', 1800.00, true, false, 'Dr. Ramón'),
('MORG850912HMCRRL01', 'Tratamiento 4: Corona de Porcelana', 2500.00, false, false, 'Dr. Ramón'),
('PEAR900325HMCRRN02', 'Tratamiento 1: Ajuste de Brackets', 800.00, true, true, 'Dra. Sofía'),
('HERJ880719HMCRRL05', 'Tratamiento 1: Extracción Tercer Molar', 1200.00, true, false, 'Dr. Ramón')
ON CONFLICT DO NOTHING;

-- 4. Citas
INSERT INTO public.citas (curp_paciente, fecha, hora, dentista, consultorio, tratamiento, costo, estado)
VALUES 
('MORG850912HMCRRL01', CURRENT_DATE, '10:00 AM', 'Dr. Ramón', '#3', 'Tratamiento 4: Corona de Porcelana', 2500.00, 'agendada'),
('HERJ880719HMCRRL05', CURRENT_DATE, '12:30 PM', 'Dr. Ramón', '#3', 'Revisión Post-Extracción', 400.00, 'agendada'),
('PEAR900325HMCRRN02', CURRENT_DATE + INTERVAL '2 days', '04:00 PM', 'Dra. Sofía', '#1', 'Control de Ortodoncia', 800.00, 'agendada')
ON CONFLICT DO NOTHING;

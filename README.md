# 🦷 DentalCare Pro - Sistema Clínico Odontológico Integral

Sistema web profesional para la gestión de clínicas dentales, control de expedientes de pacientes, odontograma interactivo 360° (32 piezas anatómicas FDI), agenda médica y control de caja/facturación con roles de acceso diferenciados (**Doctor** vs **Administrativo**).

---

## 🌟 Características Principales

* **🎨 Diseño Clínico Profesional:** Interfaz moderna estilo SaaS Médico con paleta Slate/Teal/Emerald, tarjetas elevadas, tipografía Inter / Plus Jakarta Sans y diseño 100% responsivo.
* **🔐 Autenticación & Roles RBAC:**
  * **Doctor (🩺):** Acceso enfocado en la atención clínica: consulta y registro de sus propios pacientes, odontograma interactivo, tratamientos clínicos y agenda de citas asignada a su consultorio. Los módulos financieros y de cobro quedan completamente ocultos.
  * **Administrativo (👑):** Control financiero total: caja de cobros, liquidación de tratamientos pendientes, saldo a favor del paciente, métricas financieras en tiempo real (total recaudado, adeudos, pacientes, citas) y filtro global de la agenda de todos los doctores.
* **🦷 Odontograma 360° Multicapa:**
  * Ilustración de alta resolución de la **Arcada Superior (Maxilar)** y **Arcada Inferior (Mandíbula)**.
  * 32 piezas dentales permanentes mapeadas con la nomenclatura internacional **FDI** (18-28 y 48-38).
  * Estados clínicos por pieza: 🟢 Realizado / Sano vs 🟡 No realizado / En tratamiento.
  * Modal interactivo para actualizar diagnóstico, notas clínicas y costos por pieza.
* **☁️ Integración Supabase BaaS:**
  * Conectado a Supabase PostgreSQL (`https://qidwrxlfovuchxgzcdln.supabase.co`).
  * Modo híbrido con tolerancia a fallos: sincronización en tiempo real y respaldo automático en `LocalStorage` con datos demo precargados.

---

## 🔑 Cuentas de Acceso Rápido (Demo)

Puedes ingresar manualmente o usar los botones de 1 clic en la pantalla de inicio:
* 👑 **Administración:** `admin@clinicadental.com` / `admin123`
* 🩺 **Dr. Ramón (Endodoncia):** `ramon@clinicadental.com` / `doctor123` (Consultorio #3)
* 👩‍⚕️ **Dra. Sofía (Ortodoncia):** `sofia@clinicadental.com` / `doctor123` (Consultorio #1)

---

## 🚀 Despliegue en GitHub Pages

1. **Crear el repositorio en GitHub:**
   * Entra a [https://github.com/new?name=control-paciente-dental](https://github.com/new?name=control-paciente-dental).
   * Deja la opción **Public** seleccionada y **no** marques "Add README" (el proyecto local ya lo tiene).
   * Haz clic en **Create repository**.

2. **Subir el código:**
   Abre una terminal PowerShell en esta carpeta y ejecuta:
   ```bash
   git push -u origin main
   ```

3. **Activar GitHub Pages:**
   * En tu repositorio de GitHub, ve a **Settings** -> **Pages**.
   * En **Build and deployment > Source**, selecciona **Deploy from a branch**.
   * En **Branch**, selecciona `main` / `/(root)` y haz clic en **Save**.
   * En 1 minuto tendrás tu enlace público listo para compartir (ej. `https://Aguilar74.github.io/control-paciente-dental/`).

---

## 🗄️ Inicialización de Tablas en Supabase

1. Abre el Editor SQL de tu proyecto: [https://supabase.com/dashboard/project/qidwrxlfovuchxgzcdln/sql/new](https://supabase.com/dashboard/project/qidwrxlfovuchxgzcdln/sql/new).
2. Copia y pega el contenido completo de `supabase-schema.sql`.
3. Haz clic en **Run**. ¡Tus tablas y datos iniciales quedarán sincronizados en la nube!

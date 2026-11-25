# 🦷 Control Paciente Dental - Aplicación Web Clínica

Aplicación web moderna, estética y completamente funcional para la gestión y control clínico de pacientes odontológicos, diseñada con base en el boceto original con paleta verde menta y esmeralda (`#0E9F8E`, `#E3F3EF`, `#0F2E3D`).

---

## ✨ Características Principales

1. **Gestión de Pacientes:**
   - Registro de nuevos pacientes con validación (Nombre, Edad, Teléfono, Correo, Dirección, NSS, CURP, Dentista y Consultorio).
   - Ficha médica completa con búsqueda por CURP en tiempo real y selector rápido de pacientes.
   - Historial de tratamientos con insignias de estado (*Realizado / No realizado*, *Pagado / No pagado*).

2. **Odontograma Interactivo:**
   - Mapa dental con 16 piezas superiores e inferiores correspondientes a la arcada clínica.
   - Marcadores visuales de estado: Verde (`#2FB380`) para procedimientos realizados, Amarillo (`#F6A93B`) para no realizados o pendientes.
   - Modo de visualización actual y modo de actualización interactiva para registrar diagnósticos y notas por pieza.

3. **Agendamiento de Citas:**
   - Formulario para programar nuevas citas (Dentista, Consultorio, Tratamiento, Fecha, Hora y Costo estimado).
   - Consulta de citas programadas con opción de cancelación o pase directo a pago.

4. **Pagos y Control de Saldos:**
   - Tarjeta verde esmeralda con saldo disponible del paciente.
   - Resumen y cálculo automático de citas y tratamientos con adeudo pendiente.
   - Métodos de pago funcionales: *Pagar saldo* (descuenta del saldo a favor), *Pagar físico* (efectivo/terminal) y *Pagar después* (compromiso de pago).

5. **Base de Datos Gratuita Híbrida (Supabase + LocalStorage):**
   - **Modo Supabase (BaaS PostgreSQL en la nube):** Permite sincronizar los datos en tiempo real entre múltiples dispositivos sin requerir un servidor Node.js o Python.
   - **Modo Local / Demo Automático:** Si no se configuran credenciales o no hay internet, la aplicación funciona al 100% de forma local en el navegador con datos precargados listos para probar y mostrar a tus amigos.
   - Panel de configuración integrado con prueba de conexión, descarga de respaldo en JSON e importación de datos.

---

## 🗄️ Configuración de Base de Datos Gratuita en Supabase

Si deseas activar la sincronización en la nube con Supabase (100% gratuito):

1. Ve a [Supabase.com](https://supabase.com) y crea un proyecto gratuito.
2. En el menú lateral izquierdo, abre el **SQL Editor**.
3. Abre el archivo `supabase-schema.sql` de este proyecto, copia todo su contenido, pégalo en el editor SQL de Supabase y haz clic en **Run**.
4. Ve a **Project Settings** > **API**.
5. Copia la **Project URL** y la **Anon Key** (clave pública).
6. En la aplicación web, haz clic en la etiqueta superior que dice **"Modo Local / Demo"**, pega tu URL y tu Anon Key, y haz clic en **Guardar y Conectar**.
7. ¡Listo! Tu aplicación estará sincronizada con PostgreSQL en la nube.

---

## 🚀 Cómo Subir y Publicar en GitHub Pages

Para compartir la página montada y accesible desde cualquier navegador o teléfono móvil:

### Paso 1: Crear un nuevo repositorio en GitHub
1. Entra a tu cuenta de [GitHub](https://github.com/new).
2. Nombra tu repositorio (por ejemplo: `control-paciente-dental`).
3. Elige que sea **Público** y haz clic en **Create repository**.

### Paso 2: Subir el código desde la terminal
Abre la terminal en la carpeta del proyecto (`C:\Users\Francisco\control-paciente-dental`) y ejecuta:

```bash
git init
git add .
git commit -m "feat: Sistema funcional Control Paciente Dental"
git branch -M main
git remote add origin https://github.com/TU_USUARIO_GITHUB/control-paciente-dental.git
git push -u origin main
```

### Paso 3: Activar GitHub Pages
1. En tu repositorio en GitHub, ve a la pestaña **Settings** (Configuración).
2. En el menú lateral izquierdo, selecciona **Pages**.
3. En la sección **Build and deployment** > **Branch**:
   - Selecciona la rama: `main`.
   - Carpeta: `/ (root)`.
   - Haz clic en **Save**.
4. Espera 1 minuto y GitHub te dará el enlace público:  
   `https://TU_USUARIO_GITHUB.github.io/control-paciente-dental/`
5. ¡Compártela con tus amigos! Al abrir el enlace verán la página funcionando inmediatamente con todos los datos y funciones.

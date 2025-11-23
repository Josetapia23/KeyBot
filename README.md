# 🤖 KeyDrop Bot - Automatización de Sorteos

Bot automatizado para participar en sorteos de KeyDrop cada 2 minutos. Diseñado para no perderte ningún sorteo "Amateur".

## 🎯 Características

- ✅ Participación automática cada 2 minutos (configurable)
- ✅ Persistencia de sesión (no necesitas hacer login cada vez)
- ✅ Modo headless (ejecución en segundo plano)
- ✅ Logs detallados con colores
- ✅ Anti-detección básica
- ✅ Manejo robusto de errores

## 📋 Requisitos Previos

- **Node.js** (versión 16 o superior)
- **npm** o **yarn**
- Una cuenta activa en KeyDrop

## 🚀 Instalación

1. **Clona o descarga este repositorio**

2. **Instala las dependencias:**
```bash
npm install
```

3. **Configura las variables de entorno:**
```bash
cp .env.example .env
```

Edita el archivo `.env` si quieres cambiar la configuración por defecto:
```env
# Tiempo de espera entre participaciones (en milisegundos)
WAIT_TIME=120000  # 2 minutos

# Modo headless (true = oculto, false = visible)
HEADLESS=true

# URL del sorteo
GIVEAWAY_URL=https://keydrop.com/es/giveaways/list
```

## 🎮 Uso

### Primera vez (Login)

La primera vez que ejecutes el bot, necesitas hacer login manualmente:

```bash
npm run test
```

Este comando abrirá el navegador en modo visible. Sigue estos pasos:

1. El navegador se abrirá automáticamente
2. Inicia sesión en KeyDrop con tu cuenta
3. El bot guardará tu sesión automáticamente
4. Después de 5 minutos (o cuando veas que está logueado), puedes cerrar el bot con `Ctrl+C`

### Ejecución Normal

Una vez que hayas iniciado sesión, ejecuta el bot en modo normal:

```bash
npm start
```

El bot:
- ✅ Se ejecutará en segundo plano (headless)
- ✅ Participará automáticamente cada 2 minutos
- ✅ Mostrará logs de cada acción
- ✅ Guardará un contador de participaciones

**Para detener el bot:** Presiona `Ctrl+C`

## 📊 Ejemplo de Logs

```
[23/11/2025 10:30:15] 🚀 Iniciando KeyDrop Bot...
[23/11/2025 10:30:16] ✅ Navegador iniciado correctamente
[23/11/2025 10:30:18] ✅ Sesión activa detectada
[23/11/2025 10:30:18] 💾 Sesión guardada
[23/11/2025 10:30:18] 🔄 Iniciando loop de participación...
[23/11/2025 10:30:18] ⏰ Participando cada 120 segundos
[23/11/2025 10:30:20] 🎯 Buscando sorteo Amateur...
[23/11/2025 10:30:22] ✅ Sorteo Amateur encontrado
[23/11/2025 10:30:23] 🎉 ¡Participación exitosa! Total: 1
[23/11/2025 10:30:24] ⬅️  Regresando a la lista de sorteos
[23/11/2025 10:30:24] ⏳ Esperando 2m 0s hasta la próxima participación...
```

## ⚙️ Configuración Avanzada

### Cambiar tiempo de espera

Para participar cada 3 minutos en lugar de 2, edita el archivo `.env`:

```env
WAIT_TIME=180000  # 3 minutos = 180000 ms
```

### Ejecutar con navegador visible (para debugging)

```bash
npm run test
```

O edita el `.env`:
```env
HEADLESS=false
```

## 🛠️ Solución de Problemas

### El bot no encuentra el sorteo Amateur

Los selectores CSS pueden cambiar si KeyDrop actualiza su sitio. En ese caso:

1. Abre el archivo `bot.js`
2. Busca la sección `participateInGiveaway()`
3. Ajusta los selectores según la nueva estructura de la página

### El bot se desconecta después de un tiempo

La sesión puede expirar. Simplemente ejecuta de nuevo:
```bash
npm run test
```

Y vuelve a hacer login.

### Error de instalación

Si tienes problemas instalando Playwright, intenta:
```bash
npx playwright install
```

## 📁 Estructura del Proyecto

```
KeyBot/
├── bot.js              # Script principal del bot
├── package.json        # Dependencias
├── .env               # Configuración (no se sube a git)
├── .env.example       # Ejemplo de configuración
├── .gitignore         # Archivos ignorados por git
├── session/           # Carpeta con sesión guardada (se crea automáticamente)
└── README.md          # Este archivo
```

## ⚠️ Advertencias Importantes

- ⚠️ **Uso bajo tu propio riesgo**: Este bot es para uso educativo. Asegúrate de que usar bots no viole los términos de servicio de KeyDrop.
- ⚠️ **No compartas tu sesión**: El directorio `session/` contiene tus cookies de login. No lo compartas.
- ⚠️ **Monitorea el bot**: Aunque tiene manejo de errores, es recomendable revisar los logs ocasionalmente.

## 🤝 Contribuciones

Si encuentras algún bug o quieres mejorar el bot:

1. Haz un fork del repositorio
2. Crea una rama con tu feature (`git checkout -b feature/mejora`)
3. Haz commit de tus cambios (`git commit -am 'Agrega nueva mejora'`)
4. Push a la rama (`git push origin feature/mejora`)
5. Abre un Pull Request

## 📝 Notas

- El bot usa Playwright, que es más moderno y robusto que Puppeteer
- Incluye técnicas básicas de anti-detección de bots
- La sesión se guarda localmente, por lo que no necesitas hacer login cada vez

## 🐛 Debugging

Si necesitas ver exactamente qué está haciendo el bot:

1. Cambia `HEADLESS=false` en el `.env`
2. Ejecuta `npm start`
3. Verás el navegador en acción

## 📞 Soporte

Si tienes problemas:
1. Revisa la sección de "Solución de Problemas"
2. Verifica que Node.js esté instalado correctamente
3. Asegúrate de haber ejecutado `npm install`
4. Revisa los logs del bot para ver errores específicos

---

**Hecho con ❤️ para no perderse ningún sorteo**

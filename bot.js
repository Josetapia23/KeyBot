const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración
const CONFIG = {
    GIVEAWAY_URL: process.env.GIVEAWAY_URL || 'https://keydrop.com/es/giveaways/list',
    WAIT_TIME: parseInt(process.env.WAIT_TIME) || 120000, // 2 minutos por defecto
    HEADLESS: process.env.HEADLESS !== 'false', // true por defecto
    SESSION_DIR: path.join(__dirname, 'session')
};

// Colores para los logs
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleString('es-ES');
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

class KeyDropBot {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.participationCount = 0;
    }

    async init() {
        log('🚀 Iniciando KeyDrop Bot...', 'cyan');

        // Crear directorio de sesión si no existe
        if (!fs.existsSync(CONFIG.SESSION_DIR)) {
            fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
            log('📁 Directorio de sesión creado', 'yellow');
        }

        // Lanzar navegador con opciones anti-detección
        this.browser = await chromium.launch({
            headless: CONFIG.HEADLESS,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        // Crear contexto con sesión persistente
        this.context = await this.browser.newContext({
            storageState: fs.existsSync(path.join(CONFIG.SESSION_DIR, 'state.json'))
                ? path.join(CONFIG.SESSION_DIR, 'state.json')
                : undefined,
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        this.page = await this.context.newPage();
        log('✅ Navegador iniciado correctamente', 'green');
    }

    async checkLogin() {
        log('🔍 Verificando estado de sesión...', 'yellow');

        await this.page.goto(CONFIG.GIVEAWAY_URL, {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        // Esperar un poco para que cargue la página
        await this.page.waitForTimeout(3000);

        // Verificar si hay un botón de login o si ya está logueado
        // Ajusta estos selectores según la estructura real de KeyDrop
        const isLoggedIn = await this.page.evaluate(() => {
            // Verificar si hay elementos que indiquen que está logueado
            // Por ejemplo, avatar de usuario, nombre de usuario, etc.
            return !document.querySelector('a[href*="login"]') &&
                   !document.querySelector('button:has-text("Login")');
        });

        if (!isLoggedIn) {
            log('⚠️  No has iniciado sesión. Por favor:', 'yellow');
            log('   1. El navegador se abrirá (si está en modo headless, cámbialo a headless=false)', 'yellow');
            log('   2. Inicia sesión manualmente en KeyDrop', 'yellow');
            log('   3. El bot guardará tu sesión automáticamente', 'yellow');

            // Si está en modo headless, avisar que debe cambiar
            if (CONFIG.HEADLESS) {
                log('   💡 Ejecuta: npm run test (para ver el navegador y hacer login)', 'cyan');
                await this.cleanup();
                process.exit(0);
            }

            // Esperar a que el usuario haga login (esperar mucho tiempo)
            log('⏳ Esperando que inicies sesión... (tienes 5 minutos)', 'yellow');
            await this.page.waitForTimeout(300000); // 5 minutos
        } else {
            log('✅ Sesión activa detectada', 'green');
        }

        // Guardar estado de la sesión
        await this.context.storageState({ path: path.join(CONFIG.SESSION_DIR, 'state.json') });
        log('💾 Sesión guardada', 'green');
    }

    async participateInGiveaway() {
        try {
            log('🎯 Buscando sorteo Amateur...', 'cyan');

            // Navegar a la página de sorteos
            await this.page.goto(CONFIG.GIVEAWAY_URL, {
                waitUntil: 'networkidle',
                timeout: 60000
            });

            // Esperar a que cargue la página
            await this.page.waitForTimeout(2000);

            // Buscar el sorteo Amateur
            // Nota: Estos selectores son aproximados y deberán ajustarse según la estructura real
            const amateurGiveaway = await this.page.locator('text=Amateur').first();

            if (await amateurGiveaway.count() > 0) {
                log('✅ Sorteo Amateur encontrado', 'green');

                // Hacer clic en el sorteo Amateur
                await amateurGiveaway.click();
                await this.page.waitForTimeout(2000);

                // Buscar y hacer clic en el botón de "Unirse al sorteo"
                // Ajusta el selector según el texto real del botón
                const joinButton = this.page.locator('button:has-text("Unirse"), button:has-text("Join"), button:has-text("Participar")').first();

                if (await joinButton.count() > 0) {
                    await joinButton.click();
                    this.participationCount++;
                    log(`🎉 ¡Participación exitosa! Total: ${this.participationCount}`, 'green');

                    await this.page.waitForTimeout(1000);

                    // Volver atrás
                    await this.page.goBack();
                    log('⬅️  Regresando a la lista de sorteos', 'blue');
                } else {
                    log('⚠️  No se encontró el botón de participar (puede que ya hayas participado)', 'yellow');
                    await this.page.goBack();
                }
            } else {
                log('❌ No se encontró el sorteo Amateur', 'red');
            }

        } catch (error) {
            log(`❌ Error al participar: ${error.message}`, 'red');
            // Intentar volver a la página principal
            try {
                await this.page.goto(CONFIG.GIVEAWAY_URL);
            } catch (e) {
                log('❌ Error al volver a la página principal', 'red');
            }
        }
    }

    async run() {
        await this.init();
        await this.checkLogin();

        log('🔄 Iniciando loop de participación...', 'cyan');
        log(`⏰ Participando cada ${CONFIG.WAIT_TIME / 1000} segundos`, 'cyan');
        log('   Presiona Ctrl+C para detener el bot', 'yellow');
        console.log('');

        // Loop infinito
        while (true) {
            await this.participateInGiveaway();

            const waitMinutes = Math.floor(CONFIG.WAIT_TIME / 60000);
            const waitSeconds = Math.floor((CONFIG.WAIT_TIME % 60000) / 1000);
            log(`⏳ Esperando ${waitMinutes}m ${waitSeconds}s hasta la próxima participación...`, 'yellow');

            await this.page.waitForTimeout(CONFIG.WAIT_TIME);
        }
    }

    async cleanup() {
        log('🧹 Cerrando navegador...', 'yellow');
        if (this.browser) {
            await this.browser.close();
        }
        log('👋 Bot detenido', 'cyan');
    }
}

// Manejo de señales de terminación
async function handleExit(bot) {
    await bot.cleanup();
    process.exit(0);
}

// Ejecutar bot
(async () => {
    const bot = new KeyDropBot();

    // Manejar Ctrl+C y otras señales
    process.on('SIGINT', () => handleExit(bot));
    process.on('SIGTERM', () => handleExit(bot));

    try {
        await bot.run();
    } catch (error) {
        log(`❌ Error fatal: ${error.message}`, 'red');
        console.error(error);
        await bot.cleanup();
        process.exit(1);
    }
})();

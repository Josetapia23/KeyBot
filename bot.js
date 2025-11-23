const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración
const CONFIG = {
    GIVEAWAY_URL: process.env.GIVEAWAY_URL || 'https://keydrop.com/es/giveaways/list',
    WAIT_TIME: parseInt(process.env.WAIT_TIME) || 120000, // 2 minutos por defecto
    HEADLESS: process.env.HEADLESS !== 'false', // true por defecto
    USE_BRAVE: process.env.USE_BRAVE === 'true', // Usar Brave en lugar de Chromium
    BRAVE_PATH: process.env.BRAVE_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    BRAVE_USER_DATA: process.env.BRAVE_USER_DATA || path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\User Data'),
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

        if (CONFIG.USE_BRAVE) {
            log('🦁 Usando tu navegador Brave con tu sesión existente...', 'cyan');
            log('⚠️  Asegúrate de cerrar completamente Brave antes de continuar', 'yellow');

            // Verificar que exista el ejecutable de Brave
            if (!fs.existsSync(CONFIG.BRAVE_PATH)) {
                log(`❌ No se encuentra Brave en: ${CONFIG.BRAVE_PATH}`, 'red');
                log('💡 Edita el archivo .env y corrige la ruta BRAVE_PATH', 'yellow');
                process.exit(1);
            }

            // Verificar que exista el directorio de perfil
            if (!fs.existsSync(CONFIG.BRAVE_USER_DATA)) {
                log(`❌ No se encuentra el perfil de Brave en: ${CONFIG.BRAVE_USER_DATA}`, 'red');
                log('💡 Edita el archivo .env y corrige la ruta BRAVE_USER_DATA', 'yellow');
                process.exit(1);
            }

            try {
                // Usar el contexto persistente de Brave (con tu perfil y sesión)
                this.context = await chromium.launchPersistentContext(CONFIG.BRAVE_USER_DATA, {
                    headless: false, // Brave no soporta headless con perfil de usuario
                    executablePath: CONFIG.BRAVE_PATH,
                    viewport: { width: 1920, height: 1080 },
                    args: [
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-setuid-sandbox'
                    ]
                });

                this.page = this.context.pages()[0] || await this.context.newPage();
                log('✅ Brave iniciado con tu perfil', 'green');
                log('🔑 Usando tu sesión existente de KeyDrop', 'green');
            } catch (error) {
                log('❌ Error al abrir Brave. Posibles causas:', 'red');
                log('   1. Brave ya está abierto - CIÉRRALO completamente', 'yellow');
                log('   2. Otra instancia del bot está corriendo', 'yellow');
                log('   3. El perfil está bloqueado', 'yellow');
                throw error;
            }

        } else {
            // Método original con Chromium de Playwright
            log('🌐 Usando Chromium de Playwright...', 'cyan');

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
    }

    async checkLogin() {
        log('🔍 Verificando estado de sesión...', 'yellow');

        await this.page.goto(CONFIG.GIVEAWAY_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Esperar un poco para que cargue la página completamente
        await this.page.waitForTimeout(5000);

        if (CONFIG.USE_BRAVE) {
            // Si usa Brave con su perfil, asumimos que ya está logueado
            log('✅ Usando perfil de Brave - sesión activa', 'green');
            return;
        }

        // Verificar si hay un botón de login o si ya está logueado
        const isLoggedIn = await this.page.evaluate(() => {
            // Buscar indicadores comunes de login
            const loginLink = document.querySelector('a[href*="login"]');
            const loginButton = document.querySelector('button[class*="login"]');
            const signInButton = document.querySelector('button[class*="sign-in"]');

            // Si no encuentra ningún botón de login, asume que está logueado
            return !loginLink && !loginButton && !signInButton;
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

        // Guardar estado de la sesión (solo si no usa Brave)
        if (!CONFIG.USE_BRAVE) {
            await this.context.storageState({ path: path.join(CONFIG.SESSION_DIR, 'state.json') });
            log('💾 Sesión guardada', 'green');
        }
    }

    async participateInGiveaway() {
        try {
            log('🎯 Buscando sorteo Amateur...', 'cyan');

            // Navegar a la página de sorteos
            await this.page.goto(CONFIG.GIVEAWAY_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Esperar a que cargue la página completamente
            await this.page.waitForTimeout(3000);

            // Buscar el sorteo Amateur
            let foundCard = false;
            let amateurGiveawayUrl = null;

            try {
                // Método que funcionaba: Buscar el texto "AMATEUR"
                const amateurExists = await this.page.getByText(/amateur/i).count();
                log(`🔍 Elementos con "Amateur" encontrados: ${amateurExists}`, 'blue');

                if (amateurExists > 0) {
                    // Encontrar el texto "AMATEUR GIVEAWAY"
                    const amateurText = this.page.getByText(/amateur\s*giveaway/i).first();

                    if (await amateurText.count() > 0) {
                        log('✅ Encontrado "AMATEUR GIVEAWAY"', 'green');

                        // Intentar obtener el enlace padre o cercano
                        // Método 1: Buscar en el DOM el enlace que rodea este texto
                        amateurGiveawayUrl = await this.page.evaluate(() => {
                            // Buscar todos los elementos que contengan "AMATEUR GIVEAWAY"
                            const elements = Array.from(document.querySelectorAll('*'));
                            const amateurElement = elements.find(el => {
                                const text = el.textContent || '';
                                return text.includes('AMATEUR') && text.includes('GIVEAWAY') && el.children.length < 10;
                            });

                            if (amateurElement) {
                                // Buscar el enlace más cercano (padre o ancestro)
                                let current = amateurElement;
                                while (current && current !== document.body) {
                                    if (current.tagName === 'A' && current.href) {
                                        return current.href;
                                    }
                                    current = current.parentElement;
                                }

                                // Si no encontró como padre, buscar enlace dentro del mismo elemento
                                const link = amateurElement.querySelector('a[href*="/giveaways/"]');
                                if (link) {
                                    return link.href;
                                }
                            }
                            return null;
                        });

                        if (amateurGiveawayUrl) {
                            log(`🔗 URL del sorteo Amateur: ${amateurGiveawayUrl}`, 'green');
                            // Navegar directamente a la URL
                            await this.page.goto(amateurGiveawayUrl, {
                                waitUntil: 'domcontentloaded',
                                timeout: 30000
                            });
                            foundCard = true;
                        } else {
                            log('⚠️  No se pudo obtener la URL del sorteo', 'yellow');
                            // Intentar hacer clic en el texto directamente (método anterior)
                            await amateurText.click({ force: true });
                            await this.page.waitForTimeout(2000);

                            // Verificar si la URL cambió
                            const currentUrl = this.page.url();
                            if (!currentUrl.includes('/giveaways/list')) {
                                log(`🔗 Navegado a: ${currentUrl}`, 'green');
                                foundCard = true;
                            } else {
                                log('⚠️  El clic no navegó a la página del sorteo', 'yellow');
                            }
                        }
                    }
                }

                if (!foundCard) {
                    log('❌ No se encontró el sorteo Amateur', 'red');

                    // Debug: Tomar screenshot para ver qué hay en la página
                    try {
                        const screenshotPath = path.join(__dirname, 'debug_screenshot.png');
                        await this.page.screenshot({ path: screenshotPath });
                        log(`📸 Screenshot guardado en: ${screenshotPath}`, 'yellow');
                    } catch (e) {
                        log('⚠️  No se pudo guardar screenshot', 'yellow');
                    }

                    return false; // Retornar false cuando no encuentra el sorteo
                }
            } catch (error) {
                log(`❌ Error al buscar sorteo: ${error.message}`, 'red');
                return false;
            }

            if (foundCard) {
                // Esperar a que cargue la nueva página
                await this.page.waitForLoadState('domcontentloaded');
                await this.page.waitForTimeout(2000);

                // Verificar que estamos en la página correcta
                const currentUrl = this.page.url();
                log(`📍 Navegado a: ${currentUrl}`, 'blue');

                // Buscar el botón de "Unirse al sorteo" usando el data-testid
                const joinButton = this.page.locator('[data-testid="btn-single-card-giveaway-join"]').first();

                if (await joinButton.count() > 0) {
                    // Verificar el texto del botón antes de hacer clic
                    const buttonText = await joinButton.textContent();
                    log(`🔍 Texto del botón: "${buttonText}"`, 'blue');

                    // Verificar si ya está unido (el botón dice "ÚNETE DE NUEVO" o similar)
                    if (buttonText && (buttonText.includes('DE NUEVO') || buttonText.includes('AGAIN'))) {
                        log('⚠️  Ya participaste en este sorteo anteriormente', 'yellow');
                        await this.page.goto(CONFIG.GIVEAWAY_URL);
                        return false;
                    }

                    log('✅ Botón "Unirse al sorteo" encontrado', 'green');
                    log('🖱️  Haciendo clic en el botón...', 'cyan');

                    await joinButton.click({ force: true });

                    // Esperar a que el botón cambie de texto (indicador de que se unió exitosamente)
                    log('⏳ Esperando confirmación de participación...', 'yellow');

                    try {
                        // Esperar hasta 10 segundos a que el botón cambie a "ÚNETE DE NUEVO"
                        await this.page.waitForFunction(() => {
                            const button = document.querySelector('[data-testid="btn-single-card-giveaway-join"]');
                            if (!button) return false;
                            const text = button.textContent || '';
                            return text.includes('DE NUEVO') || text.includes('AGAIN');
                        }, { timeout: 10000 });

                        log('✅ ¡Botón cambió a "ÚNETE DE NUEVO" - Participación confirmada!', 'green');
                        this.participationCount++;
                        log(`🎉 ¡Participación exitosa! Total: ${this.participationCount}`, 'green');

                        // Esperar un poco más para que se procese completamente
                        await this.page.waitForTimeout(3000);

                        // Volver a la lista de sorteos
                        await this.page.goto(CONFIG.GIVEAWAY_URL);
                        log('⬅️  Regresado a la lista de sorteos', 'blue');

                        return true; // Retornar true cuando se une exitosamente

                    } catch (timeoutError) {
                        log('⚠️  El botón no cambió - puede que ya estuvieras participando o hubo un error', 'yellow');

                        // Tomar screenshot para debug
                        try {
                            const screenshotPath = path.join(__dirname, 'debug_after_click.png');
                            await this.page.screenshot({ path: screenshotPath });
                            log(`📸 Screenshot guardado en: ${screenshotPath}`, 'yellow');
                        } catch (e) {
                            // Ignorar error de screenshot
                        }

                        // Volver a la lista
                        await this.page.goto(CONFIG.GIVEAWAY_URL);
                        return false;
                    }
                } else {
                    log('⚠️  No se encontró el botón de participar', 'yellow');
                    // Volver a la lista
                    await this.page.goto(CONFIG.GIVEAWAY_URL);
                    return false; // Retornar false cuando no encuentra el botón
                }
            }

            return false; // Por defecto retornar false

        } catch (error) {
            log(`❌ Error al participar: ${error.message}`, 'red');
            // Intentar volver a la página principal
            try {
                await this.page.goto(CONFIG.GIVEAWAY_URL);
            } catch (e) {
                log('❌ Error al volver a la página principal', 'red');
            }
            return false; // Retornar false en caso de error
        }
    }

    async run() {
        await this.init();
        await this.checkLogin();

        log('🔄 Iniciando loop de participación...', 'cyan');
        log(`⏰ Esperando ${CONFIG.WAIT_TIME / 1000} segundos después de cada participación exitosa`, 'cyan');
        log('   Presiona Ctrl+C para detener el bot', 'yellow');
        console.log('');

        // Loop infinito
        while (true) {
            const success = await this.participateInGiveaway();

            if (success) {
                // Solo esperar los 2 minutos si la participación fue exitosa
                const waitMinutes = Math.floor(CONFIG.WAIT_TIME / 60000);
                const waitSeconds = Math.floor((CONFIG.WAIT_TIME % 60000) / 1000);
                log(`⏳ Esperando ${waitMinutes}m ${waitSeconds}s hasta la próxima participación...`, 'yellow');
                await this.page.waitForTimeout(CONFIG.WAIT_TIME);
            } else {
                // Si no tuvo éxito, reintentar en 5 segundos
                log('🔄 Reintentando en 5 segundos...', 'yellow');
                await this.page.waitForTimeout(5000);
            }
        }
    }

    async cleanup() {
        log('🧹 Cerrando navegador...', 'yellow');
        if (CONFIG.USE_BRAVE) {
            // En modo Brave, cerramos el contexto
            if (this.context) {
                await this.context.close();
            }
        } else {
            // En modo Chromium, cerramos el browser
            if (this.browser) {
                await this.browser.close();
            }
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

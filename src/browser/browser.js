import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { saveSession, saveAuthToken, loadAccountCookies, loadAuthToken } from './session.js';
import { startManualAuthentication } from './auth.js';
import { clearPagePool, getAuthToken } from '../api/chat.js';
import fs from 'fs';
import path from 'path';
import { logInfo, logError, logWarn, logDebug } from '../logger/index.js';
import {
    CHAT_PAGE_URL, NAVIGATION_TIMEOUT, RETRY_DELAY, PROTOCOL_TIMEOUT,
    VIEWPORT_WIDTH, VIEWPORT_HEIGHT, USER_AGENT,
    SESSION_DIR, ACCOUNTS_DIR
} from '../config.js';

puppeteer.use(StealthPlugin());

let browserInstance = null;
let browserContext = null;
export let isAuthenticated = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function initBrowser(visibleMode = true, skipManualRestart = false) {
    if (browserInstance) {
        const connected = typeof browserInstance.isConnected === 'function'
            ? browserInstance.isConnected()
            : browserInstance.connected !== false;
        const pageOpen = browserContext && (typeof browserContext.isClosed !== 'function' || !browserContext.isClosed());
        if (connected && pageOpen) return true;
        await shutdownBrowser();
    }

    logInfo('Инициализация браузера с Puppeteer Stealth...');
    try {
        const launchedBrowser = await puppeteer.launch({
            headless: !visibleMode,
            slowMo: visibleMode ? 30 : 0,
            executablePath: process.env.CHROME_PATH || undefined,
            userDataDir: process.env.CHROME_USER_DATA_DIR || undefined,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage', '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
                '--start-maximized', '--disable-infobars',
                '--disable-extensions', '--disable-gpu',
                '--no-first-run', '--no-default-browser-check',
                '--ignore-certificate-errors', '--ignore-certificate-errors-spki-list'
            ],
            defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
            protocolTimeout: PROTOCOL_TIMEOUT,
            ignoreHTTPSErrors: true
        });
        browserInstance = launchedBrowser;
        launchedBrowser.on('disconnected', () => {
            if (browserInstance === launchedBrowser) {
                browserInstance = null;
                browserContext = null;
            }
        });

        const pages = await browserInstance.pages();
        const page = pages.length > 0 ? pages[0] : await browserInstance.newPage();

        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [{ 0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }, description: 'Portable Document Format', filename: 'internal-pdf-viewer', length: 1, name: 'Chrome PDF Plugin' }]
            });
            Object.defineProperty(navigator, 'connection', {
                get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false })
            });
            if (!navigator.getBattery) {
                navigator.getBattery = () => Promise.resolve({ charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1 });
            }

            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function (type, listener, options) {
                if (type === 'mousemove' || type === 'mousedown' || type === 'mouseup') {
                    const wrappedListener = function (event) { setTimeout(() => listener.call(this, event), Math.random() * 3); };
                    return originalAddEventListener.call(this, type, wrappedListener, options);
                }
                return originalAddEventListener.call(this, type, listener, options);
            };

            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function (type) {
                const context = this.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, this.width, this.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const noise = Math.floor(Math.random() * 5) - 2;
                        data[i] = Math.max(0, Math.min(255, data[i] + noise));
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
                    }
                    context.putImageData(imageData, 0, 0);
                }
                return originalToDataURL.apply(this, arguments);
            };
        });

        browserContext = page;
        logInfo('Браузер инициализирован с максимальной защитой от обнаружения');

        if (visibleMode) {
            await startManualAuthenticationPuppeteer(page, skipManualRestart);
        }
        // loadSessionPuppeteer removed — was dead code (always returned false)

        if (!visibleMode) {
            // Восстанавливаем сохранённую сессию Qwen (cookies + localStorage token),
            // чтобы headless-браузер выглядел авторизованным для Qwen anti-bot.
            try {
                const restoredAccountId = process.env.QWEN_BROWSER_ACCOUNT_ID || null;
                await page.goto(new URL(CHAT_PAGE_URL).origin, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
                const savedCookies = loadAccountCookies(restoredAccountId);
                const cookieToken = savedCookies.find(cookie => cookie.name === 'token')?.value || null;
                const authToken = cookieToken || loadAuthToken(restoredAccountId);
                if (savedCookies.length) {
                    await page.setCookie(...savedCookies);
                    logInfo(`Восстановлено ${savedCookies.length} cookies сессии Qwen`);
                }
                if (authToken) {
                    saveAuthToken(authToken, restoredAccountId);
                    await page.evaluate((t) => { try { localStorage.setItem('token', t); } catch (e) {} }, authToken);
                    logInfo('Токен Qwen установлен в localStorage');
                }
                await page.goto(CHAT_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
            } catch (restoreError) {
                logWarn(`Не удалось восстановить сессию Qwen: ${restoreError.message}`);
            }
        }

        return true;
    } catch (error) {
        logError('Ошибка при инициализации браузера', error);
        await shutdownBrowser();
        return false;
    }
}

async function saveSessionPuppeteer(page, token = null) {
    try {
        const cookies = await page.cookies();
        const sessionDir = path.join(process.cwd(), SESSION_DIR, ACCOUNTS_DIR);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        const accountId = `acc_${Date.now()}`;
        const accountDir = path.join(sessionDir, accountId);
        if (!fs.existsSync(accountDir)) fs.mkdirSync(accountDir, { recursive: true });

        fs.writeFileSync(path.join(accountDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
        if (token) fs.writeFileSync(path.join(accountDir, 'token.txt'), token, 'utf8');
        logInfo(`Cookies сохранены для аккаунта ${accountId}`);
        return accountId;
    } catch (error) {
        logError('Ошибка при сохранении сессии', error);
        return null;
    }
}

async function startManualAuthenticationPuppeteer(page, skipManualRestart) {
    try {
        logInfo('Открытие страницы для ручной авторизации...');
        await page.goto(CHAT_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
        await delay(5000);

        console.log('------------------------------------------------------');
        console.log('               НЕОБХОДИМА АВТОРИЗАЦИЯ');
        console.log('------------------------------------------------------');
        console.log('Пожалуйста, выполните следующие действия:');
        console.log('1. Войдите в систему в открытом браузере');
        console.log('2. ВАЖНО: Двигайте мышью естественно, не спешите');
        console.log('3. Если появится слайдер капчи - решите её медленно');
        console.log('4. Дождитесь полной загрузки главной страницы');
        console.log('5. После успешной авторизации нажмите ENTER в консоли');
        console.log('------------------------------------------------------');
        console.log('После успешной авторизации нажмите ENTER для продолжения...');

        // Auto-poll: ждём, пока пользователь войдёт в Qwen (токен появится в localStorage).
        // Заменяет ручное нажатие ENTER — необходимо для detached/фонового запуска,
        // чтобы скрипт сам завершился, как только вход обнаружен.
        const configuredTimeout = Number(process.env.QWEN_LOGIN_TIMEOUT);
        const pollTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 10000
            ? Math.min(configuredTimeout, 1800000)
            : 300000;
        const pollDeadline = Date.now() + pollTimeoutMs;
        logInfo(`Ожидание входа в Qwen (проверка каждые 3 сек, таймаут ${Math.round(pollTimeoutMs / 1000)} сек)...`);
        let tokenFound = false;
        while (Date.now() < pollDeadline) {
            try {
                const polledToken = await page.evaluate(() => {
                    const directKeys = ['token', 'auth_token', 'access_token', 'id_token', 'qwen_token'];
                    for (const key of directKeys) {
                        const value = localStorage.getItem(key) || sessionStorage.getItem(key);
                        if (value) return value;
                    }
                    const jwtLike = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
                    for (const storage of [localStorage, sessionStorage]) {
                        for (let i = 0; i < storage.length; i += 1) {
                            const value = storage.getItem(storage.key(i)) || '';
                            const match = value.match(jwtLike);
                            if (match) return match[0];
                        }
                    }
                    return null;
                });
                if (polledToken) {
                    logInfo('Вход в Qwen обнаружен: токен найден в localStorage.');
                    tokenFound = true;
                    break;
                }
            } catch (pollError) {
                logDebug(`Опрос localStorage не удался (повтор через 3 сек): ${pollError.message}`);
            }
            await delay(3000);
        }
        if (!tokenFound) {
            throw new Error('Время ожидания входа истекло. Токен не найден.');
        }

        let cookies = [];
        try {
            cookies = await page.cookies();
            logInfo(`Сохранено ${cookies.length} cookies`);
        } catch (error) {
            logWarn(`Не удалось прочитать cookies после ручной авторизации: ${error.message}`);
        }

        let token = null;
        try {
            token = await page.evaluate(() => {
                const directKeys = ['token', 'auth_token', 'access_token', 'id_token', 'qwen_token'];
                for (const key of directKeys) {
                    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
                    if (value) return value;
                }
                const jwtLike = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
                for (const storage of [localStorage, sessionStorage]) {
                    for (let i = 0; i < storage.length; i += 1) {
                        const value = storage.getItem(storage.key(i)) || '';
                        const match = value.match(jwtLike);
                        if (match) return match[0];
                    }
                }
                return null;
            });
        } catch (error) {
            logWarn(`Не удалось прочитать localStorage/sessionStorage: ${error.message}`);
        }

        if (token) {
            logInfo('Токен найден и будет сохранен');
            saveAuthToken(token);
        } else {
            logWarn('Токен не найден в localStorage/sessionStorage');
            logInfo('Попытка извлечь токен из cookies...');
            const tokenCookie = cookies.find(c => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('auth'));
            if (tokenCookie) {
                logInfo(`Токен найден в cookie: ${tokenCookie.name}`);
                saveAuthToken(tokenCookie.value);
            }
        }

        if (!token && !cookies.some(c => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('auth'))) {
            throw new Error('Токен Qwen не найден после авторизации');
        }

        try {
            const accountId = await saveSessionPuppeteer(page, token);
            if (accountId) logInfo(`Сессия сохранена с ID: ${accountId}`);
        } catch (error) {
            logWarn(`Не удалось сохранить cookies-сессию: ${error.message}`);
        }

        setAuthenticationStatus(true);
        logInfo('Авторизация завершена успешно');

        if (!skipManualRestart) await restartBrowserInHeadlessMode();
    } catch (error) {
        logError('Ошибка при ручной авторизации', error);
        throw error;
    }
}

export async function restartBrowserInHeadlessMode() {
    logInfo('Перезапуск браузера в фоновом режиме...');
    const token = getAuthToken();
    if (token) { logDebug('Сохранение токена...'); saveAuthToken(token); await delay(1000); }
    await shutdownBrowser();
    await delay(RETRY_DELAY);
    const success = await initBrowser(false);
    logInfo(success ? 'Браузер перезапущен в фоновом режиме' : 'Ошибка при перезапуске браузера');
}

export async function shutdownBrowser() {
    try {
        try { await clearPagePool(); } catch (e) { logError('Ошибка при очистке пула страниц', e); }
        if (browserInstance) {
            try {
                const pages = await browserInstance.pages();
                for (const page of pages) await page.close().catch(() => {});
                await browserInstance.close();
            } catch (e) { logError('Ошибка при закрытии браузера', e); }
        }
        browserContext = null;
        browserInstance = null;
        logInfo('Браузер закрыт');
    } catch (error) {
        logError('Ошибка при завершении работы браузера', error);
    }
}

export function getBrowserContext() { return browserContext; }
export function setAuthenticationStatus(status) { isAuthenticated = status; }
export function getAuthenticationStatus() { return isAuthenticated; }

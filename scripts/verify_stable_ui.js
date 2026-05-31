#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_BASE_URL = 'http://localhost:5000';
const TEST_USER = 'beta_regression_check';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseArgs(argv) {
    const options = {
        baseUrl: DEFAULT_BASE_URL,
        headed: false,
        referer: ''
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--headed') {
            options.headed = true;
        } else if (arg.startsWith('--base-url=')) {
            options.baseUrl = arg.slice('--base-url='.length);
        } else if (arg === '--base-url') {
            options.baseUrl = argv[++i];
        } else if (arg.startsWith('--referer=')) {
            options.referer = arg.slice('--referer='.length);
        } else if (arg === '--referer') {
            options.referer = argv[++i];
        } else {
            throw new Error(`Unknown option: ${arg}`);
        }
    }

    options.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    return options;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function readText(relativePath) {
    return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function parseClassicScript(relativePath) {
    new Function(readText(relativePath));
}

function getHtmlScriptSources() {
    const html = readText('local_index.html');
    return Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/g)).map(match => match[1]);
}

function assertScriptOrder() {
    const scripts = getHtmlScriptSources();
    const expectedOrder = [
        'data.js',
        'js/logic_core_utils.js',
        'js/logic_card_filter.js',
        'js/logic_card_view.js',
        'js/logic_menu_view.js',
        'js/logic_core.js',
        'js/logic_basket.js',
        'js/logic_print.js',
        'js/logic_preset.js'
    ];

    let lastIndex = -1;
    for (const expected of expectedOrder) {
        const index = scripts.findIndex(src => src.startsWith(expected));
        assert(index !== -1, `local_index.html is missing script: ${expected}`);
        assert(index > lastIndex, `local_index.html script order is wrong around: ${expected}`);
        lastIndex = index;
    }
}

function requestOk(url, timeoutMs = 1500) {
    return new Promise(resolve => {
        const client = url.startsWith('https:') ? https : http;
        const req = client.get(url, res => {
            res.resume();
            resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            resolve(false);
        });
        req.on('error', () => resolve(false));
    });
}

function requestText(url, headers = {}, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const req = client.get(url, { headers }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode || 0,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
        });
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error(`Timed out while fetching ${url}`));
        });
        req.on('error', reject);
    });
}

async function assertServedIndexScriptVersions(options) {
    const headers = options.referer ? { Referer: options.referer } : {};
    const response = await requestText(buildUrl(options.baseUrl, { user: TEST_USER }), headers);
    assert(response.statusCode === 200, `served index check expected 200, got ${response.statusCode}`);

    const expectedScripts = getHtmlScriptSources().filter(src =>
        src.startsWith('data.js') ||
        src.startsWith('js/logic_core_utils.js') ||
        src.startsWith('js/logic_card_filter.js') ||
        src.startsWith('js/logic_card_view.js') ||
        src.startsWith('js/logic_menu_view.js') ||
        src.startsWith('js/logic_core.js')
    );

    for (const expected of expectedScripts) {
        const doubleQuoted = `src="${expected}"`;
        const singleQuoted = `src='${expected}'`;
        assert(response.body.includes(doubleQuoted) || response.body.includes(singleQuoted),
            `served index is stale or mismatched; missing ${expected}`);
    }
}

function choosePythonCommand() {
    const candidates = process.env.PYTHON
        ? [[process.env.PYTHON, []]]
        : (process.platform === 'win32' ? [['python', []], ['py', ['-3']]] : [['python3', []], ['python', []]]);

    for (const [command, prefixArgs] of candidates) {
        const result = spawnSync(command, [...prefixArgs, '--version'], { stdio: 'ignore', windowsHide: true });
        if (result.status === 0) {
            return { command, prefixArgs };
        }
    }

    throw new Error('Python was not found. Start local_server.py manually or install Python.');
}

async function startLocalServer(baseUrl) {
    if (await requestOk(baseUrl)) {
        return null;
    }

    if (baseUrl !== DEFAULT_BASE_URL) {
        throw new Error(`Custom base URL is not reachable: ${baseUrl}`);
    }

    const { command, prefixArgs } = choosePythonCommand();
    const code = [
        'import local_server',
        "local_server.server.app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)"
    ].join('; ');

    const child = spawn(command, [...prefixArgs, '-c', code], {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });

    child.stdout.on('data', chunk => {
        const text = chunk.toString().trim();
        if (text) process.stderr.write(`[local_server] ${text}\n`);
    });
    child.stderr.on('data', chunk => {
        const text = chunk.toString().trim();
        if (text) process.stderr.write(`[local_server] ${text}\n`);
    });

    const started = await waitForServer(baseUrl, 15000);
    if (!started) {
        child.kill();
        throw new Error(`Could not start local server at ${baseUrl}`);
    }

    return child;
}

async function waitForServer(baseUrl, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await requestOk(baseUrl, 1000)) return true;
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    return false;
}

function buildUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
}

function requirePlaywright() {
    try {
        return require('playwright');
    } catch (error) {
        throw new Error([
            'Playwright is not available in this Node environment.',
            'Install it locally or globally, then rerun:',
            '  npm install -D playwright',
            '  node scripts/verify_stable_ui.js'
        ].join('\n'));
    }
}

async function collectRows(page, nameNeedle = '') {
    return page.evaluate(needle => Array.from(document.querySelectorAll('#inventory .card'))
        .map(card => {
            const name = card.querySelector('.card-name')?.textContent.trim() || '';
            const divs = card.querySelectorAll('div');
            const info = divs.length > 1 ? divs[1].textContent.trim() : '';
            return { name, info };
        })
        .filter(row => !needle || row.name.includes(needle)), nameNeedle);
}

async function firstRows(page, count = 12) {
    return page.evaluate(limit => Array.from(document.querySelectorAll('#inventory .card')).slice(0, limit)
        .map(card => {
            const name = card.querySelector('.card-name')?.textContent.trim() || '';
            const divs = card.querySelectorAll('div');
            const info = divs.length > 1 ? divs[1].textContent.trim() : '';
            return { name, info };
        }), count);
}

async function cardCount(page) {
    return page.locator('#inventory .card').count();
}

async function search(page, query) {
    await page.fill('#global-search-input', query);
    await page.waitForTimeout(250);
    return cardCount(page);
}

function expectInfos(rows, expectedInfos, label) {
    const infos = rows.map(row => row.info).sort();
    for (const info of expectedInfos) {
        assert(infos.includes(info), `${label} is missing "${info}": ${JSON.stringify(rows)}`);
    }
}

async function runBrowserChecks(options) {
    const { chromium } = requirePlaywright();
    const browser = await chromium.launch({ headless: !options.headed });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const errors = [];

    try {
        await context.addInitScript(user => {
            localStorage.setItem('tutorial_hide_welcome', 'true');
            localStorage.setItem('hangru_gate_pass', user);
            Object.defineProperty(window, 'triggerAutoSave', {
                configurable: true,
                get() { return function () {}; },
                set() {}
            });
        }, TEST_USER);

        await context.route('**/api/user_presets**', route => {
            if (MUTATING_METHODS.has(route.request().method())) {
                return route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
        await context.route('**/api/user_cards**', route => {
            if (MUTATING_METHODS.has(route.request().method())) {
                return route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        });
        await context.route('**/api/register_user**', route =>
            route.fulfill({ status: 204, contentType: 'application/json', body: '{}' })
        );
        await context.route('**/upload**', route =>
            route.fulfill({ status: 204, contentType: 'application/json', body: '{}' })
        );

        const page = await context.newPage();
        page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
        page.on('console', message => {
            if (message.type() === 'error') errors.push(`console: ${message.text()}`);
        });

        const gotoOptions = { waitUntil: 'domcontentloaded' };
        if (options.referer) gotoOptions.referer = options.referer;

        await page.goto(buildUrl(options.baseUrl, {
            user: TEST_USER,
            v: `stable-ui-regression-${Date.now()}`
        }), gotoOptions);
        await page.waitForSelector('#inventory .card', { timeout: 15000 });
        await page.waitForTimeout(500);

        const loadedScripts = await page.evaluate(() => Array.from(document.scripts).map(script => script.getAttribute('src') || ''));
        assert(loadedScripts.some(src => src.includes('js/logic_core_utils.js')), 'served page did not load logic_core_utils.js');
        assert(loadedScripts.some(src => src.includes('js/logic_card_filter.js')), 'served page did not load logic_card_filter.js');
        assert(loadedScripts.some(src => src.includes('js/logic_card_view.js')), 'served page did not load logic_card_view.js');
        assert(loadedScripts.some(src => src.includes('js/logic_menu_view.js')), 'served page did not load logic_menu_view.js');
        assert(loadedScripts.some(src => src.includes('js/logic_core.js')), 'served page did not load logic_core.js');

        const languageCount = await cardCount(page);
        assert(languageCount === 1390, `language count expected 1390, got ${languageCount}`);

        const firstImageOk = await page.evaluate(async () => {
            const img = document.querySelector('#inventory .card img');
            if (!img) return false;
            if (!img.complete) {
                await new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }
            return img.naturalWidth > 0 && !img.src.includes('placeholder.com');
        });
        assert(firstImageOk, 'first language image did not load');

        await page.click('button[onclick*="articulation"]');
        await page.waitForTimeout(500);
        const articulationTitle = await page.locator('#sidebar-title').textContent();
        const articulationPlaceholder = await page.locator('#global-search-input').getAttribute('placeholder');
        const articulationPositionTabs = await page.locator('.position-tabs .pos-btn').count();
        const articulationSyllableTabs = await page.locator('.syllable-tabs .syllable-btn').count();
        assert((articulationTitle || '').includes('목표 음소'), `articulation sidebar title mismatch: ${articulationTitle}`);
        assert((articulationPlaceholder || '').includes('조음'), `articulation placeholder mismatch: ${articulationPlaceholder}`);
        assert(articulationPositionTabs === 5, `articulation position tabs expected 5, got ${articulationPositionTabs}`);
        assert(articulationSyllableTabs === 7, `articulation syllable tabs expected 7, got ${articulationSyllableTabs}`);
        const articulationCount = await cardCount(page);
        assert(articulationCount === 4192, `articulation count expected 4192, got ${articulationCount}`);

        await search(page, '하');
        const haVisibleCount = await cardCount(page);
        const haHamRows = await collectRows(page, '하모니카');
        assert(haHamRows.length === 1 && haHamRows[0].info === 'ㅎ, 어두초성',
            `하 search should show one direct 하모니카 row: ${JSON.stringify(haHamRows)}`);

        await search(page, '하모니카');
        const hamFullRows = await collectRows(page, '하모니카');
        assert(hamFullRows.length === 4, `하모니카 full search should show 4 rows: ${JSON.stringify(hamFullRows)}`);
        expectInfos(hamFullRows, ['ㅎ, 어두초성', 'ㅁ, 어중초성', 'ㄴ, 어중초성', 'ㅋ, 어중초성'], '하모니카 full search');

        await search(page, '가');
        const gageRows = await collectRows(page, '가게[가게]');
        assert(gageRows.length === 1 && gageRows[0].info === 'ㄱ, 어두초성',
            `가 search should show only direct 가게 row: ${JSON.stringify(gageRows)}`);

        await search(page, '감');
        const gamRows = await collectRows(page, '감[감]');
        assert(gamRows.length === 2, `감 search should show 2 감 rows: ${JSON.stringify(gamRows)}`);
        expectInfos(gamRows, ['ㄱ, 어두초성', 'ㅁ, 어말종성'], '감 search');
        const gamjaRows = await collectRows(page, '감자[감자]');
        assert(gamjaRows.length === 2, `감 search should show 2 감자 rows: ${JSON.stringify(gamjaRows)}`);
        expectInfos(gamjaRows, ['ㄱ, 어두초성', 'ㅁ, 어중종성'], '감자 search');

        await search(page, '사탕');
        const satangRows = await collectRows(page, '사탕[사탕]');
        assert(satangRows.length === 3, `사탕 search should show 3 direct rows: ${JSON.stringify(satangRows)}`);
        expectInfos(satangRows, ['ㅅ, 어두초성', 'ㅌ, 어중초성', 'ㅇ(받침), 어말종성'], '사탕 search');

        await search(page, '바나나');
        const bananaRows = await collectRows(page, '바나나');
        assert(bananaRows.length === 3, `바나나 search should show 3 rows: ${JSON.stringify(bananaRows)}`);
        assert(bananaRows.some(row => row.info === 'ㅂ, 어두초성'), `바나나 search missing ㅂ row: ${JSON.stringify(bananaRows)}`);
        assert(bananaRows.filter(row => row.info === 'ㄴ, 어중초성').length === 2,
            `바나나 search should keep two ㄴ rows: ${JSON.stringify(bananaRows)}`);

        await search(page, 'ㅎ');
        const hRows = await firstRows(page, 80);
        assert(hRows.length > 0 && hRows.every(row => row.info.startsWith('ㅎ,')),
            `ㅎ search had non-ㅎ rows: ${JSON.stringify(hRows.filter(row => !row.info.startsWith('ㅎ,')).slice(0, 10))}`);

        await search(page, 'ㄱ');
        const gRows = await firstRows(page, 80);
        assert(gRows.length > 0 && gRows.every(row => row.info.startsWith('ㄱ,')),
            `ㄱ search had non-ㄱ rows: ${JSON.stringify(gRows.filter(row => !row.info.startsWith('ㄱ,')).slice(0, 10))}`);

        await search(page, 'ㅏ');
        const aRows = await firstRows(page, 80);
        assert(aRows.every(row => row.info.startsWith('ㅇ(모음),')),
            `ㅏ search had non-vowel rows: ${JSON.stringify(aRows.filter(row => !row.info.startsWith('ㅇ(모음),')).slice(0, 10))}`);

        await search(page, 'ㅜ');
        const uRows = await firstRows(page, 80);
        assert(uRows.length > 0 && uRows.every(row => row.info.startsWith('ㅇ(모음),')),
            `ㅜ search had non-vowel rows: ${JSON.stringify(uRows.filter(row => !row.info.startsWith('ㅇ(모음),')).slice(0, 10))}`);

        const vowelSyllableQueries = ['아', '야', '어', '여', '오', '요', '우', '유', '으', '이', '애', '에', '외', '워', '웨', '위', '의'];
        const vowelSyllableChecks = [];
        for (const query of vowelSyllableQueries) {
            const count = await search(page, query);
            const sample = await firstRows(page, 6);
            assert(count > 0, `${query} vowel syllable search returned no articulation rows`);
            assert(sample.every(row => row.name && !row.name.includes('undefined')),
                `${query} vowel syllable search produced invalid rows: ${JSON.stringify(sample)}`);
            vowelSyllableChecks.push({ query, count, sample });
        }

        const optionalVowelSyllableCounts = {};
        for (const query of ['와', '왜']) {
            optionalVowelSyllableCounts[query] = await search(page, query);
        }

        await page.click('button[onclick*="language"]');
        await page.waitForTimeout(500);
        const languageTitle = await page.locator('#sidebar-title').textContent();
        const languagePlaceholder = await page.locator('#global-search-input').getAttribute('placeholder');
        const languagePositionTabs = await page.locator('.position-tabs .pos-btn').count();
        const languageSyllableTabs = await page.locator('.syllable-tabs .syllable-btn').count();
        assert((languageTitle || '').includes('언어 범주'), `language sidebar title mismatch: ${languageTitle}`);
        assert((languagePlaceholder || '').includes('언어'), `language placeholder mismatch: ${languagePlaceholder}`);
        assert(languagePositionTabs === 0, `language position tabs expected 0, got ${languagePositionTabs}`);
        assert(languageSyllableTabs === 7, `language syllable tabs expected 7, got ${languageSyllableTabs}`);
        const languageCountAfterSwitch = await cardCount(page);
        assert(languageCountAfterSwitch === 1390, `language count after switch expected 1390, got ${languageCountAfterSwitch}`);

        await search(page, '하');
        const languageHaSample = await firstRows(page, 8);
        assert(languageHaSample.length > 0, 'language 하 search returned no rows');

        await search(page, '해');
        const languageHaeSample = await firstRows(page, 8);
        assert(languageHaeSample.some(row => row.name.includes('해요')),
            `language 해 search did not surface 해요 rows: ${JSON.stringify(languageHaeSample)}`);

        await page.click('button[onclick*="articulation"]');
        await page.waitForTimeout(300);
        const placeholder = await page.locator('#global-search-input').getAttribute('placeholder');
        assert((placeholder || '').includes('조음'), `articulation placeholder was not restored: ${placeholder}`);
        const positionTabsAfterReturn = await page.locator('.position-tabs .pos-btn').count();
        assert(positionTabsAfterReturn === 5, `articulation position tabs after return expected 5, got ${positionTabsAfterReturn}`);

        await search(page, '하');
        const visibleBeforeAddAll = await cardCount(page);
        await page.locator('#inventory .card').first().click();
        await page.waitForTimeout(200);
        const basketNamesAfterClick = await page.locator('#basket-grid .card.in-basket .card-name').allTextContents();
        assert(basketNamesAfterClick.length >= 1 && !basketNamesAfterClick.some(name => name.includes('undefined')),
            `basket click produced invalid names: ${JSON.stringify(basketNamesAfterClick)}`);

        await page.evaluate(() => {
            document.querySelectorAll('#basket-grid .card.in-basket').forEach(card => card.remove());
        });
        await page.click('#add-all-btn');
        await page.waitForTimeout(400);
        const basketNamesAfterAll = await page.locator('#basket-grid .card.in-basket .card-name').allTextContents();
        assert(basketNamesAfterAll.length === Math.min(visibleBeforeAddAll, 100),
            `addAll count mismatch: visible ${visibleBeforeAddAll}, basket ${basketNamesAfterAll.length}`);
        assert(!basketNamesAfterAll.some(name => !name || name.includes('undefined')),
            `addAll produced invalid names: ${JSON.stringify(basketNamesAfterAll.slice(0, 20))}`);

        assert(errors.length === 0, `browser console/page errors found: ${JSON.stringify(errors)}`);

        return {
            languageCount,
            articulationCount,
            haVisibleCount,
            haHamRows,
            hamFullRows,
            gageRows,
            gamRows,
            gamjaRows,
            satangRows,
            bananaRows,
            vowelASampleCount: aRows.length,
            vowelUSample: uRows.slice(0, 5),
            vowelSyllableChecks,
            optionalVowelSyllableCounts,
            languageHaSample,
            languageHaeSample,
            basketClickCount: basketNamesAfterClick.length,
            addAllCount: basketNamesAfterAll.length,
            errors
        };
    } finally {
        await browser.close();
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    parseClassicScript('js/logic_core_utils.js');
    parseClassicScript('js/logic_card_filter.js');
    parseClassicScript('js/logic_card_view.js');
    parseClassicScript('js/logic_menu_view.js');
    parseClassicScript('js/logic_core.js');
    assertScriptOrder();

    const serverProcess = await startLocalServer(options.baseUrl);
    try {
        await assertServedIndexScriptVersions(options);
        const browserSummary = await runBrowserChecks(options);
        const summary = {
            ok: true,
            baseUrl: options.baseUrl,
            referer: options.referer || null,
            startedLocalServer: Boolean(serverProcess),
            staticChecks: {
                parsed: ['js/logic_core_utils.js', 'js/logic_card_filter.js', 'js/logic_card_view.js', 'js/logic_menu_view.js', 'js/logic_core.js'],
                localIndexScriptOrder: 'ok',
                servedIndexScriptVersions: 'ok'
            },
            browserChecks: browserSummary
        };
        console.log(JSON.stringify(summary, null, 2));
    } finally {
        if (serverProcess) {
            serverProcess.kill();
        }
    }
}

main().catch(error => {
    console.error(JSON.stringify({
        ok: false,
        error: error.message,
        stack: error.stack
    }, null, 2));
    process.exit(1);
});


chrome.runtime.onInstalled.addListener(
    async function () {
        let { urlList, settings } = await chrome.storage.local.get(['urlList', 'settings']);
        if (!urlList || !settings) {
            chrome.storage.local.set({
                urlList: [],
                settings: {
                    paused: false,
                    noPattern: false,
                    noEye: false,
                    blackList: false,
                    closeOnClick: false,
                    maxSafe: 32
                }
            });
        }
    }
);

/** @type {WebSocket} */
let ws_g, settings;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        handle();
        return request.r.startsWith('get');

        async function handle() {

            switch (request.r) {
                case 'getUrlList': {
                    let { urlList } = await chrome.storage.local.get('urlList');
                    sendResponse(urlList);
                    break;
                }
                case 'getSettings': {
                    let { urlList, settings } = await chrome.storage.local.get(['urlList', 'settings']);
                    let { excludeForTabs, pauseForTabs } = await chrome.storage.session.get({ excludeForTabs: [], pauseForTabs: [] });
                    let _settings = { ...settings };
                    let tab = request.tab || sender.tab;
                    if (tab) {
                        if (pauseForTabs.indexOf(tab.id) != -1)
                            _settings.pausedForTab = true;
                        if (tab.url) {
                            let domain = getDomain(tab.url);
                            if (domain) {
                                for (let i = 0; i < excludeForTabs.length; i++) {
                                    if (excludeForTabs[i].tabId == tab.id && excludeForTabs[i].domain == domain) { _settings.excludedForTab = true; break; }
                                }
                            }
                            let lowerUrl = tab.url.toLowerCase();
                            for (let i = 0; i < urlList.length; i++) {
                                if (lowerUrl.indexOf(urlList[i]) != -1) { _settings.excluded = true; break; }
                            }
                        }
                    }
                    sendResponse(_settings);
                    break;
                }
                case 'setColorIcon':
                    chrome.action.setIcon({ path: request.toggle ? 'icon.png' : 'icon-d.png', tabId: sender.tab.id });
                    break;
                case 'urlListAdd': {
                    let { urlList } = await chrome.storage.local.get('urlList');
                    let url = request.domainOnly ? getDomain(request.url) : request.url.toLowerCase();
                    if (url) {
                        urlList.push(url);
                        chrome.storage.local.set({ urlList });
                        chrome.runtime.sendMessage({ r: 'urlListModified' });
                    }
                    break;
                }
                case 'urlListRemove': {
                    let { urlList } = await chrome.storage.local.get('urlList');
                    if (request.url) {
                        let lowerUrl = request.url.toLowerCase();
                        for (let i = 0; i < urlList.length; i++) {
                            if (lowerUrl.indexOf(urlList[i]) != -1) { urlList.splice(i, 1); i--; }
                        }
                    } else
                        urlList.splice(request.index, 1);
                    chrome.storage.local.set({ urlList });
                    chrome.runtime.sendMessage({ r: 'urlListModified' });
                    break;
                }
                case 'setUrlList': {
                    let urlList = request.urlList;
                    chrome.storage.local.set({ urlList });
                    break;
                }
                case 'excludeForTab': {
                    let { excludeForTabs } = await chrome.storage.session.get({ excludeForTabs: [] });
                    let domain = getDomain(request.tab.url);
                    if (!domain) return;
                    if (request.toggle) {
                        excludeForTabs.push({ tabId: request.tab.id, domain: domain });
                    }
                    else {
                        for (let i = 0; i < excludeForTabs.length; i++)
                            if (excludeForTabs[i].tabId == request.tab.id && excludeForTabs[i].domain == domain) { excludeForTabs.splice(i, 1); break; }
                    }
                    chrome.storage.session.set({ excludeForTabs });
                    break;
                }
                case 'pause': {
                    await getSettings();
                    settings.paused = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'pauseForTab': {
                    let { pauseForTabs } = await chrome.storage.session.get({ pauseForTabs: [] });
                    if (request.toggle)
                        pauseForTabs.push(request.tabId);
                    else
                        for (let i = 0; i < pauseForTabs.length; i++)
                            if (pauseForTabs[i] == request.tabId) { pauseForTabs.splice(i, 1); break; }
                    chrome.storage.session.set({ pauseForTabs });
                    break;
                }
                case 'setNoPattern': {
                    await getSettings();
                    settings.noPattern = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setNoEye': {
                    await getSettings();
                    settings.noEye = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setBlackList': {
                    await getSettings();
                    settings.blackList = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setMaxSafe': {
                    let ms = +request.maxSafe;
                    if (!ms || ms < 1 || ms > 1000)
                        ms = 32;
                    await getSettings();
                    settings.maxSafe = ms;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setCloseOnClick': {
                    await getSettings();
                    settings.closeOnClick = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setUnwanted': {
                    await getSettings();
                    settings.unwanted = request.unwanted;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'getSetCodeR': {
                    let ok = false;
                    if (request.code) {
                        try {
                            let r = await fetch('https://wizman.tandola.com:2345/check_code?code=' + request.code);
                            let t = await r.text();
                            ok = t == 1;
                        }
                        catch {
                            sendResponse({ err: 'Could not connect to server.' });
                            return;
                        }
                    }
                    if (!request.code || ok) {
                        await getSettings();
                        settings.code = request.code;
                        chrome.storage.local.set({ settings });
                    }
                    sendResponse({ ok });
                    break;
                }
                case 'getAnalyzeResponse': {
                    await getSettings();
                    let code = settings.code, unwanted = settings.unwanted;
                    if (!code || !unwanted) {
                        sendResponse(0);
                        return;
                    }
                    let ws = ws_g;
                    if (!ws || ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) {
                        ws_g = ws = new WebSocket('wss://wizman.tandola.com:2345/ws?code=' + code);
                        ws.img_id = 0;
                        ws.openPromise = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
                        ws.onmessage = x => {
                            let d = JSON.parse(x.data);
                            sendResult(ws, d.img_id, d.result, true);
                        }
                        ws.reqCallbacks = new Map();
                        ws.addReq = (data, callback) => {
                            if (!ws.sendQueue) {
                                ws.sendQueue = [];
                                setTimeout(async () => {
                                    let requests = ws.sendQueue;
                                    ws.sendQueue = null;
                                    await ws.openPromise;
                                    if (ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) {
                                        requests.forEach(x => sendResult(ws, x.img_id, 0));
                                        return;
                                    }
                                    ws.send(JSON.stringify({ requests, unwanted }))
                                }, 100);
                            }
                            ws.sendQueue.push(data);
                            ws.reqCallbacks.set(data.img_id, callback);
                        }
                    }

                    let img_id = ++ws.img_id, url = request.imgUrl, b64, hash;
                    if (url.startsWith('data:')) {
                        let m = /data:image\/\w+;base64,(.+)/.exec(url);
                        if (!m) {
                            sendResponse(0);
                            return;
                        }
                        b64 = m[1];
                        hash = hash64(b64);
                        url = 'hash:' + hash;
                    }
                    ws.addReq({ img_id, url }, { sendResponse, b64, hash });

                    break;
                }
            }
        }
    }
);

function getDomain(url) {
    let regex = /^\w+:\/\/([\w\.:-]+)/.exec(url);
    return regex ? regex[1].toLowerCase() : null;
}
function sendResult(ws, img_id, result, fromAnalysis) {
    let v = ws.reqCallbacks.get(img_id);
    if (v) {
        if (result == 0 && fromAnalysis && v.b64) {
            ws.addReq({ img_id, url: 'hash:' + v.hash, b64: v.b64 }, { sendResponse: v.sendResponse });
            return;
        }
        v.sendResponse(result);
        ws.reqCallbacks.delete(img_id);
    }
}
async function getSettings() {
    if (!settings) {
        let o = await chrome.storage.local.get('settings');
        settings = o.settings;
    }
}
function hash64(str) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = (h1 ^ ch) * 16777619;
        h1 |= 0;
        h2 = (h2 ^ ch) * 16777619;
        h2 |= 0;
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}
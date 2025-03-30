
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
let ws, settings;

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
                    if (!settings.unwanted) {
                        sendResponse(0);
                        return;
                    }
                    if (!ws || ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) {
                        if (!settings.code) {
                            sendResponse(0);
                            return;
                        }
                        ws = new WebSocket('wss://wizman.tandola.com:2345/ws?code=' + settings.code);
                        ws.img_id = 0;
                        ws.resolveMap = new Map();
                        ws.openPromise = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
                        ws.onmessage = x => {
                            console.log(x.data)
                            let d = JSON.parse(x.data), resolve = ws.resolveMap.get(d.img_id);
                            resolve(d.result);
                        }
                    }
                    try {
                        await ws.openPromise;
                    } catch {
                        sendResponse(0);
                        return;
                    }

                    let img_id = ++ws.img_id, url = request.imgUrl;
                    console.log('got: ' + url)
                    ws.send(JSON.stringify({ img_id, url, unwanted: settings.unwanted }))
                    let r = await new Promise(resolve => {
                        ws.resolveMap.set(img_id, resolve)
                    });
                    console.log(url + ': ' + img_id + ': ' + r)
                    sendResponse(r)

                    ////let analyzeUrl = 'https://0tjvfkrk9p2xjg-2345.proxy.runpod.net/analyze';
                    //let analyzeUrl = 'http://78.141.241.57:2345/analyze';
                    //try {
                    //    let r = await fetch(analyzeUrl, {
                    //        method: 'POST',
                    //        headers: { "Content-Type": "application/json" },
                    //        body: JSON.stringify({ unwanted: 'a woman', url: request.imgUrl })
                    //    });
                    //    let t = await r.text();
                    //    sendResponse(t);
                    //}
                    //catch {
                    //    sendResponse('0');
                    //}
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
async function getSettings() {
    if (!settings) {
        let o = await chrome.storage.local.get('settings');
        settings = o.settings;
    }
}
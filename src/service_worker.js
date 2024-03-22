go();

async function go() {
    let { urlList, settings } = await chrome.storage.local.get(null);
    if (!urlList || !settings) {
        let offscreenPromise = new Promise(resolve => {
            chrome.runtime.onMessage.addListener(function (request) {
                if (request.r != 'migrateSettings')
                    return;
                let s = JSON.parse(request.storage);
                urlList = s.urlList ? JSON.parse(s.urlList) : [];
                settings = {
                    paused: s.isPaused == '1',
                    noPattern: s.isNoPattern == '1',
                    noEye: s.isNoEye == '1',
                    blackList: s.isBlackList == '1',
                    closeOnClick: s.closeOnClick == '1',
                    maxSafe: +s.maxSafe || 32
                };
                chrome.storage.local.set({ urlList, settings });
                resolve();
            });
        });
        await chrome.offscreen.createDocument({
            url: 'migrate-settings.htm',
            reasons: ['LOCAL_STORAGE'],
            justification: 'migrate settings from manifest v2',
        });
        await offscreenPromise;
        await chrome.offscreen.closeDocument();
    }
    let excludeForTabList = [],
        pauseForTabList = [],
        domainRegex = /^\w+:\/\/([\w\.:-]+)/;
    function getDomain(url) {
        let regex = domainRegex.exec(url);
        return regex ? regex[1].toLowerCase() : null;
    }
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            switch (request.r) {
                case 'getSettings': {
                    let _settings = { ...settings };
                    let tab = request.tab || sender.tab;
                    if (tab) {
                        if (pauseForTabList.indexOf(tab.id) != -1)
                            _settings.pausedForTab = true;
                        if (tab.url) {
                            let domain = getDomain(tab.url);
                            if (domain) {
                                for (let i = 0; i < excludeForTabList.length; i++) {
                                    if (excludeForTabList[i].tabId == tab.id && excludeForTabList[i].domain == domain) { _settings.excludedForTab = true; break; }
                                }
                            }
                            let lowerUrl = tab.url.toLowerCase();
                            for (let i = 0; i < urlList.length; i++) {
                                if (lowerUrl.indexOf(urlList[i]) != -1) { _settings.excluded = true; break; }
                            }
                            if (settings.blackList)
                                _settings.excluded = !_settings.excluded;
                        }
                    }
                    sendResponse(_settings);
                    break;
                }
                case 'setColorIcon':
                    chrome.action.setIcon({ path: request.toggle ? 'icon.png' : 'icon-d.png', tabId: sender.tab.id });
                    break;
                case 'urlListAdd':
                    let url = request.domainOnly ? getDomain(request.url) : request.url.toLowerCase();
                    if (url) {
                        urlList.push(url);
                        chrome.storage.local.set({ urlList });
                        chrome.runtime.sendMessage({ r: 'urlListModified' });
                    }
                    sendResponse(true);
                    break;
                case 'urlListRemove':
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
                case 'getUrlList':
                    sendResponse(urlList);
                    break;
                case 'setUrlList':
                    urlList = request.urlList;
                    chrome.storage.local.set({ urlList });
                    sendResponse(true);
                    break;
                case 'excludeForTab':
                    let domain = getDomain(request.tab.url);
                    if (!domain) return;
                    if (request.toggle) {
                        excludeForTabList.push({ tabId: request.tab.id, domain: domain });
                    }
                    else {
                        for (let i = 0; i < excludeForTabList.length; i++)
                            if (excludeForTabList[i].tabId == request.tab.id && excludeForTabList[i].domain == domain) { excludeForTabList.splice(i, 1); break; }
                    }
                    break;
                case 'pause':
                    settings.paused = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                case 'pauseForTab':
                    if (request.toggle)
                        pauseForTabList.push(request.tabId);
                    else
                        for (let i = 0; i < pauseForTabList.length; i++)
                            if (pauseForTabList[i] == request.tabId) { pauseForTabList.splice(i, 1); break; }
                    break;
                case 'setNoPattern':
                    settings.noPattern = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                case 'setNoEye':
                    settings.noEye = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                case 'setBlackList':
                    settings.blackList = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                case 'setMaxSafe': {
                    let ms = +request.maxSafe;
                    if (!ms || ms < 1 || ms > 1000)
                        ms = 32;
                    settings.maxSafe = ms;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setCloseOnClick':
                    settings.closeOnClick = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
            }
        }
    );
}

chrome.runtime.onInstalled.addListener(
    async function () {
        let { urlList, settings } = await chrome.storage.local.get(['urlList', 'settings']);
        if (!urlList || !settings) {
            let offscreenPromise = new Promise(resolve => {
                let migrateSettingsListener = request => {
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
                    chrome.runtime.onMessage.removeListener(migrateSettingsListener);
                };
                chrome.runtime.onMessage.addListener(migrateSettingsListener);
            });
            await chrome.offscreen.createDocument({
                url: 'migrate-settings.htm',
                reasons: ['LOCAL_STORAGE'],
                justification: 'migrate settings from manifest v2',
            });
            await offscreenPromise;
            await chrome.offscreen.closeDocument();
        }
    }
);

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
                    let { settings } = await chrome.storage.local.get('settings');
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
                    let { settings } = await chrome.storage.local.get('settings');
                    settings.noPattern = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setNoEye': {
                    let { settings } = await chrome.storage.local.get('settings');
                    settings.noEye = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setBlackList': {
                    let { settings } = await chrome.storage.local.get('settings');
                    settings.blackList = request.toggle;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setMaxSafe': {
                    let ms = +request.maxSafe;
                    if (!ms || ms < 1 || ms > 1000)
                        ms = 32;
                    let { settings } = await chrome.storage.local.get('settings');
                    settings.maxSafe = ms;
                    chrome.storage.local.set({ settings });
                    break;
                }
                case 'setCloseOnClick': {
                    let { settings } = await chrome.storage.local.get('settings');
                    settings.closeOnClick = request.toggle;
                    chrome.storage.local.set({ settings });
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

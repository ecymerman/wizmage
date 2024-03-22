go();

async function go() {
    let localStorage = await chrome.storage.local.get(null);
    if (!localStorage.urlList) {
        chrome.offscreen.createDocument({
            url: 'migrate-settings.htm',
            reasons: ['LOCAL_STORAGE'],
            justification: 'migrate settings from manifest v2',
        });
        localStorage = await new Promise(resolve => {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (request.r != 'migrate-settings')
                    return;
                chrome.storage.local.set(request.settings);
                resolve(request.settings);
            });
        })
    }
    let urlList = localStorage.urlList || [],
        isPaused = localStorage.isPaused,
        isNoPattern = localStorage.isNoPattern,
        isNoEye = localStorage.isNoEye,
        isBlackList = localStorage.isBlackList,
        closeOnClick = localStorage.closeOnClick,
        maxSafe = localStorage.maxSafe || 32,
        excludeForTabList = [],
        pauseForTabList = [],
        domainRegex = /^\w+:\/\/([\w\.:-]+)/;
    function getDomain(url) {
        let regex = domainRegex.exec(url);
        return regex ? regex[1].toLowerCase() : null;
    }
    function saveUrlList() {
        return chrome.storage.local.set({ urlList });
    }
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            switch (request.r) {
                case 'getSettings':
                    let settings = { isPaused, isNoPattern, isNoEye, isBlackList, maxSafe, closeOnClick };
                    let tab = request.tab || sender.tab;
                    if (tab) {
                        if (pauseForTabList.indexOf(tab.id) != -1)
                            settings.isPausedForTab = true;
                        if (tab.url) {
                            let domain = getDomain(tab.url);
                            if (domain) {
                                for (let i = 0; i < excludeForTabList.length; i++) {
                                    if (excludeForTabList[i].tabId == tab.id && excludeForTabList[i].domain == domain) { settings.isExcludedForTab = true; break; }
                                }
                            }
                            let lowerUrl = tab.url.toLowerCase();
                            for (let i = 0; i < urlList.length; i++) {
                                if (lowerUrl.indexOf(urlList[i]) != -1) { settings.isExcluded = true; break; }
                            }
                            if (isBlackList)
                                settings.isExcluded = !settings.isExcluded;
                        }
                    }
                    sendResponse(settings);
                    break;
                case 'setColorIcon':
                    chrome.action.setIcon({ path: request.toggle ? 'icon.png' : 'icon-d.png', tabId: sender.tab.id });
                    break;
                case 'urlListAdd':
                    let url = request.domainOnly ? getDomain(request.url) : request.url.toLowerCase();
                    if (url) {
                        urlList.push(url);
                        saveUrlList();
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
                    saveUrlList();
                    chrome.runtime.sendMessage({ r: 'urlListModified' });
                    break;
                case 'getUrlList':
                    sendResponse(urlList);
                    break;
                case 'setUrlList':
                    urlList = request.urlList;
                    saveUrlList();
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
                    isPaused = request.toggle;
                    chrome.storage.local.set({ isPaused });
                    break;
                case 'pauseForTab':
                    if (request.toggle)
                        pauseForTabList.push(request.tabId);
                    else
                        for (let i = 0; i < pauseForTabList.length; i++)
                            if (pauseForTabList[i] == request.tabId) { pauseForTabList.splice(i, 1); break; }
                    break;
                case 'setNoPattern':
                    isNoPattern = request.toggle;
                    chrome.storage.local.set({ isNoPattern });
                    break;
                case 'setNoEye':
                    isNoEye = request.toggle;
                    chrome.storage.local.set({ isNoEye });
                    break;
                case 'setBlackList':
                    isBlackList = request.toggle;
                    chrome.storage.local.set({ isBlackList });
                    break;
                case 'setMaxSafe':
                    maxSafe = +request.maxSafe;
                    if (!maxSafe || maxSafe < 1 || maxSafe > 1000)
                        maxSafe = 32;
                    chrome.storage.local.set({ maxSafe });
                    break;
                case 'setCloseOnClick':
                    closeOnClick = request.toggle;
                    chrome.storage.local.set({ closeOnClick });
                    break;
            }
        }
    );
}
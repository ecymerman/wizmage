chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0], closeOnClick;
    function showImages() {
        chrome.tabs.sendMessage(activeTab.id, { r: 'showImages' });
    }
    chrome.runtime.sendMessage({ r: 'getSettings', tab: activeTab }, function (settings) {
        document.getElementById('pauseChk').checked = settings.paused;
        document.getElementById('pauseTab').checked = settings.pausedForTab;
        document.getElementById('excludeDomain').checked = settings.excluded;
        document.getElementById('excludeForTab').checked = settings.excludedForTab;
        document.getElementById('exclude-tab-wrap').style.display = 'block';
        document.querySelectorAll('i-add-exclude').forEach(x => x.innerText = settings.blackList ? 'Add' : 'Exclude');
        closeOnClick = settings.closeOnClick;
    });
    document.getElementById('showImages').onclick = function () {
        showImages();
        if (closeOnClick) close();
    };
    document.getElementById('excludeDomain').onclick = function () {
        if (document.getElementById('excludeDomain').checked) {
            chrome.runtime.sendMessage({ r: 'urlListAdd', url: activeTab.url, domainOnly: true });
            showImages();
        } else {
            chrome.runtime.sendMessage({ r: 'urlListRemove', url: activeTab.url });
        }
        if (closeOnClick) close();
    };
    document.getElementById('excludeForTab').onclick = function () {
        var isChecked = document.getElementById('excludeForTab').checked;
        chrome.runtime.sendMessage({ r: 'excludeForTab', toggle: isChecked, tab: activeTab });
        if (isChecked)
            showImages();
        if (closeOnClick) close();
    };
    document.getElementById('pauseChk').onclick = function () {
        chrome.runtime.sendMessage({ r: 'pause', toggle: this.checked });
        showImages();
        if (closeOnClick) close();
    };
    document.getElementById('pauseTab').onclick = function () {
        chrome.runtime.sendMessage({ r: 'pauseForTab', tabId: activeTab.id, toggle: this.checked });
        showImages();
        if (closeOnClick) close();
    };
    document.getElementById('still-seeing-images').onclick = function () {
        var advice = document.getElementById('advice');
        advice.style.display = advice.style.display == 'block' ? 'none' : 'block';
    };
});
document.getElementById('close').onclick = function () { close(); };

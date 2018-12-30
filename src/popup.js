chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0], closeOnClick;
    function showImages() {
        chrome.tabs.sendMessage(activeTab.id, { r: 'showImages' });
    }
    chrome.runtime.sendMessage({ r: 'getSettings', tab: activeTab }, function (settings) {
        document.getElementById('pauseChk').checked = settings.isPaused;
        document.getElementById('pauseTab').checked = settings.isPausedForTab;
        document.getElementById('excludeDomain').checked = settings.isBlackList ? !settings.isExcluded : settings.isExcluded;
        document.getElementById('excludeForTab').checked = settings.isExcludedForTab;
        document.getElementById('exclude-domain-label').innerText = (settings.isBlackList ? 'Add' : 'Exclude') + ' Website';
        document.getElementById('exclude-tab-wrap').style.display = settings.isBlackList ? 'none' : 'block';
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
    document.getElementById('block-flash').onclick = function () {
        alert("In order to avoid automatically showing Flash animations, in the 'Plug-ins' section of Chrome's settings (which you will see when you press OK), click either 'Click to play' (recommended), or 'Block all'.");
        chrome.tabs.create({ url: "chrome://settings/content#handlers-section" });
    };
    document.getElementById('report').onclick = function () {
        chrome.tabs.create({ url: "https://chrome.google.com/webstore/support/ifoggbfaoakkojipahnplnbfnhhhnmlp?hl=en&gl=IL#bug" });
    };
});
document.getElementById('close').onclick = function () { close(); };

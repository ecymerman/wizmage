{
    let addName = document.getElementById('addName'),
        noPattern = document.getElementById('noPattern'),
        noEye = document.getElementById('noEye'),
        list = document.getElementById('list'),
        whiteList = document.getElementById('white-list'),
        blackList = document.getElementById('black-list'),
        form = document.getElementById('form'),
        freeText = document.getElementById('free-text'),
        maxSafe = document.getElementById('max-safe'),
        closeOnClick = document.getElementById('close-on-click'),
        isFreeText = false;
    addName.focus();
    chrome.runtime.sendMessage({ r: 'getSettings' }, function (settings) {
        noPattern.checked = settings.noPattern;
        noEye.checked = settings.noEye;
        closeOnClick.checked = settings.closeOnClick;
        (settings.blackList ? blackList : whiteList).checked = true;
        maxSafe.value = settings.maxSafe;
    });
    chrome.runtime.onMessage.addListener(function (request) {
        if (request.r == 'urlListModified')
            CreateList();
    });
    noPattern.onclick = function () {
        chrome.runtime.sendMessage({ r: 'setNoPattern', toggle: this.checked });
    };
    noEye.onclick = function () {
        chrome.runtime.sendMessage({ r: 'setNoEye', toggle: this.checked });
    };
    whiteList.onclick = function () {
        chrome.runtime.sendMessage({ r: 'setBlackList', toggle: false });
    };
    blackList.onclick = function () {
        chrome.runtime.sendMessage({ r: 'setBlackList', toggle: true });
    };
    maxSafe.onchange = function () {
        chrome.runtime.sendMessage({ r: 'setMaxSafe', maxSafe: maxSafe.value });
    };
    closeOnClick.onclick = function () {
        chrome.runtime.sendMessage({ r: 'setCloseOnClick', toggle: this.checked });
    };
    window.onunload = () => maxSafe.blur();
    form.onsubmit = function () {
        let url = addName.value.trim().toLowerCase();
        if (!url.length) return;
        chrome.runtime.sendMessage({ r: 'urlListAdd', url: url }, CreateList);
        addName.value = '';
        return false;
    };
    list.onclick = ev => {
        let del = ev.target.closest('.delete');
        if (del) {
            let item = ev.target.closest('.item');
            chrome.runtime.sendMessage({ r: 'urlListRemove', index: item.ix }, CreateList);
        }
    };
    function CreateList() {
        chrome.runtime.sendMessage({ r: 'getUrlList' }, function (urlList) {
            list.innerHTML = '';
            if (isFreeText) {
                let textarea = document.createElement('textarea');
                textarea.style.width = '100%';
                textarea.rows = 15;
                textarea.value = urlList.join('\n');
                list.appendChild(textarea);
                textarea.onchange = function () {
                    let text = textarea.value, lines = text.split('\n'), urls = [];
                    for (let i = 0; i < lines.length; i++) {
                        let url = lines[i].trim();
                        if (url)
                            urls.push(url);
                    }
                    chrome.runtime.sendMessage({ r: 'setUrlList', urlList: urls }, CreateList);
                };
            }
            else {
                for (let i = 0; i < urlList.length; i++) {
                    let item = document.createElement('div');
                    item.className = 'item';
                    item.ix = i;
                    item.innerHTML = `<span class='delete'>X</span> <span class='url'>${urlList[i]}</span>`;
                    list.appendChild(item);
                }
            }
        });
    }
    freeText.onclick = function () {
        isFreeText = freeText.checked;
        CreateList();
    };
    CreateList();
}
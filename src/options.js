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
        code_t_t.innerText = settings.code || 'No Code';
        if (settings.unwanted) {
            if (unwanted_ideas.indexOf(settings.unwanted) > -1) {
                unwanted_opt.value = settings.unwanted;
            }
            else {
                unwanted_opt.value = 'cust';
                unwanted_w.classList.add('cust');
                unwanted_cust.value = settings.unwanted;
            }
        }
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

    //code
    let code_w = document.getElementById('code-w'), code_t_t = document.getElementById('code-t-t'), code_t_edit = document.getElementById('code-t-edit'), code_set_i = document.getElementById('code-set-i'),
        code_set_ok = document.getElementById('code-set-ok'), code_set_cancel = document.getElementById('code-set-cancel');
    code_t_edit.onclick = () => code_w.classList.add('editing');
    code_set_cancel.onclick = () => code_w.classList.remove('editing');
    code_set_ok.onclick = () => {
        chrome.runtime.sendMessage({ r: 'getSetCodeR', code: code_set_i.value || null }, (r) => {
            if (r.err) {
                alert(r.err);
                return;
            }
            if (r.ok) {
                code_t_t.innerText = code_set_i.value;
                code_w.classList.remove('editing')
            }
            else
                alert('Code not recognized.');
        });

    }

    //unwanted
    let unwanted_w = document.getElementById('unwanted-w'), unwanted_opt = document.getElementById('unwanted-opt'), unwanted_cust = document.getElementById('unwanted-cust'),
        unwanted_ideas = ['nudity', 'delicious food', 'a woman', 'a man', 'advertizing', 'an eagle sucking a lollipop'];
    for (let idea of unwanted_ideas) {
        let opt = document.createElement('option');
        opt.innerText = idea;
        unwanted_opt.appendChild(opt);
    }
    let saveUnwanted = () => {
        let v = unwanted_opt.value;
        if (v == 'cust')
            v = unwanted_cust.value;
        chrome.runtime.sendMessage({ r: 'setUnwanted', unwanted: v }) 
    };
    unwanted_opt.onchange = () => {
        let v = unwanted_opt.value;
        if (v == 'cust')
            unwanted_w.classList.add('cust');
        else
            unwanted_w.classList.remove('cust');
        saveUnwanted();
    }

}
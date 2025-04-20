{
    const originalAppend = Element.prototype.append;
    Element.prototype.append = function (...args) {
        originalAppend.apply(this, args);
        return this;
    };
    Element.prototype.text = function (t) {
        this.innerText = t;
        return this;
    }

    let addName = document.getElementById('addName'),
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
        noEye.checked = settings.noEye;
        closeOnClick.checked = settings.closeOnClick;
        (settings.blackList ? blackList : whiteList).checked = true;
        maxSafe.value = settings.maxSafe;
        $phone_t_t.text(settings.phone || 'No Phone Number')
        if (settings.unwanted) {
            if (unwanted_ideas.indexOf(settings.unwanted) > -1) {
                $unwanted_opt.value = settings.unwanted;
            }
            else {
                $unwanted_opt.value = 'cust';
                $unwanted_w.classList.add('cust');
                $unwanted_cust.value = settings.unwanted;
            }
        }
    });
    chrome.runtime.onMessage.addListener(function (request) {
        if (request.r == 'urlListModified')
            CreateList();
    });
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

    //phone
    let $phone_t_set = document.getElementById('phone-t-set'), $phone_t_t = document.getElementById('phone-t-t'),
        countryCodes = [54, 297, 61, 43, 375, 32, 1, 55, 359, 56, 86, 57, 506, 357, 420, 45, 358, 33, 49, 44, 30, 502, 504, 852, 36, 91, 62, 353, 972, 350, 39, 81, 254, 965, 961, 370, 52, 212, 64, 47, 92, 507, 51, 48, 351, 40, 7, 65, 386, 27, 850, 34, 46, 41, 66, 31, 90, 598, 58, 82, 591, 971, 886, 380, 60];
    $phone_t_set.onclick = () => {
        let $cc = $m('cc', 'input', { type: 'number', required: true, maxlength: 3 }),
            $num = $m('num', 'input', { type: 'number', required: true }),
            $phoneD = $m('dialog', 'form').append($m('c').append(
                $m('h').text('Enter your phone number.\nWe will send you a verification code via WhatsApp.'),
                $m('phone').append($m('plus', 'span').text('+'), $cc, $num),
                $m('ctrls').append($m('cont', 'button').text('Continue'))
            ));
        $cc.oninput = () => {
            if ($cc.value && countryCodes.indexOf(+$cc.value) > -1)
                $num.focus();
        };
        showDialog($phoneD, 'send_code',
            () => $cc.focus(),
            () => {
                let cc = $cc.value, num = $num.value;
                if (['1', '45', '372', '995', '374'].indexOf(cc) == -1 && num[0] == '0')
                    num = num.substr(1)
                if ((cc == '1' && num.length != 10) || num.length < 4 || num.length > 15) {
                    alert('Phone number is not the correct length.');
                    return;
                }
                let phone = '+' + cc + num;
                return { phone };
            },
            (data, r) => {
                let phone = data.phone,
                    $code = $m('i', 'input', { required: true, name: 'code', type: 'number' }),
                    $first_name = $m('i', 'input', { required: true, name: 'first_name' }),
                    $last_name = $m('i', 'input', { required: true, name: 'last_name' }),
                    $email = $m('i', 'input', { required: true, name: 'email', type: 'email' }),
                    $codeD = $m('dialog', 'form').append($m('c').append(
                        $m('h').text('We just sent you a code via WhatsApp.'),
                        $m('field').append($m('lbl').text('Code'), $code),
                        $m('field').append($m('lbl').text('First Name'), $first_name),
                        $m('field').append($m('lbl').text('Last Name'), $last_name),
                        $m('field').append($m('lbl').text('Email'), $email),
                        $m('ctrls').append($m('cont', 'button').text('Continue'))
                    ));
                showDialog($codeD, 'verify_code',
                    () => $code.focus(),
                    () => {
                        let data = {
                            phone,
                            code: $code.value,
                            first_name: $first_name.value,
                            last_name: $last_name.value,
                            email: $email.value,
                        };
                        return data;
                    },
                    (data, r) => {
                        chrome.runtime.sendMessage({ r: 'setToken', token: r.token, phone })
                        $phone_t_t.text(phone);
                    }
                );
            }
        );
    }

    //unwanted
    let $unwanted_w = document.getElementById('unwanted-w'), $unwanted_opt = document.getElementById('unwanted-opt'),
        $unwanted_cust = document.getElementById('unwanted-cust'),
        unwanted_ideas = ['nudity', 'delicious food', 'a woman', 'a man', 'advertizing', 'an eagle sucking a lollipop'];
    for (let idea of unwanted_ideas) {
        let opt = document.createElement('option');
        opt.innerText = idea;
        $unwanted_opt.appendChild(opt);
    }
    let saveUnwanted = () => {
        let v = $unwanted_opt.value;
        if (v == 'cust')
            v = $unwanted_cust.value;
        chrome.runtime.sendMessage({ r: 'setUnwanted', unwanted: v })
    };
    $unwanted_opt.onchange = () => {
        let v = $unwanted_opt.value;
        if (v == 'cust')
            $unwanted_w.classList.add('cust');
        else
            $unwanted_w.classList.remove('cust');
        saveUnwanted();
    }
    $unwanted_cust.oninput = saveUnwanted;

    function $m(cls, tag, attrs) {
        let el = document.createElement(tag || 'div');
        el.className = cls;
        if (attrs) {
            for (const [key, value] of Object.entries(attrs))
                el[key] = value;
        }
        return el;
    }

    function showDialog($d, endpoint, onShow, getData, onResp) {

        document.body.append($d);
        $d.onclick = () => $d.remove();
        $d.firstElementChild.onclick = ev => ev.stopPropagation();
        onShow();

        let submitting;
        $d.onsubmit = async ev => {
            ev.preventDefault();
            if (submitting) return;
            let data = getData();
            if (!data) return;
            submitting = true;
            let r;
            try {
                let resp = await fetch('https://wizman.wizmage.com/' + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(data)
                }).finally(() => submitting = false);
                if (!resp.ok) throw new Error();
                r = await resp.json();
            }
            catch {
                alert('There was an error connecting to the server.');
                return;
            }
            if (r.err) {
                alert(r.err);
                return;
            }
            $d.remove();
            onResp(data, r);
        }
    }

}
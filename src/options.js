{
    const originalAppend = Element.prototype.append;
    Element.prototype.append = function (...args) {
        originalAppend.apply(this, args);
        return this;
    };
    Element.prototype.setText = function (t) {
        this.innerText = t;
        return this;
    }

    let addName = document.getElementById('addName'),
        phoneW = document.getElementById('phone-w'),
        noEye = document.getElementById('noEye'),
        list = document.getElementById('list'),
        whiteBlackList = document.getElementById('w-b-list'),
        form = document.getElementById('form'),
        freeText = document.getElementById('free-text'),
        maxSafe = document.getElementById('max-safe'),
        closeOnClick = document.getElementById('close-on-click'),
        exclusions = document.getElementById('exclusions'),
        isFreeText = false;
    chrome.runtime.sendMessage({ r: 'getSettings' }, function (settings) {
        noEye.checked = settings.noEye;
        closeOnClick.checked = settings.closeOnClick;
        whiteBlackList.value = settings.blackList ? 'B' : 'W';
        exclusions.setAttribute('data-type', whiteBlackList.value);
        maxSafe.value = settings.maxSafe;
        $phone_t_t.setText(settings.phone || 'No Phone Number')
        $phone_t_set.setText(settings.phone ? 'Modify Number' : 'Set Number')
        phoneW.setAttribute('data-has-num', settings.phone ? 'Y' : 'N')
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
    whiteBlackList.onchange = function () {
        chrome.runtime.sendMessage({ r: 'setBlackList', toggle: whiteBlackList.value == 'B' });
        exclusions.setAttribute('data-type', whiteBlackList.value);
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
        chrome.runtime.sendMessage({ r: 'urlListAdd', url: url });
        addName.value = '';
        return false;
    };
    list.onclick = ev => {
        let del = ev.target.closest('.delete');
        if (del) {
            let item = ev.target.closest('.item');
            chrome.runtime.sendMessage({ r: 'urlListRemove', index: item.ix });
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
                    let item = m$('item');
                    item.className = 'item';
                    item.ix = i;
                    item.innerHTML = `<span class='url'>${urlList[i]}</span><span class='delete'>X</span>`;
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
        let $cc = m$('cc', 'input', { type: 'number', required: true, maxlength: 3 }),
            $num = m$('num', 'input', { type: 'text', required: true }),
            $wa = m$('method-radio', 'input', { type: 'radio', name: 'method', checked: true }), $waW = m$('method-lbl wa', 'label').append($wa, ' WhatsApp'),
            $sms = m$('method-radio', 'input', { type: 'radio', name: 'method' }), $smsW = m$('method-lbl sms', 'label').append($sms, ' SMS'),
            $noWhatsApp = m$('no-wa').setText("If you don't have WhatsApp, email your phone number to ai@wizmage.com and we will try to email you your code."),
            $cancel = m$('cancel', 'button', { type: 'button' }).setText('Cancel'),
            $phoneD = m$('dialog', 'form').append(m$('c').append(
                m$('icon-w').append(m$('', 'img', { src: 'green-tick.png' })),
                m$('h').setText('Verify your number'),
                m$('t').setText('For security reasons we need to verify your phone number. ').append(m$('', 'a', { href: 'https://wizmage.com/ai#privacy', target: '_blank' }).setText('Why')),
                m$('phone').append(m$('plus', 'span').setText('+'), $cc, $num),
                m$('method').append($waW, $smsW, $noWhatsApp),
                m$('ctrls').append($cancel, m$('cont', 'button').setText('Continue')),
            ));
        $cc.oninput = () => {
            let cc = $cc.value, validCC = !!cc && countryCodes.indexOf(+cc) > -1;
            $phoneD.classList.toggle('valid-cc', validCC);
            $phoneD.classList.toggle('cc-usa', cc == '1');
            if (cc != '1')
                $wa.checked = true;
            if ($cc.value && countryCodes.indexOf(+$cc.value) > -1)
                $num.focus();
            //I know some communities in these countries, and feel I can distinguish spam from real, manually.
            $noWhatsApp.style.display = cc == '44' || cc == '972' ? 'block' : 'none';
        };
        $num.oninput = () => {
            if (/[^0-9]/.test($num.value))
                $num.value = $num.value.replace(/[^0-9]/g, '');
        };
        $cancel.onclick=() => $phoneD.remove();
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
                return { phone, sms: $sms.checked };
            },
            (data, r) => {
                let phone = data.phone,
                    $digits = m$('field digits'),
                    $cancel = m$('cancel', 'button', { type: 'button' }).setText('Cancel'),
                    $codeD = m$('dialog', 'form').append(m$('c').append(
                        m$('icon-w').append(m$('', 'img', { src: 'green-tick.png' })),
                        m$('h').setText('Verify your number'),
                        m$('t').setText('We sent your code. Enter it below. ').append(m$('', 'a', { href: 'https://wizmage.com/ai#privacy', target: '_blank' }).setText('Why')),
                        $digits,
                        m$('ctrls').append($cancel, m$('cont', 'button').setText('Continue'))
                    )),
                    digits = [], numDigits = 8;
                for (let i = 0; i < numDigits; i++) {
                    let $digit = m$('digit', 'input', { required: 'required', maxlength: 1 });
                    $digits.append($digit);
                    digits.push($digit);
                    $digit.oninput = () => {
                        if ($digit.value && i < numDigits - 1)
                            digits[i + 1].focus();
                    };
                    $digit.onpaste = ev => {
                        let v = ev.clipboardData.getData('text').trim();
                        if (v.length == numDigits) {
                            ev.preventDefault();
                            for (let i = 0; i < numDigits; i++)
                                digits[i].value = v.substr(i, 1);
                        }
                    };
                    $digit.onkeydown = ev => {
                        if (ev.key == 'Backspace' && !ev.currentTarget.value && i > 0) {
                            digits[i - 1].focus();
                        }
                    };
                }
                $cancel.onclick=() => $codeD.remove();
                showDialog($codeD, 'verify_code',
                    () => digits[0].focus(),
                    () => {
                        let data = {
                            phone,
                            code: ''
                        };
                        digits.forEach(x => data.code += x.value);
                        return data;
                    },
                    (data, r) => {
                        chrome.runtime.sendMessage({ r: 'setToken', token: r.token, phone })
                        $phone_t_t.setText(phone);
                        $phone_t_set.setText('Modify Number')
                        phoneW.setAttribute('data-has-num', 'Y')
                    }
                );
            }
        );
    }

    //unwanted
    let $unwanted_w = document.getElementById('unwanted-w'), $unwanted_opt = document.getElementById('unwanted-opt'),
        $unwanted_cust = document.getElementById('unwanted-cust'),
        unwanted_ideas = ['nudity', 'delicious food', 'a woman', 'a man', 'advertizing'];
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

    function m$(cls, tag, attrs) {
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
$(function () {
    var $addName = $('#addName').focus(), $noPattern = $('#noPattern'), $noEye = $('#noEye'), $list = $('#list'), $whiteList = $('#white-list'), $blackList = $('#black-list'),
        $form = $('form'), isFreeText = false, $freeText = $('#free-text'), $maxSafe = $('#max-safe'), $closeOnClick = $('#close-on-click'), $pauseDuration = $('#pause_duration');
    chrome.runtime.sendMessage({ r: 'getSettings' }, function (settings) {
        $noPattern[0].checked = settings.isNoPattern;
        $noEye[0].checked = settings.isNoEye;
        (settings.isBlackList ? $blackList : $whiteList)[0].checked = true;
        $maxSafe.val(settings.maxSafe);
        $pauseDuration.val(settings.pauseDuration);
    });
    chrome.runtime.onMessage.addListener(function (request) {
        if (request.r == 'urlListModified')
            CreateList();
    });
    $noPattern.click(function () {
        chrome.runtime.sendMessage({ r: 'setNoPattern', toggle: this.checked });
    });
    $noEye.click(function () {
        chrome.runtime.sendMessage({ r: 'setNoEye', toggle: this.checked });
    });
    $whiteList.click(function () {
        chrome.runtime.sendMessage({ r: 'setBlackList', toggle: false });
    });
    $blackList.click(function () {
        chrome.runtime.sendMessage({ r: 'setBlackList', toggle: true });
    });
    $maxSafe.change(function () {
        chrome.runtime.sendMessage({ r: 'setMaxSafe', maxSafe: $maxSafe.val() });
    });
    $closeOnClick.change(function () {
        chrome.runtime.sendMessage({ r: 'setCloseOnClick', toggle: this.checked });
    });
    $pauseDuration.change(function () {
        chrome.runtime.sendMessage({ r: 'setPauseDuration', value: pauseDuration.val() });
    });
    $(window).on('unload', function () { $maxSafe.blur(); });
    $form.submit(function () {
        var url = $.trim($addName.val()).toLowerCase();
        if (!url.length) return;
        chrome.runtime.sendMessage({ r: 'urlListAdd', url: url }, CreateList);
        $addName.val('');
        return false;
    });
    $list.on('click', '.delete', function () {
        var $parent = $(this).parent();
        chrome.runtime.sendMessage({ r: 'urlListRemove', index: $parent.index() }, CreateList);
    });
    function CreateList() {
        chrome.runtime.sendMessage({ r: 'getUrlList' }, function (urlList) {
            $list.empty();
            if (isFreeText) {
                var $textarea = $('<textarea>').css('width', '100%').attr('rows', '15'), text = '';
                for (var i = 0; i < urlList.length; i++) {
                    text += urlList[i] + '\n';
                }
                $textarea.val(text);
                $list.append($textarea);
                $textarea.change(function () {
                    var text = $textarea.val(), lines = text.split('\n'), urls = [];
                    for (var i = 0; i < lines.length; i++) {
                        var url = lines[i].trim();
                        if (url)
                            urls.push(url);
                    }
                    chrome.runtime.sendMessage({ r: 'setUrlList', urlList: urls }, CreateList);                        
                });
            }
            else {
                for (var i = 0; i < urlList.length; i++)
                    $list.append("<div class='item'><span class='delete'>X</span> <span class='url'>" + urlList[i] + '</span></div>');
            }
        });
    }
    $freeText.click(function () {
        isFreeText = $freeText[0].checked;
        CreateList();
    });
    CreateList();
});
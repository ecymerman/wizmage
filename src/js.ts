interface Window {
    wzmShowImages(): void;
}
interface Settings {
    isPaused: boolean,
    isNoPattern: boolean,
    isNoEye: boolean,
    isBlackList: boolean,
    maxSafe: number,
    isExcluded: boolean,
    isExcludedForTab: boolean,
    isPausedForTab: boolean,
}
interface HTMLElement {
    wzmHasWizmageBG?: boolean,
    wzmWizmaged: boolean,
    wzmBeenBlocked?: boolean,
    wzmLastCheckedSrc?: string,
    wzmRect?: ClientRect,
    wzmShade?: number,
    wzmHidden?: boolean,
    wzmHasMouseEventListeners?: boolean,
    wzmHasLoadEventListener?: boolean,
    wzmHasHover?: boolean,
    wzmHasHoverVisual?: boolean,
    wzmClearHoverVisualTimer?: number,
    wzmCheckTimeout?: number
}
interface HTMLImageElement {
    wzmHasTitleAndSizeSetup?: boolean,
    owner?: HTMLElement,
    oldsrc?: string,
    oldsrcset?: string
}
interface String {
    startsWith(str: string): boolean;
}
declare var mutationObserver: MutationObserver;
//global variables
let showAll = false,
    extensionUrl = chrome.runtime.getURL(''),
    urlExtensionUrl = 'url("' + extensionUrl,
    blankImg = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    urlBlankImg = 'url("' + blankImg + '")',
    patternCSSUrl = 'url(' + extensionUrl + "pattern.png" + ')',
    patternLightUrl = extensionUrl + "pattern-light.png",
    patternLightCSSUrl = 'url(' + patternLightUrl + ')',
    eyeCSSUrl = 'url(' + extensionUrl + "eye.svg" + ')',
    undoCSSUrl = 'url(' + extensionUrl + "undo.png" + ')',
    tagList: string[] = ['IMG', 'DIV', 'SPAN', 'A', 'UL', 'LI', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'I', 'STRONG', 'B', 'BIG', 'BUTTON', 'CENTER', 'SECTION', 'TABLE', 'FIGURE', 'ASIDE', 'HEADER', 'VIDEO', 'P', 'ARTICLE', 'PICTURE'],
    tagListCSS = tagList.join(),
    iframes: HTMLIFrameElement[] = [],
    contentLoaded = false,
    settings: Settings | undefined,
    quotesRegex = /['"]/g;

//keep track of contentLoaded
window.addEventListener('DOMContentLoaded', function () { contentLoaded = true; });

//start by seeing if is active or is paused etc.
chrome.runtime.sendMessage({ r: 'getSettings' }, function (s: Settings) {
    settings = s;
    //if is active - go
    if (settings && !settings.isExcluded && !settings.isExcludedForTab && !settings.isPaused && !settings.isPausedForTab) {
        //change icon
        chrome.runtime.sendMessage({ r: 'setColorIcon', toggle: true });
        //do main window
        DoWin(window, contentLoaded);
    } else {
        if (!document.documentElement)
            return;
        AddClass(document.documentElement, 'wizmage-show-html');
        let observer = new MutationObserver(function (mutations: MutationRecord[]) {
            for (let i = 0; i < mutations.length; i++) {
                let m = mutations[i];
                if (m.type == 'attributes') {
                    let el = <HTMLElement>m.target;
                    if (el.tagName == 'HTML' && m.attributeName == 'class') {
                        if (el.className.indexOf('wizmage-show-html') == -1)
                            AddClass(el, 'wizmage-show-html');
                    }
                }
                else if (m.addedNodes != null && m.addedNodes.length > 0) {
                    for (let j = 0; j < m.addedNodes.length; j++) {
                        let el = <HTMLElement>m.addedNodes[j];
                        if (el.tagName == 'HTML')
                            AddClass(el, 'wizmage-show-html wizmage-running');
                    }
                }
            }
        });
        observer.observe(document.documentElement, { attributes: true });
        observer.observe(document, { subtree: true, childList: true });
    }
});

//catch 'Show Images' option from browser actions
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.r == 'showImages') ShowImages();
    }
);

function isImg(el: HTMLElement): el is HTMLImageElement { return el.tagName == 'IMG'; }

function ShowImages() {
    if (showAll) return;
    showAll = true;
    if (window == top)
        chrome.runtime.sendMessage({ r: 'setColorIcon', toggle: false });
    window.wzmShowImages();
    for (let i = 0, max = iframes.length; i < max; i++) {
        let iframe = iframes[i];
        try {
            if (iframe.contentWindow && iframe.contentWindow.wzmShowImages)
                iframe.contentWindow.wzmShowImages();
        }
        catch (err) { /*iframe may have been rewritten*/ }
    }
}

function DoWin(win: Window, winContentLoaded: boolean) {
    let _settings = settings!, //DoWin is only called after settings is set
        doc = win.document,
        observer: MutationObserver | undefined,
        eye = doc.createElement('div'),
        mouseMoved = false,
        mouseEvent: MouseEvent | undefined,
        mouseOverEl: HTMLElement | undefined,
        elList: HTMLElement[] = [],
        hasStarted = false;

    //global show images
    win.wzmShowImages = function () {
        if (hasStarted) {
            doc.removeEventListener('keydown', DocKeyDown);
            doc.removeEventListener('mousemove', DocMouseMove);
            win.removeEventListener('scroll', WindowScroll);
            for (let i = 0, max = elList.length; i < max; i++)
                ShowEl.call(elList[i]);
            win.removeEventListener('DOMContentLoaded', Start);
            if (mouseOverEl) {
                DoHover(mouseOverEl, false);
                mouseOverEl = undefined;
            }
            for (let i = 0, bodyChildren = doc.body.children; i < bodyChildren.length; i++) //for some reason, sometimes the eye is removed before
                if (bodyChildren[i] == eye)
                    doc.body.removeChild(eye);
            if (observer)
                observer.disconnect();
            RemoveClass(document.documentElement!, 'wizmage-running');
        }
        else
            AddClass(document.documentElement!, 'wizmage-show-html');
    }

    //start, or register start
    if (winContentLoaded)
        Start();
    else
        win.addEventListener('DOMContentLoaded', Start);

    function DocKeyDown(e: KeyboardEvent) {
        if (e.altKey && e.keyCode == 80 && !_settings.isPaused) { //ALT-p
            _settings.isPaused = true;
            chrome.runtime.sendMessage({ r: 'pause', toggle: true });
            ShowImages();
        }
        else if (mouseOverEl && e.altKey) {
            if (e.keyCode == 65 && mouseOverEl.wzmWizmaged) { //ALT-a
                ShowEl.call(mouseOverEl);
                eye.style.display = 'none';
            } else if (e.keyCode == 90 && !mouseOverEl.wzmWizmaged) { //ALT-z
                DoElement.call(mouseOverEl);
                eye.style.display = 'none';
            }
        }
    }
    function DocMouseMove(e: MouseEvent) { mouseEvent = e; mouseMoved = true; }
    let windowScrollIX = 0;
    function WindowScroll() {
        let _windowScrollIX = ++windowScrollIX;
        if (mouseOverEl)
            DoHoverVisual(mouseOverEl, false);
        setTimeout(function () {
            if (_windowScrollIX != windowScrollIX)
                return;
            windowScrollIX = 0; //Signal no pending scroll callbacks. CheckMousePosition doesn't run during scroll to avoid showing eye in wrong place.
            mouseMoved = true; UpdateElRects(); CheckMousePosition();
        }, 200);
    }

    //keep track of which image-element mouse if over
    function mouseEntered(this: HTMLElement, e: MouseEvent) {
        DoHover(this, true, e);
        e.stopPropagation();
    }
    function mouseLeft(this: HTMLElement, e: MouseEvent) {
        DoHover(this, false, e);
    }
    //process all elements with background-image, and observe mutations for new ones
    function Start() {
        //when viewing an image (not a webpage). iFrames, or pdfs may not have body/head
        if (!doc.body || !doc.head || !doc.documentElement || (win == top && doc.body.children.length == 1 && !doc.body.children[0].children.length)) {
            ShowImages();
            return;
        }
        //do elements
        DoElements(doc.body, false);
        //show body
        AddClass(doc.documentElement, 'wizmage-show-html wizmage-running');
        //create eye
        eye.style.display = 'none';
        eye.style.width = eye.style.height = '16px';
        eye.style.position = 'fixed';
        eye.style.zIndex = '100000000';
        eye.style.cursor = 'pointer';
        eye.style.padding = '0';
        eye.style.margin = '0';
        eye.style.opacity = '.5';
        doc.body.appendChild(eye);
        //create temporary div, to eager load background img light for noEye to avoid flicker
        if (_settings.isNoEye) {
            for (let i = 0; i < 8; i++) {
                let div = doc.createElement('div');
                div.style.opacity = div.style.width = div.style.height = '0';
                div.className = 'wizmage-pattern-bg-img wizmage-light wizmage-shade-' + i;
                doc.body.appendChild(div);
            }
        }
        //mutation observer
        observer = new MutationObserver(function (mutations: MutationRecord[]) {
            for (let i = 0; i < mutations.length; i++) {
                let m = mutations[i], el = <HTMLElement>m.target;
                if (m.type == 'attributes') {
                    if (m.attributeName == 'class') {
                        if (el.tagName == 'HTML') {
                            //incase the website is messing with the <html> classes
                            if (el.className.indexOf('wizmage-show-html') == -1)
                                AddClass(el, 'wizmage-show-html');
                            if (el.className.indexOf('wizmage-running') == -1)
                                AddClass(el, 'wizmage-running');
                        }
                        let oldHasLazy = m.oldValue != null && m.oldValue.indexOf('lazy') > -1,
                            newHasLazy = el.className != null && typeof (el.className) == 'string' && el.className.indexOf('lazy') > -1;
                        if (oldHasLazy != newHasLazy)
                            DoElements(el, true);
                    } else if (m.attributeName == 'style' && el.style.backgroundImage && el.style.backgroundImage.indexOf('url(') > - 1) {
                        let oldBgImg, oldBgImgMatch;
                        if (m.oldValue == null || !(oldBgImgMatch = /background(?:-image)?:[^;]*url\(['"]?(.+?)['"]?\)/.exec(m.oldValue)))
                            oldBgImg = '';
                        else
                            oldBgImg = oldBgImgMatch[1];
                        let imgUrlMatch = /url\(['"]?(.+?)['"]?\)/.exec(el.style.backgroundImage);
                        if (imgUrlMatch && oldBgImg != imgUrlMatch[1]) {
                            setTimeout(() => DoElement.call(el), 0); //for sites that change the class just after, like linkedin
                        }
                    }
                    else if (m.attributeName == 'srcset' && el.tagName == 'SOURCE' && (<HTMLSourceElement>el).srcset && m.target.parentElement)
                        DoElement.call(m.target.parentElement!);
                }
                else if (m.addedNodes != null && m.addedNodes.length > 0) {
                    for (let j = 0; j < m.addedNodes.length; j++) {
                        let el = <HTMLElement>m.addedNodes[j];
                        if (!el.tagName) //eg text nodes
                            continue;
                        if (el.tagName == 'IFRAME')
                            DoIframe(<HTMLIFrameElement>el);
                        else if (el.tagName == 'HTML')
                            AddClass(el, 'wizmage-show-html wizmage-running');
                        else if (el.tagName == 'SOURCE') {
                            if (!showAll)
                                DoImgSrc(<HTMLImageElement>el, true);
                        }
                        else
                            DoElements(el, true);
                    }
                }
            }
        });
        observer.observe(doc, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
        //CheckMousePosition every so often
        setInterval(CheckMousePosition, 250);
        setInterval(UpdateElRects, 3000);
        for (let to of [250, 1500, 4500, 7500])
            setTimeout(UpdateElRects, to);
        //ALT-a, ALT-z
        doc.addEventListener('keydown', DocKeyDown);
        //notice when mouse has moved
        doc.addEventListener('mousemove', DocMouseMove);
        win.addEventListener('scroll', WindowScroll);
        //empty iframes
        let iframes = doc.getElementsByTagName('iframe');
        for (let i = 0, max = iframes.length; i < max; i++) {
            DoIframe(iframes[i]);
        }
        hasStarted = true;
    }
    function DoElements(el: HTMLElement, includeEl: boolean) {
        if (includeEl && tagList.indexOf(el.tagName) > -1)
            DoElement.call(el);
        let all = el.querySelectorAll(tagListCSS);
        for (let i = 0, max = all.length; i < max; i++)
            DoElement.call(<HTMLElement>all[i]);
    }
    function DoIframe(iframe: HTMLIFrameElement) {
        if ((iframe.src && iframe.src != "about:blank" && iframe.src.substr(0, 11) != 'javascript:') || !iframe.contentWindow) return;
        let _win = iframe.contentWindow;
        let pollNum = 0, pollID = setInterval(function () {
            try { var _doc = _win.document } //may cause access error, if is from other domain
            catch (err) {
                clearInterval(pollID);
                return;
            }
            if (_doc && _doc.body) {
                clearInterval(pollID);
                if (_doc.head) {
                    let linkEl = _doc.createElement('link');
                    linkEl.rel = 'stylesheet';
                    linkEl.href = extensionUrl + 'css.css';
                    _doc.head.appendChild(linkEl);
                    iframes.push(iframe);
                    DoWin(_win, true);
                }
            }
            if (++pollNum == 500)
                clearInterval(pollID);
        }, 10);
    }

    function DoElement(this: HTMLElement) {
        if (showAll) return;
        let el = this;
        if (isImg(el)) {
            //attach load event - needed 1) as we need to catch it after it is switched for the blankImg, 2) in case the img gets changed to something else later
            DoLoadEventListener(el, true);

            //see if not yet loaded
            if (!el.complete) {
                //hide, to avoid flash until load event is handled
                MarkWizmaged(el, true);
                DoHidden(el, true);
                return;
            }

            let elWidth = el.width, elHeight = el.height;
            if (el.src == blankImg && !el.srcset) { //was successfully replaced
                DoHidden(el, false);
            } else if ((elWidth == 0 || elWidth > _settings.maxSafe) && (elHeight == 0 || elHeight > _settings.maxSafe)) { //needs to be hidden - we need to catch 0 too, as sometimes images start off as zero
                DoMouseEventListeners(el, true);
                if (!el.wzmHasTitleAndSizeSetup) {
                    el.style.width = elWidth + 'px';
                    el.style.height = elHeight + 'px';
                    if (!el.title)
                        if (el.alt)
                            el.title = el.alt;
                        else {
                            el.src.match(/([-\w]+)(\.[\w]+)?$/i);
                            el.title = RegExp.$1;
                        }
                    el.wzmHasTitleAndSizeSetup = true;
                }
                DoHidden(el, true);
                DoImgSrc(el, true);
                DoWizmageBG(el, true);
                el.src = blankImg;
            } else { //small image
                MarkWizmaged(el, false); //maybe !el.complete initially
                DoHidden(el, false);
            }
        }
        else if (el.tagName == 'VIDEO') {
            DoHidden(el, true);
            MarkWizmaged(el, true);
        } else if (el.tagName == 'PICTURE') {
            for (let i = 0; i < el.children.length; i++) {
                let child = <HTMLElement>el.children[i];
                if (child.tagName == 'SOURCE')
                    DoImgSrc(<HTMLImageElement>child, true);
            }
            MarkWizmaged(el, true);
        } else {
            let compStyle = getComputedStyle(el), bgimg = compStyle.backgroundImage, width = parseInt(compStyle.width!) || el.clientWidth, height = parseInt(compStyle.height!) || el.clientHeight; //as per https://developer.mozilla.org/en/docs/Web/API/window.getComputedStyle, getComputedStyle will return the 'used values' for width and height, which is always in px. We also use clientXXX, since sometimes compStyle returns NaN.
            if (bgimg && bgimg != 'none'
                && !el.wzmWizmaged
                && (width == 0 || width > _settings.maxSafe) && (height == 0 || height > _settings.maxSafe) /*we need to catch 0 too, as sometimes elements start off as zero*/
                && bgimg.indexOf('url(') != -1
                && !bgimg.startsWith(urlExtensionUrl)
            ) {
                DoWizmageBG(el, true);
                DoMouseEventListeners(el, true);
                if (el.wzmLastCheckedSrc != bgimg) {
                    el.wzmLastCheckedSrc = bgimg;
                    let i = new Image();
                    i.owner = el;
                    i.onload = CheckBgImg;
                    let urlMatch = /\burl\(["']?(.*?)["']?\)/.exec(bgimg);
                    if (urlMatch)
                        i.src = urlMatch[1];
                }
            }
        }
    }
    function CheckBgImg(this: GlobalEventHandlers) {
        let el = <HTMLImageElement>this;
        if ((el.height <= _settings.maxSafe || el.width <= _settings.maxSafe) && el.owner) ShowEl.call(el.owner);
        this.onload = null;
    };

    function MarkWizmaged(el: HTMLElement, toggle: boolean) {
        if (toggle) {
            el.wzmWizmaged = true;
            el.wzmBeenBlocked = true;
            if (elList.indexOf(el) == -1) {
                elList.push(el);
                el.wzmRect = el.getBoundingClientRect();
            }
        }
        else
            el.wzmWizmaged = false;
    }

    function DoWizmageBG(el: HTMLElement, toggle: boolean) {
        if (toggle && !el.wzmHasWizmageBG) {
            let shade = Math.floor(Math.random() * 8);
            if (_settings.isNoPattern)
                AddClass(el, 'wizmage-no-bg');
            else {
                el.wzmShade = shade;
                AddClass(el, 'wizmage-pattern-bg-img wizmage-cls wizmage-shade-' + shade);
            }
            el.wzmHasWizmageBG = true;
            MarkWizmaged(el, true);
        } else if (!toggle && el.wzmHasWizmageBG) {
            if (_settings.isNoPattern)
                RemoveClass(el, 'wizmage-no-bg');
            else {
                RemoveClass(el, 'wizmage-pattern-bg-img');
                RemoveClass(el, 'wizmage-cls');
                RemoveClass(el, 'wizmage-shade-' + el.wzmShade);
            }
            el.wzmHasWizmageBG = false;
            MarkWizmaged(el, false);
        }
    }
    //for IMG,SOURCE
    function DoImgSrc(el: HTMLImageElement, toggle: boolean) {
        if (toggle) {
            if (el.tagName != 'SOURCE') {
                el.oldsrc = el.src;
                el.src = '';
            }
            el.oldsrcset = el.srcset;
            el.srcset = '';
        }
        else {
            if (el.tagName != 'SOURCE' && el.oldsrc != undefined) //may be undefined if img was hidden and never loaded
                el.src = el.oldsrc || '';
            if (el.oldsrcset != undefined)
                el.srcset = el.oldsrcset || '';
        }
    }
    function DoHidden(el: HTMLElement, toggle: boolean) {
        if (toggle && !el.wzmHidden) {
            AddClass(el, 'wizmage-hide');
            el.wzmHidden = true;
        } else if (!toggle && el.wzmHidden) {
            RemoveClass(el, 'wizmage-hide');
            el.wzmHidden = false;
        }
    }
    function DoMouseEventListeners(el: HTMLElement, toggle: boolean) {
        if (toggle && !el.wzmHasMouseEventListeners) {
            el.addEventListener('mouseover', mouseEntered);
            el.addEventListener('mouseout', mouseLeft);
            el.wzmHasMouseEventListeners = true;
        } else if (!toggle && el.wzmHasMouseEventListeners) {
            el.removeEventListener('mouseover', mouseEntered);
            el.removeEventListener('mouseout', mouseLeft);
            el.wzmHasMouseEventListeners = false;
        }
    }
    function DoLoadEventListener(el: HTMLElement, toggle: boolean) {
        if (toggle && !el.wzmHasLoadEventListener) {
            el.addEventListener('load', DoElement);
            el.wzmHasLoadEventListener = true;
        } else if (!toggle && el.wzmHasLoadEventListener) {
            el.removeEventListener('load', DoElement);
            el.wzmHasLoadEventListener = false;
        }
    }

    function DoHover(el: HTMLElement, toggle: boolean, evt?: MouseEvent) {
        let coords = el.wzmRect;
        if (toggle && !el.wzmHasHover) {
            if (mouseOverEl && mouseOverEl != el)
                DoHover(mouseOverEl, false);
            mouseOverEl = el;
            DoHoverVisual(el, true, coords);
            el.wzmHasHover = true;
        } else if (!toggle && el.wzmHasHover && (!evt || !coords || !IsMouseIn(evt, coords))) {
            DoHoverVisual(el, false, coords);
            el.wzmHasHover = false;
            if (el == mouseOverEl)
                mouseOverEl = undefined;
        }
    }

    function DoHoverVisual(el: HTMLElement, toggle: boolean, coords?: ClientRect) {
        if (toggle && !el.wzmHasHoverVisual && el.wzmWizmaged) {
            if (!_settings.isNoEye) {
                //eye
                if (!eye.parentElement) //page js may have removed it
                    doc.body.appendChild(eye);
                PositionEye(el, coords);
                eye.style.display = 'block';
                eye.style.backgroundColor = el.tagName == 'VIDEO' ? '#fff' : '';
                let setupEye = function () {
                    eye.style.backgroundImage = eyeCSSUrl;
                    eye.onclick = function (e) {
                        e.stopPropagation();
                        ShowEl.call(el);
                        eye.style.backgroundImage = undoCSSUrl;
                        DoHoverVisualClearTimer(el, true);
                        eye.onclick = function (e) {
                            e.stopPropagation();
                            DoElement.call(el);
                            setupEye();
                            DoHoverVisualClearTimer(el, true);
                        }
                    }
                }
                setupEye();
            } else
                AddClass(el, 'wizmage-light');
            DoHoverVisualClearTimer(el, true);
            el.wzmHasHoverVisual = true;
        } else if (!toggle && el.wzmHasHoverVisual) {
            if (!_settings.isNoEye)
                eye.style.display = 'none';
            else
                RemoveClass(el, 'wizmage-light');
            DoHoverVisualClearTimer(el, false);
            el.wzmHasHoverVisual = false;
        }
    }
    function DoHoverVisualClearTimer(el: HTMLElement, toggle: boolean) {
        if (toggle) {
            DoHoverVisualClearTimer(el, false);
            el.wzmClearHoverVisualTimer = setTimeout(function () { DoHoverVisual(el, false); }, 2500);
        }
        else if (!toggle && el.wzmClearHoverVisualTimer) {
            clearTimeout(el.wzmClearHoverVisualTimer);
            el.wzmClearHoverVisualTimer = undefined;
        }
    }
    function PositionEye(el: HTMLElement, coords?: ClientRect) {
        if (!coords)
            return;
        eye.style.top = (coords.top < 0 ? 0 : coords.top) + 'px';
        let left = coords.right; if (left > doc.documentElement!.clientWidth) left = doc.documentElement!.clientWidth;
        eye.style.left = (left - 16) + 'px';
    }

    function UpdateElRects() {
        for (let el of elList) {
            if (el.wzmBeenBlocked)
                el.wzmRect = el.getBoundingClientRect();
        }
    }

    function CheckMousePosition() {
        if (!mouseMoved || !mouseEvent || !contentLoaded || showAll || windowScrollIX > 0) return;
        mouseMoved = false;
        //see if needs to defocus current
        if (mouseOverEl) {
            let coords = mouseOverEl.wzmRect;
            if (!coords || !IsMouseIn(mouseEvent, coords))
                DoHover(mouseOverEl, false);
            else if (mouseOverEl.wzmWizmaged) {
                if (!mouseOverEl.wzmHasHoverVisual)
                    DoHoverVisual(mouseOverEl, true, coords);
                else {
                    DoHoverVisualClearTimer(mouseOverEl, true);
                    PositionEye(mouseOverEl, coords);
                }
            }
        }
        //find element under mouse
        let foundEl = mouseOverEl, found = false, foundSize = (foundEl && foundEl.wzmRect) ? foundEl.wzmRect.width * foundEl.wzmRect.height : undefined;
        for (let el of elList) {
            if (el == foundEl || !el.wzmBeenBlocked)
                continue;
            let rect = el.wzmRect;
            if (rect && IsMouseIn(mouseEvent, rect)) {
                //If not foundEl yet, use this. Else if foundEl has not got wzmBG, then if ours does, use it. Else if foundEl is bigger, use this.
                let useThis = false;
                if (!foundEl)
                    useThis = true;
                else if (!foundEl.wzmWizmaged && el.wzmWizmaged) {
                    useThis = true;
                }
                else if ((!foundSize || (foundSize > rect.width * rect.height)) && foundEl.wzmWizmaged == el.wzmWizmaged)
                    useThis = true;
                if (useThis) {
                    foundEl = el;
                    foundSize = rect.width * rect.height;
                    found = true;
                }
            }
        }
        if (found && foundEl && foundEl != mouseOverEl) {
            DoHover(foundEl, true);
        }
    }
    function IsMouseIn(mouseEvt: MouseEvent, coords: ClientRect) {
        return mouseEvt.x >= coords.left && mouseEvt.x < coords.right && mouseEvt.y >= coords.top && mouseEvt.y < coords.bottom;
    }

    function ShowEl(this: HTMLElement) {
        //mustn't trigger the observer here to call DoElement on this
        let el = this;
        DoHidden(el, false);
        if (isImg(el)) {
            DoLoadEventListener(el, false);
            DoImgSrc(el, false);
            DoWizmageBG(el, false);
        }
        else if (el.tagName == 'VIDEO') {
            MarkWizmaged(el, false);
        }
        else if (el.tagName == 'PICTURE') {
            for (let i = 0; i < el.children.length; i++) {
                let node = el.children[i];
                if (node.tagName == 'SOURCE')
                    DoImgSrc(<HTMLImageElement>node, false);
            }
            MarkWizmaged(el, false);
        } else {
            DoWizmageBG(el, false);
        }
        if (el.wzmCheckTimeout) {
            clearTimeout(el.wzmCheckTimeout);
            el.wzmCheckTimeout = undefined;
        }
        if (showAll) {
            DoMouseEventListeners(el, false);
        }
    }

}

function RemoveClass(el: Element, n: string) { //these assume long unique class names, so no need to check for word boundaries
    let oldClass = el.className, newClass = el.className.replace(new RegExp('\\b' + n + '\\b'), '');
    if (oldClass != newClass) {
        el.className = newClass;
    }
}
function AddClass(el: Element, c: string) {
    el.className += ' ' + c;
}

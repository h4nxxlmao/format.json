// format.json - Fast client-side JSON Formatter & Validator
// Originally created by hanx (https://hanx.lol)

(function () {
    "use strict";

    var jsonInput = document.getElementById("json-input");
    var jsonOutput = document.getElementById("json-output");
    var editorMain = document.getElementById("editor-main");
    var errorDetail = document.getElementById("error-detail");
    var errorMessage = document.getElementById("error-message");
    var btnCloseError = document.getElementById("btn-close-error");
    var charCount = document.getElementById("char-count");
    var lineCount = document.getElementById("line-count");
    var sizeCount = document.getElementById("size-count");
    var indentSelect = document.getElementById("indent-select");
    var fileUpload = document.getElementById("file-upload");
    var toast = document.getElementById("toast");

    var btnFormat = document.getElementById("btn-format");
    var btnMinify = document.getElementById("btn-minify");
    var btnValidate = document.getElementById("btn-validate");
    var btnClear = document.getElementById("btn-clear");
    var btnCopy = document.getElementById("btn-copy");
    var btnDownload = document.getElementById("btn-download");
    var btnUpload = document.getElementById("btn-upload");
    var btnExample = document.getElementById("btn-example");

    var btnTheme = document.getElementById("btn-theme");
    var themeLabel = document.getElementById("theme-label");

    var tabBtnInput = document.getElementById("tab-btn-input");
    var tabBtnOutput = document.getElementById("tab-btn-output");
    var tabBtnSplit = document.getElementById("tab-btn-split");

    var lastFormatted = "";
    var toastTimer = null;

    var EXAMPLE_JSON = {
        "name": "format.json",
        "version": "1.1.0",
        "description": "JSON Formatter and Validator: by hanx.lol",
        "author": {
            "name": "hanx",
            "url": "https://hanx.lol"
        },
        "features": [
            "format",
            "minify",
            "validate",
            "syntax-highlight",
            "dark-light-theme",
            "responsive-mobile",
            "upload",
            "download"
        ],
        "settings": {
            "indent": 2,
            "theme": "dark",
            "autoValidate": true
        },
        "stats": {
            "users": 1024,
            "active": true,
            "ratio": 3.14159,
            "nothing": null
        }
    };

    function initTheme() {
        var savedTheme = localStorage.getItem("format_json_theme");
        var theme = savedTheme || "dark";
        applyTheme(theme);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("format_json_theme", theme);
        if (theme === "dark") {
            themeLabel.textContent = "Light";
            btnTheme.setAttribute("title", "Switch to light theme");
        } else {
            themeLabel.textContent = "Dark";
            btnTheme.setAttribute("title", "Switch to dark theme");
        }
    }

    function toggleTheme() {
        var current = document.documentElement.getAttribute("data-theme") || "dark";
        var next = (current === "dark") ? "light" : "dark";
        applyTheme(next);
        showToast("Switched to " + next + " mode");
    }

    function setMobileView(view) {
        editorMain.setAttribute("data-mobile-view", view);
        var tabs = [
            { btn: tabBtnInput, name: "input" },
            { btn: tabBtnOutput, name: "output" },
            { btn: tabBtnSplit, name: "split" }
        ];
        tabs.forEach(function (t) {
            var isActive = (t.name === view);
            t.btn.classList.toggle("active", isActive);
            t.btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
    }

    function getIndent() {
        var v = indentSelect.value;
        if (v === "tab") return "\t";
        return parseInt(v, 10);
    }

    function safeParse(str) {
        try {
            return { ok: true, value: JSON.parse(str) };
        } catch (e) {
            return { ok: false, error: e };
        }
    }

    function friendlyError(e, raw) {
        var msg = e.message || String(e);
        var posMatch = msg.match(/position (\d+)/i);
        if (posMatch) {
            var pos = parseInt(posMatch[1], 10);
            var before = raw.substring(Math.max(0, pos - 25), pos);
            var after = raw.substring(pos, Math.min(raw.length, pos + 25));
            var linesBefore = raw.substring(0, pos).match(/\n/g);
            var lineNum = linesBefore ? linesBefore.length + 1 : 1;
            var lastNL = raw.lastIndexOf("\n", pos - 1);
            var colNum = pos - lastNL;
            return msg + "\n\nLine " + lineNum + ", Column " + colNum + "\nContext: ..." + before + " [HERE] " + after + "...";
        }
        return msg;
    }

    function esc(s) {
        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function highlight(jsonStr) {
        return jsonStr.replace(
            /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\]]|[:,])/g,
            function (match) {
                var cls = "";
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        var keyPart = match.slice(0, match.lastIndexOf('"') + 1);
                        return '<span class="tok-key">' + esc(keyPart) + '</span><span class="tok-colon">:</span>';
                    }
                    cls = "tok-str";
                } else if (/^true$|^false$/.test(match)) {
                    cls = "tok-bool";
                } else if (match === "null") {
                    cls = "tok-null";
                } else if (/^[{}\[\]]$/.test(match)) {
                    cls = "tok-brace";
                } else if (match === ",") {
                    cls = "tok-comma";
                } else {
                    cls = "tok-num";
                }
                return '<span class="' + cls + '">' + esc(match) + "</span>";
            }
        );
    }

    function renderOutput(text, useHighlight) {
        if (!text) {
            jsonOutput.innerHTML = '<span class="empty-hint">Output will appear here after formatting or validating.</span>';
            lastFormatted = "";
            return;
        }
        if (useHighlight) {
            jsonOutput.innerHTML = highlight(text);
        } else {
            jsonOutput.textContent = text;
        }
        lastFormatted = text;
    }

    function showError(msg) {
        errorDetail.style.display = "block";
        errorMessage.textContent = msg;
    }

    function hideError() {
        errorDetail.style.display = "none";
        errorMessage.textContent = "";
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + " B";
        var kb = bytes / 1024;
        if (kb < 1024) return kb.toFixed(1) + " KB";
        var mb = kb / 1024;
        return mb.toFixed(2) + " MB";
    }

    function updateStats() {
        var val = jsonInput.value;
        charCount.textContent = val.length.toLocaleString();
        var lines = val === "" ? 0 : (val.match(/\n/g) || []).length + 1;
        lineCount.textContent = lines.toLocaleString();
        var bytes = new Blob([val]).size;
        sizeCount.textContent = formatBytes(bytes);
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("show");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 2200);
    }

    function isMobileView() {
        return window.innerWidth <= 768;
    }

    function doFormat() {
        var raw = jsonInput.value.trim();
        if (!raw) {
            hideError();
            renderOutput("", false);
            showToast("Nothing to format");
            return;
        }
        var result = safeParse(raw);
        if (!result.ok) {
            showError(friendlyError(result.error, raw));
            renderOutput("", false);
            return;
        }
        hideError();
        var formatted = JSON.stringify(result.value, null, getIndent());
        jsonInput.value = formatted;
        renderOutput(formatted, true);
        updateStats();
        showToast("Formatted");

        if (isMobileView()) {
            setMobileView("output");
        }
    }

    function doMinify() {
        var raw = jsonInput.value.trim();
        if (!raw) {
            showToast("Nothing to minify");
            return;
        }
        var result = safeParse(raw);
        if (!result.ok) {
            showError(friendlyError(result.error, raw));
            renderOutput("", false);
            return;
        }
        hideError();
        var minified = JSON.stringify(result.value);
        jsonInput.value = minified;
        renderOutput(minified, false);
        updateStats();
        showToast("Minified: " + minified.length.toLocaleString() + " chars");

        if (isMobileView()) {
            setMobileView("output");
        }
    }

    function doValidate() {
        var raw = jsonInput.value.trim();
        if (!raw) {
            hideError();
            renderOutput("", false);
            showToast("Nothing to validate");
            return;
        }
        var result = safeParse(raw);
        if (result.ok) {
            hideError();
            renderOutput(JSON.stringify(result.value, null, getIndent()), true);
            showToast("Valid JSON syntax");
            if (isMobileView()) {
                setMobileView("output");
            }
        } else {
            showError(friendlyError(result.error, raw));
            renderOutput("", false);
        }
    }

    function doClear() {
        jsonInput.value = "";
        lastFormatted = "";
        renderOutput("", false);
        hideError();
        updateStats();
        if (isMobileView()) {
            setMobileView("input");
        }
        jsonInput.focus();
    }

    function doCopy() {
        var text = lastFormatted || jsonInput.value;
        if (!text) {
            showToast("Nothing to copy");
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("Copied to clipboard");
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand("copy");
            showToast("Copied to clipboard");
        } catch (e) {
            showToast("Copy failed: select text manually");
        }
        document.body.removeChild(ta);
    }

    function doDownload() {
        var text = lastFormatted || jsonInput.value;
        if (!text) {
            showToast("Nothing to download");
            return;
        }
        var blob = new Blob([text], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
        showToast("Downloaded data.json");
    }

    function doUpload() {
        fileUpload.value = "";
        fileUpload.click();
    }

    fileUpload.addEventListener("change", function () {
        var file = fileUpload.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            jsonInput.value = e.target.result;
            updateStats();
            doValidate();
            showToast("Loaded: " + file.name);
        };
        reader.onerror = function () {
            showToast("Error reading file");
        };
        reader.readAsText(file);
    });

    function doExample() {
        jsonInput.value = JSON.stringify(EXAMPLE_JSON, null, 2);
        updateStats();
        doFormat();
    }

    jsonInput.addEventListener("input", function () {
        updateStats();
        hideError();
        lastFormatted = "";
        jsonOutput.innerHTML = '<span class="empty-hint">Press Format or Validate to inspect output.</span>';
    });

    jsonInput.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
            e.preventDefault();
            var start = this.selectionStart;
            var end = this.selectionEnd;
            var indent = (indentSelect.value === "tab") ? "\t" : "  ";
            this.value = this.value.substring(0, start) + indent + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + indent.length;
        } else if (e.key === "Escape") {
            // Allow keyboard-only navigation to escape textarea trap
            this.blur();
        }
    });

    // Event listeners
    btnFormat.addEventListener("click", doFormat);
    btnMinify.addEventListener("click", doMinify);
    btnValidate.addEventListener("click", doValidate);
    btnClear.addEventListener("click", doClear);
    btnCopy.addEventListener("click", doCopy);
    btnDownload.addEventListener("click", doDownload);
    btnUpload.addEventListener("click", doUpload);
    btnExample.addEventListener("click", doExample);

    btnTheme.addEventListener("click", toggleTheme);
    btnCloseError.addEventListener("click", hideError);

    tabBtnInput.addEventListener("click", function () { setMobileView("input"); });
    tabBtnOutput.addEventListener("click", function () { setMobileView("output"); });
    tabBtnSplit.addEventListener("click", function () { setMobileView("split"); });

    document.addEventListener("keydown", function (e) {
        var mod = e.ctrlKey || e.metaKey;
        if (!mod) return;
        if (e.key === "Enter") {
            e.preventDefault();
            doFormat();
        } else if (e.key === "m" || e.key === "M") {
            e.preventDefault();
            doMinify();
        } else if (e.key === "k" || e.key === "K") {
            e.preventDefault();
            doClear();
        }
    });

    // Initialize state
    initTheme();
    updateStats();
    renderOutput("", false);
}());

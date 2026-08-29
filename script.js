// made by hanx https://hanx.pro
// last update/touched 26.08.2026
(function () {
    "use strict";

    var jsonInput = document.getElementById("json-input");
    var jsonOutput = document.getElementById("json-output");
    var statusMsg = document.getElementById("status-msg");
    var statusDot = document.getElementById("status-dot");
    var statusText = document.getElementById("status-text");
    var errorDetail = document.getElementById("error-detail");
    var charCount = document.getElementById("char-count");
    var lineCount = document.getElementById("line-count");
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

    var lastFormatted = "";
    var toastTimer = null;

    var EXAMPLE_JSON = {
        "name": "hanx-json-tool",
        "version": "1.0.0",
        "description": "JSON Formatter & Validator — by hanx.lol",
        "author": {
            "name": "hanx",
            "url": "https://hanx.lol"
        },
        "features": [
            "format",
            "minify",
            "validate",
            "syntax-highlight",
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
            "version": 1,
            "active": true,
            "deprecated": false,
            "ratio": 3.14159,
            "nothing": null
        }
    };

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
            jsonOutput.innerHTML = '<span class="empty-hint">Output will appear here after Format or Validate.</span>';
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

    function setStatus(type, msg) {
        statusMsg.className = "status-msg " + type;
        statusText.textContent = msg;
        if (type === "ok") {
            statusDot.style.background = "var(--ok)";
        } else if (type === "err") {
            statusDot.style.background = "var(--err)";
        } else {
            statusDot.style.background = "var(--text-faint)";
        }
    }

    function showError(msg) {
        errorDetail.style.display = "block";
        errorDetail.textContent = msg;
    }

    function hideError() {
        errorDetail.style.display = "none";
        errorDetail.textContent = "";
    }

    function updateStats() {
        var val = jsonInput.value;
        charCount.textContent = val.length.toLocaleString();
        var lines = val === "" ? 0 : (val.match(/\n/g) || []).length + 1;
        lineCount.textContent = lines.toLocaleString();
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("show");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
    }

    function doFormat() {
        var raw = jsonInput.value.trim();
        if (!raw) { setStatus("idle", "Nothing to format"); hideError(); renderOutput("", false); return; }
        var result = safeParse(raw);
        if (!result.ok) {
            setStatus("err", "Invalid JSON — cannot format");
            showError(friendlyError(result.error, raw));
            renderOutput("", false);
            return;
        }
        hideError();
        var formatted = JSON.stringify(result.value, null, getIndent());
        jsonInput.value = formatted;
        renderOutput(formatted, true);
        setStatus("ok", "Formatted successfully");
        updateStats();
        showToast("Formatted");
    }

    function doMinify() {
        var raw = jsonInput.value.trim();
        if (!raw) { setStatus("idle", "Nothing to minify"); return; }
        var result = safeParse(raw);
        if (!result.ok) {
            setStatus("err", "Invalid JSON — cannot minify");
            showError(friendlyError(result.error, raw));
            renderOutput("", false);
            return;
        }
        hideError();
        var minified = JSON.stringify(result.value);
        jsonInput.value = minified;
        renderOutput(minified, false);
        setStatus("ok", "Minified — " + minified.length.toLocaleString() + " chars");
        updateStats();
        showToast("Minified");
    }

    function doValidate() {
        var raw = jsonInput.value.trim();
        if (!raw) { setStatus("idle", "Nothing to validate"); hideError(); renderOutput("", false); return; }
        var result = safeParse(raw);
        if (result.ok) {
            setStatus("ok", "Valid JSON");
            hideError();
            renderOutput(JSON.stringify(result.value, null, getIndent()), true);
        } else {
            setStatus("err", "Invalid JSON");
            showError(friendlyError(result.error, raw));
            renderOutput("", false);
        }
    }

    function doClear() {
        jsonInput.value = "";
        lastFormatted = "";
        renderOutput("", false);
        setStatus("idle", "Cleared");
        hideError();
        updateStats();
        jsonInput.focus();
    }

    function doCopy() {
        var text = lastFormatted || jsonInput.value;
        if (!text) { showToast("Nothing to copy"); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("Copied to clipboard");
            }).catch(function () { fallbackCopy(text); });
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
        try { document.execCommand("copy"); showToast("Copied to clipboard"); }
        catch (e) { showToast("Copy failed — select text manually"); }
        document.body.removeChild(ta);
    }

    function doDownload() {
        var text = lastFormatted || jsonInput.value;
        if (!text) { showToast("Nothing to download"); return; }
        var blob = new Blob([text], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
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
        reader.onerror = function () { showToast("Error reading file"); };
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
        setStatus("idle", "Ready");
        lastFormatted = "";
        jsonOutput.innerHTML = '<span class="empty-hint">Press Format or Validate to see output.</span>';
    });

    jsonInput.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
            e.preventDefault();
            var start = this.selectionStart;
            var end = this.selectionEnd;
            var indent = (indentSelect.value === "tab") ? "\t" : "  ";
            this.value = this.value.substring(0, start) + indent + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + indent.length;
        }
    });

    btnFormat.addEventListener("click", doFormat);
    btnMinify.addEventListener("click", doMinify);
    btnValidate.addEventListener("click", doValidate);
    btnClear.addEventListener("click", doClear);
    btnCopy.addEventListener("click", doCopy);
    btnDownload.addEventListener("click", doDownload);
    btnUpload.addEventListener("click", doUpload);
    btnExample.addEventListener("click", doExample);

    document.addEventListener("keydown", function (e) {
        var mod = e.ctrlKey || e.metaKey;
        if (!mod) return;
        if (e.key === "Enter") { e.preventDefault(); doFormat(); }
        if (e.key === "m") { e.preventDefault(); doMinify(); }
        if (e.key === "k") { e.preventDefault(); doClear(); }
    });

    updateStats();
    renderOutput("", false);
    setStatus("idle", "Ready");

}());

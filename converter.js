// ======================================================
// Persistent settings / remembered values
// ======================================================
"use strict";

let els = {};

const STORAGE_KEYS = {
    input: "rf_input",
    convertIp: "rf_convert_ip",
    convertOp: "rf_convert_op",
    shiftLvl: "rf_shift_lvl",
    shiftDir: "rf_shift_dir",
    manchesterMode: "rf_manchester_mode",
    keeloqInvert: "rf_keeloq_invert",
    diffInit: "rf_diff_init",
    inputHeight: "rf_input_height",
    inputWidth: "rf_input_width"
};

// load stuff then html is done
window.addEventListener("DOMContentLoaded", () =>
{
    // get the doc elements we care about
    els = {
        input: document.getElementById("binaryInput"),
        output: document.getElementById("output"),
        convertIp: document.getElementById("convertIp"),
        convertOp: document.getElementById("convertOp"),
        shiftLvl: document.getElementById("shiftLvl"),
        shiftDir: document.getElementById("shiftDir"),
        manchesterMode: document.getElementById("manchesterMode"),
        keeloqInvert: document.getElementById("keeloqInvert"),
        diffInit: document.getElementById("diffInit")
    };

    // Load saved values on startup
    loadSettings();

    const elements = [
        "binaryInput",
        "convertIp",
        "convertOp",
        "shiftLvl",
        "shiftDir",
        "manchesterMode",
        "keeloqInvert",
        "diffInit"
    ];

    elements.forEach(id =>
    {
        const el = document.getElementById(id);
        el.addEventListener("input", saveSettings);
        el.addEventListener("change", saveSettings);
    });

    // save textarea resize changes
    const inputBox = document.getElementById("binaryInput");

    // poll size changes caused by textarea resize handle
    let lastW = inputBox.offsetWidth;
    let lastH = inputBox.offsetHeight;

    setInterval(() =>
    {
        if (inputBox.offsetWidth !== lastW || inputBox.offsetHeight !== lastH) {
            lastW = inputBox.offsetWidth;
            lastH = inputBox.offsetHeight;
            saveSettings();
        }
    }, 500);
});


function saveSettings()
{
    const inputBox = document.getElementById("binaryInput");

    localStorage.setItem(STORAGE_KEYS.input, inputBox.value);
    localStorage.setItem(STORAGE_KEYS.convertIp, document.getElementById("convertIp").value);
    localStorage.setItem(STORAGE_KEYS.convertOp,document.getElementById("convertOp").value);
    localStorage.setItem(STORAGE_KEYS.shiftLvl, document.getElementById("shiftLvl").value);
    localStorage.setItem(STORAGE_KEYS.shiftDir, document.getElementById("shiftDir").value);
    localStorage.setItem(STORAGE_KEYS.manchesterMode, document.getElementById("manchesterMode").value);
    localStorage.setItem(STORAGE_KEYS.diffInit, document.getElementById("diffInit").value);

    // remember textarea size
    localStorage.setItem(STORAGE_KEYS.inputHeight, inputBox.offsetHeight);
    localStorage.setItem(STORAGE_KEYS.inputWidth, inputBox.offsetWidth);
}

function loadSettings()
{
    const inputBox = document.getElementById("binaryInput");
    const input = localStorage.getItem(STORAGE_KEYS.input);

    if (input !== null && input.trim().length > 0) {
        inputBox.value = input;
    }

    setIfExists("convertIp", STORAGE_KEYS.convertIp);
    setIfExists("convertOp", STORAGE_KEYS.convertOp);
    setIfExists("shiftLvl", STORAGE_KEYS.shiftLvl);
    setIfExists("shiftDir", STORAGE_KEYS.shiftDir);
    setIfExists("manchesterMode", STORAGE_KEYS.manchesterMode);
    setIfExists("diffInit", STORAGE_KEYS.diffInit);

    restoreTextareaSize();
}

function setIfExists(elementId, storageKey)
{
    const value = localStorage.getItem(storageKey);

    if (value !== null) {
        document.getElementById(elementId).value = value;
    }
}

function restoreTextareaSize()
{
    const inputBox = document.getElementById("binaryInput");
    const savedHeight = parseInt(localStorage.getItem(STORAGE_KEYS.inputHeight));
    const savedWidth = parseInt(localStorage.getItem(STORAGE_KEYS.inputWidth));
    const padding = 40;

    // only restore if it still fits onscreen
    if (!isNaN(savedWidth)) {
        if (savedWidth < window.innerWidth - padding) {
            inputBox.style.width = savedWidth + "px";
        }
    }

    if (!isNaN(savedHeight)) {
        if (savedHeight < window.innerHeight - padding) {
            inputBox.style.height = savedHeight + "px";
        }
    }
}

function cleanBinary(str)
{
    return str.replace(/[^01]/g, '');
}

function normalizeRaw(str)
{
    return str.replace(/0x/gi, '').replace(/\s+/g, '');
}

function normalizeInput(str)
{
    return str.trim().replace(/0x/gi, '').replace(/\s+/g, '');
}

function isHex(str)
{
    return /^[0-9a-fA-F]+$/.test(str);
}

function isBinary(str)
{
    return /^[01]+$/.test(str);
}


function getInputLines()
{
    return document.getElementById("binaryInput").value
        .split("\n")
        .map(x => x.trim())
        .filter(x => x.length);
}

function getBitsFromLine(line)
{
    let input = normalizeInput(line);

    if (!input)
        return "";

    // hex input
    if (isHex(input) && !isBinary(input)) {
        let bits = "";
        // each hex digit = exactly 4 bits
        for (let i = 0; i < input.length; i++) {
            const nibble = parseInt(input[i], 16);
            bits += nibble.toString(2).padStart(4, '0');
        }
        return bits;
    }

    // binary input
    return input;
}

function getHexFromLine(line)
{
    let input = normalizeInput(line);

    if (!input)
        return "";

    // hex input
    if (isBinary(input)) {
        return bitsToHex(input);
    }

    // binary input
    return input;
}

function getBitsFromInput()
{
    const lines = getInputLines();

    return lines.map(line => ({
        original: line,
        bits: getBitsFromLine(line),
        hex: getHexFromLine(line)
    }));
}

function bitsToHex(bits)
{
    let padded = bits;

    while (padded.length % 8 !== 0)
        padded += '0';

    let hex = [];

    for (let i = 0; i < padded.length; i += 8) {
        let byteStr = padded.substr(i, 8);
        let value = parseInt(byteStr, 2);
        hex.push(value.toString(16).padStart(2, '0'));
    }

    return hex.join(' ');
}

function convert()
{
    const input = normalizeInput(document.getElementById("binaryInput").value);
    const rows = getBitsFromInput();
    let out = "";

    for (const row of rows) {
        // original input was binary
        if (isBinary(normalizeInput(row.original))) {
            out += row.hex + "\n\n";
            continue;
        }
        // original input was hex
        if (isHex(normalizeInput(row.original))) {
            out += row.bits + "\n\n";
            continue;
        }
        out += "Invalid input\n\n";
    }
    document.getElementById("output").textContent = out.trim();
}

function shiftBits()
{
    const rows = getBitsFromInput();
    const val = document.getElementById("shiftLvl").value;
    const shiftDir = document.getElementById("shiftDir").value;

    let out = "";

    for (const row of rows) {
        const original = row.bits;
        if (shiftDir == "0") {
            for (let shift = 0; shift <= 8; shift++) {
                // RIGHT shift: pad left with zeros, trim right
                let shifted = val.repeat(shift) + original;
                shifted = shifted.slice(0, original.length + shift);
                const hex = bitsToHex(shifted);
                out += "SHIFT " + shift + ": " + hex + "\n";
            }
        } else if (shiftDir == "1") {
            for (let shift = 0; shift <= 8; shift++) {
                // LEFT shift mirror: append instead of prepend
                let shifted =  val.repeat(8-shift) + original ;
                shifted = shifted.slice(0, original.length + shift);
                const hex = bitsToHex(shifted);
                out += "SHIFT " + shift + ": " + hex + "\n";
            }
        }
        out += "\n";
    }
    document.getElementById("output").textContent = out.trim();
}

function decodeManchester()
{
    const rows = getBitsFromInput();
    const mode = document.getElementById("manchesterMode").value;
    let out = "";
    
    for (const row of rows) {
        const bits = row.bits;
        if (bits.length % 2 !== 0) {
            document.getElementById("output").textContent ="require even number of bits";
            return;
        }
        let decoded = "";
        let errors = 0;
        for (let i = 0; i < bits.length; i += 2) {
            const pair = bits.substr(i, 2);
            if (mode === "1") {
                if (pair === "01") decoded += "1";
                else if (pair === "10") decoded += "0";
                else { decoded += "?"; errors++; }
            } else {
                if (pair === "10") decoded += "1";
                else if (pair === "01") decoded += "0";
                else { decoded += "?"; errors++; }
            }
        }
        out += "Bits:\n" + bits + "\n" +
                "Manchester Decoded:\n" + decoded + "\n" +
                "HEX:\n" + bitsToHex(decoded.replace(/\?/g, '0')) + "\n" +
                "Errors: " + errors + "\n\n";
    }
    document.getElementById("output").textContent = out.trim();
}

function decodeDiffManchester()
{
    const rows = getBitsFromInput();
    let level = document.getElementById("diffInit").value;
    let out = "";

    for (const row of rows) {
        const bits = row.bits;
        if (bits.length < 2 || bits.length % 2 !== 0) {
            document.getElementById("output").textContent = "require even number of bits";
            return;
        }
        let decoded = "";
        let errors = 0;
        for (let i = 0; i < bits.length; i += 2) {
            const h1 = bits[i];
            const h2 = bits[i + 1];
            if (h1 === h2) {
                decoded += "?";
                errors++;
                level = h2;
                continue;
            }
            decoded += (h1 === level) ? "1" : "0";
            level = h2;
        }
        out += "Bits:\n" + bits + "\n" +
                "Differential Manchester Decoded:\n" + decoded + "\n" +
                "HEX:\n" + bitsToHex(decoded.replace(/\?/g, '0')) + "\n" +
                "Errors: " + errors + "\n\n";
    }
    document.getElementById("output").textContent = out.trim();
}


function decodeKeeloq()
{
    const rows = getBitsFromInput();
    const mode = document.getElementById("keeloqInvert").value;
    let out = "";
    
    for (const row of rows) {
        const bits = row.bits;
        if (bits.length % 3 !== 0) {
            document.getElementById("output").textContent ="require multiple of 3 bits";
            return;
        }

        let decoded = "";
        let errors = 0;
        for (let i = 0; i < bits.length; i += 3) {
            const triplet = bits.substr(i, 3);
            if (mode === "1") {
                if (triplet === "100") decoded += "1";
                else if (triplet === "110") decoded += "0";
                else { decoded += "?"; errors++; }
            } else {
                if (triplet === "100") decoded += "1";
                else if (triplet === "110") decoded += "0";
                else { decoded += "?"; errors++; }
            }
        }
        out += "Bits:\n" + bits + "\n" +
                "Keeloq Decoded:\n" + decoded + "\n" +
                "HEX:\n" + bitsToHex(decoded.replace(/\?/g, '0')) + "\n" +
                "Errors: " + errors + "\n\n";
    }
    document.getElementById("output").textContent = out.trim();
}

function encodeManchester()
{
    const rows = getBitsFromInput();
    const mode = document.getElementById("manchesterMode").value;
    let out = "";
    for (const row of rows) {
        const bits = row.bits;
        if (!bits || !isBinary(bits)) {
            document.getElementById("output").textContent = "Input not valid";
            return;
        }
        let encoded = "";
        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];
            if (mode === "1") {
                // 1 = 01,  0 = 10
                encoded += (bit === "1") ? "01" : "10";
            } else {
                // 1 = 10,  0 = 01
                encoded += (bit === "1") ? "10" : "01";
            }
        }
        out += "Input Bits:\n" + bits + "\n" +
                "Manchester Encoded:\n" + encoded + "\n" +
                "HEX:\n" + bitsToHex(encoded) + "\n\n";
    }
    document.getElementById("output").textContent = out.trim();
}

function encodeDiffManchester()
{
    const rows = getBitsFromInput();
    let out = "";
    for (const row of rows) {
        const bits = row.bits;
        if (!bits || !isBinary(bits)) {
            document.getElementById("output").textContent = "Input not valid";
            return;
        }
        let encoded = "";
        let level = document.getElementById("diffInit").value;
        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];
            let h1;
            let h2;
            if (bit === "0") {
                // transition at start
                h1 = (level === "0") ? "1" : "0";
            } else {
                // no transition at start
                h1 = level;
            }
            // always transition in middle
            h2 = (h1 === "0") ? "1" : "0";
            encoded += h1 + h2;
            level = h2;
        }
        out += "Input Bits:\n" + bits + "\n" +
                "Differential Manchester Encoded:\n" + encoded + "\n" +
                "HEX:\n" + bitsToHex(encoded) + "\n\n";
    }
    document.getElementById("output").textContent = out.trim();

}

function encodeKeeloq()
{
    const rows = getBitsFromInput();
    const mode = document.getElementById("keeloqInvert").value;
    let out = "";
    for (const row of rows) {
        const bits = row.bits;
        if (!bits || !isBinary(bits)) {
            document.getElementById("output").textContent = "Input not valid";
            return;
        }
        let encoded = "";
        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];
            if (mode === "1") {
                // 1 = 01,  0 = 10
                encoded += (bit === "1") ? "100" : "110";
            } else {
                // 1 = 10,  0 = 01
                encoded += (bit === "1") ? "110" : "100";
            }
        }
        out += "Input Bits:\n" + bits + "\n" +
                "Keeloq Encoded:\n" + encoded + "\n" +
                "HEX:\n" + bitsToHex(encoded) + "\n\n";
    }
    document.getElementById("output").textContent = out.trim();
}

// ======================================================
// Persistent settings / remembered values
// ======================================================
"use strict";



let originalWidth = 0;
let zoom = 1;
const BASE_WIDTH = 2500;
let container = null;
let redrawPending = false;

let graphSamples;
let viewStart = 0;       // first sample displayed
let samplesPerPixel = 20;
const GRAPH_WIDTH = 2500;

let dragging = false;
let lastMouseX = 0;

// load stuff then html is done
window.addEventListener("DOMContentLoaded", () =>
{
    container = document.querySelector(".graph-container");
    container.addEventListener("wheel", onGraphWheel, { passive: false });
    const canvas = document.getElementById("signalGraph");

    canvas.addEventListener("mousedown", e =>
    {
        dragging = true;
        lastMouseX = e.offsetX;
    });

    window.addEventListener("mouseup", () =>
    {
        dragging = false;
    });

    canvas.addEventListener("mousemove", e =>
    {
        if (!dragging || !graphSamples)
            return;
        const dx = e.offsetX - lastMouseX;
        viewStart -= dx * samplesPerPixel;
        const visible = GRAPH_WIDTH * samplesPerPixel;
        viewStart = Math.max(
            0,
            Math.min(graphSamples.length - visible, viewStart)
        );
        lastMouseX = e.offsetX;
        drawSignal();
    });
});

function onGraphWheel(e)
{
    e.preventDefault();

    const mouseSample =
        viewStart + e.offsetX * samplesPerPixel;

    if (e.deltaY < 0)
        samplesPerPixel /= 1.25;
    else
        samplesPerPixel *= 1.25;

    const maxSamplesPerPixel = graphSamples.length / GRAPH_WIDTH;
    samplesPerPixel *= Math.pow(1.0025, e.deltaY);
    samplesPerPixel = Math.max(0.01, samplesPerPixel);
    samplesPerPixel = Math.min(maxSamplesPerPixel, samplesPerPixel);

    // Keep sample under mouse fixed
    viewStart = mouseSample - e.offsetX * samplesPerPixel;
    const visibleSamples = GRAPH_WIDTH * samplesPerPixel;
    viewStart = Math.max(0, Math.min(graphSamples.length - visibleSamples, viewStart));

    drawSignal();
}

function showLoading(text = "Parsing IQ file...")
{
    const overlay = document.getElementById("loadingOverlay");
    overlay.lastElementChild.textContent = text;
    overlay.style.display = "flex";
}

function hideLoading()
{
    document.getElementById("loadingOverlay").style.display = "none";
}

let iqSamples = null;
function importRfFile()
{
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = ".iq,.complex16s";

    picker.onchange = async () =>
    {
        if (!picker.files.length)
            return;

        try
        {
            const file = picker.files[0];
            console.log("Importing:", file.name);

            showLoading();

            // Let the browser paint the spinner
            await new Promise(r => setTimeout(r, 0));

            const buffer = await file.arrayBuffer();

            iqSamples = new Int8Array(buffer);
            // Build graph data from iqSamples
            const display = new Int8Array(iqSamples.length / 2);
            for (let i = 0, j = 0; i + 1 < iqSamples.length; i += 2) {
                display[j++] = iqSamples[i];
            }
            graphSamples = display;

            samplesPerPixel = graphSamples.length / GRAPH_WIDTH;
            viewStart = 0;
            zoom = 1;
            drawSignal();
        }
        finally
        {
            hideLoading();
        }
    };

    picker.click();
}

function u8ToY(sample, height)
{
    return height - (sample / 255) * (height - 10) - 5;
}

function s8ToY(sample, height)
{
    return height / 2
        - (sample / 128) * (height / 2 - 5);
}

function drawSignal()
{
    if (!graphSamples)
        return;

    const canvas = document.getElementById("signalGraph");
    const ctx = canvas.getContext("2d");

    const width = GRAPH_WIDTH;
    const height = 220;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    // Centre line
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.strokeStyle = "#00ff66";
    ctx.lineWidth = 1;

    if (samplesPerPixel > 200)
    {
        // =====================================================
        // Zoomed out: draw min/max bars
        // =====================================================
        ctx.beginPath();

        for (let x = 0; x < width; x++)
        {
            const start = Math.floor(viewStart + x * samplesPerPixel);

            if (start >= graphSamples.length)
                break;

            const end = Math.max(
                start + 1,
                Math.min(
                    Math.floor(start + samplesPerPixel),
                    graphSamples.length
                )
            );

            let min = 127;
            let max = -128;

            for (let i = start; i < end; i++)
            {
                const s = graphSamples[i];

                if (s < min) min = s;
                if (s > max) max = s;
            }

            ctx.moveTo(x + 0.5, s8ToY(max, height));
            ctx.lineTo(x + 0.5, s8ToY(min, height));
        }

        ctx.stroke();
    }
    else
    {
        // =====================================================
        // Zoomed in: draw connected waveform
        // =====================================================
        ctx.beginPath();

        let first = true;

        for (let x = 0; x < width; x++){

            const pos = viewStart + x * samplesPerPixel;
            const i0 = Math.floor(pos);
            const i1 = Math.min(i0 + 1, graphSamples.length - 1);
            const t = pos - i0;
            const sample = graphSamples[i0] * (1 - t) + graphSamples[i1] * t;

            const y = s8ToY(sample, height);

            if (first)
            {
                ctx.moveTo(x, y);
                first = false;
            }
            else
            {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }
}


function demodulateIQ()
{
    if (!iqSamples)
        return "";

    const params =
    {
        sampleRate: Number(document.getElementById("sampleRate").value),
        decimation: Number(document.getElementById("decimation").value),
        threshold: Number(document.getElementById("noiseThreshold").value),
        zeroBreak: Number(document.getElementById("zeroBreak").value),
        minBurst: Number(document.getElementById("minBurst").value)
    };

    let bits = "";
    try 
    {
        showLoading();
        const samples = iqSamples;
        let sum = 0;
        let count = 0;

        const step = params.decimation * 2;

        for (let i = 0; i + 1 < samples.length; i += step) {
            sum += Math.abs(samples[i]) + Math.abs(samples[i + 1]);
            count++;
        }
        let threshold;

        if (params.threshold < 0)
            threshold = sum / count;
        else
            threshold = params.threshold;
        
        console.log("Average magnitude threshold:", threshold);

        for (let i = 0; i + 1 < samples.length; i += step) {
            const mag = Math.abs(samples[i]) + Math.abs(samples[i + 1]);
            bits += (mag > threshold) ? "1" : "0";
        }

        bits = bits.replace(/0{50,}/g, "\n\n");
        document.getElementById("demod_results").textContent = bits.trim();
    }
    finally 
    {
        hideLoading();
    }
    return bits;
}

function moveToAnalysis() {
    document.getElementById("binaryInput").value = document.getElementById("demod_results").textContent
}
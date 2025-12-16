
import { systems } from './systems.js';

export async function startDanmakuMaker(savedata, battleFunc, initFunc, beamFunc) {
    console.log("Starting Danmaku Maker...");

return new Promise((resolve) => {

document.getElementById("a_back").remove();
        document.getElementById("background").remove();

        const THEME = {
            bg: "#1e1e1e",
            paletteBg: "#252526",
            workspaceBg: "#1e1e1e",
            blockDefault: "#4c97ff",
            blockControl: "#ffab19",
            blockEvent: "#ffbf00",
            blockLooks: "#9966ff",
            text: "#ffffff",
            border: "#333333",
            accent: "#0e639c"
        };

        const STYLE_SHEET = `
            .scratch-container {
                font-family: "DotJP", Helvetica, Arial, sans-serif;
                color: ${THEME.text};
                display: flex; height: 100vh; overflow: hidden;
                background: ${THEME.bg};
            }
            .palette {
                width: 250px; background: ${THEME.paletteBg};
                border-right: 1px solid ${THEME.border};
                display: flex; flex-direction: column;
                padding: 10px; overflow-y: auto;
            }
            .workspace {
                flex: 1; background: ${THEME.workspaceBg};
                position: relative; overflow: auto;
                background-image: radial-gradient(#333 1px, transparent 1px);
                background-size: 20px 20px;
            }
            .preview-panel {
                width: 400px; background: #000;
                border-left: 1px solid ${THEME.border};
                display: flex; flex-direction: column;
            }
            .block {
                padding: 10px; margin: 5px 0;
                border-radius: 4px; cursor: grab;
                color: white; font-weight: bold; font-size: 12px;
                display: flex; align-items: center; gap: 5px;
                box-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                white-space: nowrap;
            }
            .block:active { cursor: grabbing; }
            .block input {
                background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.3);
                color: white; border-radius: 10px; padding: 2px 6px;
                width: 50px; text-align: center;
            }
            .block-control { background-color: ${THEME.blockControl}; border: 1px solid #cf8b17; }
            .block-motion { background-color: ${THEME.blockDefault}; border: 1px solid #3373cc; }
            .block-looks { background-color: ${THEME.blockLooks}; border: 1px solid #774dcb; }

            .nested-area {
                min-height: 40px; margin: 10px 0 5px 20px;
                border: 2px dashed rgba(255,255,255,0.3);
                border-radius: 4px;
                padding: 10px;
                background: rgba(0,0,0,0.2);
                position: relative;
            }
            .nested-area:empty::before {
                content: "Drag blocks here...";
                color: rgba(255,255,255,0.4);
                font-size: 11px;
                font-style: italic;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }
            .nested-area.drag-over {
                background: rgba(76, 151, 255, 0.2);
                border-color: #4c97ff;
            }

            .btn {
                background: #333; color: white; border: 1px solid #555;
                padding: 5px 10px; cursor: pointer; margin: 2px;
            }
            .btn:hover { background: #444; }
            .btn-green { background: #2da44e; border-color: #2da44e; }
            .btn-red { background: #cf222e; border-color: #cf222e; }
        `;

let script = [];
        let workspaceEl;
        let draggedBlock = null;
        let draggedSource = null;
        let elementDataMap = new WeakMap();
        let isPlaying = false;
        let beams = [];

        const BLOCK_DEFS = {
            "repeat": { category: "control", label: "Repeat", params: [{ name: "times", type: "number", default: 10 }], hasChildren: true },
            "for": {
                category: "control", label: "For i from",
                params: [
                    { name: "start", type: "number", default: 0, label: "Start" },
                    { name: "end", type: "number", default: 10, label: "End" }
                ],
                hasChildren: true
            },
            "wait": { category: "control", label: "Wait Frames", params: [{ name: "frames", type: "number", default: 5 }] },
            "set_angle": { category: "motion", label: "Set Base Angle", params: [{ name: "val", type: "number", default: 0 }] },
            "change_angle": { category: "motion", label: "Change Angle By", params: [{ name: "val", type: "number", default: 10 }] },
            "set_angle_from_index": {
                category: "motion", label: "Set Angle = i ×",
                params: [
                    { name: "multiplier", type: "number", default: 10, label: "Multiplier" },
                    { name: "offset", type: "number", default: 0, label: "+ Offset" }
                ]
            },
            "change_angle_by_index": {
                category: "motion", label: "Change Angle by i ×",
                params: [{ name: "multiplier", type: "number", default: 5, label: "Multiplier" }]
            },
            "set_var": {
                category: "motion", label: "Set Var",
                params: [
                    { name: "name", type: "text", default: "x", label: "Name" },
                    { name: "value", type: "number", default: 0, label: "= Value" }
                ]
            },
            "add_to_var": {
                category: "motion", label: "Add to Var",
                params: [
                    { name: "name", type: "text", default: "x", label: "Name" },
                    { name: "value", type: "number", default: 1, label: "+ Value" }
                ]
            },
            "subtract_from_var": {
                category: "motion", label: "Subtract from Var",
                params: [
                    { name: "name", type: "text", default: "x", label: "Name" },
                    { name: "value", type: "number", default: 1, label: "- Value" }
                ]
            },
            "multiply_var": {
                category: "motion", label: "Multiply Var",
                params: [
                    { name: "name", type: "text", default: "x", label: "Name" },
                    { name: "value", type: "number", default: 2, label: "× Value" }
                ]
            },
            "divide_var": {
                category: "motion", label: "Divide Var",
                params: [
                    { name: "name", type: "text", default: "x", label: "Name" },
                    { name: "value", type: "number", default: 2, label: "÷ Value" }
                ]
            },
            "set_angle_from_var": {
                category: "motion", label: "Set Angle from Var",
                params: [{ name: "name", type: "text", default: "angle", label: "Name" }]
            },
            "fire_angle": {
                category: "motion", label: "Fire Beam (Angle)",
                params: [
                    { name: "x", type: "number", default: 600, label: "X" },
                    { name: "y", type: "number", default: 350, label: "Y" },
                    { name: "speed", type: "number", default: 5 },
                    { name: "offset", type: "number", default: 0, label: "Angle Offset" }
                ]
            },
            "fire_standard": {
                category: "motion", label: "Fire Beam (VX/VY)",
                params: [
                    { name: "x", type: "number", default: 600, label: "X" },
                    { name: "y", type: "number", default: 350, label: "Y" },
                    { name: "vx", type: "number", default: 5, label: "VX" },
                    { name: "vy", type: "number", default: 0, label: "VY" }
                ]
            },
            "set_color": { category: "looks", label: "Set Color", params: [{ name: "color", type: "color", default: "#00ffcc" }] },
            "set_tate": { category: "looks", label: "Vertical Mode (Tate)", params: [{ name: "enabled", type: "checkbox", default: true }] }
        };

function getPramsDefault(def) {
            let p = {};
            def.params.forEach(param => {
                p[param.name] = param.default;
            });
            return p;
        }

        function createButton(text, cls, onclick) {
            const b = document.createElement('button');
            b.className = cls;
            b.textContent = text;
            b.style.display = "block";
            b.style.width = "100%";
            b.onclick = onclick;
            return b;
        }

        function createBlockElSimple(type, def) {
            const div = document.createElement('div');
            div.className = `block block-${def.category}`;
            div.textContent = def.label;
            return div;
        }

        function renderBlock(block, parentList, index) {
            const def = BLOCK_DEFS[block.type];
            if (!def) return document.createElement('div');

            const el = document.createElement('div');
            el.className = `block block-${def.category}`;
            elementDataMap.set(el, { block, parentList, index });

            const labelText = document.createElement('span');
            labelText.textContent = def.label;
            el.appendChild(labelText);

            def.params.forEach(p => {
                const input = document.createElement('input');
                input.type = p.type === "checkbox" ? "checkbox" : (p.type === "color" ? "color" : "text");
                if (p.type === "checkbox") input.checked = block.params[p.name];
                else input.value = block.params[p.name];
                input.onchange = (e) => {
                    block.params[p.name] = p.type === "checkbox" ? e.target.checked : e.target.value;
                };
                input.onmousedown = (e) => e.stopPropagation();
                el.appendChild(input);
            });

            const delBtn = document.createElement('span');
            delBtn.innerHTML = " &times;";
            delBtn.style.cursor = "pointer";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                parentList.splice(index, 1);
                renderWorkspace();
            };
            el.appendChild(delBtn);

            el.draggable = true;
            el.ondragstart = (e) => {
                e.stopPropagation();
                draggedBlock = block;
                e.dataTransfer.setData("text/plain", block.type);
                const data = elementDataMap.get(el);
                if (data) {
                    e.dataTransfer.effectAllowed = "move";
                    draggedSource = { list: parentList, index: index };
                }
            };

            if (def.hasChildren) {
                const nested = document.createElement('div');
                nested.className = "nested-area";
                block.children.forEach((child, i) => {
                    nested.appendChild(renderBlock(child, block.children, i));
                });
                nested.ondragover = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nested.classList.add('drag-over');
                };
                nested.ondragleave = (e) => {
                    e.stopPropagation();
                    nested.classList.remove('drag-over');
                };
                nested.ondrop = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nested.classList.remove('drag-over');
                    handleDrop(block.children);
                };
                el.appendChild(nested);
            }
            return el;
        }

        function renderWorkspace() {
            workspaceEl.innerHTML = "";
            script.forEach((block, i) => {
                workspaceEl.appendChild(renderBlock(block, script, i));
            });
        }

        function handleDrop(targetList) {
            if (!draggedBlock) return;
            let blockToInsert = draggedBlock;
            if (draggedSource) {
                const { list, index } = draggedSource;
                list.splice(index, 1);
                draggedSource = null;
            } else {
                blockToInsert = JSON.parse(JSON.stringify(draggedBlock));
            }
            targetList.push(blockToInsert);
            renderWorkspace();
            draggedBlock = null;
        }

        function runPreview() {
            if (isPlaying) return;
            isPlaying = true;
            beams = [];
            runInterpreter();
            animatePreview();
        }

        function stopPreview() {
            isPlaying = false;
            beams = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        async function runInterpreter() {
            const ctxState = { angle: 0, color: "#00ffcc", tate: true, vars: {}, loopStack: [] };
            const execP = async (block) => {
                if (!isPlaying) return;
                if (block.type === "repeat") {
                    for (let i = 0; i < block.params.times; i++) {
                        if (!isPlaying) break;
                        for (const child of block.children) await execP(child);
                    }
                } else if (block.type === "for") {
                    const start = parseInt(block.params.start);
                    const end = parseInt(block.params.end);
                    for (let i = start; i <= end; i++) {
                        if (!isPlaying) break;
                        ctxState.loopStack.push(i);
                        for (const child of block.children) await execP(child);
                        ctxState.loopStack.pop();
                    }
                } else if (block.type === "wait") {
                    if (!isPlaying) return;
                    await new Promise(r => setTimeout(r, block.params.frames * 16));
                } else if (block.type === "set_angle") {
                    ctxState.angle = parseFloat(block.params.val);
                } else if (block.type === "change_angle") {
                    ctxState.angle += parseFloat(block.params.val);
                } else if (block.type === "set_angle_from_index") {
                    const i = ctxState.loopStack.length > 0 ? ctxState.loopStack[ctxState.loopStack.length - 1] : 0;
                    const multiplier = parseFloat(block.params.multiplier);
                    const offset = parseFloat(block.params.offset);
                    ctxState.angle = i * multiplier + offset;
                } else if (block.type === "change_angle_by_index") {
                    const i = ctxState.loopStack.length > 0 ? ctxState.loopStack[ctxState.loopStack.length - 1] : 0;
                    const multiplier = parseFloat(block.params.multiplier);
                    ctxState.angle += i * multiplier;
                } else if (block.type === "set_var") {
                    const name = block.params.name;
                    const value = parseFloat(block.params.value);
                    ctxState.vars[name] = value;
                } else if (block.type === "add_to_var") {
                    const name = block.params.name;
                    const value = parseFloat(block.params.value);
                    ctxState.vars[name] = (ctxState.vars[name] || 0) + value;
                } else if (block.type === "subtract_from_var") {
                    const name = block.params.name;
                    const value = parseFloat(block.params.value);
                    ctxState.vars[name] = (ctxState.vars[name] || 0) - value;
                } else if (block.type === "multiply_var") {
                    const name = block.params.name;
                    const value = parseFloat(block.params.value);
                    ctxState.vars[name] = (ctxState.vars[name] || 0) * value;
                } else if (block.type === "divide_var") {
                    const name = block.params.name;
                    const value = parseFloat(block.params.value);
                    if (value !== 0) {
                        ctxState.vars[name] = (ctxState.vars[name] || 0) / value;
                    }
                } else if (block.type === "set_angle_from_var") {
                    const name = block.params.name;
                    ctxState.angle = ctxState.vars[name] || 0;
                } else if (block.type === "set_color") {
                    ctxState.color = block.params.color;
                } else if (block.type === "fire_angle") {
                    const spd = parseFloat(block.params.speed);
                    const finalAng = ctxState.angle + parseFloat(block.params.offset);
                    const x = parseFloat(block.params.x) / 3;
                    const y = parseFloat(block.params.y) / 2.33;
                    beams.push({
                        x: x, y: y,
                        vx: Math.cos(finalAng * Math.PI / 180) * spd,
                        vy: Math.sin(finalAng * Math.PI / 180) * spd,
                        angle: finalAng,
                        color: ctxState.color,
                        life: 100,
                        tate: ctxState.tate
                    });
                } else if (block.type === "fire_standard") {
                    const x = parseFloat(block.params.x) / 3;
                    const y = parseFloat(block.params.y) / 2.33;
                    const vx = parseFloat(block.params.vx);
                    const vy = parseFloat(block.params.vy);
                    const angle = Math.atan2(vy, vx) * 180 / Math.PI;
                    beams.push({
                        x: x, y: y,
                        vx: vx,
                        vy: vy,
                        angle: angle,
                        color: ctxState.color,
                        life: 100,
                        tate: ctxState.tate
                    });
                }
            };
            while (isPlaying) {
                for (const block of script) {
                    await execP(block);
                    if (!isPlaying) break;
                }
                await new Promise(r => setTimeout(r, 200));
            }
        }

        function animatePreview() {
            if (!isPlaying) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#444";
            ctx.strokeRect(0, 0, 400, 300);

            for (let i = beams.length - 1; i >= 0; i--) {
                const b = beams[i];
                b.x += b.vx; b.y += b.vy; b.life--;
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle * Math.PI / 180);
                ctx.fillStyle = b.color;
                if (b.tate) ctx.fillRect(-300, -7.5, 600, 15);
                else ctx.fillRect(-7.5, -300, 15, 600);
                ctx.restore();
                if (b.life <= 0 || b.x < -500 || b.x > 900) beams.splice(i, 1);
            }
            requestAnimationFrame(animatePreview);
        }

        function close() {
            style.remove();
            container.remove();
            stopPreview();
            const aBack = document.getElementById("a_back");
            if (aBack) aBack.style.display = "block";
        }

const style = document.createElement('style');
        style.textContent = STYLE_SHEET;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.className = "scratch-container";
        container.style.zIndex = "5500";
        const stage = document.getElementById("stage") || document.body;
        stage.appendChild(container);

const palette = document.createElement('div');
        palette.className = "palette";
        palette.innerHTML = "<h3>COMMANDS</h3>";
        container.appendChild(palette);

        Object.keys(BLOCK_DEFS).forEach(type => {
            const def = BLOCK_DEFS[type];
            const el = createBlockElSimple(type, def);
            el.draggable = true;
            el.ondragstart = (e) => {
                draggedBlock = { type: type, params: { ...getPramsDefault(def) }, children: [] };
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("text/plain", type);
            };
            palette.appendChild(el);
        });

const workspace = document.createElement('div');
        workspace.className = "workspace";
        workspace.innerHTML = "<div style='padding:10px; color:#666;'>When Battle Starts...</div>";

        const scriptRoot = document.createElement('div');
        scriptRoot.id = "script-root";
        scriptRoot.style.minHeight = "400px";
        scriptRoot.style.padding = "10px";
        workspace.appendChild(scriptRoot);
        workspaceEl = scriptRoot;
        container.appendChild(workspace);

        workspaceEl.ondragover = (e) => e.preventDefault();
        workspaceEl.ondrop = (e) => {
            e.preventDefault();
            handleDrop(script);
        };

const previewPanel = document.createElement('div');
        previewPanel.className = "preview-panel";
        container.appendChild(previewPanel);

        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 300;
        canvas.style.cssText = "width: 100%; height: 300px; background: #000; border-bottom: 1px solid #333;";
        previewPanel.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const controls = document.createElement('div');
        controls.style.padding = "10px";
        previewPanel.appendChild(controls);

const btnRun = createButton("RUN PREVIEW", "btn-green", runPreview);
        controls.appendChild(btnRun);

        const btnStop = createButton("STOP", "btn-red", stopPreview);
        controls.appendChild(btnStop);

        const btnClear = createButton("CLEAR SCRIPT", "btn", () => {
            if (confirm("Clear all blocks?")) {
                script = [];
                renderWorkspace();
            }
        });
        controls.appendChild(btnClear);

        const btnExport = createButton("COPY JSON", "btn", () => {
            navigator.clipboard.writeText(JSON.stringify(script, null, 2));
            alert("Script copied to clipboard!");
        });
        controls.appendChild(btnExport);

        const btnImport = createButton("IMPORT JSON", "btn", () => {
            const json = prompt("Paste JSON script:");
            if (json) {
                try {
                    script = JSON.parse(json);
                    renderWorkspace();
                } catch (e) { alert("Invalid JSON"); }
            }
        });
        controls.appendChild(btnImport);

        const btnTest = createButton("TEST IN BATTLE", "btn-green", async () => {
            container.style.display = "none";
            isPlaying = false;

            const runner = async (callbackbeam, sys, col) => {
                const ctxState = { angle: 0, color: "#ffffff", tate: true, vars: {}, loopStack: [] };
                const execBlock = async (block) => {
                    if (block.type === "repeat") {
                        for (let i = 0; i < block.params.times; i++) {
                            if (!window.battleActive) break;
                            for (const child of block.children) await execBlock(child);
                        }
                    } else if (block.type === "for") {
                        const start = parseInt(block.params.start);
                        const end = parseInt(block.params.end);
                        for (let i = start; i <= end; i++) {
                            if (!window.battleActive) break;
                            ctxState.loopStack.push(i);
                            for (const child of block.children) await execBlock(child);
                            ctxState.loopStack.pop();
                        }
                    } else if (block.type === "wait") {
                        await systems.sleepInterruptible(systems, block.params.frames * 16);
                    } else if (block.type === "set_angle") {
                        ctxState.angle = parseFloat(block.params.val);
                    } else if (block.type === "change_angle") {
                        ctxState.angle += parseFloat(block.params.val);
                    } else if (block.type === "set_angle_from_index") {
                        const i = ctxState.loopStack.length > 0 ? ctxState.loopStack[ctxState.loopStack.length - 1] : 0;
                        const multiplier = parseFloat(block.params.multiplier);
                        const offset = parseFloat(block.params.offset);
                        ctxState.angle = i * multiplier + offset;
                    } else if (block.type === "change_angle_by_index") {
                        const i = ctxState.loopStack.length > 0 ? ctxState.loopStack[ctxState.loopStack.length - 1] : 0;
                        const multiplier = parseFloat(block.params.multiplier);
                        ctxState.angle += i * multiplier;
                    } else if (block.type === "set_var") {
                        const name = block.params.name;
                        const value = parseFloat(block.params.value);
                        ctxState.vars[name] = value;
                    } else if (block.type === "add_to_var") {
                        const name = block.params.name;
                        const value = parseFloat(block.params.value);
                        ctxState.vars[name] = (ctxState.vars[name] || 0) + value;
                    } else if (block.type === "subtract_from_var") {
                        const name = block.params.name;
                        const value = parseFloat(block.params.value);
                        ctxState.vars[name] = (ctxState.vars[name] || 0) - value;
                    } else if (block.type === "multiply_var") {
                        const name = block.params.name;
                        const value = parseFloat(block.params.value);
                        ctxState.vars[name] = (ctxState.vars[name] || 0) * value;
                    } else if (block.type === "divide_var") {
                        const name = block.params.name;
                        const value = parseFloat(block.params.value);
                        if (value !== 0) {
                            ctxState.vars[name] = (ctxState.vars[name] || 0) / value;
                        }
                    } else if (block.type === "set_angle_from_var") {
                        const name = block.params.name;
                        ctxState.angle = ctxState.vars[name] || 0;
                    } else if (block.type === "set_color") {
                        ctxState.color = block.params.color;
                    } else if (block.type === "set_tate") {
                        ctxState.tate = block.params.enabled;
                    } else if (block.type === "fire_angle") {
                        const x = parseFloat(block.params.x);
                        const y = parseFloat(block.params.y);
                        const finalAngle = ctxState.angle + parseFloat(block.params.offset);
                        const spd = parseFloat(block.params.speed);
                        if (beamFunc) {

                            beamFunc(x, y, spd, 0, ctxState.color, ctxState.tate, false, 400, finalAngle, true);
                        }
                    } else if (block.type === "fire_standard") {
                        const x = parseFloat(block.params.x);
                        const y = parseFloat(block.params.y);
                        const vx = parseFloat(block.params.vx);
                        const vy = parseFloat(block.params.vy);
                        if (beamFunc) {

                            beamFunc(x, y, vx, vy, ctxState.color, ctxState.tate, false, 400, 0, false);
                        }
                    }
                };

                await systems.sleepInterruptible(systems, 1000);
                while (window.battleActive) {
                    for (const block of script) {
                        if (!window.battleActive) break;
                        await execBlock(block);
                    }
                    await systems.sleepInterruptible(systems, 60);
                }
            };

            if (battleFunc) {
                try {
                    await battleFunc(runner, 0, 7, false, false);
                } catch (e) { console.error(e); }
            }
            container.style.display = "flex";
        });
        controls.appendChild(btnTest);

        const btnExit = createButton("EXIT", "btn-red", () => {
            if (confirm("Exit Maker Mode?")) {
                close();
                resolve();
            }
        });
        controls.appendChild(btnExit);

        renderWorkspace();
    });
}

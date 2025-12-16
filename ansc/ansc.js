
import { systems } from './systems.js';
import { danmakuEngine } from './danmaku.js';
import { Creation } from './Creation.js';

export { startDanmakuMaker } from './danmaku_maker.js';

export let beams = [];
export let savedata = {
    name: "Player",
    maincolor: "#00ffff",
    config: { bgm: 100, se: 100 }
};

window.Creation = Creation;

export const context = {
    screenshake: (amp) => screenshake(amp),
    soundeffect: (path) => soundeffect(path),
    createFlash: (d, c) => createFlash(d, c),
    visualnoveldialogue: (l, c) => visualnoveldialogue(l, c),
    bullethells: (i, c) => bullethells(i, c),

    playSynth: (type) => {

        if (window.playGameSe) window.playGameSe(type);
    }
};

function saferemove(id) {
    const el = document.getElementById(id);
    if (el) {
        if (el.creationInstance) {
            el.creationInstance.remove();
        } else {
            el.remove();
        }
    }
}

function soundeffect(path) {
    if (!savedata.config) savedata.config = { bgm: 100, se: 100 };
    try {
        const audio = new Audio(path);
        audio.volume = savedata.config.se / 100;
        audio.play().catch(e => { });
    } catch (e) {
        console.warn("Audio initialization failed:", e);
    }
}

function screenshake(amplitude) {
    const stage = document.getElementById("stage") || document.body;
    stage.animate([
        { transform: "translate(0px, 0px)" },
        { transform: "translate(-" + amplitude + "px, 0px)" },
        { transform: "translate(" + amplitude * 2 + "px, 0px)" },
        { transform: "translate(0px, -" + amplitude + "px)" },
        { transform: "translate(-" + amplitude + "px, 0px)" },
        { transform: "translate(0px, " + amplitude * 2 + "px)" },
        { transform: "translate(0px, -" + amplitude + "px)" },
        { transform: "translate(0px, 0px)" }
    ], {
        duration: 500,
        iterations: 1
    });
}

function createFlash(duration = 10, color = "rgba(255, 255, 255, 0.8)") {
    if (window.battleParticles) {
        window.battleParticles.push({
            type: 'flash',
            life: duration,
            maxLife: duration,
            color: color,
            zIndex: 10000
        });
    }
}

export function beam(x, y, vx, vy, color, tate, boss = false, life = 400, angle = 0, isAngleDirection = false) {
    if (window.battleActive) {
        soundeffect("./ansc/music/fire.wav")
        const b = {
            gui: {
                typeValue: color,
                zIndex: 2,
                x: x,
                y: y,
                width: 0,
                height: 0,
                maxWidth: 1250,
                maxHeight: 700
            },
            x: x,
            y: y,
            color: color,
            prelife: life,
            life: life / 4,
            vx: 0,
            vy: 0,
            boss: boss,
            angle: angle,
            isAngleDirection: isAngleDirection,
            isPreLine: false,
            lifec: life / 4,
            delete: function () { },
            remove: function () { }
        };

        if (tate) {
            b.gui.width = 2000;
            b.gui.height = 50;
            b.width = 2000;
            b.height = 50;
        } else {
            b.gui.width = 50;
            b.gui.height = 2000;
            b.width = 50;
            b.height = 2000;
        }
        b.x = x;
        b.y = y;
        b.color = color;
        b.prelife = life;
        b.life = life / 4;
        b.gui.x = x;
        b.gui.y = y;
        if (isAngleDirection) {
            const rad = angle * Math.PI / 180;
            const speed = Math.sqrt(vx * vx + vy * vy) || 10;
            b.vx = Math.cos(rad) * speed;
            b.vy = Math.sin(rad) * speed;
            b.gui.x = x - b.gui.width / 2;
            b.gui.y = y - b.gui.height / 2;
            b.gui.x += -100 * b.vx;
            b.gui.y += -100 * b.vy;
            b.x = b.gui.x;
            b.y = b.gui.y;
            b.isPreLine = false;
        } else {
            b.vx = vx;
            b.vy = vy;
            b.isPreLine = false;
        }
        b.boss = boss;
        b.angle = angle;
        beams.push(b);
        b.lifec = b.life;
    }
}

async function bullethells(bhnumber, color) {
    return await systems._bulletHells[bhnumber](beam, systems, color);
}

function renderenemytodataurl(enemyIndex, color = "rgba(255,0,0,1)", scale = 10, iskcalb = false) {
    if (!systems || !systems.enemy || !systems.enemy[enemyIndex]) return null;

    let data = systems.enemy[enemyIndex];
    const height = data.length;
    const width = data[0].length;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const drawPixelData = (source, useColor) => {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const val = source[y][x];
                if (typeof val === "string" && val.startsWith("rgba(")) {
                    if (val !== "rgba(0,0,0,0)") {
                        ctx.fillStyle = val;
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                } else if (useColor && val === "1") {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
    };

    const hasRGBA = data.some(row => row.some(v => typeof v === "string" && v.startsWith("rgba(")));
    drawPixelData(data, !hasRGBA);

    return canvas.toDataURL();
}

async function visualnoveldialogue(lines, bgContext = null) {
    if (!Array.isArray(lines)) lines = [lines];
    lines = lines.map(l => {
        if (typeof l === 'string') return { text: l, speaker: "right", name: "" };
        return l;
    });

    const dialogueLayer = document.createElement('div');
    dialogueLayer.id = "vn-layer";
    dialogueLayer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000;
        pointer-events: none;
    `;
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(dialogueLayer);

    const bgLayer = document.createElement('div');
    bgLayer.style.cssText = `position: absolute; inset: 0; background-image: linear-gradient(to bottom right, #141e30, #243b55); background-color: #000; background-size: cover; background-position: center; z-index: 0; transition: background-image 0.5s;`;
    dialogueLayer.appendChild(bgLayer);

    const style = document.createElement('style');
    style.innerHTML = `
        .vn-char { position: absolute; bottom: 0; height: 80%; transition: opacity 0.3s; image-rendering: pixelated; }
        .vn-char.left { left: 10%; z-index: 2; }
        .vn-char.right { right: 10%; z-index: 2; }
        .vn-box { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 85%; height: 220px; background: rgba(0,0,0,0.8); border: 2px solid cyan; padding: 20px; font-size: 24px; color: white; display:flex; flex-direction:column; z-index:10; }
        .vn-name { font-size: 32px; color: cyan; margin-bottom: 10px; }
        .vn-text { flex:1; }
     `;
    container.appendChild(style);

    const leftChar = document.createElement('img'); leftChar.className = "vn-char left"; dialogueLayer.appendChild(leftChar);
    const rightChar = document.createElement('img'); rightChar.className = "vn-char right"; dialogueLayer.appendChild(rightChar);
    const box = document.createElement('div'); box.className = "vn-box"; dialogueLayer.appendChild(box);
    const nameEl = document.createElement('div'); nameEl.className = "vn-name"; box.appendChild(nameEl);
    const textEl = document.createElement('div'); textEl.className = "vn-text"; box.appendChild(textEl);

    let resolveStep = null;
    const clickHandler = () => { if (resolveStep) resolveStep(); };

    const clickListener = () => clickHandler();
    const keyListener = (e) => { if (e.key === "Enter") clickHandler(); };

    const inputOverlay = document.createElement('div');
    inputOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:3000;cursor:pointer;";
    inputOverlay.onclick = clickListener;
    dialogueLayer.appendChild(inputOverlay);
    window.addEventListener("keydown", keyListener);

    for (const line of lines) {
        if (line.chara === false) { leftChar.style.display = 'none'; rightChar.style.display = 'none'; }
        else {
            if (line.speaker === "right") {
                rightChar.style.display = 'block';
                if (line.name === "神") { rightChar.src = "./ansc/god.png"; }
                else if (line.image) { rightChar.src = line.image; }
                else if (bgContext) {
                    const num = bgContext.Stagenumber;
                    let col = "rgba(255,0,0,1)";
                    if (num === 1) col = "rgba(0,255,0,1)";
                    if (num === 2) col = "rgba(0,0,255,1)";
                    rightChar.src = renderenemytodataurl(num, col, 15);
                }
            }
        }
        nameEl.textContent = line.name || "";
        textEl.textContent = "";
        for (const char of line.text) {
            textEl.textContent += char;
            await new Promise(r => setTimeout(r, 30));
        }
        await new Promise(r => { resolveStep = r; });
        resolveStep = null;
    }

    window.removeEventListener("keydown", keyListener);
    dialogueLayer.remove();
    style.remove();
}

async function entertext(content) {
    await visualnoveldialogue(content);
}

export async function battle(bullet_hell, Stagenumber, StageLevel = 1, lastboss = false, scriptedLoss = false, preMovie = null, postMovie = null, movieDuration = 1500) {
    const isBoss = (StageLevel == 7) || lastboss;
    const bgContext = { isBoss, lastboss, Stagenumber, Stagelevel: StageLevel };
    danmakuEngine.init();

    return await new Promise(async (resolve) => {
        window.battleActive = true;
        window.windForce = 0;

        let musicPath = isBoss ? './ansc/music/BossBattle.wav' : './ansc/music/EnemyBattle.mp3';
        if (lastboss && !scriptedLoss) musicPath = './ansc/music/The-UnknownContinue.mp3';
        const battleAudio = new Audio(musicPath);
        battleAudio.volume = (savedata.config.bgm || 100) / 100;
        battleAudio.loop = true;
        battleAudio.play().catch(e => console.warn("Battle BGM failed", e));

        function stopBattleMusic() {
            battleAudio.pause();
            battleAudio.currentTime = 0;
        }

        if (isBoss && !lastboss) {
            systems.stars(Stagenumber == 3 ? "0,0,0" : "255,255,255");
            systems.drawCrescent(Stagenumber == 0 ? 255 : 0, Stagenumber == 1 ? 255 : 0, Stagenumber == 2 ? 255 : 0);
        } else if (lastboss) {
            systems.stars("255,255,255");
            systems.drawCrescent(255, 255, 255);
        } else {
            systems.stars(Stagenumber == 3 ? "0,0,0" : "255,255,255");
            if (Stagenumber < 3) systems.drawCrescent(Stagenumber == 0 ? 255 : 0, Stagenumber == 1 ? 255 : 0, Stagenumber == 2 ? 255 : 0);
        }

        let finish = false;
        let PlayerHP = 3;
        let BossHP = (StageLevel == 7) ? 3 : 1;
        let BossPhase = 1;
        let time = movieDuration;
        let isshoot = false;
        let ishit = [false, 0];
        let Player_ishit = [false, 0];
        let finishcharge = 0;

        let score = 0;
        let survivalFrame = 0;

        const challenge = window.challengeFlags || {};
        if (challenge.owata) PlayerHP = 1;

        const radi = Creation.create("radi", "gui", { typeValue: { dot: "10px", data: [], zIndex: 2, } }, "newcreate");
        const arrow = Creation.create("arrow", "gui", { width: 32 * 5, height: 32 * 5, typeValue: { dot: "10px" } }, "newcreate");
        const PlayerHPBer = Creation.create("PlayerHPBer", "gui", { x: 900, y: 500, typeValue: "#00ff00", height: 45, zIndex: 2 }, "colorfill");
        const PlayerHPBerBack = Creation.create("PlayerHPBerBack", "gui", { x: 900, y: 500, typeValue: "#ff0000", height: 45, zIndex: 1 }, "colorfill");

        const player = Creation.create("player", "gui", { typeValue: { dot: "2.5px", data: systems.you(true) }, zIndex: 2 }, "newcreate");
        player.gui.x = 550; player.gui.y = 250;

        const GraphinyGauge = Creation.create("GraphinyGauge", "gui", { x: 0, y: 500, typeValue: "#00ffff", height: 45, zIndex: 2 }, "colorfill");
        const GraphinyGaugeBack = Creation.create("GraphinyGaugeBack", "gui", { x: 0, y: 500, typeValue: "#00ffaf", height: 45, zIndex: 1 }, "colorfill");

        let enemy;
        if (lastboss) {
            enemy = Creation.create("enemy", "gui", { typeValue: "./ansc/god_error.png", zIndex: 2 }, "image");
            enemy.gui.width = 60; enemy.gui.height = 60; enemy.gui.x = 600 - 30; enemy.gui.y = 90;
        } else if (isBoss && Stagenumber == 3) {
            enemy = Creation.create("enemy", "gui", { typeValue: { dot: "5px", data: systems.enemy[5] }, zIndex: 2 }, "newcreate");
            enemy.gui.width = 50; enemy.gui.height = 50; enemy.gui.x = 600 - 40; enemy.gui.y = 100;
        } else if (isBoss) {
            const bossColors = ["rgba(255, 0, 0, 1)", "rgba(0, 255, 0, 1)", "rgba(0, 0, 255, 1)"];
            const myColor = bossColors[Stagenumber];
            enemy = Creation.create("enemy", "gui", { typeValue: { dot: "5px", data: systems.enemy[Stagenumber].map(r => r.map(c => c === "1" ? myColor : "rgba(0,0,0,0)")) }, zIndex: 2 }, "newcreate");
            enemy.gui.width = 50; enemy.gui.height = 50; enemy.gui.x = 600 - 40; enemy.gui.y = 100;
        } else {
            enemy = Creation.create("enemy", "gui", { typeValue: { dot: "5px", data: systems.enemy[Stagenumber].map(r => r.map(c => c === "1" ? `rgba(${Stagenumber == 0 ? 255 : 0}, ${Stagenumber == 1 ? 255 : 0}, ${Stagenumber == 2 ? 255 : 0}, 1)` : "rgba(0,0,0,0)")) }, zIndex: 2 }, "newcreate");
            enemy.gui.width = 50; enemy.gui.height = 50; enemy.gui.x = 600 - 40; enemy.gui.y = 100;
        }

        const particles = [];
        window.battleParticles = particles;
        const particleLayer = Creation.create("particleLayer", "gui", { typeValue: "rgba(0,0,0,0)", width: 1200, height: 700, zIndex: 10, x: 0, y: 0 }, "colorfill");

        particleLayer.canvas = function () {
            const cre = document.getElementById(this.name);
            if (!cre) return;
            const ctx = cre.getContext('2d');
            ctx.clearRect(0, 0, this.gui.maxWidth, this.gui.maxHeight);

            for (const p of particles) {
                if (p.type === 'flash') {
                    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.pow(p.life / p.maxLife, 2);
                    ctx.fillStyle = p.color; ctx.fillRect(0, 0, 1200, 700); ctx.restore(); continue;
                }
                ctx.fillStyle = p.color;
                if (p.type === 'afterimage') {

                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = (p.life / p.maxLife) * 0.3;
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                    ctx.globalAlpha = 1.0;
                } else if (p.type === 'ring') {

                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();
                    if (p.expand) { p.size += 2; ctx.globalAlpha = Math.max(0, p.life / 20); ctx.stroke(); ctx.globalAlpha = 1.0; }
                } else if (p.type === 'expanding_diamond') {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.strokeStyle = p.color; ctx.lineWidth = 20; ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
                } else {
                    ctx.globalAlpha = Math.min(1, p.life / 20); ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1.0;
                }
                p.life--;
            }
            for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);

            beams.forEach(b => {
                const cx = b.gui.x + b.gui.width / 2;
                const cy = b.gui.y + b.gui.height / 2;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.angle * Math.PI / 180);

                ctx.shadowBlur = 20; ctx.shadowColor = b.gui.typeValue;
                ctx.fillStyle = b.gui.typeValue;
                ctx.fillRect(-b.gui.width / 2, -b.gui.height / 2, b.gui.width, b.gui.height);

                ctx.shadowBlur = 0;
                if (b.gui.width > 10 && b.gui.height > 10) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.fillRect(-b.gui.width / 2 + 5, -b.gui.height / 2 + 5, b.gui.width - 10, b.gui.height - 10);
                }
                ctx.restore();

                b.gui.x += b.vx * 9;
                b.gui.y += b.vy * 9;
                b.life -= 2.5;
                if (b.life <= 0) { b.delete(); beams.splice(beams.indexOf(b), 1); }
            });
        };

        function createexplosion(x, y, count = 30) {
            for (let i = 0; i < count; i++) {
                if (particles.length > 1000) break;
                const hue = Math.random() * 360;
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(Math.random() * Math.PI * 2) * (Math.random() * 30 + 10),
                    vy: Math.sin(Math.random() * Math.PI * 2) * (Math.random() * 30 + 10),
                    life: Math.random() * 50 + 30, color: `hsl(${hue}, 100%, 70%)`, size: Math.random() * 20 + 5, type: 'square'
                });
            }
        }

        function createSpark(x, y) {
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * (Math.random() * 10),
                    vy: Math.sin(angle) * (Math.random() * 10),
                    life: 20, color: "#ffff00", size: 3, type: 'square'
                });
            }
        }

        function createShockwave(x, y, color, ringCount = 1) {
            particles.push({ x: x, y: y, life: 50, maxLife: 50, type: 'ring', color: color, size: 10, expand: true });
        }
        function createWarningHitEffect(x, y, color) {
            particles.push({ x: x + 16, y: y + 16, life: 20, type: 'square', color: color, size: 10 });
        }

        function createAfterimage(obj) {
            particles.push({
                x: obj.gui.x, y: obj.gui.y, width: obj.gui.width, height: obj.gui.height,
                life: 10, maxLife: 10, type: 'afterimage', color: savedata.maincolor,
                data: obj.gui.typeValue.data
            });
        }

        document.addEventListener("keyup", e => { if (e.key === " " && isshoot) { isshoot = false; }; });

        function getCorners(obj) {
            const angle = (obj.angle || 0) * Math.PI / 180;
            const cx = obj.gui.x + obj.gui.width / 2;
            const cy = obj.gui.y + obj.gui.height / 2;
            const w = obj.gui.width / 2; const h = obj.gui.height / 2;
            return [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }].map(p => ({
                x: cx + (p.x * Math.cos(angle) - p.y * Math.sin(angle)),
                y: cy + (p.x * Math.sin(angle) + p.y * Math.cos(angle))
            }));
        }
        function checkcollision(a, b) {
            return (a.gui.x < b.gui.x + b.gui.width && a.gui.x + a.gui.width > b.gui.x &&
                a.gui.y < b.gui.y + b.gui.height && a.gui.y + a.gui.height > b.gui.y);
        }

        if (checkcollision(player, enemy)) {
            screenshake(100); createexplosion(player.gui.x, player.gui.y);
        }

        PlayerHPBer.canvas(); PlayerHPBerBack.canvas();
        player.vx = 0; player.vy = 0;
        const gravity = 1.135;
        let count = 0;
        const playerSpeed = 2.5;

        function moveWithGravity(obj) {
            if (obj.keydata['ArrowLeft'] && count != 1) { obj.vx = -1 * playerSpeed; obj.vy = 0; };
            if (obj.keydata['ArrowRight'] && count != 2) { obj.vx = playerSpeed; obj.vy = 0; };
            if (obj.keydata['ArrowUp'] && count != 3) { obj.vy = -1 * playerSpeed; obj.vx = 0; };
            if (obj.keydata['ArrowDown'] && count != 4) { obj.vy = playerSpeed; obj.vx = 0; };
            if (obj.vy == 0 && obj.vx == 0) count = 0;
            if (obj.keydata['ArrowLeft']) count = 1;
            if (obj.keydata['ArrowRight']) count = 2;
            if (obj.keydata['ArrowUp']) count = 3;
            if (obj.keydata['ArrowDown']) count = 4;
            obj.vx *= gravity; obj.vy *= gravity;
            obj.gui.x += obj.vx;
            if (window.windForce) obj.gui.x += window.windForce;
            obj.gui.y += obj.vy;

            if (obj.gui.y + obj.gui.height > obj.gui.maxHeight) { obj.gui.y = obj.gui.maxHeight - obj.gui.height; obj.vy = 0; }
            if (obj.gui.y < 0) { obj.gui.y = 0; obj.vy = 0; }
            if (obj.gui.x + obj.gui.width > obj.gui.maxWidth) { obj.gui.x = obj.gui.maxWidth - obj.gui.width; obj.vx = 0; }
            if (obj.gui.x < 0) { obj.gui.x = 0; obj.vx = 0; }
        }

        function updateScreenAura() {
            if (Math.random() > 0.7) return;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 2;
            particles.push({
                x: 600, y: 350, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 10,
                color: savedata.maincolor || "#00ffff", size: 1800, type: 'expanding_diamond', rotation: 90, expansionSpeed: 60
            });
        }
        function showArrow(direction = "up") {
            arrow.gui.typeValue.data = systems.arrow[direction].map(r => r.map(c => c === "1" ? savedata.maincolor : "rgba(0,0,0,0)"));
            arrow.canvas();
        }

        function onPlayerHit() {
            if (!Player_ishit[0]) {
                screenshake(50);
                createexplosion(player.gui.x, player.gui.y);
                player.gui.x = 100; player.gui.y = 500;
                PlayerHP--; Player_ishit[0] = true; Player_ishit[1] = 0;
            }
        }

        async function update() {

            survivalFrame++;
            if (survivalFrame % 60 === 0) {
                score += 100;
            }

            if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
                if (survivalFrame % 5 === 0) createAfterimage(player);
            }

            danmakuEngine.update(player, onPlayerHit);

            if (PlayerHP <= 0) {
                stopBattleMusic();
                beams.length = 0;
                window.battleActive = false;
                player.remove(); enemy.remove(); particleLayer.remove(); PlayerHPBer.remove(); PlayerHPBerBack.remove(); GraphinyGauge.remove(); GraphinyGaugeBack.remove(); arrow.remove(); radi.remove();
                resolve(false);
                return;
            }

            if (time > 0) time--;
            else {
                stopBattleMusic();
                beams.length = 0;
                window.battleActive = false;
                player.remove(); enemy.remove(); particleLayer.remove(); PlayerHPBer.remove(); PlayerHPBerBack.remove(); GraphinyGauge.remove(); GraphinyGaugeBack.remove(); arrow.remove(); radi.remove();
                resolve(true);
                return;

            }

            PlayerHPBer.delete(); PlayerHPBerBack.delete();
            PlayerHPBer.gui.width = PlayerHP * 100; PlayerHPBerBack.gui.width = 300;
            GraphinyGauge.delete(); GraphinyGaugeBack.delete();
            GraphinyGauge.gui.width = 300 - time / 5; GraphinyGaugeBack.gui.width = 300;

            arrow.gui.x = player.gui.x; arrow.gui.y = player.gui.y;
            if (count === 0) arrow.delete();
            else if (count === 1) showArrow("right");
            else if (count === 2) showArrow("left");
            else if (count === 3) showArrow("up");
            else if (count === 4) showArrow("down");

            particleLayer.canvas();
            for (const b of beams) {
                if (checkcollision(player, b)) {
                    if (!b.isPreLine && !Player_ishit[0]) onPlayerHit();
                }
            }
            if (Player_ishit[0]) {
                Player_ishit[1]++;
                if (Player_ishit[1] >= 120) { PlayerHPBer.gui.typeValue = "#00ff00"; Player_ishit[0] = false; }
                else PlayerHPBer.gui.typeValue = "#ff11ff";
            }
            GraphinyGauge.canvas(); GraphinyGaugeBack.canvas(); PlayerHPBer.canvas(); PlayerHPBerBack.canvas();
            player.canvas();

            GraphinyGauge.canvas(); GraphinyGaugeBack.canvas(); PlayerHPBer.canvas(); PlayerHPBerBack.canvas();
            player.canvas();

            const pCtx = document.getElementById("particleLayer").getContext('2d');
            pCtx.save();
            pCtx.font = "24px 'PixelMplus10'";
            pCtx.fillStyle = "#fff";
            pCtx.textAlign = "left";
            pCtx.shadowBlur = 5;
            pCtx.shadowColor = "#00ffff";
            pCtx.fillText(`SCORE: ${score}`, 20, 40);
            pCtx.restore();

            updateScreenAura(); moveWithGravity(player); enemy.canvas();

            if (window.battleActive) requestAnimationFrame(update);
        }

        if (typeof bullet_hell === 'function') bullet_hell();

        if (systems._specialAttacks) {
            const specialAttackIndex = Stagenumber * 7 + (StageLevel - 1);
            if (systems._specialAttacks[specialAttackIndex]) systems._specialAttacks[specialAttackIndex](danmakuEngine, systems, 'rgba(255,255,255,1)');
        }

        update();
    });
}

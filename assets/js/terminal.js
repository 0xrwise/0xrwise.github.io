/**
 * 0x4research — Interactive Terminal & Typewriter Controller
 * Handles:
 *   1. Interactive shell prompt on the Home page (index.html)
 *   2. Automatic typewriter sequence on the CV page (cv.html)
 */
document.addEventListener("DOMContentLoaded", () => {
    initInteractiveShell();
    initCvTypewriter();
});

function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * 1. HOME PAGE INTERACTIVE SHELL
 */
function initInteractiveShell() {
    const inputField = document.getElementById("cmd-input");
    const outputArea = document.getElementById("terminal-output");
    const scrollArea = document.getElementById("terminal-scroll");
    const configNode = document.getElementById("terminal-config");

    if (!inputField || !outputArea) {
        return;
    }

    let config = {
        username: "user",
        hostname: "0x4research",
        commands: {
            whoami: {
                name: "[YOUR_FULL_NAME]",
                alias: "[YOUR_USERNAME]",
                bio: "Configure your bio in _config.yml",
                focus: "Research | Writing | Technology"
            },
            skills: "Configure your skills in _config.yml",
            contact: {
                label: "Contact",
                text: "github.com/yourusername",
                url: "https://github.com/yourusername"
            }
        }
    };

    if (configNode) {
        try {
            config = Object.assign(config, JSON.parse(configNode.textContent));
        } catch (err) {
            console.error("Failed to parse terminal configuration:", err);
        }
    }

    const promptHTML = `<span class="c-red">${escapeHtml(config.username)}</span><span class="c-white">@${escapeHtml(config.hostname)}:~$</span>`;

    const commandRegistry = {
        help: () => `
            <span class="c-white">Available commands:</span><br>
            <span class="c-green">whoami</span>   <span class="c-white">- About the author</span><br>
            <span class="c-green">skills</span>   <span class="c-white">- View research focus &amp; skills</span><br>
            <span class="c-green">contact</span>  <span class="c-white">- Get contact info</span><br>
            <span class="c-green">clear</span>    <span class="c-white">- Clear terminal screen</span>
        `,
        whoami: () => {
            const w = config.commands.whoami || {};
            return `
                <span class="c-green">Name</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="c-white">${escapeHtml(w.name)}</span><br>
                <span class="c-green">Username</span> : <span class="c-red">${escapeHtml(w.alias)}</span><br>
                <br>
                <span class="c-white">${escapeHtml(w.bio)}</span><br>
                <br>
                <span class="c-blue">${escapeHtml(w.focus)}</span>
            `;
        },
        skills: () => `<span class="c-white">${escapeHtml(config.commands.skills)}</span>`,
        contact: () => {
            const c = config.commands.contact || {};
            const safeUrl = escapeHtml(c.url || "#");
            const safeLabel = escapeHtml(c.label || "Contact");
            const safeText = escapeHtml(c.text || safeUrl);
            return `<span class="c-blue">${safeLabel}:</span> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="comm-link">${safeText}</a>`;
        }
    };

    const commandHistory = [];
    let historyIndex = -1;

    document.body.addEventListener("click", () => {
        if (window.getSelection().toString() === "") {
            inputField.focus();
        }
    });

    const printOutput = (htmlContent) => {
        const line = document.createElement("div");
        line.className = "output-line";
        line.innerHTML = htmlContent;
        outputArea.appendChild(line);
    };

    const scrollToBottom = () => {
        if (!scrollArea) return;
        requestAnimationFrame(() => {
            scrollArea.scrollTop = scrollArea.scrollHeight;
        });
    };

    inputField.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (commandHistory.length > 0 && historyIndex > 0) {
                historyIndex--;
                inputField.value = commandHistory[historyIndex];
            }
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                inputField.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                inputField.value = "";
            }
            return;
        }

        if (event.key === "Enter") {
            const rawInput = inputField.value.trim();
            const cmd = rawInput.toLowerCase();
            inputField.value = "";

            if (!rawInput) return;

            commandHistory.push(rawInput);
            historyIndex = commandHistory.length;

            printOutput(`<span class="prompt">${promptHTML}</span> <span class="c-white">${escapeHtml(rawInput)}</span>`);

            if (cmd === "clear") {
                outputArea.innerHTML = "";
            } else if (Object.prototype.hasOwnProperty.call(commandRegistry, cmd)) {
                printOutput(commandRegistry[cmd]());
            } else {
                printOutput(
                    `<span class="c-red">bash: ${escapeHtml(cmd)}: command not found.</span> ` +
                    `<span class="c-white">Type</span> <span class="c-green">'help'</span> <span class="c-white">for available commands.</span>`
                );
            }

            scrollToBottom();
        }
    });
}

/**
 * 2. CV PAGE TYPEWRITER SEQUENCE (RATAALADA-STYLE)
 */
function initCvTypewriter() {
    const cvRoot = document.getElementById("cv-root");
    if (!cvRoot) return;

    const cmdTarget = document.getElementById("cv-typed-cmd");
    const cmdCursor = document.getElementById("cv-cmd-cursor");
    const bodyContent = document.getElementById("cv-body-content");
    const bioOutput = document.getElementById("cv-typewriter-output");
    const bioCursor = document.getElementById("cv-bio-cursor");
    const bioDataNode = document.getElementById("cv-bio-data");
    const fadeSections = cvRoot.querySelectorAll(".cv-fade-section");

    const commandStr = cvRoot.getAttribute("data-cmd") || "cat ~/cv.txt";
    const baseSpeed = Math.max(5, parseInt(cvRoot.getAttribute("data-speed") || "18", 10));

    let bioLines = [];
    if (bioDataNode) {
        try {
            const parsed = JSON.parse(bioDataNode.textContent);
            if (Array.isArray(parsed)) {
                bioLines = parsed;
            }
        } catch (err) {
            console.error("Failed to parse CV bio lines:", err);
        }
    }

    let skipAnimation = false;

    const revealRemainingSections = () => {
        if (bioCursor) {
            bioCursor.style.display = "none";
        }
        fadeSections.forEach((sec, idx) => {
            setTimeout(() => {
                sec.classList.add("is-visible");
            }, skipAnimation ? 0 : idx * 120);
        });
    };

    // Allow user to click anywhere in the CV to complete typing immediately
    cvRoot.addEventListener("click", () => {
        skipAnimation = true;
    });

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function runSequence() {
        await sleep(250);

        // Step 1: Type the shell command (e.g., "cat ~/cv.txt")
        for (let i = 0; i < commandStr.length; i++) {
            if (skipAnimation) {
                cmdTarget.textContent = commandStr;
                break;
            }
            cmdTarget.textContent += commandStr[i];
            await sleep(35);
        }

        await sleep(skipAnimation ? 0 : 220);

        if (cmdCursor) {
            cmdCursor.style.display = "none";
        }
        if (bodyContent) {
            bodyContent.classList.remove("is-hidden");
        }

        // Step 2: Type each paragraph in the bio box character-by-character
        for (let pIndex = 0; pIndex < bioLines.length; pIndex++) {
            const lineText = String(bioLines[pIndex]);
            const pElem = document.createElement("p");
            pElem.className = "cv-bio-paragraph";

            const prefix = document.createElement("span");
            prefix.className = "c-green";
            prefix.textContent = "> ";
            pElem.appendChild(prefix);

            const textSpan = document.createElement("span");
            pElem.appendChild(textSpan);
            bioOutput.appendChild(pElem);

            // Keep cursor right after the active text
            if (bioCursor) {
                pElem.appendChild(bioCursor);
            }

            for (let cIndex = 0; cIndex < lineText.length; cIndex++) {
                if (skipAnimation) {
                    textSpan.textContent = lineText;
                    break;
                }
                textSpan.textContent += lineText[cIndex];
                const char = lineText[cIndex];
                const delay = (char === "." || char === ",") ? baseSpeed * 4 : baseSpeed;
                await sleep(delay);
            }

            await sleep(skipAnimation ? 0 : 250);
        }

        // Step 3: Reveal metadata, timeline, skills, and links smoothly
        revealRemainingSections();
    }

    runSequence();
}

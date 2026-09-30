document.addEventListener("DOMContentLoaded", function() {
    const inputField = document.getElementById("cmd-input");
    const outputArea = document.getElementById("terminal-output");
    const scrollArea = document.getElementById("terminal-scroll");
    
    // Pastikan variabel ini persis dengan format di index.html
    const promptHTML = `<span class="c-red">0xrwise</span><span class="c-white">@research:~$</span>`;

    // Memaksa fokus ke input saat layar diklik (kecuali saat blok teks)
    document.body.addEventListener("click", () => {
        if (window.getSelection().toString() === "") {
            inputField.focus();
        }
    });

    // Database Command
    const commands = {
        "help": `
            <span class="c-white">Available commands:</span><br>
            <span class="c-green">whoami</span>   <span class="c-white">- About the author</span><br>
            <span class="c-green">skills</span>   <span class="c-white">- View technical skills</span><br>
            <span class="c-green">contact</span>  <span class="c-white">- Get contact info</span><br>
            <span class="c-green">clear</span>    <span class="c-white">- Clear terminal screen</span>
        `,
        "whoami": `
            <span class="c-green">Name</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="c-white">M. Rafi Akbar</span><br>
            <span class="c-green">Identity</span> : <span class="c-red">0xrwise</span><br>
            <br>
            <span class="c-white">Sensitive young man that trying to life for research and spreading the truth.</span><br>
            <br>
            <span class="c-blue">⚖️ Tech | Law | Politics | Existence.</span>
        `,
        "skills": "<span class='c-white'>idk man, i just observe what everyone else ignores, pull a few strings, and </span><span class='c-red'>make chaos work for me</span><span class='c-white'>. it's all just a mental game, isn't it?</span>",

	"contact": "<span class='c-blue'>Telegram:</span> <a href='https://t.me/0xrwise' target='_blank' class='c-white' style='text-decoration: none; border-bottom: 1px dashed var(--text-white);'>t.me/0xrwise</a>",

    };

    inputField.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            const cmd = inputField.value.trim().toLowerCase();
            const rawCmd = inputField.value.trim();
            inputField.value = ""; 

            if (cmd === "") return;

            // Cetak riwayat input persis seperti yang diketik user
            printOutput(`<span class="prompt">${promptHTML}</span> <span class="c-white">${rawCmd}</span>`);

            // Logika Command
            if (cmd === "clear") {
                outputArea.innerHTML = "";
            } else if (commands[cmd]) {
                printOutput(commands[cmd]);
            } else {
                printOutput(`<span class="c-red">bash: ${cmd}: command not found.</span> <span class="c-white">Type</span> <span class="c-green">'help'</span> <span class="c-white">for available commands.</span>`);
            }
            
            // Auto-scroll ke bawah saat ada teks baru
            setTimeout(() => {
                scrollArea.scrollTop = scrollArea.scrollHeight;
            }, 10);
        }
    });

    function printOutput(html) {
        const div = document.createElement("div");
        div.className = "output-line";
        div.innerHTML = html;
        outputArea.appendChild(div);
    }
});

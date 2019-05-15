/* eslint-disable no-undef */
ace.require("ace/ext/language_tools");

const firestore = firebase.firestore();
const sketches = firestore.collection("sketches")

let autoplay = false;
let vimMode = false;

const HTML_HEAD = `
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.7.3/p5.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.7.3/addons/p5.dom.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.7.3/addons/p5.sound.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.6/dat.gui.min.js"></script>
    <style>
        body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
        }
    </style>
</head>
`

const editor = ace.edit("editor");

editor.setTheme("ace/theme/dawn");
editor.setKeyboardHandler("ace/keyboard/vim");
editor.setOptions({
    selectionStyle: "text",
    highlightActiveLine: true,
    highlightSelectedWord: true,
    readOnly: false,
    cursorStyle: "smooth",
    behavioursEnabled: true,
    wrapBehavioursEnabled: true,
    autoScrollEditorIntoView: true,
    copyWithEmptySelection: true,
    useSoftTabs: true,
    navigateWithinSoftTabs: true
});

editor.session.setMode("ace/mode/javascript");

const session = editor.getSession();

function updateDisplay() {
    const iframe = document.getElementById("iframe");

    iframe.srcdoc = `
    <html>
    ${HTML_HEAD}
    <body>
    <script>
        ${session.getValue()}
    </script>
    </body>
    </html>
    `
    iframe.contentWindow.location.reload()
}

session.on('change', e => {
    if (autoplay) updateDisplay()
});

window.addEventListener("resize", () => {
    if (autoplay) updateDisplay()
});

function status(text) {
    if (text === '') document.getElementById().classList.add('hidden')
    else document.getElementById('status').classList.remove('hidden');
    document.getElementById('status').innerText = text;
}

function saveFile(name) {
    status('saving...');
    sketches.doc(name).get()
        .then(doc => {
            if (doc.exists) {
                const c = confirm("The file " + name + " already exists. Are you sure you want to overwrite it?")

                if (!c) {
                    return true;
                }
            }
            return sketches.doc(name).set({
                code: session.getValue()
            });
        })
        .then((cancelled) => {
            if (cancelled) {
                status('');
            } else {
                window.location.hash = name;
                status('saved.');
            }
        })
        .catch(e => {
            status('couldn\'t save.');
            console.log("Error saving to Firebase")
            console.log(e)
        })
}

function openFile(name) {
    status('loading...')
    return sketches.doc(name).get()
        .then(doc => {
            if (doc.exists) {
                session.setValue(doc.data().code)
                status('loaded.')
            } else {
                status('not found.')
            }
            window.location.hash = name
            document.getElementById('title').value = name;
            updateDisplay();
        }) || false
}

function loadSketch(span) {
    openFile(span.dataset.id);
}

function makeSketchElement(doc) {
    return `<span class="sketch-name" data-id=${doc.id} onclick="loadSketch(this)">${doc.id}</span>`
}

function updateSketchList() {
    sketches.get()
        .then(snap => {
            const sketchList = snap.docs
                .map(makeSketchElement)
                .join('')

            document.getElementById('sketches').innerHTML = sketchList;
        });
}

function toggleAutoplay() {
    autoplay = !autoplay;
    localStorage.setItem('autoplay', autoplay);
    if (autoplay) {
        document.getElementById('autoplay').classList.add('active');
        updateDisplay();
    } else document.getElementById('autoplay').classList.remove('active');
}

function toggleVim() {
    vimMode = !vimMode;
    localStorage.setItem('vim', vimMode);
    if (vimMode) {
        document.getElementById('vim').classList.add('active');
        editor.setKeyboardHandler('ace/keyboard/vim');
    } else {
        document.getElementById('vim').classList.remove('active');
        editor.setKeyboardHandler('');
    }
}

window.onload = e => {
    updateDisplay();
    updateSketchList();
    if (window.location.hash !== "") {
        openFile(window.location.hash.split('#')[1])
    }
    const VimApi = ace.require("ace/keyboard/vim").CodeMirror.Vim;

    VimApi.defineEx("write", "w", (cm, input) => {
        if (input.args === undefined && window.location.hash !== "") {
            saveFile(window.location.hash.split('#')[1])
        } else {
            saveFile(input.args[0])
        }
    });
    VimApi.defineEx("open", "o", (cm, input) => {
        openFile(input.args[0])
    });

    vimMode = JSON.parse(localStorage.getItem('vim'));
    autoplay = JSON.parse(localStorage.getItem('autoplay'));

    if (vimMode) {
        document.getElementById('vim').classList.add('active');
        editor.setKeyboardHandler('ace/keyboard/vim');
    } else {
        document.getElementById('vim').classList.remove('active');
        editor.setKeyboardHandler('');
    }

    if (autoplay) document.getElementById('autoplay').classList.add('active');
    else document.getElementById('autoplay').classList.remove('active');

    document.getElementById('play').onclick = updateDisplay;
    document.getElementById('autoplay').onclick = toggleAutoplay;
    document.getElementById('save').onclick = () => saveFile(document.getElementById("title").value);
    document.getElementById('vim').onclick = toggleVim;
    document.getElementById('reload').onclick = () => openFile(window.location.hash.split('#')[1]);
    document.getElementById('fullscreen').onclick = () => document.getElementById('iframe').contentWindow.document.getElementById('defaultCanvas0').requestFullscreen();
}

sketches.onSnapshot(snap => {
    const sketchList = snap.docs
        .map(makeSketchElement)
        .join('')

    document.getElementById('sketches').innerHTML = sketchList;
});

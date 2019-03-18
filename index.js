/* eslint-disable no-undef */
ace.require("ace/ext/language_tools");

const firestore = firebase.firestore();
const sketches = firestore.collection("sketches")

const HTML_HEAD = `
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.7.3/p5.min.js"></script>
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
    updateDisplay()
});

window.addEventListener("resize", () => {
    updateDisplay()
});

function saveFile(name) {
    console.log("Saving as", name)
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
            if (!cancelled) window.location.hash = name
        })
        .catch(e => {
            console.log("Error saving to Firebase")
            console.log(e)
        })
}

function openFile(name) {
    console.log("Opening", name)
    return sketches.doc(name).get()
        .then(doc => {
            if (doc.exists) {
                session.setValue(doc.data().code)
            }
            window.location.hash = name
        })
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
}

sketches.onSnapshot(snap => {
    const sketchList = snap.docs
        .map(makeSketchElement)
        .join('')

    document.getElementById('sketches').innerHTML = sketchList;
});

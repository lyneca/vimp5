ace.require("ace/ext/language_tools");

let firestore = firebase.firestore();
let sketches = firestore.collection("sketches")

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

function saveFile(name) {
    console.log("Saving as", name)
    sketches.doc(name)
        .set({
            code: session.getValue()
        }).then(() => {
            window.location.hash = name
        })
}

function openFile(name) {
    console.log("Opening", name)
    sketches.doc(name).get()
        .then(doc => {
            if (doc.exists) {
                session.setValue(doc.data().code)
            }
            window.location.hash = name
        })
}



let editor = ace.edit("editor");

editor.setTheme("ace/theme/dawn");
editor.setKeyboardHandler("ace/keyboard/vim");
editor.setOptions({
    selectionStyle: "text",
    highlightActiveLine: true,
    highlightSelectedWord: true,
    readOnly: false,
    cursorStyle: "smooth",
    mergeUndoDeltas: false | true | "always",
    behavioursEnabled: true,
    wrapBehavioursEnabled: true,
    enableBasicAutocompletion: true,
    autoScrollEditorIntoView: true,
    copyWithEmptySelection: true,
    useSoftTabs: true,
    navigateWithinSoftTabs: true
});

window.onload = e => {
    updateDisplay();
    if (window.location.hash !== "") {
        openFile(window.location.hash.split('#')[1])
    }
    var VimApi = ace.require("ace/keyboard/vim").CodeMirror.Vim
    VimApi.defineEx("write", "w", function (cm, input) {
        if (input.args === undefined && window.location.hash !== "") {
            saveFile(window.location.hash.split('#')[1])
        } else {
            saveFile(input.args[0])
        }
    })
    VimApi.defineEx("open", "o", function (cm, input) {
        openFile(input.args[0])
    })
}

editor.session.setMode("ace/mode/javascript");

let session = editor.getSession();

function updateDisplay() {
    let iframe = document.getElementById("iframe");
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

// window.addEventListener("hashchange", url => {
//     openFile(url.newURL.split('#')[1])
// });

window.addEventListener("resize", () => {
    updateDisplay()
});
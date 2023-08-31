checkboxPrefs = [
  "disableSendDrafts",
  "testOnStartup"
];


async function loadPrefs() {
  let { prefs } = await messenger.storage.local.get({prefs: {}});
  for (let pref of checkboxPrefs) {
    elt = document.getElementById(pref);
    elt.checked = prefs[pref] ? true : false;
    elt.addEventListener("change", savePrefs);
  }
}

async function savePrefs() {
  let { prefs } = await messenger.storage.local.get({prefs: {}});
  for (let pref of checkboxPrefs) {
    prefs[pref] = document.getElementById(pref).checked ? true : false;
  }
  await messenger.storage.local.set({prefs});
}

async function init() {
  await loadPrefs();
}

window.addEventListener("load", init, false);

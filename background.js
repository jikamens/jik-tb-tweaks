// Figure out whether it's Shabbat or Yom Tov (SYT). If so, enable
// Send Does Send Later. Otherwise, disable it.

// Initially, we set an alarm which runs once per minute until the
// first time it succeeds. Once it succeeds, it uses the returned
// value to determine when it next needs to run and updates the alarm
// accordingly.

var sendDoesSL;
var working = false;
// Set to -1 to bypoass startup testing
var logicTestCount = 4;
var lastTestTime = undefined;

function log(msg) {
  tag = (logicTestCount > 0) ? " [TESTING]" : "";
  console.log(`jik tweaks${tag}: ${msg}`);
}

browser.alarms.onAlarm.addListener(checkChol);

browser.runtime.sendMessage(
  "sendlater3@kamens.us",
  {action: "getPreferences"}).then(startCheckingChol);

async function setAlarm(info) {
  var lastTestCount = logicTestCount--;
  if (lastTestCount > 0) {
    if (info.when) {
      lastTestTime = info.when;
    }
    else {
      lastTestTime += info.periodInMinutes * 60000;
    }
    // The NextChol endpoint is rate-limited
    await new Promise(r => setTimeout(r, 1000));
    log(`setAlarm: running checkChol as of ${new Date(lastTestTime)}`);
    checkChol({}, lastTestTime);
  }
  else if (lastTestCount == 0) {
    await new Promise(r => setTimeout(r, 1000));
    log('setAlarm: finished testing, returning to real-time');
    browser.alarms.create({when: Date.now(), periodInMinutes: 1});
  }
  else {
    browser.alarms.create(info);
  }
}

function startCheckingChol(prefs) {
  log(`startCheckingChol: prefs.sendDoesSL=${prefs.sendDoesSL}`);
  sendDoesSL = prefs.sendDoesSL;
  setAlarm({when: Date.now(), periodInMinutes: 1});
}

function checkChol(alarm, asOf) {
  log('Entering checkChol');
  if (working) {
    log('checkChol: working is true, returning');
    return;
  }
  working = true;
  // If sendDoesSL is false, then we believe that it's currently chol,
  // so we want to check if that has changed. We therefore do an
  // inverted NextChol query, which will either return 0 if it's
  // currently Shabbat or Yom Tov, or the time in the future when it
  // will next be Shabbat or Yom Tov.
  NextChol(false, sendDoesSL == false, true, asOf, checkCholCallback);
  log('checkChol: fired NextChol');
}

function checkCholCallback(retval, error) {
  log('Entering checkCholCallback');
  working = false;
  if (error) {
    log('XHR returned error; trying again in a minute');
    setAlarm({periodInMinutes: 1});
    throw error;
  }
  if (retval == 0) {
    // Flip sendDoesSL and check again in a minute. This prevents us
    // from having to worry about the race condition.
    log(`checkCholCallback: Changing sendDoesSL to ${!sendDoesSL}`);
    browser.runtime.sendMessage(
      "sendlater3@kamens.us",
      {action: "setPreferences",
       preferences: {sendDoesSL: !sendDoesSL}}).then(
         (prefs) => {
           sendDoesSL = !sendDoesSL;
           log(`checkCholCallback: flipped sendDoesSL to ${sendDoesSL}, ` +
               'checking again in a minute');
           setAlarm({periodInMinutes: 1});
         }).catch(err => {
           log('checkCholCallback: error setting preferences, trying again ' +
               'in a minute');
           setAlarm({periodInMinutes: 1});
           throw error;
         });
    return;
  }
  then = new Date(retval * 1000);
  log(`checkColCallback: waiting until ${then} to check again`);
  setAlarm({when: retval * 1000});
}

// If callback is truthy, then it's a function which takes two
// arguments -- a return value and an error string. If the error
// string is truthy, then the request failed, and the string explains
// why. Otherwise, the return value is what this function would have
// returned if a callback hadn't been specified.
// asOf is a JavaScript timestamp (i.e., ms since epoch).
function NextChol(force, inverse, zeroish, asOf, callback) {
    var url = 'https://jik4.kamens.us/cgi-bin/next-chol.cgi?';
    var args = new Array();
    if (force) {
	args.push("force=1");
    }
    if (inverse) {
	args.push("inverse=1");
    }
    if (zeroish) {
	args.push("boolean=1");
    }
    if (asOf) {
        args.push(`date=${Math.round(asOf/1000)}`);
    }
    url = url + args.join("&");

    var req = new XMLHttpRequest();

    var my_callback = function() {
        if (req.readyState != 4)
            return;
        if (req.status != 200) {
            msg = 'Error fetching from ' + url;
            if (callback) {
                callback('', msg);
                return;
            }
	    throw(msg);
        }
        var matches = req.responseText.match(/^\s*(\d+)/);
        if (matches.length < 1) {
            msg = url + " did not return a number";
            if (callback) {
                callback('', msg);
                return;
            }
            throw(msg);
        }
        var then = matches[1];
        if (callback) {
            callback(then, '');
            return;
        }
        return then;
    }
            
    if (callback) {
        async = true;
        req.onreadystatechange = my_callback;
    }
    else {
        async = false;
    }
    req.open('GET', url, async);
    req.send();
    if (! callback) {
        return my_callback();
    }
}

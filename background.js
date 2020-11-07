// Figure out whether it's Shabbat or Yom Tov (SYT). If so, enable
// Send Does Send Later. Otherwise, disable it.

// Initially, we set an alarm which runs once per minute until the
// first time it succeeds. Once it succeeds, it uses the returned
// value to determine when it next needs to run and updates the alarm
// accordingly.

var sendDoesSL;
var working = false;

function log(msg) {
  console.log(`jik tweaks: ${msg}`);
}

browser.alarms.onAlarm.addListener(checkChol);

browser.runtime.sendMessage(
  "sendlater3@kamens.us",
  {action: "getPreferences"}).then(startCheckingChol);

function startCheckingChol(prefs) {
  log(`startCheckingChol: prefs.sendDoesSL=${prefs.sendDoesSL}`);
  sendDoesSL = prefs.sendDoesSL;
  browser.alarms.create({when: Date.now(), periodInMinutes: 1});
}

function checkChol(alarm) {
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
  NextChol(false, sendDoesSL == false, true, checkCholCallback);
  log('checkChol: fired NextChol');
}

function checkCholCallback(retval, error) {
  log('Entering checkCholCallback');
  working = false;
  if (error) {
    log('XHR returned error; trying again in a minute');
    browser.alarms.create({periodInMinutes: 1});
    throw error;
  }
  if (retval == 0) {
    // Flip sendDoesSL and check again in a minute. This prevents us
    // from having to worry about the race condition.
    browser.runtime.sendMessage(
      "sendlater3@kamens.us",
      {action: "setPreferences",
       preferences: {sendDoesSL: !sendDoesSL}}).then(
         (prefs) => {
           sendDoesSL = !sendDoesSL;
           log(`checkCholCallback: flipped sendDoesSL to ${sendDoesSL}, ` +
               'checking again in a minute');
           browser.alarms.create({periodInMinutes: 1});
         });
    return;
  }
  then = new Date(retval * 1000);
  log(`checkColCallback: waiting until ${then} to check again`);
  browser.alarms.create({when: retval * 1000});
}

// If callback is truthy, then it's a function which takes two
// arguments -- a return value and an error string. If the error
// string is truthy, then the request failed, and the string explains
// why. Otherwise, the return value is what this function would have
// returned if a callback hadn't been specified.
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

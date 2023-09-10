# Example of adjusting Send Later's preferences from another add-on

This directory contains a Thunderbird add-on which illustrates how you can implement your own custom logic for dynamically changing the settings of the Send Later add-on.

To use this approach you need to understand at least at a basic level [how to build a Thunderbird add-on][buildaddon] and [how messaging between add-ons works][sendmessage].

This add-on isn't intended for you to use as-is since what it does probably isn't what you want to do, so you should tweak it to do what you want. It's just an example.

The two customizations this add-on implements are:

* Every five minutes, it checks to see if the sendDrafts preference in Send Later is true, and if so, changes it to false, unless the preference in _this_ add-on which controls whether to do that is currently disabled. The reason why I do this is because I use "server-side Send Later" to schedule my drafts from several desktops but only actually deliver them from one, but sometimes I need to temporarily enable delivery on one of my desktops while I'm working on Send Later enhancements and need to test something. I don't want to forget to turn that back off when I'm done, because then I could end up with two different computers trying to deliver the same messages, which would be bad, so I have this add-on set up to do it for me if I forget.

* It uses my `NextChol` web endpoint to enable Send does Send Later during the Jewish Sabbath and holidays. I use email on the Sabbath and holidays, but many of the people I correspond with do not. I want to be respectful of them and not send them emails during those times, so I flip that switch to remind me to consider when sending each message whether it should be sent immediately or rescheduled for later.

For more about the runtime messages that Send Later accepts, see the [user guide][runtime].

[buildaddon]: https://developer.thunderbird.net/add-ons/about-add-ons
[sendmessage]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage
[runtime]: https://extended-thunder.github.io/send-later/#runtime

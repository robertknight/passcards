[![Build Status](https://travis-ci.org/robertknight/passcards.png?branch=master)](https://travis-ci.org/robertknight/passcards) [![Join the chat at https://gitter.im/robertknight/passcards](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/robertknight/passcards?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

*Passcards* is an open source app that aims to make logging in to websites and apps from all your devices easier.

It saves logins and other credentials in an encrypted store in Dropbox and enables you to access them from a supported browser (currently Chrome, Firefox or Safari) on any device via a web app or browser extension. The browser extension (currently available for Chrome and Firefox) can auto-fill login forms using saved credentials and quickly add or update logins.

Passcards uses the same storage format as the popular [1Password](https://agilebits.com/onepassword) app and can be used alongside the official 1Password apps. (_Please be aware that Passcards is **not** affiliated with the makers of 1Password, AgileBits, in any way and they cannot support the use of 3rd-party apps to access 1Password vaults_)

## Features

* Saves logins and other credentials to an encrypted store and enables access from a supported browser on any device
* Syncs logins for offline access (eg. for WiFi network passwords)
* Simple [material design](http://www.google.co.uk/design/) interface for quick search and editing/adding of items.
* Generates random passwords which are secure but still easy to read and type when needed
* Browser extensions for Chrome and Firefox that can be used on Windows, Mac, Linux and ChromeOS
* Mobile web app, compatible with Safari, Chrome and Firefox (other browsers may also work).
* Compatible with the official [1Password](https://agilebits.com/onepassword) apps
* Command-line interface installable via npm

## Installation

passcards is available as a browser add-on for Firefox and Chrome, a web app and a command-line
app.

See [the passcards site](http://robertknight.github.io/passcards/) for links to install the browser extensions, access the web app and instructions to install the command-line version.

### Supported Browsers

The initial stable release of Passcards will target current stable releases of
the major desktop and mobile browsers:

 * Firefox stable + current ESR release
 * Chrome stable
 * Internet Explorer 11 and later
 * Mobile Safari from iOS 7 and later
 * Safari from OS X 10.9

Support for older browsers may be possible in future.

## Development

Local development requires a version of iojs/Node that is compatible with [jsdom](https://github.com/tmpvar/jsdom) and make. To build the CLI and web clients, clone the source and run `make`.

```
git clone https://github.com/robertknight/passcards
npm install
make all
```

### Running the Web App Locally

The web client is a single page application. The Dropbox client keys in the source are configured to allow
the app to be served from [http://localhost:8000/webui/index.html](http://localhost:8000/webui/index.html) . You can set up a server for this locally
by running, from the root of a source checkout, `python -m SimpleHTTPServer`.

If you want to host the web app from a different location you will need to register your own Dropbox
API keys from the [Dropbox App Console]("https://www.dropbox.com/developers/apps"). When registering a new app,
you currently need to give it full Dropbox access permissions (though this requirement could easily be dropped
if necessary) and enable the 'implicit' authorization flow.

### Firefox Extension

The Firefox extension is built using the [add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK). A version of the SDK which produces
addons compatible with Firefox 30 or later is included as a git submodule.

### Chrome Extension

The Chrome extension is tested against Chrome 36 or later, though earlier versions should work.

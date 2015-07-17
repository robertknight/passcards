[![Build Status](https://travis-ci.org/robertknight/passcards.png?branch=master)](https://travis-ci.org/robertknight/passcards) [![Join the chat at https://gitter.im/robertknight/passcards](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/robertknight/passcards?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

*passcards* is a web, browser extension and command-line based password manager under development.

It uses the [1Password](https://agilebits.com/onepassword) password vault format and is designed
to be usable alongside the official 1Password apps.

The passcards apps are designed for use with Dropbox. To use them with an existing 1Password vault,
you'll need to enable Dropbox syncing within the official 1Password apps.

## Installation

passcards is available as a browser add-on for Firefox and Chrome, a web app and a command-line
app.

See [the passcards site](http://robertknight.github.io/passcards/) for links to
current releases.

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

[![Build Status](https://travis-ci.org/robertknight/1pass-web.png?branch=master)](https://travis-ci.org/robertknight/1pass-web)

This is a web and command-line based password manager under development.

It uses the [1Password](https://agilebits.com/onepassword) password vault format and is designed
to be usable alongside the official 1Password apps.

Both the command-line client and the web client are designed
for use with Dropbox. To use them with an existing 1Password vault,
you'll need to enable Dropbox syncing within the official 1Password apps.

## Command-line Client Installation

```
npm install -g onepass-cli
```

After installing the command-line app, it can be run using `1pass <command>`.
See `1pass --help` for a list of supported commands.

## Web App

The web client is currently in the very early stages of development.
You can access the [current alpha version here](https://robertknight.github.io/1pass-web/app/index.html)

### Local Development

Local development requires Node.js 0.10 and make. To build the CLI and web clients, clone the source and run `make`.

The web client is a single page application. The Dropbox client keys in the source are configured to allow
the app to be served from http://localhost:8000/webui/index.html . You can set up a server for this locally
by running, from the root of a source checkout, `python -m SimpleHTTPServer`.

If you want to host the web app from a different location you will need to register your own Dropbox
API keys from the [Dropbox App Console]("https://www.dropbox.com/developers/apps"). When registering a new app,
you currently need to give it full Dropbox access permissions (though this requirement could easily be dropped
if necessary) and enable the _implicit_ authorization flow.

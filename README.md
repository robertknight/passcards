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

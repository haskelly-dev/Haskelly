# Haskelly

Haskelly is a VS Code extension that provides complete support for casual and expert Haskell 
development. This includes:
* Code highlight
* Code completion
* Running Haskell inside the editor using either GHCi, runHaskell or Stack build
* Testing all the prop functions in a file with QuickCheck


## Features

### Code highlight
Proper code highlight for Haskell code. It just works.

### Code completion
Intelligent code completion using the Intero package. This takes into account functions and 
constants defined in the opened file as well as the Haskell standard library and
the imported modules.

### Running Haskell
The extension allows three ways of executing Haskell in the integrated terminal inside VS Code:
* GHCi: you can call all the functions declared in the file providing the arguments. The 
extension calls `stack ghci` in the background.

* Run file: looks for a main function and executes it. The extension uses `stack runhaskell` under the hood.

* Stack build: runs the Stack project defined in the root folder. The extension runs `stack build`.

### Testing Haskell
Easily run QuickCheck on all the functions that start with the prefix `prop_` in the
currently opened file. 

## Requirements
* Node 6
* Stack. If you don't know about it, Stack is the best Haskell package manager. If you still use Cabal, check out Stack.
After installing Stack and adding it to your `PATH`, run `$ stack setup`. This will install the GHC (Glasgow Haskell Compiler) and GHCi.
    * Intero package for code completion. To install it: `$ stack install intero`.
    * QuickCheck package for running `QuickCheck`. To install it: `$ stack install quickcheck`.


## Extension Settings

Haskelly is fully customizable. Just add any of these properties in the preferences file (Code -> Preferences -> User Settings [CMD+,])
* `haskell.enable`: enable/disable this extension
* `haskell.codeCompletion`: set to `false` to disable code completion
* `haskell.ghci`: set to `false` to hide the `GHCi` button in the bottom bar
* `haskell.runhaskell`: set to `false` to hide the `Run file` button in the bottom bar
* `haskell.stackbuild`: set to `false` to hide the `Stack build` button in the bottom bar
* `haskell.quickcheck`: set to `false` to hide the `QuickCheck` button in the bottom bar

## Known Issues

This extension is in beta, so some bugs/issues might be present. We would really appreciate if you
could file a Github issue request in the extension public repository.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.1

Initial release of Haskelly.

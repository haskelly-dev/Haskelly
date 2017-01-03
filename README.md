# Haskelly

Haskelly is a VS Code extension that provides complete support for casual and expert Haskell 
development. This includes:
* Code highlight
* Code completion
* Running Haskell inside the editor using either GHCi, runHaskell or Stack build
* Testing all the prop functions in a file with QuickCheck or Stack test


## Features

### Code highlight
Proper code highlight for Haskell code. It just works.

### Code completion
Intelligent code completion using the [Intero](https://github.com/commercialhaskell/intero) package. This takes into account functions and 
constants defined in the opened file as well as the Haskell standard library and
the imported modules.

### Running Haskell
The extension allows three ways of executing Haskell using the integrated terminal inside VS Code:
* GHCi: you can call all the functions declared in the file providing the arguments. The 
extension calls `stack ghci` in the background.

* Run file: looks for a main function and executes it. The extension uses `stack runhaskell` under the hood.

* Stack run: runs the Stack project defined in the root folder. The extension runs `stack run` which uses the [stack-run](https://hackage.haskell.org/package/stack-run) package.

### Testing Haskell
Easily run QuickCheck on all the functions that start with the prefix `prop_` in the
currently opened file. If working in a Stack project, Haskelly will run `stack test`.

## Requirements
* NodeJS 6 or higher
* Stack. If you don't know about it, Stack is the best Haskell package manager. If you still use Cabal, check out Stack.
After installing Stack and adding it to your `PATH`, run `$ stack setup`. This will install the GHC (Glasgow Haskell Compiler) and GHCi.
* Stack packages (installed locally if working inside a Stack project):
    * Intero package for code completion. To install it: `$ stack install intero`.
    * QuickCheck package for running `QuickCheck`. To install it: `$ stack install quickcheck`.
    * stack-run package for running `stack run`. To install it: `$ stack install stack-run`.


## Extension Settings

Haskelly is fully customizable. Just add any of these properties in the preferences file (Code -> Preferences -> Work Space Settings (settings.json))
* `haskelly.codeCompletion`: set to `false` to disable code completion
* `haskelly.buttons.ghci`: set to `false` to hide the `GHCi` button in the bottom bar
* `haskelly.buttons.runfile`: set to `false` to hide the `Run file` button in the bottom bar
* `haskelly.buttons.quickcheck`: set to `false` to hide the `QuickCheck` button in the bottom bar
* `haskelly.buttons.stackRun`: set to `false` to hide the `Stack run` button in the bottom bar
* `haskelly.buttons.stackTest`: set to `false` to hide the `Stack test` button in the bottom bar

## Known Issues

* Code completion not working in files inside a Stack project (Windows only).
* Custom character in GHCi substituting the normal "Prelude" not supported yet.

This extension is in alpha, so some bugs/issues might be present. We would really appreciate if you
could send us any feedback or bug reports at: [zcabmse@ucl.ac.uk](mailto:zcabmse@ucl.ac.uk?Subject=Haskelly%20feedback) .

## Release Notes

### 0.2.1

* Added `Stack test`, which runs all the tests defined in a stack project.
* Added `Stack run`, which runs the local Stack project.
* Running GHCi directly into the integrated terminal.
* Improvements in Stack code completion.

### 0.2.0

* Windows is now fully supported and enjoys the same features as macOS and Linux.
* Fixed some bugs in code completion.

### 0.1.0

Fixed issue with buttons not showing up when the configuration is not set.

### 0.0.9

Updated known issues.

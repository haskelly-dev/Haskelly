# Haskelly

Haskelly is a VS Code extension that provides complete support for casual and expert Haskell
development. This includes:
* Code highlight
* Code snippets
* Code completion
* Running Haskell inside the editor using either GHCi, runHaskell or Stack build
* Testing all the prop functions in a file with QuickCheck or Stack test


## Features

### Code highlight
Proper code highlight for Haskell code. It just works.

### Code snippets
Snippets for the most popular functions in Haskell such as `map` or `fold` and other structures like `data` or `newtype`. 
For the tokens which have a snippets, Haskelly will show both the suggestion and the snippet. If you want to disable this behaviour and 
force Haskelly to only provide the snippet set the configuration `haskelly.snippets.important` to `true`. Go to [Extension Settings](## Extension Settings)
section to learn how to add your own snippets.

### Code completion
Intelligent code completion using the [Intero](https://github.com/commercialhaskell/intero) package. This takes into account functions and
constants defined in the opened file as well as the Haskell standard library and the imported modules.

### Running Haskell
The extension allows three ways of executing Haskell using the integrated terminal inside VS Code:
* GHCi: you can call all the functions declared in the file providing the arguments. The
extension calls `stack ghci` in the background.

* Run file: looks for a main function and executes it. The extension uses `stack runhaskell` under the hood.

* Stack run: runs the Stack project defined in the root folder. The extension runs `stack run` which uses the [stack-run](https://hackage.haskell.org/package/stack-run) package.

### Testing Haskell
Easily run [QuickCheck](https://hackage.haskell.org/package/QuickCheck) on all the functions that start with the prefix `prop_` in the currently opened file. If working in a Stack project, Haskelly will run `stack test`.

Watch a demo [here](https://www.youtube.com/watch?v=r3x64iz5xDk).

## Requirements
* [NodeJS](https://nodejs.org/en/) 6 or higher.
* [Stack](https://www.haskellstack.org). If you don't know about it, Stack is the best Haskell package manager. If you still use Cabal, check out Stack. After installing Stack and adding it to your `PATH`, run `$ stack setup`. This will install the GHC (Glasgow Haskell Compiler) and GHCi.
* Stack packages (installed locally if working inside a Stack project):
    * Intero package for code completion. To install it: `$ stack install intero`.
    * QuickCheck package for running `QuickCheck`. To install it: `$ stack install quickcheck`.
    * stack-run package for running `stack run`. To install it: `$ stack install stack-run`.


## Extension Settings

Haskelly is fully customizable. Just add any of these properties in the preferences file (Code -> Preferences -> Workspace Settings (settings.json))
* `haskelly.codeCompletion`: set to `false` to disable code completion
* `haskelly.buttons.ghci`: set to `false` to hide the `GHCi` button in the bottom bar
* `haskelly.buttons.runfile`: set to `false` to hide the `Run file` button in the bottom bar
* `haskelly.buttons.quickcheck`: set to `false` to hide the `QuickCheck` button in the bottom bar
* `haskelly.buttons.stackRun`: set to `false` to hide the `Stack run` button in the bottom bar
* `haskelly.buttons.stackTest`: set to `false` to hide the `Stack test` button in the bottom bar
* `haskelly.snippets.important` set to `true` to hide code completion for which there's a snippet.
* `haskelly.snippets.custom` add your custom snippets following the structure of this [file](https://github.com/martrik/Haskelly/tree/master/languages/snippets/haskell.json).


## Road map

 Check out the next features and development of Haskelly in this [public board](https://trello.com/b/vsMlLU4h/haskelly-features).


## Contributing

If you'd like to contribute to Haskelly, this is what you can do:

* Bugs: This extension is in alpha, so some bugs might be present. We would really appreciate if you
could post any issue on the Github repository [issues section](https://github.com/martrik/Haskelly/issues) or contact us at: [zcabmse@ucl.ac.uk](mailto:zcabmse@ucl.ac.uk?Subject=Haskelly%20feedback).
* Ideas and feature requests: We want to get everyone's opinion on what we're building so feel free to use the two mentioned channels for any comment or suggestion.
* Documentation: Found a typo or strangely worded sentences? Submit a PR!
* Code: Contribute bug fixes, features or design changes.

## Release notes

Check out the release notes [here](https://github.com/martrik/Haskelly/releases).

## License

[GNU 3](https://github.com/martrik/Haskelly/blob/master/License.txt)

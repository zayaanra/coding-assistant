# Omnicode
Omnicode is an AI-based and AWS-powered coding assistant built as a VSCode extension. It's three main features are:
1. Code Completions
   * You can start typing in any programming language. After an idle time of 3 seconds, a request is made with some context of your current code to an LLM. The results are returned and written as ghost text within VSCode. You can accept the results by pressing <kbd>⇥ Tab</kbd> or continue typing to ignore it.
2. Code Refactoring
   * You can also refactor code with the LLM. To do this, select some code and right-click. It should open a context menu and you should have option that looks like: `Omnicode - Refactor Code`. Unlike code completions, this operation saves the results. You can undo it though.
3. Documentation Generator
   * You can also generate documentation. This works the same way as code refactoring. Depending on the code you select, the LLM will decide what type of documentation would be helpful. If it is just comments, then you will receive the same code with the added comments. If it is a more complex diagram (like an actual image) then there will be additional mechanisms to download this image - (**TBD**).

There is also one more feature. It involves a personalized dashboard of your own usage of Omnicode. How this will be implemented is **TBD**.

## Setup
### Prequisites:
1. Have the latest version of `npm` installed.
2. Have the latest version of VSCode installed.

### Installation
1. Clone this repository:
`git clone git@github.com:zayaanra/omnicode.git`
2. Navigate to the child directory `omnicode`:
`cd omnicode`
3. Run `npm install`
4. Run `tsc --watch`.
   * This command should only be done once so that the `out` directory (result of TS compilation) is saved. For some reason, the VSCode API doesn't do this by itself when the extension is launched for the first time. Th `out` directory isn't tracked by `git`.
5. Open the file `tsconfig.json`
   * Press <kbd>⌃ Control</kbd> + <kbd>⇧ Shift</kbd> + <kbd>B</kbd>
   * Click the item that says `npm: watch - omnicode` 
     * This is needed so that you don't have to run `tsc --watch` every time you want to compile the program (if any changes are made). It will instead compile on every file save.

### Running the program
1. Click the `Run` tab at the top of the VSCode window.
2. Click `Start Debugging`.

You can start playing with the extension now. You can also press <kbd>F5</kbd> as a shortcut. 

If you make any changes to the source code, you will need to refresh the VSCode debugger to apply any changes.


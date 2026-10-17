# Installing Molecullage

## Install with Claude Code

Open Claude Code in any folder and paste the block below. Claude installs Molecullage step by step, reports each step in one line, and stops if a step fails. It does not edit your Claude Code settings file: it prints the hook entries, and you paste the ones you want.

```
Install Molecullage for me. Do the steps below in order. After each step, tell me in one line what you did. If a step fails, stop and tell me what failed and why. Below, <clone> means the full path of the folder from step 1, written with forward slashes.

1. Ask me which folder to clone into, and suggest ~/Molecullage. If that folder exists and is not empty, ask me before you use it.
2. Run: git clone https://github.com/danilkotelnikov/Molecullage <clone>
3. In <clone>, run: npm install
4. In <clone>, install the Python packages. On Windows run: py -3 -m pip install -r requirements.txt. On Linux and macOS run: python3 -m pip install -r requirements.txt. If pip refuses to install into the system Python, stop and tell me; do not force it.
5. In <clone>, run: npm run check
   Show me every line it prints. Each line starts with pass or FAIL. If a line starts with FAIL, stop and show me that line. If the build step says no browser was found, tell me to install Chrome, Edge or Chromium, or to set MOLECULLAGE_CHROME to the path of one.
6. Look for ChimeraX. It is optional: without it, the render_structure tool cannot make new structure renders, and everything else works. If you find it somewhere other than a ChimeraX folder under C:/Program Files, /Applications, /usr/lib or /opt, tell me its path.
7. Copy the folder <clone>/claude/skill/molecullage to ~/.claude/skills/molecullage. Create ~/.claude/skills if it does not exist. If ~/.claude/skills/molecullage already exists, ask me before you replace it.
8. Register the MCP server for my user. The server name, molecullage, comes before -e:
   claude mcp add --scope user molecullage -e MOLECULLAGE_HOME=<clone> -- node <clone>/claude/mcp/server.mjs
   Put a path in double quotes if it contains a space. If you found Chrome or ChimeraX in a place the scripts do not search, add -e MOLECULLAGE_CHROME=<path> or -e MOLECULLAGE_CHIMERAX=<path> before the double dash. If a server named molecullage already exists, ask me before you remove it.
9. Do not edit ~/.claude/settings.json. Tell me about the two optional hooks in the section "Optional hooks" of <clone>/INSTALL.md: the auto-trigger, which reminds you to load the Molecullage skill when my prompt is about a figure, and the QA hook, which runs the quick QA checks after you write or edit a figure page. Ask me which ones I want. Print the JSON for those, with <clone> replaced by the real path, and tell me to merge it into the "hooks" object of ~/.claude/settings.json myself.
10. Tell me to restart Claude Code, and then to ask for a figure.
```

After the restart, ask for a figure in plain words, for example: "Make a contact map of a nanobody and its antigen from PDB 1MEL."

## Install by hand

You need Node 20 or newer, Python 3.10 or newer, Git, and Chrome, Edge or Chromium. ChimeraX 1.10 is optional: without it you cannot make new structure renders, and everything else works. If you do not use Claude Code, these commands are the whole installation.

### Windows (PowerShell)

```
git clone https://github.com/danilkotelnikov/Molecullage $HOME\Molecullage
cd $HOME\Molecullage
npm install
py -3 -m pip install -r requirements.txt
npm run check
```

### Linux and macOS

```
git clone https://github.com/danilkotelnikov/Molecullage ~/Molecullage
cd ~/Molecullage
npm install
python3 -m pip install -r requirements.txt
npm run check
```

Some Linux distributions do not let pip install into the system Python. In that case, make a virtual environment, install the packages into it, and set `MOLECULLAGE_PYTHON` to the `python` of that environment.

If the build cannot find a browser or ChimeraX, set `MOLECULLAGE_CHROME` or `MOLECULLAGE_CHIMERAX` to the executable. To build a first figure, follow "Try it in five minutes" in `README.md`.

### The Claude Code parts, by hand

`node scripts/install.mjs` does the safe part for you. It checks the tools, copies the skill to `~/.claude/skills/molecullage`, and prints the exact `claude mcp add` line and the hook entries. It runs `claude mcp add` only when you add `--yes`. It never edits `settings.json`.

To do the same yourself, run these from the clone folder. Delete an older `~/.claude/skills/molecullage` first; otherwise the copy lands inside it.

Windows (PowerShell):

```
New-Item -ItemType Directory -Force $HOME\.claude\skills | Out-Null
Copy-Item -Recurse claude\skill\molecullage $HOME\.claude\skills\molecullage
claude mcp add --scope user molecullage -e MOLECULLAGE_HOME="$PWD" -- node "$PWD\claude\mcp\server.mjs"
```

Linux and macOS:

```
mkdir -p ~/.claude/skills && cp -r claude/skill/molecullage ~/.claude/skills/molecullage
claude mcp add --scope user molecullage -e MOLECULLAGE_HOME="$PWD" -- node "$PWD/claude/mcp/server.mjs"
```

If you had to set `MOLECULLAGE_CHROME` or `MOLECULLAGE_CHIMERAX`, give the MCP server the same value: add `-e NAME=value` to the `claude mcp add` line, before the double dash.

## Optional hooks

There are two hooks. Both stay off until you add them to your settings.

The auto-trigger (`claude/hook/molecullage_trigger.mjs`, event `UserPromptSubmit`) adds one line for Claude when your prompt mentions figure work: a figure, panel, schematic, diagram, infographic, graphical abstract, plot, chart, render, ChimeraX or palette. The line is "Molecullage skill covers figure work: load it before drawing." For any other prompt it prints nothing. It works without a `molecullage.json`. To turn it off in one project, set `"autotrigger": false` in that project's `molecullage.json`; to turn it off everywhere, remove its entry from your settings. The skill's own description already mentions figure work, so Claude often loads the skill without this hook. The hook makes Claude load it every time.

The QA hook (`claude/hook/molecullage_hook.mjs`, event `PostToolUse`) runs after Claude writes or edits a page in a `figs/` or `templates/` folder. If the matching `out/<key>.png` exists, the hook runs the quick QA checks on it (ink, empty cells, empty band, blank rectangle) and gives Claude the result in one line. It does nothing in a project without a `molecullage.json`. To use it in a figure project, copy `molecullage.example.json` from the clone to `molecullage.json` in that project. Set `"hook": false` there to turn it off again.

Earlier versions of this file put the QA hook under `UserPromptSubmit`. That entry now prints nothing; replace it with the trigger entry below.

To add the hooks, merge these entries into the `hooks` object of `~/.claude/settings.json`, with the real clone path in place of `<clone>`. Leave out the entry of a hook you do not want.

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Write|Edit",
        "hooks": [ { "type": "command", "command": "node \"<clone>/claude/hook/molecullage_hook.mjs\"" } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node \"<clone>/claude/hook/molecullage_trigger.mjs\"" } ] }
    ]
  }
}
```

## Remove

```
claude mcp remove molecullage --scope user
```

Then delete the folder `~/.claude/skills/molecullage`, the hook entries in `~/.claude/settings.json` if you added them, the clone folder, and any `molecullage.json` you copied into projects.

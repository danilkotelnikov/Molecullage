"""Run a ChimeraX script under a lock, so that only one ChimeraX window renders at a time.

    py -3 -B struct/run_cx.py struct/render.py complex entry=1MEL pdb=data/pdb/1MEL.pdb binder=A antigen=L drop=B,M cdr=1mel_vhh
    py -3 -B struct/run_cx.py --dry-run struct/render.py complex ...     # print the command, run nothing

ChimeraX is read from $STRUCTFIG_CHIMERAX, else found under C:/Program Files, /Applications or /opt (pinned and tested: 1.10).
Waits up to 25 minutes for the lock, runs ChimeraX with a 10 minute limit, prints the exit code and the script's error file.
A ChimeraX window opens briefly. The renderer needs it: --offscreen has no OpenGL on Windows.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOCK = HERE / ".cx.lock"


def find_exe():
    env = os.environ.get("STRUCTFIG_CHIMERAX")
    if env and Path(env).exists():
        return env
    for root in ("C:/Program Files", "/Applications", "/usr/lib", "/opt"):
        r = Path(root)
        if not r.exists():
            continue
        for d in sorted(r.glob("ChimeraX*"), reverse=True):
            for rel in ("bin/ChimeraX.exe", "Contents/MacOS/ChimeraX", "bin/ChimeraX"):
                if (d / rel).exists():
                    return str(d / rel)
    return None


def acquire(wait_s=1500):
    t0 = time.time()
    while True:
        try:
            LOCK.mkdir()
            return
        except FileExistsError:
            if time.time() - LOCK.stat().st_mtime > 900:  # stale lock of a crashed run
                try:
                    LOCK.rmdir()
                except OSError:
                    pass
                continue
            if time.time() - t0 > wait_s:
                sys.exit("could not get the ChimeraX lock")
            time.sleep(4)


def command(argv, exe):
    script = Path(argv[0]).resolve()
    arg = " ".join([str(script).replace("\\", "/")] + [a.replace("\\", "/") for a in argv[1:]])   # ChimeraX reads a backslash as an escape
    return [exe, "--nostatus", "--script", arg]


def main(argv):
    dry = argv and argv[0] == "--dry-run"
    if dry:
        argv = argv[1:]
    exe = find_exe()
    if not exe and not dry:
        sys.exit("ChimeraX not found. Install ChimeraX 1.10 and set STRUCTFIG_CHIMERAX to its executable.")
    cmd = command(argv, exe or "ChimeraX")
    if dry:
        print(" ".join(cmd))
        return
    script = Path(argv[0]).resolve()
    (HERE / f"last_error_{script.stem}.txt").unlink(missing_ok=True)   # an old error file must not be mistaken for this run's
    acquire()
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            code = proc.wait(timeout=600)
        except subprocess.TimeoutExpired:
            proc.kill()
            code = "timeout"
    finally:
        try:
            LOCK.rmdir()
        except OSError:
            pass
    print("ChimeraX exit:", code)
    err = HERE / f"last_error_{script.stem}.txt"
    if err.exists():
        print(err.read_text(encoding="utf-8")[-1500:])


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])

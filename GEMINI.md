# Antigravity Rules & Command Execution Policy

## 1. Denylist: Banned Commands (STRICTLY PROHIBITED)
The agent must **NEVER** propose or execute the following commands under any circumstances:

### Git Destructive Operations
- `git push --force` or `git push -f`
- `git reset --hard`
- `git clean -fd`, `git clean -f`, or `git clean -x`
- `git branch -D`
- `git checkout -- .` or `git restore .`

### Bulk Deletion & Filesystem Destruction
- PowerShell: `Remove-Item -Recurse -Force`, `rmdir /s /q`, `rd /s /q`
- Command Prompt: `del /f /s /q`, `del *.*`
- Linux/Bash: `rm -rf /*`, `rm -rf ~*`, `rm -rf .*`, `mkfs.*`, `dd if=* of=*`
- Formatting disks: `Format-Volume`, `format *:`, `fdisk`

### Operating System & Process Termination
- `Stop-Computer`, `shutdown`, `reboot`, `init 0`, `init 6`
- `Stop-Process -Force` (except explicitly created child background tasks)
- `Set-ExecutionPolicy Unrestricted`
- Modifying system registries or permissions: `chmod -R 777 /`, `chown -R`

### Database & Environment Leakage
- `DROP DATABASE`, `drop database`, `prisma migrate reset`, `typeorm schema:drop`
- Dumping all environment secrets to logs or chat: `Get-ChildItem env:`, `printenv`, `env`

---

## 2. Asklist: Commands Requiring Explicit Confirmation
The agent must ask the user explicitly before running:
- Any `git push` command.
- Package installations that alter global state (`npm install -g`, `pip install` outside virtual environments).
- Terminating long-running background servers or services.

---

## 3. Allowlist: Safe Commands (Safe to Run Automatically)
The agent is encouraged to run safe, read-only and standard workflow commands in the sandbox:
- Workspace inspection: `Get-ChildItem`, `dir`, `ls`, `cat`, `Get-Content`, `type`, `findstr`, `grep`.
- Git status / inspection: `git status`, `git diff`, `git log`, `git branch`.
- Build & test: `cmake --build`, `pytest`, `python -m unittest`, `ctest`.
- Python execution within workspace: `python scripts/...`, `python -m ...`.


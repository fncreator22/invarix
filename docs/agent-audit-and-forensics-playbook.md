# Universal AI Agent Audit, Security & Forensics Playbook

A platform-agnostic, project-independent runbook for discovering, auditing, investigating, and safely neutralizing AI agents, background daemons, and shadow workflows across any local development machine or agentic runtime.

---

## How to Use This Playbook
Use these questions sequentially when onboarding to a new codebase, setting up a new agentic environment, or conducting a security review. 

Each entry provides:
1. **The Universal Prompt**: Copy-pasteable into any AI agent platform (Antigravity, Cursor, Claude Code, Copilot Workspace, Codex, etc.).
2. **Investigation Objective**: Why to ask this and what security/governance boundary it tests.
3. **Cross-Platform Diagnostic Commands**: Exact commands (Windows PowerShell and Linux/macOS Bash) the agent must execute to produce hard evidence.
4. **Standard of Expected Answer**: The rigor, proof, and data you should demand from the agent.

---

## Phase 1: Inventory & Catalog Discovery

### Question 1: Codebase Agent Inventory
* **Universal Prompt**:
  > *"What AI agents, autonomous background engines, or tool-calling models are officially defined in this project repository?"*
* **Investigation Objective**:
  Identify all application-level agents, LLM integrations, scheduled detection workers, or MCP endpoints checked into the codebase.
* **Diagnostic Procedure**:
  - **Codebase search**: Inspect documentation (`AGENTS.md`, `README.md`, `docs/`) and agent directories (`backend/app/agents/`, `src/agents/`, `agents/`).
  - **Command**:
    - *Windows*: `git grep -i "agent" -- "*.md"; Get-ChildItem -Path . -Recurse -Filter "*agent*" -ErrorAction SilentlyContinue`
    - *Linux/macOS*: `git grep -i "agent" -- "*.md"; find . -iname "*agent*"`
* **Expected Answer Standard**:
  - A structured table listing each agent’s name, role, code entry point, tool caps, memory model, and API surfaces.
  - Clear distinction between conversational agents and autonomous background engines.

---

### Question 2: Local Runtime Subagent Inventory
* **Universal Prompt**:
  > *"What AI subagents, assistants, or specialized personas are officially registered in this local agentic platform or IDE runtime?"*
* **Investigation Objective**:
  Determine what subagent templates and skills the host platform makes available to delegate tasks.
* **Diagnostic Procedure**:
  - Query platform subagent registry APIs (e.g., `manage_subagents(Action='list')`).
  - Inspect global and workspace agent configuration folders (`~/.config/`, `.agents/`, `~/.gemini/config/plugins/`).
* **Expected Answer Standard**:
  - List of built-in system agents (e.g., general subagent, research agent).
  - List of plugin-installed or project-level agents, their source manifests, and their invocation permissions.

---

## Phase 2: Runtime Process Auditing & Shadow Discovery

### Question 3: Active Process & Shadow Agent Audit
* **Universal Prompt**:
  > *"Show me everything that is actually running on this system right now. Is any AI agent, background daemon, or Python/Node process running that is not on our official list?"*
* **Investigation Objective**:
  Uncover unmonitored background daemons, detached CLI processes, or rogue agent services running in the background.
* **Diagnostic Procedure**:
  - **Process scan**:
    - *Windows*: `Get-Process | Where-Object { $_.ProcessName -match "agent|node|python|ollama|uvicorn" } | Select-Object Id, ProcessName, CommandLine`
    - *Linux/macOS*: `ps aux | grep -E "agent|node|python|ollama|uvicorn"`
  - **Parent process & command line inspection**: Inspect exact binary paths and arguments.
* **Expected Answer Standard**:
  - Process table showing PID, binary path, full arguments, and parent process.
  - Explicit confirmation whether each running process is legitimate (IDE/editor) or an unregistered shadow process.

---

### Question 4: Hidden Layer Scan (Containers, Subsystems & Open Ports)
* **Universal Prompt**:
  > *"Could something be running somewhere we didn't look? Check containers, virtual subsystems, all open listening network ports, and task schedulers."*
* **Investigation Objective**:
  Prevent blind spots in containers, Linux subsystems (WSL), system services, and local port listeners.
* **Diagnostic Procedure**:
  - **Docker containers**: `docker ps -a`
  - **WSL / Virtual Machines**: `wsl --list --running`
  - **Listening Network Sockets**:
    - *Windows*: `Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess | Sort-Object LocalPort`
    - *Linux/macOS*: `ss -tulnp` or `netstat -tulnp`
  - **Scheduled Tasks / Auto-Start Daemons**:
    - *Windows*: `Get-ScheduledTask | Where-Object { $_.TaskName -match "agent|gateway|ai" }`
    - *Linux/macOS*: `crontab -l; systemctl list-units --type=service --state=running`
* **Expected Answer Standard**:
  - Exhaustive checklist covering Docker, WSL, listening TCP sockets mapped to PIDs, and auto-start task schedulers.
  - Identification of any service listening on local ports (e.g., `127.0.0.1:XXXX`).

---

### Question 5: Evasion & Observability Assessment
* **Universal Prompt**:
  > *"Would anything have alerted us to this background process if we hadn't manually inspected the operating system?"*
* **Investigation Objective**:
  Assess why a shadow daemon managed to operate without triggering developer alerts.
* **Diagnostic Procedure**:
  - Inspect the process launch mechanism (e.g., hidden script wrappers like `wscript.exe //B`, detached fork, headless service).
  - Verify whether host IDEs / platforms maintain cross-process OS discovery (none do by default).
* **Expected Answer Standard**:
  - Technical breakdown explaining that agentic IDEs only monitor their own sandboxed subagents and do not perform OS-wide process monitoring.
  - Review of how the stealth daemon persisted itself (Task Scheduler, hidden launcher, daemon scripts).

---

## Phase 3: Compliance & Data Access Boundaries

### Question 6: Regulatory Data Access Boundary Inquiry
* **Universal Prompt**:
  > *"If a regulator or auditor asked who read or accessed a specific customer's record, what data could this system actually provide?"*
* **Investigation Objective**:
  Clarify the boundary between data-plane access logging (row-level queries) and control-plane architectural governance.
* **Diagnostic Procedure**:
  - Review the codebase data model: verify whether the application connects to production customer databases or handles PII.
  - Identify where query audit logs reside (e.g., database audit tables, SIEM, APM, CloudTrail).
* **Expected Answer Standard**:
  - Honest admission of system boundaries: whether the platform handles row-level data or architectural metadata.
  - Clear distinction: Database/API logs prove *who executed the query*; architectural governance tools prove *why the access rule/waiver was permitted and who approved it*.

---

## Phase 4: Governance & Change Auditing

### Question 7: Cataloging Unmonitored Agents
* **Universal Prompt**:
  > *"Register this discovered shadow agent in our official service catalog and agent configuration, assigned to <Target Team> ownership."*
* **Investigation Objective**:
  Remediate unmonitored shadow IT by bringing it into formal inventory with assigned human/team accountability.
* **Diagnostic Procedure**:
  - Register the agent in runtime agent definitions (e.g., via `define_subagent` or platform config).
  - Create standardized configuration metadata files (`.agents/agents/<name>.md`).
  - Record ownership, runtime port, and path in a structured manifest (`catalog.json`).
* **Expected Answer Standard**:
  - Created manifest specifying agent name, tier, owner, runtime host/port, and governance policy.

---

### Question 8: Session Scope & Modification Verification
* **Universal Prompt**:
  > *"Show me everything you modified in this session. Did you touch or alter anything I didn't explicitly ask for, especially existing subagents?"*
* **Investigation Objective**:
  Verify agent boundaries and ensure no unauthorized file edits or modifications were made.
* **Diagnostic Procedure**:
  - Inspect git working tree: `git status -s; git diff --stat`
  - Inspect file write timestamps for agent configuration directories.
* **Expected Answer Standard**:
  - Line-by-line inventory of all files touched.
  - Explicit confirmation whether existing subagents were altered or preserved.

---

### Question 9: Prior Background Worker & Git State Inspection
* **Universal Prompt**:
  > *"Did any subagent or automated background worker change anything today across this system that was not authorized?"*
* **Investigation Objective**:
  Audit background runs, transient workers, and uncommitted git modifications across past sessions.
* **Diagnostic Procedure**:
  - Inspect session execution logs and subagent logs (`.system_generated/`, `brain/`).
  - Analyze full working tree diff: `git diff`
* **Expected Answer Standard**:
  - Categorized summary of every uncommitted change (auth changes, test files, screenshots).
  - Identification of which subagent session generated each change and why.

---

## Phase 5: Threat Modeling & Pre-Termination Forensics

### Question 10: Pre-Termination Impact Assessment
* **Universal Prompt**:
  > *"Before we kill or disable this background agent, give me a detailed impact report: will terminating it affect the operating system, the development environment, or the project codebase?"*
* **Investigation Objective**:
  Prevent service disruption by confirming the target process is not a critical OS service or application dependency.
* **Diagnostic Procedure**:
  - Check process tree and dependent services.
  - Verify whether IDE tools or codebase imports rely on the target port or binary.
* **Expected Answer Standard**:
  - 3-part impact breakdown: OS/Hardware, IDE/Agent Platform, Codebase.
  - Confirmation of RAM/CPU release and absence of collateral breakages.

---

### Question 11: Data Exfiltration & Privacy Verification
* **Universal Prompt**:
  > *"Is this background agent stealing our data, reading local files, or transmitting payloads to external platform providers?"*
* **Investigation Objective**:
  Perform network socket and configuration forensics to check for active data leaks.
* **Diagnostic Procedure**:
  - **Socket inspection**:
    - *Windows*: `Get-NetTCPConnection -OwningProcess <PID>`
    - *Linux/macOS*: `ss -tp -p | grep <PID>`
  - **Configuration telemetry check**: Search config files for `telemetry`, `remote_endpoint`, `base_url`, `api_key`.
  - **Runtime state inspection**: Check gateway logs and active agent state files.
* **Expected Answer Standard**:
  - Kernel-level proof of open network connections (e.g., bound strictly to `127.0.0.1` vs. external IP).
  - Verification of telemetry flags and remote LLM provider endpoints.

---

### Question 12: Adversarial Threat Modeling & Forensic Bias Audit
* **Universal Prompt**:
  > *"Can your forensic report be biased or bypassed? Could a background agent extract and exfiltrate data without writing to logs or registering events?"*
* **Investigation Objective**:
  Subject forensic findings to adversarial review (the "Untrusted Narrator" threat model).
* **Diagnostic Procedure**:
  - Evaluate user privilege boundaries (what files the process had permission to read).
  - Contrast point-in-time socket snapshots against transient historical connections.
* **Expected Answer Standard**:
  - **Unvarnished honesty**: Acknowledging that untrusted software can omit logs, transmit data in millisecond bursts, and read any accessible user file.
  - The **Zero-Trust Imperative**: An uninvited, unmonitored background process must be terminated immediately regardless of benign log claims.

---

## Phase 6: Neutralization & Clean State Verification

### Question 13: Neutralization, Persistence Removal & Cleanup
* **Universal Prompt**:
  > *"Proceed with terminating the unauthorized agent, disabling its auto-start hooks, and completely removing its catalog and registration files."*
* **Investigation Objective**:
  Eliminate the running process, sever auto-start persistence, and purge configuration records.
* **Diagnostic Procedure**:
  1. **Kill the process**:
     - *Windows*: `Stop-Process -Id <PID> -Force`
     - *Linux/macOS*: `kill -9 <PID>`
  2. **Neutralize persistence**:
     - Disable scheduled tasks, systemd services, or stub launcher scripts (`WScript.Quit 0` / empty script).
  3. **Purge metadata files**:
     - Remove agent manifests from `.agents/` and global config folders.
  4. **Post-execution verification**:
     - *Windows*: `Get-Process -Id <PID> -ErrorAction SilentlyContinue; Get-NetTCPConnection -LocalPort <PORT> -ErrorAction SilentlyContinue`
     - *Linux/macOS*: `ps -p <PID>; ss -tulnp | grep <PORT>`
* **Expected Answer Standard**:
  - Verified termination of PID and release of network port.
  - Proof that persistence hooks cannot resurrect the daemon.
  - Clean working tree verification with legitimate project files intact.

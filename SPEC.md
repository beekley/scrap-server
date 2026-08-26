# Scavenged Server Sim (MVP)

## Overview & Core Loop

A simulation game where players assemble scrap electronics to run compute jobs, earn salvage rewards, and upgrade their rack to tackle higher-tier workloads. The core loop is:

1. Player selects a job from the bounty board.
2. Player starts a job running on exactly one server node.
3. (Time progresses) Once the job is complete, the player receives a reward of parts.
4. Player upgrades their servers and can run harder jobs.

## Core Data Models

Servers are a complete, working computer made up of parts and capable of running a job. All types are defined in src/types.ts. 

## Simulation

The execution loop updates at a fixed tick rate (e.g., 1 ticks per minute, `dt = 60s`). For the MVP, the only time-based mechanic is the execution and progression of a running job.

### Job data Pre-requisite

Jobs have two storage requirements:
1. **Total Size**: The total amount of data the job entails. The server must have enough total storage capacity (RAM + Drives) to fit this.
2. **Working Set Size**: The minimum continuous block of storage needed to actively do the computation.

$$\text{HasSufficientStorage} = \text{Node.totalStorageCapacity} \ge \text{Job.totalSize} \text{ and } \text{Node.totalStorageCapacity} \ge \text{Job.workingSetSize}$$

**Working Set Allocation (Spillover)**: 
The working set is loaded greedily into the fastest available storage components first (sorted by I/O bandwidth). If the working set exceeds the capacity of the fastest component (e.g., RAM), it spills over into the next fastest components (e.g., SSDs, then HDDs).

Because the CPU must fetch data from these various sources, the overall I/O bottleneck is determined by the **weighted harmonic mean** of the bandwidths, simulating sequential wait times for memory pages:

$$\text{Effective Throughput} = \frac{1}{\sum \frac{V_i}{\text{Bandwidth}_i}}$$
*(Where $V_i$ is the fraction of the working set stored on component $i$)*

### Job Progression

Jobs have a total compute-time requirement that must be reached to complete the job (measured in operations, `op`). Processors in the servers make progress towards this goal, but can be bottlenecked by the I/O throughput (`MB/s`) from wherever the job's working set is stored.

1. For each processor in the selected server, calculate the maximum compute rate:

    a. Determine the throughput (`MB/s`) of the storage hosting the working set.
    b. Calculate operations per second rate for the CPU, as bottlenecked by the throughput:
    
        effectiveOpsRate = min(processor.opsRate, workingSetThroughput / job.dataPerOp)

2. Update the job's progress:

$$\text{Job.workCompleted} += \text{effectiveOpsRate} \times dt$$

3. If the job reaches full progress, then it is done and the player receives the reward in their inventory.

$$\text{Progress} = \min\left(1.0, \frac{\text{Job.workCompleted}}{\text{Job.operationsRequired}}\right)$$


## Minimal Part Compatibility System

To keep the MVP lightweight without sacrificing the assembly puzzle, compatibility uses a direct string-matching rule on `socketTag`.

* **Rule:** A Part can be slotted into a Node if the Node possesses an unoccupied `SlotDefinition` where `SlotDefinition.type === Part.type` and `SlotDefinition.socketTag === Part.socketTag`.
* **MVP Sockets:**
* CPU Sockets: `LGA1155`, `AM4`.
* RAM Slots: `DDR3`, `DDR4`.
* Bus Slots: `SATA` (for Storage), `NVME` (for M.2 Storage), `PCIE` (for add-on cards/GPUs).
* Power: `STANDARD_ATX`.

## UI & State Flow

The UI consists of a single unified page showing all relevant information simultaneously, rather than navigating between distinct screens.

### 1. Server Room & Assembly (Top Section)

* **2D Server Room**: Displays a front-facing 2D grid room.
  * Parts and server cases have physical dimensions (1 unit = 1cm) and live in the room.
  * Players can drag and drop parts within the room. Parts respond to gravity and stack on top of each other or the floor.
  * All `CASE` parts automatically act as independent `ServerNode`s placed loosely in the room.
* **Node Configuration**:
  * Clicking a server case in the room selects it, revealing the Node Configuration panel.
  * **Validity Check**: If an active job is selected, the selected server displays a small check indicating whether it passes the `isServerValid` (`canServerRunJob`) requirements to run that specific job.
  * **Interactions**: Dropdown menus to insert/remove parts into compatible slots of the selected server. Removing a part drops it into the room. (Drag-and-drop to install is planned for later).
  * **Live Progress**: If a job is running on the selected server node, the progress bar and current status are displayed in the config panel.
  * While a job is running on a node, its part slots are locked (disabled).

### 2. Telemetry Card (Visible on Node Selection)

* The telemetry card is only visible when a specific server node is selected.
* It displays real-time execution gauges for the selected node:
  * Live compute rate ($op/s$) and active bottleneck indicator (e.g., `Bottleneck: Storage IO (SATA 60 MB/s)` or `Bottleneck: CPU Limit`).
  * CPU, RAM, and Storage capacity and utilization.
* Actions: **Start Job** (if valid and not running), **Abort Job** (if running).

### 3. Bounty Board (Bottom Section)

* Displays a list of available jobs in a card below the rack assembly.
* Each job highlights: Work Volume ($op$), Working Set ($GB$), Total Size ($GB$), IO Intensity ($MB/op$), and Rewards.
* Action: **Select Job** -> sets the job as the active target for the rack assembly validity checks.
* When a job completes, a payout notification is shown and rewards (cash/parts) are added to the inventory.

### 4. Game Clock & Pacing

* The UI features a global game clock (e.g., `Day 1, 00:00`).
* **Time Scale**: The simulation ticks every 100 ms of real-life time, advancing the game clock by 6 game-seconds per tick (maintaining the ratio of 1 real-life second to 1 game-minute / 60 game-seconds).
* **Job Pacing**: Jobs require large amounts of operations (e.g., 500,000 to 2,000,000 ops) so that they take a few real-life minutes to complete on starter hardware.

---

## Game Data Architecture

The game uses modular data structures to populate parts and jobs instead of a single seed file. Data is located in `src/data/`:

* `src/data/parts/`: Contains categorized hardware lists (e.g. `cpus.ts`, `motherboards.ts`, `cases.ts`).
* `src/data/jobs/`: Contains categorized job lists (e.g. `early_game.ts`).

These are aggregated in `src/data/index.ts` and loaded by the store.

### Sample Parts

| ID | Name | Type | Socket / Target | Compute | RAM | IO Speed |
| --- | --- | --- | --- | --- | --- | --- |
| `case_techmaker_atx` | TechMaker Basic ATX Case | CASE | `TOWER` | 0 | 0 | — |
| `mb_haodyn_h61` | Haodyn H61-M | MOTHERBOARD | `ATX` | 0 | 0 | 500 MB/s (SATA3) |
| `cpu_acc_vectra_1155` | ACC Vectra-II 1155 | CPU | `LGA1155` | 300 op/s | 0 | — |
| `ram_techmaker_4gb_ddr3` | TechMaker Value 4GB DDR3 | RAM | `DDR3` | 0 | 4 GB | 10,000 MB/s |
| `hdd_techmaker_500gb` | TechMaker 500GB HDD | STORAGE | `SATA3` | 0 | 0 | 100 MB/s |
| `nvme_acc_datacore_1tb` | ACC DataCore Pro 1TB NVMe | STORAGE | `NVME` | 0 | 0 | 3,500 MB/s |
| `psu_techmaker_300w` | TechMaker 300W Budget PSU | PSU | `STANDARD_ATX` | 0 | 0 | — |

### Sample Jobs

| ID | Title | Required Work | Working Set | Total Size | IO Ratio | Reward Drops |
| --- | --- | --- | --- | --- | --- | --- |
| `job_01` | Recover Corrupted Text Archive | 50,000 op | 1 GB | 10 GB | 0.2 MB/op (Low IO) | 1x `ram_techmaker_4gb_ddr3` |
| `job_02` | Brute-Force Password Dump | 150,000 op | 1 GB | 2 GB | 0.01 MB/op (Compute Bound) | 1x `cpu_acc_vectra_1155` |
| `job_03` | Scrape Video Metadata | 50,000 op | 2 GB | 50 GB | 2.5 MB/op (IO Bound) | 1x `psu_techmaker_300w`, 1x `hdd_techmaker_500gb` |


---

## Out of Scope for MVP (Future Work)

* Physical Server Racks (`RACK` parts) to mount cases into.
* Drag-and-drop parts directly into server case slots (currently using dropdowns).
* Power delivery and calculation (Node power draw vs PSU capacity).
* Thermal simulation (Heat generation vs Cooling capacity, thermal throttling).
* Inter-node networking clusters (distributed compute across multi-chassis links).
* Cable routing / 2D wire drag-and-drop.
* Part wear/tear degradation and random component failure.
* Complex OS/Firmware flashing configurations.
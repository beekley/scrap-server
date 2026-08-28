# Scavenged Server Sim (MVP)

## Overview & Core Loop

A simulation game where players assemble scrap electronics to run compute jobs, earn salvage rewards and EarthCoin ($ETC), and upgrade their rack to tackle higher-tier workloads. The core loop is:

1. Player selects a job from the bounty board.
2. Player starts a job running on exactly one server node.
3. (Time progresses) Server parts consume power, draining the player's EarthCoin balance.
4. Once the job is complete, the player receives a reward of parts, bundles, or complete server builds.
5. Player upgrades their servers and can run harder jobs.

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

## Execution & Simulation (ETL Phases)

The simulation engine uses realistic dimensions (Operations, MB/s, GB, Watts) provided by the `safe-units` library to calculate game ticks. Jobs execute in a 3-phase ETL (Extract, Transform, Load) pipeline:

1.  **LOAD Phase**: `downloadSize` is transferred from external storage into the server's working memory. The speed is dictated entirely by the `ioBandwidth` of the local storage drives.
2.  **COMPUTE Phase**: The CPU processes the `operationsRequired`.
    *   **The Swap Penalty**: If the server has less RAM than the `workingSetSize`, it must "page" to disk. A harmonic mean of the RAM speed and Storage speed is used to calculate the `effectiveBandwidth`. The CPU's operations are bottlenecked by the time it takes the memory bus to feed it data based on the `memoryAccessPerOp` rate. Missing RAM on an HDD will grind the CPU to a halt, while an NVMe drive will perform significantly better.
3.  **SAVE Phase**: The `uploadSize` is written from memory back to persistent storage. Speed is dictated by `ioBandwidth`.

Additionally, the job's `totalSize` is a hard requirement. If the server does not have enough total storage capacity to hold the data, it cannot run the job at all.

If the job reaches full progress across all phases, it is done and the player receives the hardware reward. However, rewards are not given immediately; they accumulate as "pending rewards."
    
### The Transfer Panel
At midnight each day, the game pauses and the **Transfer Panel** opens. This is a grid similar to the server room.
*   All pending rewards from the previous day are automatically deposited into the transfer panel.
*   The player can drag and drop parts between their main server room and the transfer panel.
*   Clicking the **Sell Items** button will permanently sell all parts and servers currently left inside the transfer panel for 25% of their base value in $ETC, closing the panel. If the player wants to keep all rewards, they drag them to the main room and click "Sell" to close it (selling 0 items).
    
### Power & Economy (EarthCoin)

Instead of cash, the game economy runs on a cryptocurrency called EarthCoin ($ETC). 

* **Power Draw**: Every simulation tick, all installed components (excluding PSUs) across all server nodes draw power in Watts.
* **Idle Power**: Servers without an active job run in a low-power idle state, consuming only 1% of their cumulative maximum power draw.
* **Cost**: The calculated energy consumption (in kWh) is billed every tick at a rate of 0.0001 $ETC per kWh.
* **Out of Power State**: If the player's $ETC balance cannot cover the power cost for the tick, the servers are halted. An `Out of Power` warning banner is displayed, and jobs will no longer make progress until the player gains more $ETC.

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

* **2D Server Room**: Displays a front-facing 2D grid room representing physical space.
  * Parts and server cases have physical dimensions (1 unit = 1cm) and live in the room.
  * Players can drag and drop parts within the room. 
  * **Strict Physics**: Dragging prevents pulling items out from underneath other stacked items. Dropping an item simulates gravity, falling to the lowest possible space where its center-of-gravity is supported. Drag operations highlight blue for valid drops and red for invalid drops (where an item lacks a balanced resting place).
  * All `CASE` parts automatically act as independent `ServerNode`s placed loosely in the room.

### 2. Context Panel (Visible on Selection)

* Clicking any item in the server room reveals the **Context Panel** for that item, unifying component details and telemetry.
* **Server Node Panel**: If the selected item is a Server Node (Case), this panel displays:
  * **Live Progress**: Start Job, Abort Job, and real-time progress bars.
  * **Telemetry**: Live compute rate ($op/s$) and active bottleneck indicator (e.g., `Bottleneck: Storage I/O` or `Bottleneck: CPU Limit`).
  * **Utilization**: CPU, RAM, and Storage capacities.
* **Part Info Panel**: Displays hardware details (Kind, Value, Power Draw, Compute, Bandwidth) for the specific selected part.
  * **Recursive Sockets**: If the part has sockets (e.g., Motherboard, Case), its slots are rendered as an indented tree with dropdowns to install compatible components. Any installed child parts that also have sockets are rendered recursively beneath them.
  * **Inspection & Navigation**: Users can click "Inspect" next to any installed part in the slot tree to dive into that specific part's details. A navigation button ("↑ Up to [Parent Part]") allows traversing back up the hierarchy.
  * While a job is running on a server node, its part slots are locked (disabled).

### 3. Bounty Board (Bottom Section)

* Displays a list of available jobs in a card below the rack assembly.
* Each job highlights: Work Volume ($op$), Working Set ($GB$), Total Size ($GB$), IO Intensity ($MB/op$), and Rewards.
* Action: **Select Job** -> sets the job as the active target for the rack assembly validity checks.
* When a job completes, a payout notification is shown and rewards (loot parts) are added to the inventory.

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
| `mb_techmaker_am2` | TechMaker Legacy AM2 | MOTHERBOARD | `ATX` | 0 | 0 | 500 MB/s (SATA3) |
| `cpu_acc_titan_legacy_4200` | ACC Titan Legacy 4200 | CPU | `AM2` | 40 op/s | 0 | — |
| `ram_techmaker_512mb` | TechMaker Old 512MB DDR2 | RAM | `DDR2` | 0 | 0.5 GB | 3,200 MB/s |
| `hdd_techmaker_250gb` | TechMaker 250GB HDD | STORAGE | `SATA3` | 0 | 0 | 80 MB/s |
| `nvme_acc_datacore_1tb` | ACC DataCore Pro 1TB NVMe | STORAGE | `NVME` | 0 | 0 | 3,500 MB/s |
| `psu_techmaker_300w` | TechMaker 300W Budget PSU | PSU | `STANDARD_ATX` | 0 | 0 | — |

### Sample Jobs

| ID | Title | Required Work | Working Set | Total Size | IO Ratio | Reward Drops |
| --- | --- | --- | --- | --- | --- | --- |
| `job_01` | Recover Corrupted Text Archive | 50,000 op | 1 GB | 10 GB | 0.2 MB/op (Low IO) | 1x `ram_techmaker_512mb` |
| `job_02` | Brute-Force Password Dump | 150,000 op | 1 GB | 2 GB | 0.01 MB/op (Compute Bound) | 1x `cpu_acc_titan_legacy_4200` |
| `job_03` | Scrape Video Metadata | 50,000 op | 2 GB | 50 GB | 2.5 MB/op (IO Bound) | 1x `psu_techmaker_300w`, 1x `hdd_techmaker_250gb` |


---

## Out of Scope for MVP (Future Work)

* Physical Server Racks (`RACK` parts) to mount cases into.
* Drag-and-drop parts directly into server case slots (currently using dropdowns).
* Power capacity limits (Node power draw vs PSU capacity is not yet strictly enforced).
* Thermal simulation (Heat generation vs Cooling capacity, thermal throttling).
* Inter-node networking clusters (distributed compute across multi-chassis links).
* Cable routing / 2D wire drag-and-drop.
* Part wear/tear degradation and random component failure.
* Complex OS/Firmware flashing configurations.
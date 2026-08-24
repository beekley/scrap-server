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
2. **Working Set Size**: The minimum continuous block of storage needed to actively do the computation. This must fit in the server's storage and will determine the I/O bottleneck.

$$\text{HasSufficientStorage} = \text{Node.totalStorageCapacity} \ge \text{Job.totalSize}$$

*Note: For the MVP, we assume the working set is optimally placed on the fastest available storage that can fit it (e.g. RAM if it fits, falling back to a fast SSD, or a slow HDD).*

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
* CPU Sockets: `SOCKET_V1` (e.g., legacy scrap CPUs), `SOCKET_V2` (mid-tier CPUs).
* RAM Slots: `DDR_LEGACY`, `DDR_MODERN`.
* Bus Slots: `SATA` (for Storage), `PCIE` (for add-on cards/GPUs).
* Power: `STANDARD_ATX_POWER`.

## UI & State Flow

Each of these screens navigable via menu.

### Screen 1: Bounty Board

* Displays a list of 3–5 available jobs.
* Each card highlights: Work Volume ($op$), Working Set ($GB$), Total Size ($GB$), IO Intensity ($MB/op$), and Rewards.
* Action: **Select Job** -> moves to Server Node allocation, where the player chooses a valid server node to start running.

### Screen 2: Rack & Assembly View

* Left Panel: Player Inventory (unassigned parts).
* Center Panel: Selected `ServerNode` showing available physical slots.
* Right Panel: Node telemetry preview:
* Aggregated Compute ($op/s$)
* Total RAM ($GB$) & Storage ($GB$)
* Interactions: Drag or click to insert/remove parts into compatible slots.

### Screen 3: Live Telemetry & Execution

* Displays active execution gauges:
* Progress Bar: $0\% \to 100\%$
* Real-Time Compute Rate ($op/s$) with active bottleneck indicator (e.g., `Bottleneck: Storage IO (SATA 150 MB/s)` or `Bottleneck: CPU (50 op/s)`).
* Actions: **Abort Job**

### Screen 4: Job Complete / Payout

* Triggered when `workCompleted >= operationsRequired`.
* Displays rewards earned (scrap parts added to inventory + cash).
* Action: **Return to Rack** to integrate new parts.

---

## Seed Data (MVP Balance Set)

### Sample Parts

| ID | Name | Type | Socket / Target | Compute | RAM | IO Speed |
| --- | --- | --- | --- | --- | --- | --- |
| `mb_trash` | Salvaged OEM Board | MOTHERBOARD | — | 0 | 0 | 150 MB/s (SATA) |
| `cpu_old` | Dual-Core E-Waste CPU | CPU | `SOCKET_V1` | 50 op/s | 0 | — |
| `ram_1gb` | Generic 1GB DDR Stick | RAM | `DDR_LEGACY` | 0 | 1 GB | 5000 MB/s |
| `hdd_slow` | 250GB Mechanical HDD | STORAGE | `SATA` | 0 | 0 | 60 MB/s |
| `psu_200` | Sparky 200W PSU | PSU | `STANDARD_ATX` | 0 | 0 | — |

### Sample Jobs

| ID | Title | Required Work | Working Set | Total Size | IO Ratio | Reward Cash | Reward Drops |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `job_01` | Recover Corrupted Text Archive | 500 op | 1 GB | 10 GB | 0.2 MB/op (Low IO) | $50 | 1x `ram_1gb` |
| `job_02` | Brute-Force Password Dump | 1,500 op | 1 GB | 2 GB | 0.01 MB/op (Compute Bound) | $120 | 1x `cpu_old` |
| `job_03` | Scrape Video Metadata | 2,000 op | 2 GB | 50 GB | 2.5 MB/op (IO Bound) | $250 | 1x `psu_200`, 1x `mb_trash` |

---

## Out of Scope for MVP (Future Work)

* Power delivery and calculation (Node power draw vs PSU capacity).
* Thermal simulation (Heat generation vs Cooling capacity, thermal throttling).
* Inter-node networking clusters (distributed compute across multi-chassis links).
* Cable routing / 2D wire drag-and-drop.
* Part wear/tear degradation and random component failure.
* Complex OS/Firmware flashing configurations.
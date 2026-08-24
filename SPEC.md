# Scavenged Server Sim (MVP)

## Overview & Core Loop

A simulation game where players assemble scrap electronics to run compute jobs, earn salvage rewards, and upgrade their rack to tackle higher-tier workloads. The core loop is:

1. Player selects a job from the bounty board.
1. Player start a job running on one or more server nodes.
1. (Time progresses) Once the job is complete, the player receives a reward of parts.
1. Player upgrades their servers and can run harder jobs.

## Core Data Models

Servers are a complete, working computer made up of parts and capable of running a job. All types are defined in src/types.ts. 

## Simulation

The execution loop updates at a fixed tick rate (e.g., 1 ticks per minute, `dt = 60s`). For the MVP, the only time-based mechanic is the execution and progression of a running job.

### Job data Pre-requisite

Jobs have a static storage requirement and the server(s) selected to run the job must have enough storage to reach that minimum or the player cannot select those servers.

$$\text{HasSufficientRAM} = \text{Sum(Job.servers.totalStorage)} \ge \text{Job.requiredStorage}$$

Where totalStorage is the sum of all memory and drives in the selected servers.

### Job Progression

Jobs have a total compute-time requirement that must be reached to complete the job (measured in operations). Processors in the servers make progress towards this goal, but can be bottlenecked by the I/O throughput from wherever the job's data is stored.

1. For each processor in the servers handling the job, calculate the maximum compute rate:

    a. Find the nearest part the data is stored and get the minimum throughput (MB/S) between that part and the processor.
    b. Calculate operations per second rate for the CPU, as bottlenecked by the throughput:
    
        effectiveOpsRate = min(processor.opsRate, throughput / dataPerOp)


2. Update the job's progress:

$$\text{Job.workCompleted} += \text{effectiveOpsRate} \times dt$$

3. If the job reaches full progress, then it is done and the player receives the reward in their inventory.

$$\text{Progress} = \min\left(1.0, \frac{\text{Job.workCompleted}}{\text{Job.workRequired}}\right)$$


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
* Each card highlights: Work Volume ($CU$), RAM floor ($GB$), IO Intensity ($MB/CU$), and Rewards.
* Action: **Select Job** -> moves to Server Node allocation, where the player chooses a valid server node to run start running.

### Screen 2: Rack & Assembly View

* Left Panel: Player Inventory (unassigned parts).
* Center Panel: Selected `ServerNode` showing available physical slots.
* Right Panel: Node telemetry preview:
* Aggregated Compute ($CU/s$)
* Total RAM ($GB$) & Storage ($GB$)
* Power Balance: $\text{Draw (W)} / \text{Capacity (W)}$ (Green if safe, Red if over capacity)
* Cooling Balance: $\text{TDP (W)} \text{ vs } \text{Cooling (W)}$
* Interactions: Drag or click to insert/remove parts into compatible slots.

### Screen 3: Live Telemetry & Execution

* Displays active execution gauges:
* Progress Bar: $0\% \to 100\%$
* Real-Time Compute Rate ($CU/s$) with active bottleneck indicator (e.g., `Bottleneck: Storage IO (SATA 150 MB/s)` or `Bottleneck: Thermal Throttle (82°C)`).
* Actions: **Abort Job** or **Overclock Node** (boost compute by 25%, double heat generation).

### Screen 4: Job Complete / Payout

* Triggered when `workCompleted >= workRequired`.
* Displays rewards earned (scrap parts added to inventory + cash).
* Action: **Return to Rack** to integrate new parts.

---

## Seed Data (MVP Balance Set)

### Sample Parts

| ID | Name | Type | Socket / Target | Compute | RAM | IO Speed | Power Draw / Cap | Heat / Cooling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `mb_trash` | Salvaged OEM Board | MOTHERBOARD | — | 0 | 0 | 150 MB/s (SATA) | 15W Draw | 0 |
| `cpu_old` | Dual-Core E-Waste CPU | CPU | `SOCKET_V1` | 50 CU/s | 0 | — | 65W Draw | 65W TDP |
| `ram_1gb` | Generic 1GB DDR Stick | RAM | `DDR_LEGACY` | 0 | 1 GB | — | 5W Draw | 0 |
| `hdd_slow` | 250GB Mechanical HDD | STORAGE | `SATA` | 0 | 0 | 60 MB/s | 10W Draw | 5W TDP |
| `psu_200` | Sparky 200W PSU | PSU | `STANDARD_ATX` | 0 | 0 | — | 200W Cap | 0 |
| `fan_80` | Noisy 80mm Fan | FAN | `CHASSIS_FAN` | 0 | 0 | — | 3W Draw | 50W Cooling |
| `soc_phone` | Cracked Android Phone | SOC_DEVICE | `SHELF_SPACE` | 35 CU/s | 2 GB | 30 MB/s (USB) | 10W Draw | 10W Cooling |

### Sample Jobs

| ID | Title | Required Work | Required RAM | IO Ratio | Reward Cash | Reward Drops |
| --- | --- | --- | --- | --- | --- | --- |
| `job_01` | Recover Corrupted Text Archive | 500 CU | 1 GB | 0.2 MB/CU (Low IO) | $50 | 1x `ram_1gb` |
| `job_02` | Brute-Force Password Dump | 1,500 CU | 1 GB | 0.01 MB/CU (Compute Bound) | $120 | 1x `fan_80`, 1x `cpu_old` |
| `job_03` | Scrape Video Metadata | 2,000 CU | 2 GB | 2.5 MB/CU (IO Bound) | $250 | 1x `psu_200`, 1x `mb_trash` |

---

## Out of Scope for MVP

* Inter-node networking clusters (distributed compute across multi-chassis links).
* Cable routing / 2D wire drag-and-drop.
* Part wear/tear degradation and random component failure.
* Complex OS/Firmware flashing configurations.
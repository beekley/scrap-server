# Feature Backlog

## Template

When adding new features, use the following format:

### [Feature Name]
**User Story:** As a player, I want to [action] so that [benefit].
**Problem Statement:** [Why this makes the game better / what prototype feedback it addresses].
**Implementation Details:** [Technical notes, formulas, mechanics, or specific open questions].

---

## 1. Live Telemetry Graphs
**User Story:** As a player, I want to see real-time graphs of my server's metrics during a job, so that I can actively monitor its performance, power, and thermal stress.
**Problem Statement:** The execution phase currently feels like waiting on a passive "glorified progress bar". Visualizing the simulation makes job execution feel active, tense, and technically complete.
**Implementation Details:** 
- Replace the static progress bar in the Context Panel with a rolling line chart updating every tick.
- Plot Power Draw (W), Temperature (°C), and Compute Rate (ops/s) against time.
- Add red-line thresholds for thermal limits and power maximums to visually communicate danger.

## 2. Better UI / Polish
**User Story:** As a player, I want a clean, intuitive interface for managing my hardware, sockets, and active jobs, so that the simulation feels like a professional management dashboard.
**Problem Statement:** The current UI feels too much like a developer prototype. Improving the layout, visual hierarchy, and interaction design will ground the game and make it feel "complete."
**Implementation Details:** 
- *Pending user clarification on specific pain points.* 
- Likely involves polishing the recursive socket tree, improving drag-and-drop affordances in the 2D room, and ensuring the Context Panel and Bounty Board flow logically without overwhelming the screen.

## 3. Thermal Simulation & Heat Transfer
**User Story:** As a player, I want my components to generate and transfer heat realistically, forcing me to consider cooling and physical placement to prevent my servers from thermal throttling or crashing.
**Problem Statement:** Without thermal constraints, there is no physical trade-off in the decision space; players can just cram the most powerful parts into the smallest cases.
**Implementation Details:** 
- **Heat Generation:** Every part generates heat equal to its power draw (1 Watt of power = 1 Watt of heat).
- **Heat Transfer (Cellular Automata):** Heat spreads to adjacent components/grid cells each tick based on conservation of energy.
  - *Draft Formula:* Every tick, a cell transfers a percentage of its thermal energy to its 4 adjacent neighbors based on a conductivity constant $k$, and dissipates a percentage into the ambient room temperature. 
  - $T_{new} = T_{current} + (\text{Watts} \times \text{TickRatio}) - k \times (T_{current} - T_{ambient}) + \sum k \times (T_{neighbor} - T_{current})$
- **Throttling:** When a component's temperature exceeds its designated threshold, its compute output drops. If it hits critical mass, it fails the job.

## 4. Racks, Shelves & Spatial Mechanics
**User Story:** As a player, I want to mount servers into racks or place them on shelves to organize my room and manage heat effectively.
**Problem Statement:** Placing servers in a pile on the floor lacks the infrastructure feel of a true server sim. Players need a compelling mechanical reason to invest in racks over floor-stacking.
**Implementation Details:** 
- **Shelves:** Basic physics furniture. Placing cases on a shelf allows them to be stacked vertically while maintaining adjacent "air" grid cells for heat dissipation.
- **Racks (`RACK` parts):** Industrial server racks with discrete "U" slots (1U, 2U, 4U).
- **The Incentive:** Because of the new heat transfer mechanics (Feature 3), floor-stacked servers will rapidly heat each other up, causing them to thermal throttle. Racks provide forced induction (a massive cooling/dissipation bonus to all installed units), making them mandatory for high-density, high-power compute clusters.

# Things I Pretend to Be an Expert In

## Table of Contents
- [Research Interests](#research-interests)
- [Education](#education)
- [Work Experience](#work-experience)
- [Research Projects](#research-projects)
  - [Hybrid Learning and Optimization methods for solving Capacitated Vehicle Routing Problem](#hybrid-learning-and-optimization-methods-for-solving-capacitated-vehicle-routing-problem)
  - [Cutting Slack Quantum Optimization with Slack Free Methods for Combinatorial Benchmarks](#cutting-slack-quantum-optimizaton-with-slack-free-methods-for-combinatorial-benchmarks)
  - [Adaptive Graph Shrinking for Quantum Optimization of Constrained Combinatorial Problems](#adaptive-graph-shrinking-for-quantum-optimization-of-constrained-combinatorial-problems)
  - [A Comparative Study of Quantum Optimization Techniques for Solving Combinatorial Optimization Benchmark Problems](#a-comparative-study-of-quantum-optimization-techniques-for-solving-combinatorial-optimization-benchmark-problems)
  - [Quantum Monte Carlo Methods for Newsvendor Problem with Multiple Unreliable Suppliers](#quantum-monte-carlo-methods-for-newsvendor-problem-with-multiple-unreliable-suppliers)
  - [Quantum Enhanced Simulation-Based Optimization for Newsvendor Problems](#quantum-enhanced-simulation-based-optimization-for-newsvendor-problems)
  - [Quantum Relaxation for Solving Multiple Knapsack Problems](#quantum-relaxation-for-solving-multiple-knapsack-problems)
- [Quantum Education Work](#quantum-education-work)
  - [Quantum Classroom Website](#quantum-classroom-website)
  - [Medium Blogs](#medium-blogs)
- [Publications](#publications)
- [Media Coverage](#media-coverage)

---

## Research Interests  

Exploring the intersection of quantum computing, optimization, and algorithms to tackle complex computational challenges. My interests include:  

### **Quantum Computing & Optimization**  
- Quantum Algorithms
- Hybrid Quantum-Classical Optimization  
- Quantum Machine Learning  
- Quantum-Assisted Constraint Programming  
- Quantum Error Mitigation & Noise-Aware Computing  

### **Classical & Constraint Optimization**  
- Constraint Programming (CP)  
- Mixed-Integer Programming (MIP)  
- Heuristics & Metaheuristics (Genetic Algorithms, Simulated Annealing)  
- Combinatorial Optimization 
- Integer Linear Programming (ILP)  
- Large-Scale Supply Chain & Logistics Optimization  
- Applications in Finance & Risk Management 

### **Applied & Theoretical Interests**  
- Quantum Applications in Supply Chain & Logistics  
- Benchmarking Quantum vs. Classical Solvers  
- Quantum Advantage & Near-Term Quantum Computing  
- Complexity Theory & Hardness of Approximation  

### **GPU & HPC Integration**  
- Quantum-Classical Hybrid Computing on HPC Clusters  
- GPU-Accelerated Tensor Networks for Quantum Simulations  
- Parallel Computing for Large-Scale Optimization Problems  
- CUDA and TensorFlow Quantum for Quantum Machine Learning  
- Accelerated Quantum Circuit Simulation on Classical Hardware  


---

## Education

| Degree | Field                    | Institution                                               | Date      |
| ------ | ------------------------ | --------------------------------------------------------- | --------- |
| M.S.   | Physics and Data Science | Indian Institute of Science Education and Research Mohali | June 2022 |
| B.S.   | Physics and Data Science | Indian Institute of Science Education and Research Mohali | June 2020 |

---

## Work Experience

**Research Engineer @ School of Computing and Information Systems, Singapore Management University**  
*January 2023 – Present*

- [Hybrid Learning and Optimization methods for solving Capacitated Vehicle Routing Problem](#hybrid-learning-and-optimization-methods-for-solving-capacitated-vehicle-routing-problem)

- [Cutting Slack Quantum Optimization with Slack Free Methods for Combinatorial Benchmarks](#cutting-slack-quantum-optimizaton-with-slack-free-methods-for-combinatorial-benchmarks)

- [Adaptive Graph Shrinking for Quantum Optimization of Constrained Combinatorial Problems](#adaptive-graph-shrinking-for-quantum-optimization-of-constrained-combinatorial-problems)

- [A Comparative Study of Quantum Optimization Techniques for Solving Combinatorial Optimization Benchmark Problems](#a-comparative-study-of-quantum-optimization-techniques-for-solving-combinatorial-optimization-benchmark-problems)

- [Quantum Monte Carlo Methods for Newsvendor Problem with Multiple Unreliable Suppliers](#quantum-monte-carlo-methods-for-newsvendor-problem-with-multiple-unreliable-suppliers)

- [Quantum Enhanced Simulation-Based Optimization for Newsvendor Problems](#quantum-enhanced-simulation-based-optimization-for-newsvendor-problems)

- [Quantum Relaxation for Solving Multiple Knapsack Problems](#quantum-relaxation-for-solving-multiple-knapsack-problems)

---

## Research Projects

### Hybrid Learning and Optimization methods for solving Capacitated Vehicle Routing Problem
**Publication:** [arXiv:2509.15262](https://arxiv.org/abs/2509.15262)  
**Code:** [SMU-Quantum/Hybrid-Learning-and-Optimization](https://github.com/SMU-Quantum/adaptive_quantum_cvrp) 

- **Overview:** Proposes a **hybrid ALM framework** where deep reinforcement learning (SAC) automatically tunes penalty parameters for the Augmented Lagrangian Method in both purely classical (**RL-C-ALM**) and quantum-enhanced (**RL-Q-ALM**) variants to solve the Capacitated Vehicle Routing Problem (CVRP).

- **Framework:**
  - Define four solvers: **C-ALM** (classical baseline), **RL-C-ALM** (RL-tuned penalties/multipliers), **Q-ALM** (ALM with QUBO subproblems solved by VQE/QAOA), and **RL-Q-ALM** (RL-guided penalties within the quantum-augmented loop).
  - CVRP modeled via three-index vehicle-flow ILP with MTZ subtour elimination; ALM enforces routing, capacity, and flow constraints.

- **Techniques:**
  - **RL policy (Soft Actor-Critic):** maps instance features + violation signals → penalty parameters \((\rho,\sigma)\) to accelerate convergence and feasibility.
  - **Quantum backend:** encode selected subproblems as QUBO → Ising Hamiltonian → solve via **VQE** (hardware-efficient EfficientSU2 ansatz); decode bitstrings to routes.

- **Datasets & Evaluation:**
  - Benchmarks on synthetic and standard CVRP sets; compare solution quality, feasibility, iterations/convergence, and runtime across C-ALM, RL-C-ALM, Q-ALM, RL-Q-ALM.

- **Results:**
  - **RL-C-ALM** outperforms manually tuned ALM: better solutions with fewer iterations.
  - **RL-Q-ALM** matches classical solution quality on small instances but incurs higher runtime due to quantum overhead; demonstrates feasibility of learning-guided quantum integration.
  - Shows that **learning-driven penalty selection** is a practical lever for scalable ALM, with quantum modules giving hybrid pipeline viability.

- **Takeaway:**  
  RL-guided ALM automates penalty tuning and improves classical CVRP solving; a quantum-augmented variant is viable on small scales, pointing toward **adaptive hybrid optimization** as hardware and ansätze improve.





### Cutting Slack Quantum Optimization with Slack Free Methods for Combinatorial Benchmarks 
**Publication:** [arXiv:2507.12159](https://arxiv.org/abs/2507.12159) \
**Code:** [SMU-Quantum/Cutting-Slack](https://github.com/SMU-Quantum/cutting_slack) 


- **Overview:** Introduces **slack‑free Lagrangian-based methods**—including dual ascent, bundle methods, cutting planes, and augmented Lagrangian—to enforce constraints in QUBO formulations without introducing slack variables.

- **Framework:**  
  - Dualizes constraints via Lagrange multipliers and uses iterative updates (subgradient, bundle, cutting‑plane, augmented Lagrangian) to embed constraints directly into the optimization objective.  
- **Target Problems:**  
  - **TSP:** Applies Held–Karp relaxation to eliminate degree‑constraint slack variables.  
  - **MDKP:** Inequality constraints allow slack‑free encoding, reducing QUBO size.  
  - **MIS:** Even without slack-variable elimination, Lagrangian updates enhance feasibility and solution quality.  
- **Techniques:**  
  - Implements multiple dual-update strategies—subgradient, bundle, cutting-plane, and augmented Lagrangian—on quantum simulators and hardware.  
  - Benchmarks constraint handling via Lagrangian methods vs. traditional slack-augmented QUBO.  
- **Results:**  
  - **Qubit savings:** Significant reductions for TSP and MDKP through slack elimination.  
  - **Feasibility & performance:** Maintained or improved solution quality; MIS also benefits from constraint handling despite no qubit reduction.  
  - Demonstrates Lagrangian formulations as a scalable, resource-efficient alternative to penalty/sack-variable approaches.  

---




### Adaptive Graph Shrinking for Quantum Optimization of Constrained Combinatorial Problems  
**Publication:** [arXiv:2506.14250](https://arxiv.org/abs/2506.14250)

- **Overview:** Proposes a hybrid classical–quantum framework to tackle large constrained combinatorial optimization problems on quantum hardware by intelligently reducing problem size.
- **Framework:** Introduces **constraint-aware graph shrinking**, a verification-and-repair pipeline, and **adaptive strategies** (e.g., correlation recalculation and spectral stopping criteria) to compress QUBO instances while preserving problem structure.
- **Target Problems:** Applies the method to benchmark problems including the Multi-Dimensional Knapsack Problem (MDKP), Maximum Independent Set (MIS), and Quadratic Assignment Problem (QAP) using QUBO-to-Max-Cut transformations.
- **Techniques:** Leverages semidefinite programming (SDP)-based correlation matrices and graph neural network–inspired merging heuristics to adaptively coarsen the graph.
- **Results:** Achieves **40–80% qubit count reduction**, with minimal or no loss in solution quality and strong feasibility retention, on both simulated and quantum hardware instances.

---



### A Comparative Study of Quantum Optimization Techniques for Solving Combinatorial Optimization Benchmark Problems
**Publication:** [arXiv:2503.12121](https://arxiv.org/abs/2503.12121) \
**Code:** [SMU-Quantum/Algorithms](https://github.com/SMU-Quantum/quantum-optimization-algorithms) \
 [SMU-Quantum/Benchmarks](https://github.com/SMU-Quantum/quantum-optimization-benchmarks)

- **Overview:** Quantum optimization holds promise for addressing classically intractable combinatorial problems, yet a standardized benchmarking framework is still lacking.
- **Framework:** Introduces a comprehensive approach to evaluate quantum optimization techniques against NP-hard problems such as the Multi-Dimensional Knapsack Problem (MDKP), Maximum Independent Set (MIS), Quadratic Assignment Problem (QAP), and Market Share Problem (MSP).
- **Techniques:** Benchmarks gate-based approaches like the Variational Quantum Eigensolver (VQE) and its CVaR variant, alongside advanced methods such as the Quantum Approximate Optimization Algorithm (QAOA) and its extensions.
- **Additional Methods:** Incorporates qubit compression techniques like Pauli Correlation Encoding (PCE) and Quantum Random Access Optimization (QRAO).
- **Results:** Provides insights into feasibility, optimality gaps, and scalability based on experiments with simulated quantum environments and classical solvers.

---

### Quantum Monte Carlo Methods for Newsvendor Problem with Multiple Unreliable Suppliers
**Publication:** [arXiv:2409.07183](https://arxiv.org/abs/2409.07183)

- **Overview:** Addresses the challenges in inventory management amid increased supply chain uncertainties in a post-pandemic world.
- **Focus:** Integrates decision-makers' risk preferences into the classic newsvendor model.
- **Technique:** Utilizes Quantum Monte Carlo (QMC) combined with Quantum Amplitude Estimation (QAE) for efficient probability and expectation value estimation—offering a near-quadratic speedup over classical methods.
- **Impact:** Illuminates the link between risk-aware decision-making and inventory management, contributing to enhanced supply chain resilience.

---

### Quantum Enhanced Simulation-Based Optimization for Newsvendor Problems
**Publication:** [IEEE Xplore](https://ieeexplore.ieee.org/document/10821393) (Poster Presented at QIP2023)

- **Overview:** Utilizes a maximum profit formulation for the Newsvendor Problem to broaden its applicability beyond traditional minimal loss approaches.
- **Innovation:** Employs Quantum Generative Adversarial Networks (qGANs) to model unknown demand distributions, creating more realistic scenarios.
- **Improvement:** Introduces a new comparison operator that reduces the number of qubits required in the simulation circuit.

---

### Quantum Relaxation for Solving Multiple Knapsack Problems
**Publication:** [IEEE Xplore](https://ieeexplore.ieee.org/document/10821401)

- **Overview:** Investigates the effectiveness of Quantum Random Access Optimization (QRAO) in tackling complex constrained supply chain issues.
- **Application:** Demonstrates the solution of a Multiple Knapsack Problem (MKP) using QRAO combined with classical methods like Linear Relaxation (LR) on a real-world risk-aware procurement optimization problem involving over 100 variables.
- **Insight:** Highlights the potential of integrating quantum relaxation techniques with traditional optimization methods to enhance problem-solving capabilities.

---

## Code & Repositories

- **SMU-Quantum**  
  Explore our collaborative projects on quantum computing at SMU.  
  [GitHub Repository](https://github.com/SMU-Quantum)

---

## Quantum Education Work

### Quantum Classroom Website
**Learning Material**

A website offering free resources to learn quantum computing, featuring both original content and contributions from the quantum computing community.  
[Visit Website](https://monitsharma.github.io)  
![Website](assets/imgs/website.png)

---

### Medium Blogs
**Educational Outreach**

Regular blogs covering recent quantum computing papers, coding tutorials, and practical exercises.  
[View Blogs](https://medium.com/@_monitsharma)  
![Medium Blogs](assets/imgs/medium.png)

---

## Publications

- **M. Sharma and H. C. Lau**
  *Hybrid Learning and Optimization methods for solving Capacitated Vehicle Routing Problem*
  **arXiv preprint**, [arXiv:2509.15262](https://arxiv.org/abs/2509.15262) (2025)

- **M. Sharma and H. C. Lau**  
  *Cutting Slack: Quantum Optimization with Slack‑Free Methods for Combinatorial Benchmarks*  
  **arXiv preprint**, [arXiv:2507.12159](https://arxiv.org/abs/2507.12159) (2025)

- **M. Sharma and H. C. Lau**  
  *Adaptive Graph Shrinking for Quantum Optimization of Constrained Combinatorial Problems*  
  arXiv preprint, [arXiv:2506.14250](https://arxiv.org/abs/2506.14250) (2025)  

- **M. Sharma and H. C. Lau**  
  *A Comparative Study of Quantum Optimization Techniques for Solving Combinatorial Optimization Benchmark Problems*  
  arXiv preprint, [arXiv:2503.12121](https://arxiv.org/abs/2503.12121) (2025)

- **M. Sharma and H. C. Lau**  
  *Quantum Monte Carlo Methods for Newsvendor Problem with Multiple Unreliable Suppliers*  
  arXiv preprint, [arXiv:2409.07183](https://arxiv.org/abs/2409.07183) (2024)

- **M. Sharma, Y. Jin, H. C. Lau, and R. Raymond**  
  *Quantum Relaxation for Solving Multiple Knapsack Problems*  
  Proceedings of the 2024 IEEE International Conference on Quantum Computing and Engineering (QCE), Montreal, QC, Canada, pp. 692–698.  
  [DOI: 10.1109/QCE60285.2024.00086](https://doi.org/10.1109/QCE60285.2024.00086)

- **M. Sharma, H. C. Lau, and R. Raymond**  
  *Quantum Enhanced Simulation-Based Optimization for Newsvendor Problems*  
  Proceedings of the 2024 IEEE International Conference on Quantum Computing and Engineering (QCE), Montreal, QC, Canada, pp. 457–468.  
  [DOI: 10.1109/QCE60285.2024.00060](https://doi.org/10.1109/QCE60285.2024.00060)

---

## Media Coverage

- **Celebrating Excellence: SMU Honours Four Research Staff Supporting Key Research**  
  [Read Article](https://news.smu.edu.sg/news/2024/11/29/celebrating-excellence-smu-honours-four-research-staff-supporting-key-research)

- **Quantum Computing: Marathon Not a Sprint**  
  [Read Article](https://research.smu.edu.sg/news/2025/feb/quantum-computing-marathon-not-sprint)

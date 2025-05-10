# Disease Spread Simulation

An interactive web-based simulation of disease spread through a social network using the SIR (Susceptible-Infected-Recovered) model.

## Features

- Interactive network visualization using D3.js
- Real-time simulation of disease spread
- Adjustable parameters:
  - Network size
  - Initial infected count
  - Infection rate
  - Recovery rate
- Force-directed graph layout
- Step-by-step or automatic simulation
- Real-time statistics
- Responsive design

## Requirements

- Python 3.7+
- Flask
- NetworkX
- NumPy
- Pandas
- SciPy

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd disease-spread-simulation
```

2. Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the Flask server:
```bash
python app.py
```

2. Open your web browser and navigate to:
```
http://localhost:5000
```

3. Use the control panel to:
   - Set the number of nodes in the network
   - Choose the number of initially infected individuals
   - Adjust infection and recovery rates
   - Initialize the simulation
   - Run the simulation step by step or automatically

## How It Works

The simulation uses the SIR model to simulate disease spread through a synthetic social network. The network is generated using the Watts-Strogatz model, which creates a small-world network that approximates real-world social connections.

- **Susceptible** (Blue): Individuals who can be infected
- **Infected** (Red): Individuals who are currently infected
- **Recovered** (Green): Individuals who have recovered and are immune

The simulation takes into account:
- Network structure
- Infection probability between connected individuals
- Recovery probability for infected individuals

## Contributing

Feel free to submit issues and enhancement requests! 
from flask import Flask, render_template, request, jsonify
import networkx as nx
import numpy as np
import random
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Global variables for simulation state
simulation_state = None
network = None

def generate_network(num_nodes, edge_probability):
    """Generate a random network using the Erdős-Rényi model."""
    G = nx.erdos_renyi_graph(num_nodes, edge_probability)
    return G

def calculate_network_metrics(G):
    """Calculate various network metrics."""
    metrics = {}
    
    # Average degree
    metrics['average_degree'] = sum(dict(G.degree()).values()) / G.number_of_nodes()
    
    # Clustering coefficient
    metrics['clustering_coefficient'] = nx.average_clustering(G)
    
    # Average path length (only for connected components)
    try:
        metrics['average_path_length'] = nx.average_shortest_path_length(G)
    except nx.NetworkXError:
        # If the graph is not connected, calculate for the largest component
        largest_cc = max(nx.connected_components(G), key=len)
        metrics['average_path_length'] = nx.average_shortest_path_length(G.subgraph(largest_cc))
    
    return metrics

def initialize_simulation(num_nodes, initial_infected, edge_probability):
    """Initialize the simulation with a new network and initial state."""
    global network, simulation_state
    
    # Generate network
    network = generate_network(num_nodes, edge_probability)
    
    # Calculate initial network metrics
    network_metrics = calculate_network_metrics(network)
    
    # Initialize state
    all_nodes = set(network.nodes())
    infected = set(random.sample(list(all_nodes), initial_infected))
    susceptible = all_nodes - infected
    recovered = set()
    
    simulation_state = {
        'time': 0,
        'susceptible': list(susceptible),
        'infected': list(infected),
        'recovered': list(recovered),
        'network_metrics': network_metrics
    }
    
    return simulation_state

def run_simulation_step(infection_rate, recovery_rate):
    """Run one step of the simulation."""
    if simulation_state is None:
        raise ValueError("Simulation not initialized")
    
    # Convert sets for easier manipulation
    susceptible = set(simulation_state['susceptible'])
    infected = set(simulation_state['infected'])
    recovered = set(simulation_state['recovered'])
    
    # Handle infections
    new_infected = set()
    for node in infected:
        # Get susceptible neighbors
        neighbors = set(network.neighbors(node)) & susceptible
        # Each susceptible neighbor has a chance to get infected
        for neighbor in neighbors:
            if random.random() < infection_rate:
                new_infected.add(neighbor)
                # Remove from susceptible immediately to prevent double infection
                susceptible.remove(neighbor)
    
    # Handle recoveries
    new_recovered = set()
    for node in infected:
        if random.random() < recovery_rate:
            new_recovered.add(node)
    
    # Update state
    infected = (infected | new_infected) - new_recovered
    recovered |= new_recovered
    
    # Calculate new network metrics
    network_metrics = calculate_network_metrics(network)
    
    # Update simulation state
    simulation_state['time'] += 1
    simulation_state['susceptible'] = list(susceptible)
    simulation_state['infected'] = list(infected)
    simulation_state['recovered'] = list(recovered)
    simulation_state['network_metrics'] = network_metrics
    
    return simulation_state

def convert_to_serializable(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, set):
        return list(obj)
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    return obj

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/initialize', methods=['POST'])
def initialize():
    try:
        data = request.get_json()
        num_nodes = int(data.get('num_nodes', 1000))
        initial_infected = int(data.get('initial_infected', 5))
        edge_probability = float(data.get('edge_probability', 0.005))
        
        if num_nodes < 100 or num_nodes > 5000:
            raise ValueError("Number of nodes must be between 100 and 5000")
        if initial_infected < 1 or initial_infected > 50:
            raise ValueError("Initial infected nodes must be between 1 and 50")
        if edge_probability < 0.001 or edge_probability > 0.01:
            raise ValueError("Edge probability must be between 0.001 and 0.01")
        
        state = initialize_simulation(num_nodes, initial_infected, edge_probability)
        
        # Prepare network data for visualization
        network_data = {
            'nodes': [{'id': node} for node in network.nodes()],
            'links': [{'source': source, 'target': target} for source, target in network.edges()]
        }
        
        return jsonify({
            'state': convert_to_serializable(state),
            'network': convert_to_serializable(network_data)
        })
    except Exception as e:
        logging.error(f"Error in initialize: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/step', methods=['POST'])
def step():
    try:
        data = request.get_json()
        infection_rate = float(data.get('infection_rate', 0.3))
        recovery_rate = float(data.get('recovery_rate', 0.1))
        
        if infection_rate < 0.1 or infection_rate > 1.0:
            raise ValueError("Infection rate must be between 0.1 and 1.0")
        if recovery_rate < 0.1 or recovery_rate > 1.0:
            raise ValueError("Recovery rate must be between 0.1 and 1.0")
        
        state = run_simulation_step(infection_rate, recovery_rate)
        return jsonify({'state': convert_to_serializable(state)})
    except Exception as e:
        logging.error(f"Error in step: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 
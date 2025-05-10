// Global variables
let simulation = null;
let autoRunInterval = null;
let svg = null;
let simulationState = null;
let nodes = null;  // Store nodes reference globally
let links = null;
let zoom = null;   // Store zoom behavior
let lastInfectedNodes = new Set();  // Track newly infected nodes
let infectionAnimationTimeout = null;

// Initialize D3 force simulation
function initializeVisualization(data) {
    console.log('Initializing visualization with data:', data);
    
    if (!data || !data.nodes || !data.links) {
        console.error('Invalid network data received:', data);
        return;
    }
    
    const width = document.getElementById('network-visualization').clientWidth;
    const height = document.getElementById('network-visualization').clientHeight;
    
    console.log('Visualization container dimensions:', { width, height });

    // Clear previous visualization
    d3.select('#network-visualization').selectAll('*').remove();

    // Create SVG
    svg = d3.select('#network-visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Create a group for all elements
    const g = svg.append('g');

    // Get node size and link distance from controls
    const nodeSize = parseFloat(document.getElementById('node-size').value);
    const linkDistance = parseFloat(document.getElementById('link-distance').value);

    // Create force simulation with optimized forces
    simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(linkDistance).strength(0.2))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(nodeSize * 2))
        .alphaDecay(0.02);  // Faster decay for better performance

    // Create links
    links = g.append('g')
        .selectAll('line')
        .data(data.links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .style('stroke', '#4a4a4a')
        .style('stroke-opacity', 0.4)
        .style('stroke-width', 1);

    // Create nodes
    nodes = g.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', nodeSize)
        .style('fill', '#3498db')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add zoom controls
    const zoomControls = d3.select('.visualization-container')
        .append('div')
        .attr('class', 'zoom-controls');

    zoomControls.append('button')
        .text('+')
        .on('click', () => {
            svg.transition()
                .duration(300)
                .call(zoom.scaleBy, 1.3);
        });

    zoomControls.append('button')
        .text('-')
        .on('click', () => {
            svg.transition()
                .duration(300)
                .call(zoom.scaleBy, 0.7);
        });

    zoomControls.append('button')
        .text('⟲')
        .on('click', () => {
            svg.transition()
                .duration(300)
                .call(zoom.transform, d3.zoomIdentity);
        });

    // Update positions on each tick
    simulation.on('tick', () => {
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    });

    console.log('Visualization initialized');
}

// Update node colors based on state with optimized animations
function updateVisualization(state) {
    console.log('Updating visualization with state:', state);
    
    if (!state || !state.susceptible || !state.infected || !state.recovered) {
        console.error('Invalid state data received:', state);
        return;
    }

    // Find newly infected nodes
    const currentInfected = new Set(state.infected);
    const newlyInfected = new Set([...currentInfected].filter(x => !lastInfectedNodes.has(x)));
    lastInfectedNodes = currentInfected;

    // Update node colors with optimized animations
    nodes.each(function(d) {
        const node = d3.select(this);
        const isNewlyInfected = newlyInfected.has(d.id);
        const isInfected = state.infected.includes(d.id);
        const isRecovered = state.recovered.includes(d.id);

        if (isNewlyInfected) {
            // Quick pulse animation for new infections
            node.transition()
                .duration(200)
                .style('fill', '#e74c3c')
                .attr('r', parseFloat(document.getElementById('node-size').value) * 1.5)
                .transition()
                .duration(200)
                .attr('r', parseFloat(document.getElementById('node-size').value));
        } else if (isInfected) {
            node.style('fill', '#e74c3c');
        } else if (isRecovered) {
            node.style('fill', '#2ecc71');
        } else {
            node.style('fill', '#3498db');
        }
    });

    // Update statistics
    document.getElementById('time-step').textContent = state.time;
    document.getElementById('susceptible-count').textContent = state.susceptible.length;
    document.getElementById('infected-count').textContent = state.infected.length;
    document.getElementById('recovered-count').textContent = state.recovered.length;
    
    console.log('Visualization updated');
}

// Drag functions for interactive nodes
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Event Listeners
document.getElementById('initialize-btn').addEventListener('click', async () => {
    try {
        const numNodes = parseInt(document.getElementById('num-nodes').value);
        const initialInfected = parseInt(document.getElementById('initial-infected').value);
        const edgeProbability = parseFloat(document.getElementById('edge-probability').value);
        
        if (isNaN(numNodes) || isNaN(initialInfected) || isNaN(edgeProbability)) {
            throw new Error('Invalid input values');
        }
        
        console.log('Initializing simulation with:', { numNodes, initialInfected, edgeProbability });
        
        const response = await fetch('/api/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                num_nodes: numNodes,
                initial_infected: initialInfected,
                edge_probability: edgeProbability
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received initialization data:', data);
        
        if (!data.network || !data.state) {
            throw new Error('Invalid response data received');
        }
        
        simulationState = data.state;
        initializeVisualization(data.network);
        updateVisualization(simulationState);
        
        // Enable step and auto buttons
        document.getElementById('step-btn').disabled = false;
        document.getElementById('auto-btn').disabled = false;
    } catch (error) {
        console.error('Error initializing simulation:', error);
        alert(`Error initializing simulation: ${error.message}`);
    }
});

document.getElementById('step-btn').addEventListener('click', async () => {
    try {
        const infectionRate = parseFloat(document.getElementById('infection-rate').value);
        const recoveryRate = parseFloat(document.getElementById('recovery-rate').value);
        
        const response = await fetch('/api/step', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                infection_rate: infectionRate,
                recovery_rate: recoveryRate
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        simulationState = data.state;
        updateVisualization(simulationState);
    } catch (error) {
        console.error('Error running simulation step:', error);
        alert(`Error running simulation step: ${error.message}`);
    }
});

document.getElementById('auto-btn').addEventListener('click', function() {
    if (autoRunInterval) {
        clearInterval(autoRunInterval);
        autoRunInterval = null;
        this.textContent = 'Auto Run';
        this.classList.remove('btn-danger');
        this.classList.add('btn-warning');
    } else {
        const speed = parseInt(document.getElementById('simulation-speed').value);
        autoRunInterval = setInterval(async () => {
            try {
                const infectionRate = parseFloat(document.getElementById('infection-rate').value);
                const recoveryRate = parseFloat(document.getElementById('recovery-rate').value);
                
                const response = await fetch('/api/step', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        infection_rate: infectionRate,
                        recovery_rate: recoveryRate
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                simulationState = data.state;
                updateVisualization(simulationState);
                
                // Stop if no more infected nodes
                if (data.state.infected.length === 0) {
                    clearInterval(autoRunInterval);
                    autoRunInterval = null;
                    this.textContent = 'Auto Run';
                    this.classList.remove('btn-danger');
                    this.classList.add('btn-warning');
                }
            } catch (error) {
                console.error('Error in auto run:', error);
                clearInterval(autoRunInterval);
                autoRunInterval = null;
                this.textContent = 'Auto Run';
                this.classList.remove('btn-danger');
                this.classList.add('btn-warning');
                alert(`Error in auto run: ${error.message}`);
            }
        }, speed);
        
        this.textContent = 'Stop';
        this.classList.remove('btn-warning');
        this.classList.add('btn-danger');
    }
});

// Update range input values
document.getElementById('infection-rate').addEventListener('input', function() {
    document.getElementById('infection-rate-value').textContent = this.value;
});

document.getElementById('recovery-rate').addEventListener('input', function() {
    document.getElementById('recovery-rate-value').textContent = this.value;
});

document.getElementById('edge-probability').addEventListener('input', function() {
    document.getElementById('edge-probability-value').textContent = this.value;
});

document.getElementById('node-size').addEventListener('input', function() {
    document.getElementById('node-size-value').textContent = this.value;
    if (nodes) {
        nodes.attr('r', this.value);
    }
});

document.getElementById('link-distance').addEventListener('input', function() {
    document.getElementById('link-distance-value').textContent = this.value;
    if (simulation) {
        simulation.force('link').distance(parseFloat(this.value));
        simulation.alpha(0.3).restart();
    }
});

document.getElementById('simulation-speed').addEventListener('input', function() {
    document.getElementById('simulation-speed-value').textContent = this.value + 'ms';
});

// Handle window resize
window.addEventListener('resize', () => {
    if (svg) {
        const width = document.getElementById('network-visualization').clientWidth;
        const height = document.getElementById('network-visualization').clientHeight;
        
        svg.attr('width', width)
           .attr('height', height);
        
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
    }
}); 
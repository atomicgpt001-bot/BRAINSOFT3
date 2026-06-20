// True 3D WebGL Neural Graph Visualization using 3d-force-graph
const graphContainer = document.getElementById('graph-container');

let graphData = {
    nodes: [
        { id: "YO", group: 0, color: "#ffffff" }
    ],
    links: []
};

window.recentNodes = [];

// Initialize 3D Graph
window.Graph = ForceGraph3D()(graphContainer)
    .width(graphContainer.clientWidth || 800)
    .height(graphContainer.clientHeight || 600)
    .graphData(graphData)
    .nodeId('id')
    .nodeLabel(node => {
        // Only show the last part of the ID for cleaner labels
        const parts = node.id.split('_');
        return parts[parts.length - 1];
    })
    .backgroundColor('#00000000') // Transparent to show CSS background
    .nodeColor(node => {
        if (node.id === "YO") return "#ffffff";
        if (window.recentNodes.includes(node.id)) return "#00ffcc";
        return node.color || "#cccccc";
    })
    .nodeRelSize(4)
    .nodeResolution(16)
    .linkColor(link => {
        if (window.recentNodes.includes(link.source.id) || window.recentNodes.includes(link.target.id)) {
            return "rgba(0, 255, 204, 0.8)"; // Accent color for active paths
        }
        return "rgba(255, 255, 255, 0.1)"; // Very subtle resting links
    })
    .linkWidth(link => {
        if (window.recentNodes.includes(link.source.id) || window.recentNodes.includes(link.target.id)) {
            return 3;
        }
        return 0.5;
    })
    .linkDirectionalParticles(link => {
        if (window.recentNodes.includes(link.source.id) || window.recentNodes.includes(link.target.id)) {
            return 6; // More particles for active paths
        }
        return 1; // Constant slow flow
    })
    
    .linkDirectionalParticleWidth(1.5);

Graph.d3Force('charge').strength(-300);
Graph.d3Force('link').distance(80);

    .linkDirectionalParticleSpeed(d => d.value * 0.002 || 0.005)
    .onNodeClick(node => {
        if (node.group === 3) { // File node
            const parts = node.id.split('_');
            const neurona = parts[0];
            const rama = parts[1];
            const fileName = parts.slice(2).join('_');
            if (window.fetchNodeSummary) {
                window.fetchNodeSummary(neurona, rama, fileName);
            }
        }
        // Focus camera on node
        const distance = 100;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node, 
            3000
        );
    });

window.focusNodeInGraph = function(nodeId) {
    const node = graphData.nodes.find(n => n.id === nodeId || n.id.endsWith(`_${nodeId}`));
    if (node && node.x !== undefined) {
        const distance = 150;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node, 
            2000
        );
    }
};

// Make "YO" bigger and others proportional
Graph.nodeVal(node => {
    if (node.id === "YO") return 25;
    if (node.group === 1) return 15; // Neurona
    if (node.group === 2) return 10; // Rama
    if (node.group === 4) return 6; // Chat Msg
    return 5; // Nodo File
});

// 2026 Physics: Expansive and Fluid
Graph.d3Force('charge').strength(-400); // Stronger repulsion for a massive void feel
Graph.d3Force('link').distance(60); // Tighter links to balance repulsion

function updateGraph() {
    Graph.graphData(graphData);
}

// Global API to add nodes from renderer
window.addNeuralNode = function(neurona, rama, color) {
    let neuronaNode = graphData.nodes.find(n => n.id === neurona);
    if (!neuronaNode) {
        neuronaNode = { id: neurona, group: 1, color: color };
        graphData.nodes.push(neuronaNode);
        graphData.links.push({ source: "YO", target: neurona, color: color });
    }

    if (rama) {
        const ramaId = `${neurona}_${rama}`;
        if (!graphData.nodes.find(n => n.id === ramaId)) {
            graphData.nodes.push({ id: ramaId, group: 2, color: color });
            graphData.links.push({ source: neurona, target: ramaId, color: color });
        }
    }
    updateGraph();
};

window.addEventListener('resize', () => {
    Graph.width(graphContainer.clientWidth);
    Graph.height(graphContainer.clientHeight);
});

window.clearGraph = function() {
    graphData.nodes = [{ id: "YO", group: 0, color: "#ffffff" }];
    graphData.links = [];
    updateGraph();
};

let lastMsgNodeId = null;

window.addChatMessageNode = function(text, isUser, contextRama) {
    const msgId = `msg_${Date.now()}`;
    const color = isUser ? "#ff00ff" : "#00ffcc";
    
    // Add the message node (Group 4 for messages)
    graphData.nodes.push({ id: msgId, group: 4, color: color, name: text.substring(0, 20) + "..." });
    
    // Link to previous message if exists, otherwise link to the current context Rama
    if (lastMsgNodeId) {
        graphData.links.push({ source: lastMsgNodeId, target: msgId, color: "rgba(255,255,255,0.3)" });
    } else if (contextRama) {
        graphData.links.push({ source: contextRama, target: msgId, color: "rgba(255,255,255,0.3)" });
    } else {
        graphData.links.push({ source: "YO", target: msgId, color: "rgba(255,255,255,0.3)" });
    }
    
    lastMsgNodeId = msgId;
    updateGraph();
    window.focusNodeInGraph(msgId);
};

window.renderGlobalGraph = function(vaultStructure) {
    window.clearGraph();
    const colors = ["#00ffcc", "#ff00ff", "#ffff00", "#ff3333", "#ff9900", "#0066ff"];
    let colorIndex = 0;

    vaultStructure.forEach(neuronaObj => {
        const neuronaColor = colors[colorIndex % colors.length];
        colorIndex++;
        
        const topicName = neuronaObj.topic || "Unknown";
        graphData.nodes.push({ id: topicName, group: 1, color: neuronaColor });
        graphData.links.push({ source: "YO", target: topicName, color: neuronaColor });

        if (neuronaObj.files && neuronaObj.files.length > 0) {
            neuronaObj.files.forEach(fileName => {
                const fileNodeId = `${topicName}_${fileName}`;
                graphData.nodes.push({ id: fileNodeId, group: 3, color: neuronaColor });
                graphData.links.push({ source: topicName, target: fileNodeId, color: neuronaColor });
            });
        }
    });
    
    updateGraph();
    
    setTimeout(() => {
        Graph.zoomToFit(1000, 50);
    }, 1500);
};

window.highlightPath = function(targetId) {
    if (!window.recentNodes.includes(targetId)) {
        window.recentNodes.push(targetId);
        if (window.recentNodes.length > 5) window.recentNodes.shift();
    }
    
    const parts = targetId.split('_');
    let cumulative = "";
    parts.forEach(part => {
        cumulative = cumulative ? `${cumulative}_${part}` : part;
        if (!window.recentNodes.includes(cumulative)) {
            window.recentNodes.push(cumulative);
        }
    });

    // Refresh visuals
    Graph
      .nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .nodeVal(Graph.nodeVal())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
};

window.resetHighlight = function() {
    Graph
      .nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .nodeVal(Graph.nodeVal())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
};

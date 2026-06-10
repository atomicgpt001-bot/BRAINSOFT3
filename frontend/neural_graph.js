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
const Graph = ForceGraph3D()(graphContainer)
    .width(graphContainer.clientWidth || 800)
    .height(graphContainer.clientHeight || 600)
    .graphData(graphData)
    .nodeId('id')
    .nodeLabel('id')
    .backgroundColor('#00000000') // Transparent to show CSS background
    .nodeColor(node => {
        if (node.id === "YO") return "#ffffff";
        if (window.recentNodes.includes(node.id)) return "#00ffcc";
        return node.color || "#cccccc";
    })
    .nodeRelSize(6)
    .nodeResolution(32)
    .linkColor(link => {
        if (window.recentNodes.includes(link.source.id) || window.recentNodes.includes(link.target.id)) {
            return "#ffffff";
        }
        return link.color || "#333333";
    })
    .linkWidth(link => {
        if (window.recentNodes.includes(link.source.id) || window.recentNodes.includes(link.target.id)) {
            return 2;
        }
        return 0.5;
    })
    .linkDirectionalParticles(link => {
        if (window.recentNodes.includes(link.source.id) || window.recentNodes.includes(link.target.id)) {
            return 4;
        }
        return 0;
    })
    .linkDirectionalParticleSpeed(d => d.value * 0.001 || 0.01)
    .onNodeClick(node => {
        if (node.group === 2) { // File node
            const parts = node.id.split('_');
            const topic = parts[0];
            const fileName = parts.slice(1).join('_');
            if (window.fetchNodeSummary) {
                window.fetchNodeSummary(topic, fileName);
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
    const node = graphData.nodes.find(n => n.id === nodeId);
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

// Make "YO" slightly bigger
Graph.nodeVal(node => node.id === "YO" ? 20 : (window.recentNodes.includes(node.id) ? 10 : 5));

function updateGraph() {
    Graph.graphData(graphData);
}

// Global API to add nodes from renderer
window.addNeuralNode = function(topic, title, color) {
    let topicNode = graphData.nodes.find(n => n.id === topic);
    if (!topicNode) {
        topicNode = { id: topic, group: 1, color: color };
        graphData.nodes.push(topicNode);
        graphData.links.push({ source: "YO", target: topic, color: color });
    }

    if (title) {
        const fileNodeId = `${topic}_${title}`;
        if (!graphData.nodes.find(n => n.id === fileNodeId)) {
            graphData.nodes.push({ id: fileNodeId, group: 2, color: color });
            graphData.links.push({ source: topic, target: fileNodeId, color: color });
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

window.renderGlobalGraph = function(vaultStructure) {
    window.clearGraph();
    const colors = ["#00ffcc", "#ff00ff", "#ffff00", "#ff3333", "#ff9900", "#0066ff"];
    let colorIndex = 0;

    vaultStructure.forEach(item => {
        const topicColor = colors[colorIndex % colors.length];
        colorIndex++;
        
        graphData.nodes.push({ id: item.topic, group: 1, color: topicColor });
        graphData.links.push({ source: "YO", target: item.topic, color: topicColor });

        if (item.files && item.files.length > 0) {
            item.files.forEach(fileName => {
                const fileNodeId = `${item.topic}_${fileName}`;
                graphData.nodes.push({ id: fileNodeId, group: 2, color: topicColor });
                graphData.links.push({ source: item.topic, target: fileNodeId, color: topicColor });
            });
        }
    });
    
    
    updateGraph();
    
    // Auto-center camera after physics settle
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
    if (parts.length > 1 && !window.recentNodes.includes(parts[0])) {
        window.recentNodes.push(parts[0]);
    }

    // Refresh visuals
    Graph
      .nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .nodeVal(Graph.nodeVal())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
};

window.resetHighlight = function() {
    // We let the recentNodes array keep its contents to show a history trail
    // So resetHighlight doesn't actually wipe them out, it just forces a re-render
    Graph
      .nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .nodeVal(Graph.nodeVal())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
};

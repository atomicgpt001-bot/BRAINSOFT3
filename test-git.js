const { execSync } = require('child_process');
try {
    const stdout = execSync('git log --format="%an|%ad" --date=short').toString();
    const lines = stdout.split('\n').filter(l => l.trim() !== '');
    const authorStats = {};
    
    lines.forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const author = parts[0].trim();
            const date = parts[1].trim();
            
            if (!authorStats[author]) {
                authorStats[author] = { name: author, commits: 0, lastCommit: date };
            }
            authorStats[author].commits += 1;
            if (!authorStats[author].lastCommit) {
                authorStats[author].lastCommit = date;
            }
        }
    });
    
    const statsArray = Object.values(authorStats).sort((a, b) => b.commits - a.commits);
    console.log(statsArray);
} catch (e) {
    console.error(e);
}

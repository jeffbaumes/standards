d3.csv("GraphData-EdgesOnly-Grade-00-08-2011-06-01-cleaned - EdgeSet.csv", function(data) {
    var grades = [];
    for (var g = 0; g <= 8; ++g) {
        grades.push([]);
    }

    var nodeMap = {};
    var nodes = [];
    var links = [];

    function ensureNode(name) {
        if (nodeMap[name] === undefined) {
            nodes.push({name: name});
            var grade = +name.split(".")[0];
            grades[grade].push(nodes[nodes.length - 1]);
            nodeMap[name] = nodes[nodes.length - 1];
        }
    }

    for (var i = 0; i < data.length; ++i) {
        var d = data[i];
        ensureNode(d.Begin);
        ensureNode(d.End);
        links.push({source: nodeMap[d.Begin], target: nodeMap[d.End], type: d.EdgeDesc});
        if (d.EdgeDesc === "Nondirectional link") {
            links.push({source: nodeMap[d.End], target: nodeMap[d.Begin], type: d.EdgeDesc});
        }
    }
    console.log(nodes);
    console.log(links);
    console.log(grades);

    var fillScale = d3.scale.linear().domain([-50, -10, -1, 0, 1, 10, 50]).range(
    [
                    d3.hsl(120, 1, .8),
                    d3.hsl(120, 1, .8),
                    d3.hsl(120, 1, .4),
                    d3.hsl(240, 1, .8),
                    d3.hsl(0, 1, .5),
                    d3.hsl(0, 1, .9),
                    d3.hsl(0, 1, .9)
    ]);

    function highlightConnected(name) {
        nodes.forEach(function(d) { d.distance = null; });
        nodeMap[name].distance = 0;
        var i = -1;
        var foundOne = false;
        while (true) {
            foundOne = false;
            links.forEach(function(link) {
                if (link.target.distance === i+1 && link.source.distance === null) {
                    foundOne = true;
                    link.source.distance = i;
                }
            });
            if (!foundOne) break;
            --i;
        }
        i = 1;
        while (true) {
            foundOne = false;
            links.forEach(function(link) {
                if (link.source.distance === i-1 && link.target.distance === null) {
                    foundOne = true;
                    link.target.distance = i;
                }
            });
            if (!foundOne) break;
            ++i;
        }
        d3.selectAll("div.standard").style("background", function(d) {
            if (d.distance === null) {
                return "#eee";
            }
            return fillScale(d.distance);
        });
    }

    function buildGrade(grade) {
        d3.select(this).selectAll("div.standard")
        .data(grade)
        .enter().append("div")
        .attr("class", "standard")
        .text(function(d) { return d.name; })
        .on("mouseover", function(d) { highlightConnected(d.name); });
        //.on("mouseout", function(d) { d3.select(this).attr("class", "standard"); });
    }

    d3.select("body").selectAll("div.grade")
    .data(grades)
    .enter().append("div")
    .attr("class", "grade")
    .each(buildGrade);
});

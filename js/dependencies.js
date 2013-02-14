var app;

function go(event, id) {
    console.log("go");
    var uri = id === "home" ? "" : id;  
    app.navigate(uri, {trigger:true});
    event.returnValue = false;
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    return false;
}

d3.csv("GraphData-EdgesOnly-Grade-00-08-2011-06-01-cleaned - EdgeSet.csv", function(data) {
    d3.json("standards.json", function(standards) {
        var grades = [];
        for (var g = 0; g <= 8; ++g) {
            grades.push([]);
        }

        var nodeMap = {};
        var nodes = [];
        var links = [];

        var recodedStandards = {};
        for (var code in standards) {
            // First take out the letter if we can
            var parts = code.split(".");
            var reducedCode = code;
            if (parts.length >= 4) {
                reducedCode = parts[0] + "." + parts[1] + "." + parts[3];
                if (parts.length >= 5) {
                    reducedCode += ("." + parts[4]);
                }
            }
            reducedCode = reducedCode.replace("K", "0");
            recodedStandards[reducedCode] = standards[code];
        }

        function ensureNode(name) {
            if (nodeMap[name] === undefined) {
                var baseName = name.split("||")[0].split(",")[0].split(";")[0];
                var description = recodedStandards[baseName];
                nodes.push({name: name, description: description});
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

        for (var grade = 0; grade <= 8; ++grade) {
            grades[grade].sort(function(a, b) { return d3.ascending(a.name, b.name); });
        }

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

        function buildGrade(grade, i) {
            d3.select(this).append("div")
                .attr("class", "grade-name")
                .text(function(d) { return i === 0 ? "K" : i; });

            d3.select(this).selectAll("div.standard")
                .data(grade)
                .enter().append("div")
                .attr("class", "standard")
                .attr("title", function(d) { return d.description; })
                .text(function(d) { return d.name; })
                .on("mouseover", function(d) { highlightConnected(d.name); })
                .on("click", function(d) { go(d3.event, "/detail/" + d.name); });
        }

        d3.select("#home").selectAll("div.grade")
            .data(grades)
            .enter().append("div")
            .attr("class", "grade")
            .each(buildGrade);
            
        function show() {
            d3.select(this).style("display", "block");
        }

        function hide() {
            d3.select(this).style("display", "none");
        }

        var cur = null;
        var curName = null;
        
        function goto(id, name) {
            var prev = cur, prevName = curName, dur = 250;
            cur = id;
            curName = name;

            if (prev === cur && prevName === curName) return;

            if (prev !== null) {
                // fade out prev view
                d3.select("#"+prev).transition()
                    .duration(dur)
                    .style("opacity", 0)
                    .each("end", hide);
            }
            if (cur === "detail") {
                standard = nodeMap[name];
                $("#name").text(name);
                $("#description").text(standard.description);
                highlightConnected(name);
                var next = [];
                var prev = [];
                nodes.forEach(function (d) {
                    if (d.distance === null) return;
                    if (d.distance > 0) {
                        next[d.distance - 1] = next[d.distance - 1] || [];
                        next[d.distance - 1].push(d);
                    }
                    if (d.distance < 0) {
                        prev[-d.distance - 1] = prev[-d.distance - 1] || [];
                        prev[-d.distance - 1].push(d);
                    }
                });
                function buildDepends(cur, i) {
                    d3.select(this).append("h3").text(i ? ((i + 1) + " steps away") : "Immediate link");
                    var list = d3.select(this).selectAll("div")
                        .data(cur)
                        .enter().append("div");
                    list.append("h4").append("a").attr("href", function (d) { return "/detail/" + d.name; })
                        .text(function (d) { return d.name; })
                        .on("click", function (d) { go(d3.event, "/detail/" + d.name); });
                    list.append("div")
                        .text(function (d) { return d.description; });
                }
                d3.select("#prev").selectAll("*").remove();
                d3.select("#next").selectAll("*").remove();
                d3.select("#prev").selectAll("div").data(prev).enter().append("div").each(buildDepends);
                d3.select("#next").selectAll("div").data(next).enter().append("div").each(buildDepends);
            }
            window.scrollTo(0, 0);
            // fade in next view
            d3.select("#"+cur)
                .style("opacity", 0)
                .transition()
                .duration(dur)
                .delay(dur+2)
                .style("opacity", 1)
                .each("start", show);
        }

        var router = Backbone.Router.extend({
                routes: {
                    "": "home",
                    "detail/:name": "detail"
                },
                home:   function ()     { goto("home"); },
                detail: function (name) { goto("detail", name); }
            });
        app = new router();
        Backbone.history.start({
            //pushState: true,
            root: "/"
        });
    });
});

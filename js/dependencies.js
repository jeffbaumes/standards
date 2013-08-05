/*globals $, Backbone, console, d3, window */
var app;

function go(event, id) {
    "use strict";

    console.log("go");
    var uri = id === "home" ? "" : id;
    app.navigate(uri, {trigger: true});
    event.returnValue = false;
    if (event.preventDefault) {
        event.preventDefault();
    }
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    return false;
}

d3.csv("GraphData-EdgesOnly-Grade-00-08-2011-06-01-cleaned - EdgeSet.csv", function(data) {
    "use strict";

    d3.json("standards.json", function(standards) {
        var grades = [],
            g,
            nodeMap = {},
            nodes = [],
            links = [],
            recodedStandards = {},
            code,
            parts,
            reducedCode,
            i,
            d,
            fillScale,
            grade,
            cur = null,
            curName = null,
            MyRouter,
            categories,
            categoryMap = {},
            grouped,
            width,
            height,
            margin;

        categories = [
            {name: "Counting and Cardinality", abbreviation: "CC"},
            {name: "Measurement and Data", abbreviation: "MD"},
            {name: "Operations and Algebraic Thinking", abbreviation: "OA"},
            {name: "Number and Operations in Base Ten", abbreviation: "NBT"},
            {name: "Geometry", abbreviation: "G"},
            {name: "Number and Operations-Fractions", abbreviation: "NF"},
            {name: "The Number System", abbreviation: "NS"},
            {name: "Ratios and Proportional Relationships", abbreviation: "RP"},
            {name: "Expressions and Equations", abbreviation: "EE"},
            {name: "Statistics and Probability", abbreviation: "SP"},
            {name: "Functions", abbreviation: "F"}
        ];

        categories.forEach(function (d) {
            categoryMap[d.abbreviation] = d;
        });

        for (g = 0; g <= 8; g += 1) {
            grades.push([]);
        }

        for (code in standards) {
            if (standards.hasOwnProperty(code)) {
                // First take out the letter if we can
                parts = code.split(".");
                reducedCode = code;
                if (parts.length >= 4) {
                    reducedCode = parts[0] + "." + parts[1] + "." + parts[3];
                    if (parts.length >= 5) {
                        reducedCode += ("." + parts[4]);
                    }
                }
                reducedCode = reducedCode.replace("K", "0");
                recodedStandards[reducedCode] = standards[code];
            }
        }

        function ensureNode(name) {
            var baseName,
                description,
                grade;

            if (nodeMap[name] === undefined) {
                baseName = name.split("||")[0].split(",")[0].split(";")[0];
                description = recodedStandards[baseName];
                nodes.push({name: name, description: description});
                grade = +name.split(".")[0];
                grades[grade].push(nodes[nodes.length - 1]);
                nodeMap[name] = nodes[nodes.length - 1];
            }
        }

        for (i = 0; i < data.length; i += 1) {
            d = data[i];
            ensureNode(d.Begin);
            ensureNode(d.End);
            links.push({source: nodeMap[d.Begin], target: nodeMap[d.End], type: d.EdgeDesc});
            if (d.EdgeDesc === "Nondirectional link") {
                links.push({source: nodeMap[d.End], target: nodeMap[d.Begin], type: d.EdgeDesc});
            }
        }

        for (grade = 0; grade <= 8; grade += 1) {
            grades[grade].sort(function(a, b) { return d3.ascending(a.name, b.name); });
        }

        fillScale = d3.scale.linear().domain([-50, -10, -1, 0, 1, 10, 50]).range([
            d3.hsl(240, 1, 0.9),
            d3.hsl(240, 1, 0.9),
            d3.hsl(240, 1, 0.6),
            d3.hsl(120, 1, 0.5),
            d3.hsl(0, 1, 0.5),
            d3.hsl(0, 1, 0.9),
            d3.hsl(0, 1, 0.9)
        ]);

        function highlightConnected(name) {
            var i = -1,
                foundOne = false;
            nodes.forEach(function(d) { d.distance = null; });
            nodeMap[name].distance = 0;
            while (true) {
                foundOne = false;
                links.forEach(function(link) {
                    if (link.target.distance === i + 1 && link.source.distance === null) {
                        foundOne = true;
                        link.source.distance = i;
                    }
                });
                if (!foundOne) {
                    break;
                }
                i -= 1;
            }
            i = 1;
            while (true) {
                foundOne = false;
                links.forEach(function(link) {
                    if (link.source.distance === i - 1 && link.target.distance === null) {
                        foundOne = true;
                        link.target.distance = i;
                    }
                });
                if (!foundOne) {
                    break;
                }
                i += 1;
            }
            d3.selectAll("div.standard").style("background", function(d) {
                if (d.distance === null) {
                    return "#eee";
                }
                return fillScale(d.distance);
            });
            d3.selectAll("rect").style("fill", function(d) {
                if (d.distance === null) {
                    return "#eee";
                }
                return fillScale(d.distance);
            });
        }

        function buildGrade(grade, i) {
            d3.select(this).append("div")
                .attr("class", "grade-name")
                .text(function() { return i === 0 ? "K" : i; });

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

        function buildGroupedGradeCategory(category) {
            d3.select(this).selectAll("rect")
                .data(category.standards)
                .enter().append("rect")
                .attr("width", 7)
                .attr("height", 20)
                .attr("x", function (d, i) { return i * 7; })
                .style("fill", "#eee")
                //.style("stroke", "black")
                .on("mouseover", function(d) { highlightConnected(d.name); })
                .on("click", function(d) { go(d3.event, "/detail/" + d.name); })
                .each(function (d) {
                    $(this).popover({
                        html: false,
                        container: "body",
                        placement: "bottom",
                        trigger: "hover",
                        title: d.name,
                        content: d.description,
                        delay: {
                            show: 250,
                            hide: 250
                        }
                    });
                });
        }

        function buildGroupedGrade(grade, gradeNumber) {
            var grouped = [],
                groupMap = {};

            categories.forEach(function (d) {
                grouped.push({category: d, standards: []});
            });

            grouped.forEach(function (d) {
                groupMap[d.category.abbreviation] = d;
            });

            grade.forEach(function (d) {
                groupMap[d.name.split(";")[0].split(".")[1]].standards.push(d);
            });

            d3.select(this).append("text")
                .attr("x", 10)
                .attr("y", -5)
                .style("font-size", "18px")
                .style("font-weight", "bold")
                .style("fill", "#888")
                .text(gradeNumber === 0 ? "K" : gradeNumber);

            d3.select(this).selectAll("g")
                .data(grouped)
                .enter().append("g")
                .attr("transform", function (d, i) { return "translate(0," + (i * 40) + ")"; })
                .each(buildGroupedGradeCategory);
        }

        width = 960;
        height = 1000;
        margin = {left: 50, top: 50};

        grouped = d3.select("#grouped").append("svg")
            .attr("width", width + margin.left)
            .attr("height", height + margin.top)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        grouped.selectAll("g")
            .data(grades)
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(" + i * 100 + ",0)"; })
            .each(buildGroupedGrade);

        grouped.selectAll("text.category")
            .data(categories)
            .enter().append("text").classed("category", true)
            .text(function (d) { return d.abbreviation; })
            .style("fill", "#888")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("text-anchor", "end")
            .style("alignment-baseline", "middle")
            .attr("transform", function (d, i) { return "translate(-5," + (10 + i * 40) + ")"; });

        function show() {
            d3.select(this).style("display", "block");
        }

        function hide() {
            d3.select(this).style("display", "none");
        }

        function goto(id, name) {
            var prev = cur,
                prevName = curName,
                dur = 250,
                standard,
                nextArr = [],
                prevArr = [];

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

            cur = id;
            curName = name;

            d3.select("#flow-navitem").classed("active", cur === "home");
            d3.select("#matrix-navitem").classed("active", cur === "grouped");

            if (prev === cur && prevName === curName) {
                return;
            }

            if (prev !== null) {
                // fade out prev view
                d3.select("#" + prev).transition()
                    .duration(dur)
                    .style("opacity", 0)
                    .each("end", hide);
            }
            if (cur === "detail") {
                standard = nodeMap[name];
                $("#name").text(categoryMap[name.split(";")[0].split(".")[1]].name + ": " + name);
                $("#description").text(standard.description);
                highlightConnected(name);
                nodes.forEach(function (d) {
                    if (d.distance === null) {
                        return;
                    }
                    if (d.distance > 0) {
                        nextArr[d.distance - 1] = nextArr[d.distance - 1] || [];
                        nextArr[d.distance - 1].push(d);
                    }
                    if (d.distance < 0) {
                        prevArr[-d.distance - 1] = prevArr[-d.distance - 1] || [];
                        prevArr[-d.distance - 1].push(d);
                    }
                });
                d3.select("#prev").selectAll("*").remove();
                d3.select("#next").selectAll("*").remove();
                d3.select("#prev").selectAll("div").data(prevArr).enter().append("div").each(buildDepends);
                d3.select("#next").selectAll("div").data(nextArr).enter().append("div").each(buildDepends);
            }
            window.scrollTo(0, 0);
            // fade in next view
            d3.select("#" + cur)
                .style("opacity", 0)
                .transition()
                .duration(dur)
                .delay(dur + 2)
                .style("opacity", 1)
                .each("start", show);
        }

        MyRouter = Backbone.Router.extend({
            routes: {
                "": "home",
                "grouped": "grouped",
                "detail/:name": "detail"
            },
            home: function () { goto("home"); },
            grouped: function () { goto("grouped"); },
            detail: function (name) { goto("detail", name); }
        });
        app = new MyRouter();
        Backbone.history.start({
            //pushState: true,
            root: "/"
        });
    });
});

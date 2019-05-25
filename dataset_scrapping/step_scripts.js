

function open_issue(params, result) {
    var volume = params.year - 2019 + 111;
    var needle = "Volume" + volume;
    function $$(selector, root) {
        root = root || document;
        return Array.from(root.querySelectorAll(selector));
    }
    $$(".accordionContainer").map(function(accordion_node) {
        var a_nodes = $$(".volume-link", accordion_node);
        if (a_nodes.length == 0) return;
        if (a_nodes[0].innerText.replace(/\s/g, '') == needle) {
            var issues_list = $$("[accordion-content]", accordion_node);
            if (issues_list.length == 0) {
                a_nodes[0].click();
            };
            setTimeout(function() {
                var issues = $$("[accordion-content] .issue-item a", accordion_node);
                issues[issues.length - params.issue_num].click();
                if (!!result.done) result.done();
            }, (500 + Math.random() * 2000) | 0);
        }
    });
}


function count_issues(params, result) {
    var volume = params.year - 2019 + 111;
    var needle = "Volume" + volume;
    function $$(selector, root) {
        root = root || document;
        return Array.from(root.querySelectorAll(selector));
    }
    $$(".accordionContainer").map(function(accordion_node) {
        var a_nodes = $$(".volume-link", accordion_node);
        if (a_nodes.length == 0) return;
        if (a_nodes[0].innerText.replace(/\s/g, '') == needle) {
            var issues_list = $$("[accordion-content]", accordion_node);
            if (issues_list.length == 0) {
                a_nodes[0].click();
            };
            setTimeout(function() {
                result.count = $$("[accordion-content] li", accordion_node).length;
                if (!!result.done) result.done();
            }, (500 + Math.random() * 2000) | 0);
        }
    });
}


function get_all_articles(params, result) {
    function $$(selector, root) {
        root = root || document;
        return Array.from(root.querySelectorAll(selector));
    }

    var articles = $$("journalrecordlist article");
    var titles = {};
    var abstracts = {};
    var unread_articles_ids = [...Array(articles.length).keys()]

    function doStep(to_read) {
        if (to_read !== null) {
            var title_nodes =  $$(".article-title", articles[to_read]);
            var abstract_nodes = $$(".resultData > span", articles[to_read]);
            if (title_nodes.length > 0 && abstract_nodes.length > 0) {
                titles[to_read] = title_nodes[0].innerText;
                abstracts[to_read] = abstract_nodes[0].innerText;
                unread_articles_ids.splice(unread_articles_ids.indexOf(to_read), 1);
                console.log("Read article " + to_read +
                            ", left to read: " + JSON.stringify(unread_articles_ids));
            }
        }
        if (unread_articles_ids.length != 0) {
            var idx = (Math.random() * unread_articles_ids.length) | 0;
            if (idx >= unread_articles_ids.length) idx = 0;
            if ($$(".resultData", articles[unread_articles_ids[idx]]).length == 0) {
                $$(".abstractLink", articles[unread_articles_ids[idx]])[0].click();
            }
            setTimeout(doStep, (500 + Math.random() * 5000) | 0, unread_articles_ids[idx]);
        } else {
            result.articles = articles.map(function(article, i) {
                return {
                    title: titles[i],
                    abstract: abstracts[i]
                }
            });
            console.log("done reading articles");
            if (!!result.done) result.done();
        }

    }
    doStep(null);
}


function do_nothing() {}

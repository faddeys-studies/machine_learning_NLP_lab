(function(window, document) {
    // do not modify these lines: server replaces them with actual values
    var server_url = "";

    // now normal script goes
    function $$(selector, root) {
        root = root || document;
        return Array.from(root.querySelectorAll(selector));
    }

    function get_current_issue() {
        var active = $$(".issue-item a.active");
        if (active.length > 0) {
            var issue = active[0].innerText.replace(/\s/g, '');
            var year = active[0].parentNode.parentNode.parentNode.parentNode.children[0].innerText;
            return {issue: issue, year: year};
        }
        return {};
    }

    function executeNextStep(last_step, last_params, last_result) {
        var xhr = new XMLHttpRequest();
        var out_msg = JSON.stringify({
            last_step: last_step,
            last_params: last_params,
            last_result: last_result,
            current_state: get_current_issue()
        });

        xhr.open("POST", server_url + "/action");
        xhr.setRequestHeader('Content-type', 'text/plain');
        xhr.onreadystatechange = function() {
            if(xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    var result = {
                        done: function() {
                            delete result.done;
                            console.log(
                                "Done step " + step.name +
                                " params = " + JSON.stringify(step.params) +
                                " with result = " + JSON.stringify(result)
                            );
                            setTimeout(executeNextStep, (Math.random() * 3000) | 0, step.name, step.params, result);
                        }
                    };
                    var step = JSON.parse(xhr.responseText);
                    var step_func = eval("(" + step.code + ")");
                    console.log("Executing step " + step.name + " with params=" + JSON.stringify(step.params));
                    setTimeout(step_func, (Math.random() * 3000) | 0, step.params, result);
                } else {
                    console.log("Error:" + xhr.responseText);
                }
            };
        };
        xhr.send(out_msg);
    }
    executeNextStep(null, null, null);


})(window, document)

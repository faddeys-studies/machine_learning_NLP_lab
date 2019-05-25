from flask import Flask, request, Response
import os
import json
import random

app = Flask(__name__)


_package_dir = os.path.dirname(os.path.abspath(__file__))


def get_step_scripts():
    _step_scripts = open(os.path.join(_package_dir, "step_scripts.js")).read().strip()
    result = {}
    _step_scripts = ("\n" + _step_scripts).split("\nfunction ")
    for step in _step_scripts:
        name, _, rest_of_code = step.partition("(")
        if not name.strip():
            continue
        step_code = f"function {name}({rest_of_code}"
        result[name] = step_code
    return result


step_scripts = get_step_scripts()


class DatasetState:
    def __init__(self, data_dir):
        self.data_dir = data_dir

    def list_articles(self, year=None, issue_num=None):
        prefix = "issue_"
        if year is not None:
            prefix += str(year) + "_"
            if issue_num is not None:
                prefix += str(issue_num)
        return [
            os.path.join(self.data_dir, name)
            for name in os.listdir(self.data_dir)
            if name.startswith(prefix)
        ]

    def count_articles(self, year=None, issue_num=None):
        return len(self.list_articles(year, issue_num))

    def add_article(self, year, issue_num, article_id, title, abstract):
        path = os.path.join(self.data_dir, f"issue_{year}_{issue_num}_{article_id}.txt")
        with open(path, "w") as f:
            f.write(title.replace("\n", " ") + "\n")
            f.write(abstract)

    def get_n_issues(self):
        try:
            with open(self._metadata_path) as f:
                n_issues = json.load(f)
            return {int(year): count for year, count in n_issues.items()}
        except FileNotFoundError:
            return {}

    def tell_n_issues(self, year, n_issues):
        n_issues_data = self.get_n_issues()
        n_issues_data[year] = n_issues
        with open(self._metadata_path, "w") as f:
            json.dump(n_issues_data, f)

    @property
    def _metadata_path(self):
        return os.path.join(self.data_dir, "metadata.json")


dataset = DatasetState(".data/raw")


@app.route("/action", methods=["POST"])
def action():
    inputs = request.get_json(force=True)
    last_step = inputs["last_step"]
    last_params = inputs["last_params"]
    last_result = inputs["last_result"]
    current_year = inputs["current_state"].get("year")
    current_issue = inputs["current_state"].get("issue")
    if current_year:
        current_year = int(current_year)
    if current_issue:
        current_issue = int(current_issue.partition("Issue")[2].partition("(")[0])

    if last_step == "count_issues":
        issues_count = int(last_result["count"])
        counted_year = int(last_params["year"])
        print(f"Counted issues in year {counted_year}: {issues_count}")
        dataset.tell_n_issues(year=counted_year, n_issues=issues_count)
    elif last_step == "get_all_articles":
        articles = list(last_result["articles"])
        print(
            f"Collected articles in Year{current_year} Issue{current_issue}:",
            len(articles),
        )
        assert current_year is not None
        for i, article in enumerate(articles):
            dataset.add_article(
                current_year, current_issue, i, article["title"], article["abstract"]
            )

    next_step = "do_nothing"
    params = {}

    known_n_issues = dataset.get_n_issues()
    interesting_years = list(range(2015, 2019 + 1))
    years_with_unknown_issues_count = [
        year for year in interesting_years if known_n_issues.get(year) is None
    ]
    if years_with_unknown_issues_count:
        next_step = "count_issues"
        if current_year in years_with_unknown_issues_count:
            params = {"year": current_year}
        else:
            params = {"year": random.choice(years_with_unknown_issues_count)}
    else:
        if (
            current_year is not None
            and current_issue is not None
            and dataset.count_articles(current_year, current_issue) == 0
        ):
            next_step = "get_all_articles"
            params = {}
        else:
            years_to_check = interesting_years[:]
            random.shuffle(years_to_check)
            for year in years_to_check:
                n_issues = known_n_issues[year]
                issues = list(range(1, n_issues + 1))
                random.shuffle(issues)
                for issue in issues:
                    if dataset.count_articles(year, issue) == 0:
                        next_step = "open_issue"
                        params = {"year": year, "issue_num": issue}
                        break
                else:
                    continue
                break

    print(f"Tell agent: action={next_step} params={params}")
    resp = Response(
        json.dumps(
            {"name": next_step, "code": step_scripts[next_step], "params": params}
        )
    )
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp


@app.route("/browser_script.js")
def get_browser_script():
    browser_script = open(os.path.join(_package_dir, "browser_script.js")).read()
    line_to_replace = '   var server_url = "";'
    before, _, after = browser_script.partition(line_to_replace)
    return before + f'   var server_url = "http://{request.host}";' + after


@app.route("/inject.js")
def get_inject_script():
    url = f"http://{request.host}"
    script = """
    (function(document) {
        var script = document.createElement("script");
        script.src = "REPLACE_URL/browser_script.js";
        document.body.appendChild(script);
    })(document)
    """.replace(
        "REPLACE_URL", url
    )
    return script

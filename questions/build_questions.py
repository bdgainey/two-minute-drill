"""
Two Minute Drill: question generator.
Builds trivia questions from three templates and saves them to questions.json.

"""
import json
from itertools import combinations
from pathlib import Path

import nflreadpy as nfl
import polars as pl

OUTPUT = Path(__file__).parent / "questions.json"
MIN_TD_PASSES = 150   # need this many career TD passes to get a question
OLD_CODES = ["LAR", "OAK", "SD", "STL"]   # extra team codes nflverse has


def load_data():
    print("Loading data from nflverse...")
    teams = nfl.load_teams()
    teams = teams.filter(~pl.col("team_abbr").is_in(OLD_CODES))
    stats = nfl.load_player_stats(seasons=list(range(1999, 2026)))
    return teams, stats


def td_from_qb_questions(stats):
    qbs = (
        stats.group_by("player_id")
             .agg(pl.col("player_display_name").last().alias("name"),
                  pl.col("passing_tds").sum().alias("tds"))
             .filter(pl.col("tds") >= MIN_TD_PASSES)
             .sort("name")
    )
    questions = []
    for qb in qbs.iter_rows(named=True):
        questions.append({
            "id": "td-" + qb["player_id"],
            "template": "td_from_qb",
            "text": f"Name a player who caught a touchdown pass from {qb['name']}.",
            "params": {"qb_id": qb["player_id"], "qb_name": qb["name"]},
        })
    return questions


def two_team_questions(teams):
    nicknames = dict(zip(teams["team_abbr"], teams["team_nick"]))
    questions = []
    for team_a, team_b in combinations(sorted(nicknames), 2):
        questions.append({
            "id": f"teams-{team_a}-{team_b}",
            "template": "two_teams",
            "text": f"Name a player who played for both the {nicknames[team_a]} and the {nicknames[team_b]}.",
            "params": {"team_a": team_a, "team_b": team_b},
        })
    return questions


def hundred_yard_questions(teams):
    questions = []
    for team in teams.sort("team_abbr").iter_rows(named=True):
        for stat in ["rushing", "receiving"]:
            questions.append({
                "id": f"{stat}100-{team['team_abbr']}",
                "template": "hundred_yards",
                "text": f"Name a player who had a 100-yard {stat} game against the {team['team_nick']}.",
                "params": {"opponent": team["team_abbr"], "stat": stat},
            })
    return questions


def main():
    teams, stats = load_data()
    questions = (
        td_from_qb_questions(stats)
        + two_team_questions(teams)
        + hundred_yard_questions(teams)
    )
    OUTPUT.write_text(json.dumps(questions, indent=2))
    print(f"Saved {len(questions)} questions to {OUTPUT}")


if __name__ == "__main__":
    main()
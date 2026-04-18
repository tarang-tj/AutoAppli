"""
Canonical skill taxonomy — Python mirror of frontend/src/lib/match/taxonomy.ts.

Keep both files in sync when adding skills. The canonical names MUST match
exactly so the frontend fallback scorer and the backend service produce the
same output.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal, Optional


SkillCategory = Literal[
    "language", "framework", "database", "cloud", "devops",
    "data", "ml", "design", "product", "soft", "tool",
]


@dataclass(frozen=True)
class CanonicalSkill:
    name: str
    label: str
    category: SkillCategory
    aliases: tuple[str, ...] = field(default_factory=tuple)


SKILLS: list[CanonicalSkill] = [
    # languages
    CanonicalSkill("javascript", "JavaScript", "language", ("js", "ecmascript", "es6", "es2015")),
    CanonicalSkill("typescript", "TypeScript", "language", ("ts",)),
    CanonicalSkill("python", "Python", "language", ("py", "python3")),
    CanonicalSkill("go", "Go", "language", ("golang",)),
    CanonicalSkill("rust", "Rust", "language"),
    CanonicalSkill("java", "Java", "language"),
    CanonicalSkill("kotlin", "Kotlin", "language"),
    CanonicalSkill("swift", "Swift", "language"),
    CanonicalSkill("objective-c", "Objective-C", "language", ("objc", "obj-c")),
    CanonicalSkill("c++", "C++", "language", ("cpp", "cplusplus")),
    CanonicalSkill("c#", "C#", "language", ("csharp", "c-sharp", "dotnet", ".net")),
    CanonicalSkill("ruby", "Ruby", "language"),
    CanonicalSkill("php", "PHP", "language"),
    CanonicalSkill("scala", "Scala", "language"),
    CanonicalSkill("r", "R", "language"),
    CanonicalSkill("sql", "SQL", "language", ("structured query language",)),
    CanonicalSkill("html", "HTML", "language", ("html5",)),
    CanonicalSkill("css", "CSS", "language", ("css3",)),

    # frameworks
    CanonicalSkill("react", "React", "framework", ("reactjs", "react.js")),
    CanonicalSkill("next.js", "Next.js", "framework", ("nextjs", "next")),
    CanonicalSkill("vue", "Vue", "framework", ("vuejs", "vue.js", "vue3")),
    CanonicalSkill("angular", "Angular", "framework", ("angularjs",)),
    CanonicalSkill("svelte", "Svelte", "framework", ("sveltekit",)),
    CanonicalSkill("tailwindcss", "Tailwind CSS", "framework", ("tailwind",)),
    CanonicalSkill("node.js", "Node.js", "framework", ("node", "nodejs")),
    CanonicalSkill("express", "Express", "framework", ("expressjs", "express.js")),
    CanonicalSkill("fastapi", "FastAPI", "framework"),
    CanonicalSkill("django", "Django", "framework"),
    CanonicalSkill("flask", "Flask", "framework"),
    CanonicalSkill("rails", "Ruby on Rails", "framework", ("ruby on rails", "ror")),
    CanonicalSkill("spring", "Spring", "framework", ("springboot", "spring boot")),
    CanonicalSkill("graphql", "GraphQL", "framework", ("gql",)),
    CanonicalSkill("rest", "REST APIs", "framework", ("restful", "rest api", "rest apis")),
    CanonicalSkill("grpc", "gRPC", "framework"),

    # databases
    CanonicalSkill("postgresql", "PostgreSQL", "database", ("postgres", "psql", "pg")),
    CanonicalSkill("mysql", "MySQL", "database"),
    CanonicalSkill("mongodb", "MongoDB", "database", ("mongo",)),
    CanonicalSkill("redis", "Redis", "database"),
    CanonicalSkill("elasticsearch", "Elasticsearch", "database", ("elastic",)),
    CanonicalSkill("supabase", "Supabase", "database"),
    CanonicalSkill("snowflake", "Snowflake", "database"),
    CanonicalSkill("bigquery", "BigQuery", "database"),
    CanonicalSkill("dynamodb", "DynamoDB", "database"),
    CanonicalSkill("sqlite", "SQLite", "database"),

    # cloud
    CanonicalSkill("aws", "AWS", "cloud", ("amazon web services",)),
    CanonicalSkill("gcp", "Google Cloud", "cloud", ("google cloud", "google cloud platform")),
    CanonicalSkill("azure", "Azure", "cloud", ("microsoft azure",)),
    CanonicalSkill("vercel", "Vercel", "cloud"),
    CanonicalSkill("cloudflare", "Cloudflare", "cloud"),
    CanonicalSkill("heroku", "Heroku", "cloud"),

    # devops
    CanonicalSkill("docker", "Docker", "devops"),
    CanonicalSkill("kubernetes", "Kubernetes", "devops", ("k8s",)),
    CanonicalSkill("terraform", "Terraform", "devops"),
    CanonicalSkill("ansible", "Ansible", "devops"),
    CanonicalSkill("ci/cd", "CI/CD", "devops", ("cicd", "continuous integration", "continuous delivery", "continuous deployment")),
    CanonicalSkill("github actions", "GitHub Actions", "devops", ("gh actions",)),
    CanonicalSkill("jenkins", "Jenkins", "devops"),
    CanonicalSkill("git", "Git", "devops"),
    CanonicalSkill("linux", "Linux", "devops", ("unix",)),

    # data + ml
    CanonicalSkill("pandas", "Pandas", "data"),
    CanonicalSkill("numpy", "NumPy", "data"),
    CanonicalSkill("spark", "Apache Spark", "data", ("pyspark", "apache spark")),
    CanonicalSkill("airflow", "Airflow", "data", ("apache airflow",)),
    CanonicalSkill("dbt", "dbt", "data"),
    CanonicalSkill("kafka", "Kafka", "data", ("apache kafka",)),
    CanonicalSkill("tensorflow", "TensorFlow", "ml", ("tf",)),
    CanonicalSkill("pytorch", "PyTorch", "ml", ("torch",)),
    CanonicalSkill("scikit-learn", "scikit-learn", "ml", ("sklearn",)),
    CanonicalSkill("llm", "LLMs", "ml", ("large language models", "large language model")),
    CanonicalSkill("nlp", "NLP", "ml", ("natural language processing",)),
    CanonicalSkill("computer vision", "Computer Vision", "ml", ("cv",)),

    # design
    CanonicalSkill("figma", "Figma", "design"),
    CanonicalSkill("ui/ux", "UI/UX", "design", ("ui ux", "ux", "ui design", "ux design")),
    CanonicalSkill("user research", "User Research", "design"),
    CanonicalSkill("prototyping", "Prototyping", "design"),

    # product
    CanonicalSkill("agile", "Agile", "product", ("agile development",)),
    CanonicalSkill("scrum", "Scrum", "product"),
    CanonicalSkill("jira", "Jira", "product"),
    CanonicalSkill("product management", "Product Management", "product", ("pm",)),
    CanonicalSkill("roadmapping", "Roadmapping", "product", ("roadmap",)),

    # soft skills
    CanonicalSkill("leadership", "Leadership", "soft"),
    CanonicalSkill("communication", "Communication", "soft"),
    CanonicalSkill("mentorship", "Mentorship", "soft", ("mentoring",)),
    CanonicalSkill("collaboration", "Collaboration", "soft"),

    # tools
    CanonicalSkill("vscode", "VS Code", "tool", ("visual studio code", "vs code")),
    CanonicalSkill("intellij", "IntelliJ", "tool", ("intellij idea",)),
    CanonicalSkill("postman", "Postman", "tool"),
]


# alias → canonical name
_ALIAS_INDEX: dict[str, str] = {}
for _skill in SKILLS:
    _ALIAS_INDEX[_skill.name] = _skill.name
    for _alias in _skill.aliases:
        _ALIAS_INDEX[_alias.lower()] = _skill.name


_CANONICAL_INDEX: dict[str, CanonicalSkill] = {s.name: s for s in SKILLS}


def normalize_skill(value: str) -> Optional[str]:
    """Return canonical skill name for a free-text input, or None when unknown."""
    if not value:
        return None
    cleaned = " ".join(value.strip().lower().split())
    return _ALIAS_INDEX.get(cleaned)


def normalize_skill_list(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for v in values:
        if not v:
            continue
        canon = normalize_skill(v)
        if canon and canon not in seen:
            seen.add(canon)
            out.append(canon)
    return out


def get_skill(name: str) -> Optional[CanonicalSkill]:
    return _CANONICAL_INDEX.get(name.lower())


SeniorityLevel = Literal[
    "intern", "junior", "mid", "senior", "staff",
    "principal", "manager", "director", "vp", "c-level",
]


SENIORITY_RANK: dict[SeniorityLevel, int] = {
    "intern": 0,
    "junior": 1,
    "mid": 2,
    "senior": 3,
    "staff": 4,
    "principal": 5,
    "manager": 4,
    "director": 5,
    "vp": 6,
    "c-level": 7,
}


import re as _re

_SENIORITY_PATTERNS: list[tuple[SeniorityLevel, _re.Pattern[str]]] = [
    ("intern", _re.compile(r"\b(intern|internship|co-?op)\b", _re.I)),
    ("junior", _re.compile(r"\b(junior|jr\.?|associate|entry[- ]level|early career|new grad|graduate)\b", _re.I)),
    ("principal", _re.compile(r"\b(principal)\b", _re.I)),
    ("staff", _re.compile(r"\b(staff)\b", _re.I)),
    ("c-level", _re.compile(r"\b(cto|ceo|cpo|cfo|coo|chief)\b", _re.I)),
    ("vp", _re.compile(r"\b(vp|vice president)\b", _re.I)),
    ("director", _re.compile(r"\b(director|head of)\b", _re.I)),
    ("manager", _re.compile(r"\b(manager|lead engineer|tech lead|engineering lead|em\b)\b", _re.I)),
    ("senior", _re.compile(r"\b(senior|sr\.?|sde ?iii|swe ?iii|level ?5|l5\b|l6\b)\b", _re.I)),
    ("mid", _re.compile(r"\b(mid[- ]?level|mid[- ]senior|sde ?ii|swe ?ii|l4\b|level ?4)\b", _re.I)),
]


def detect_seniority(text: str) -> Optional[SeniorityLevel]:
    if not text:
        return None
    for level, pattern in _SENIORITY_PATTERNS:
        if pattern.search(text):
            return level
    return None


def resolve_seniority(text: str, fallback: SeniorityLevel = "mid") -> SeniorityLevel:
    return detect_seniority(text) or fallback

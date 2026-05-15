BRANCH_ROLE_PACKS = {
    "data_ai": {
        "label": "Data / AI",
        "roles": [
            "Data Analyst",
            "Data Scientist",
            "Business Analyst",
            "BI Analyst",
            "Machine Learning Engineer",
            "AI Engineer",
            "Data Engineer",
        ],
    },
    "cse_it": {
        "label": "CSE / IT",
        "roles": [
            "Software Engineer",
            "Python Developer",
            "Backend Developer",
            "Frontend Developer",
            "Full Stack Developer",
            "DevOps Engineer",
            "Cloud Engineer",
            "QA Engineer",
            "Cybersecurity Analyst",
        ],
    },
    "ece": {
        "label": "ECE",
        "roles": [
            "Embedded Systems Engineer",
            "VLSI Engineer",
            "Electronics Engineer",
            "Hardware Design Engineer",
            "IoT Engineer",
            "Signal Processing Engineer",
            "Telecommunications Engineer",
            "RF Engineer",
        ],
    },
    "eee": {
        "label": "EEE",
        "roles": [
            "Electrical Engineer",
            "Power Systems Engineer",
            "Control Systems Engineer",
            "PLC SCADA Engineer",
            "Renewable Energy Engineer",
            "Electrical Design Engineer",
            "Maintenance Engineer",
            "Automation Engineer",
        ],
    },
    "mechanical": {
        "label": "Mechanical",
        "roles": [
            "Mechanical Engineer",
            "Design Engineer",
            "CAD Engineer",
            "Manufacturing Engineer",
            "Production Engineer",
            "Quality Engineer",
            "Maintenance Engineer",
        ],
    },
    "civil": {
        "label": "Civil",
        "roles": [
            "Civil Engineer",
            "Site Engineer",
            "Structural Engineer",
            "Construction Project Engineer",
            "Quantity Surveyor",
            "Planning Engineer",
        ],
    },
    "business": {
        "label": "Business / Management",
        "roles": [
            "Business Analyst",
            "Product Manager",
            "Project Coordinator",
            "Operations Analyst",
            "Marketing Analyst",
            "HR Analyst",
        ],
    },
}


def normalize_branch_key(value: str) -> str:
    return value.strip().lower().replace("&", "and").replace("/", "_").replace(" ", "_")


def expand_roles_for_branches(roles: list[str] | None, branches: list[str] | None) -> list[str]:
    expanded: list[str] = []
    seen = set()

    for role in roles or []:
        cleaned = role.strip()
        if cleaned and cleaned.lower() not in seen:
            expanded.append(cleaned)
            seen.add(cleaned.lower())

    for branch in branches or []:
        pack = BRANCH_ROLE_PACKS.get(normalize_branch_key(branch))
        if not pack:
            continue
        for role in pack["roles"]:
            if role.lower() not in seen:
                expanded.append(role)
                seen.add(role.lower())

    return expanded

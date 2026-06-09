BRANCH_ROLE_PACKS = {
    "data_ai": {
        "label": "Data / AI",
        "roles": [
            "Data Analyst",
            "Business Analyst",
            "BI Analyst",
            "Power BI Analyst",
            "Data Visualization Analyst",
            "Data Engineer",
            "ETL Developer",
            "Data Scientist",
            "Machine Learning Engineer",
            "AI Engineer",
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
            "Application Developer",
            "Web Developer",
            "DevOps Engineer",
            "Cloud Engineer",
            "QA Engineer",
            "Software Tester",
            "Cybersecurity Analyst",
            "System Administrator",
            "IT Support Engineer",
        ],
    },
    "ece": {
        "label": "ECE",
        "roles": [
            "Embedded Systems Engineer",
            "Embedded Software Engineer",
            "VLSI Engineer",
            "RTL Design Engineer",
            "FPGA Engineer",
            "Verification Engineer",
            "Semiconductor Engineer",
            "Electronics Engineer",
            "Hardware Design Engineer",
            "PCB Design Engineer",
            "IoT Engineer",
            "Signal Processing Engineer",
            "Telecommunications Engineer",
            "RF Engineer",
            "Network Engineer",
        ],
    },
    "eee": {
        "label": "EEE",
        "roles": [
            "Electrical Engineer",
            "Power Systems Engineer",
            "Control Systems Engineer",
            "PLC SCADA Engineer",
            "Electrical Maintenance Engineer",
            "Electrical Project Engineer",
            "Electrical Site Engineer",
            "Substation Engineer",
            "Renewable Energy Engineer",
            "Solar Engineer",
            "Electrical Design Engineer",
            "Maintenance Engineer",
            "Automation Engineer",
            "Instrumentation Engineer",
        ],
    },
    "mechanical": {
        "label": "Mechanical",
        "roles": [
            "Mechanical Engineer",
            "Mechanical Design Engineer",
            "CAD Engineer",
            "CAE Engineer",
            "Thermal Engineer",
            "HVAC Engineer",
            "Manufacturing Engineer",
            "Production Engineer",
            "Maintenance Engineer",
            "Automobile Engineer",
            "Process Engineer",
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
            "AutoCAD Draftsman",
            "BIM Engineer",
            "Revit Modeler",
            "Highway Engineer",
            "Geotechnical Engineer",
            "Estimation Engineer",
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
            "Sales Analyst",
            "Financial Analyst",
            "Management Trainee",
            "Operations Executive",
            "Digital Marketing Executive",
        ],
    },
}

BRANCH_KEYWORDS = {
    "data_ai": [
        "analytics",
        "business intelligence",
        "data visualization",
        "etl",
        "machine learning",
        "ml",
        "nlp",
        "power bi",
        "python",
        "sql",
        "tableau",
        "bi analyst",
        "dashboard",
        "data analyst",
        "data science",
        "data scientist",
        "reporting",
    ],
    "cse_it": [
        "api",
        "backend",
        "cloud",
        "cybersecurity",
        "devops",
        "frontend",
        "full stack",
        "java",
        "javascript",
        "python",
        "react",
        "software",
        "application developer",
        "database",
        "it support",
        "network administrator",
        "qa",
        "testing",
        "web developer",
    ],
    "ece": [
        "analog",
        "antenna",
        "arduino",
        "cadence",
        "communication systems",
        "digital electronics",
        "electronics",
        "embedded",
        "fpga",
        "hardware",
        "iot",
        "microcontroller",
        "pcb",
        "rf",
        "semiconductor",
        "signal processing",
        "telecom",
        "verilog",
        "vlsi",
        "rtl",
        "verification",
        "embedded software",
        "physical design",
        "chip design",
    ],
    "eee": [
        "automation",
        "control systems",
        "electrical",
        "electrical design",
        "etap",
        "maintenance",
        "motor",
        "plc",
        "power electronics",
        "power systems",
        "renewable",
        "scada",
        "solar",
        "substation",
        "electrical site",
        "instrumentation",
        "protection",
        "relay",
        "switchgear",
        "transformer",
    ],
    "mechanical": [
        "ansys",
        "autocad",
        "cad",
        "catia",
        "design",
        "manufacturing",
        "mechanical",
        "production",
        "solidworks",
        "thermal",
        "automobile",
        "cae",
        "cnc",
        "fea",
        "hvac",
        "process engineer",
        "tool design",
    ],
    "civil": [
        "autocad",
        "civil",
        "construction",
        "estimation",
        "etabs",
        "planning",
        "quantity",
        "revit",
        "site",
        "staad",
        "structural",
        "bim",
        "geotechnical",
        "highway",
        "primavera",
        "surveying",
        "transportation",
    ],
    "business": [
        "agile",
        "business analyst",
        "excel",
        "hr",
        "marketing",
        "operations",
        "product",
        "project coordinator",
        "requirements",
        "stakeholder",
        "business development",
        "finance",
        "management trainee",
        "sales",
        "strategy",
    ],
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


def branch_search_terms(branch: str) -> list[str]:
    branch_key = normalize_branch_key(branch)
    pack = BRANCH_ROLE_PACKS.get(branch_key)
    if not pack:
        return []
    terms = list(pack["roles"]) + BRANCH_KEYWORDS.get(branch_key, [])
    seen = set()
    unique_terms = []
    for term in terms:
        cleaned = term.strip()
        if cleaned and cleaned.lower() not in seen:
            unique_terms.append(cleaned)
            seen.add(cleaned.lower())
    return unique_terms
